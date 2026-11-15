"""B4: rank each body's Earth pool for every candidate, dimension by dimension.

Dimensions (0-1 here; B5 turns them into 0-100 scores and text):
  terrain      slope distribution over a ~25 km window, both sides at the same pixel size
               (Mars: MOLA 463 m, Earth averaged to 463 m; Moon: LOLA 240 m slope map, Earth to 240 m),
               compared with the 1-D Wasserstein distance
  mineralogy   rock-type match: the rock class of the unit mapped at the candidate (Mars: USGS SIM 3292,
               Tanaka et al. 2014; Moon: anorthositic highland crust) vs GLiM (Hartmann & Moosdorf 2012, 0.5 deg)
  albedo       (Mars) broadband albedo of the ground: MGS TES bolometric albedo at the candidate (from the
               screening) vs MODIS snow-free shortwave albedo on Earth. Dark rock and gravel match Mars' plains,
               bright sand and salt do not; it also catches a cell the coarse rock map calls basalt but that is sand
  altitude     (Mars) mean elevation of the window: thinner air and stronger UV on high ground
  aridity, temperature (and Moon: sun_angle, ice) from B3 (earth_pool.py)
  water_history (Mars) has no global comparable data -> null

A cell needs both a terrain and a rock score to be offered as a training area ("complete"): a missing score must
not help. (Until the 15 Nov Earth audit the total was averaged over whatever was present, so a cell with no rock
data outranked one with a known mismatch.)

Run after earth_pool.py (and the screenings):
    pipeline/.venv/Scripts/python pipeline/earth_ranking.py
"""

import json
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from pyproj import CRS, Transformer
from rasterio.enums import Resampling
from rasterio.windows import Window, from_bounds
from scipy.stats import wasserstein_distance

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "interim"
SITES = json.loads((ROOT / "app" / "public" / "data" / "sites.json").read_text(encoding="utf-8"))["sites"]

MOLA_463 = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
LOLA_SLOPE = RAW / "moon" / "ldsm_75s_240m.lbl"
COP = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM/" \
      "Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM.tif"
MARS_GEOLOGY = RAW / "mars" / "sim3292" / "geology" / "SIM3292_Global_Geology.shp"  # pubs.usgs.gov/sim/3292
WINDOW_KM = 25.0
PIXEL_M = {"mars": 463.0, "moon": 240.0}
WASSERSTEIN_SCALE_DEG = 3.0  # ours: a 3 deg mean shift in the slope distribution -> similarity 1/e
ALBEDO_SCALE = 0.20  # ours: an albedo 0.20 away from the site's scores 0 (dark basalt ~0.12, sand seas ~0.40)
FULL_ALTITUDE_M = 5000.0  # ours: Earth's high deserts and plateaus top out near here (air pressure ~54 % of sea level)

# GLiM classes (Classnames.txt) and how related they are, for the rock-type match
GLIM = {1: "su", 2: "vb", 3: "ss", 4: "pb", 5: "sm", 6: "sc", 7: "va", 8: "mt", 9: "pa", 10: "vi",
        11: "wb", 12: "py", 13: "pi", 14: "ev", 15: "nd", 16: "ig"}
GLIM_NAMES = {"su": "unconsolidated sediments", "vb": "basic volcanic (basalt)", "ss": "siliciclastic sedimentary",
              "pb": "basic plutonic (gabbro, anorthosite)", "sm": "mixed sedimentary", "sc": "carbonate sedimentary",
              "va": "acid volcanic", "mt": "metamorphic", "pa": "acid plutonic", "vi": "intermediate volcanic",
              "wb": "water", "py": "pyroclastic", "pi": "intermediate plutonic", "ev": "evaporites",
              "nd": "no data", "ig": "ice and glaciers"}
FAMILY = {"vb": "mafic", "pb": "mafic", "py": "volcanic", "vi": "volcanic", "va": "volcanic",
          "su": "sediment", "ss": "sediment", "sm": "sediment", "sc": "sediment", "ev": "sediment",
          "mt": "crystalline", "pa": "crystalline", "pi": "crystalline"}

# Rock class expected at each candidate: (GLiM class, wording for the report, mapped unit).
# Mars: the unit the USGS global geologic map (SIM 3292, Tanaka et al. 2014) draws at the candidate's coordinates,
# looked up from its GIS files on 15 Nov; audit.py repeats the lookup. Volcanic units -> basalt; the transition
# unit -> mixed sediments; e lies in the same mapped polygon as Opportunity, which found layered sandstone there.
# (The first table after the screening re-run guessed basin sediments for a and c; the map shows lava plains.)
EXPECTED_ROCK = {
    "mars-candidate-a": ("vb", "lava plains mapped at the site (USGS unit AHv, Amazonian and Hesperian volcanic)", "AHv"),
    "mars-candidate-b": ("vb", "lava plains mapped at the site (USGS unit AHv, Amazonian and Hesperian volcanic)", "AHv"),
    "mars-candidate-c": ("vb", "lava plains mapped at the site (USGS unit eHv, Early Hesperian volcanic)", "eHv"),
    "mars-candidate-d": ("sm", "sediments of the highland-lowland transition (USGS unit lHt)", "lHt"),
    "mars-candidate-e": ("ss", "layered sandstone Opportunity found in the same mapped unit (USGS unit HNhu)", "HNhu"),
    "moon-candidate-a": ("pb", "anorthositic highland crust", None),
    "moon-candidate-b": ("pb", "anorthositic highland crust", None),
    "moon-candidate-c": ("pb", "anorthositic highland crust", None),
}


def mapped_unit(lat: float, lon: float) -> tuple[str, str] | None:
    """Unit code and name of the USGS global geologic map of Mars at a point; None if the GIS files are not here."""
    if not MARS_GEOLOGY.exists():
        return None
    import geopandas as gpd
    from shapely.geometry import Point

    geology = gpd.read_file(MARS_GEOLOGY)
    hit = geology[geology.contains(Point(lon, lat))]
    return None if hit.empty else (str(hit.iloc[0]["Unit"]), str(hit.iloc[0]["UnitDesc"]))


def rock_similarity(expected: str, earth: str | None) -> float | None:
    if earth in (None, "nd", "wb", "ig"):
        return None
    if earth == expected:
        return 1.0
    if expected == "pb" and earth == "mt":
        return 0.5  # impact-processed highland crust is partly metamorphic
    if FAMILY.get(earth) and FAMILY.get(earth) == FAMILY.get(expected):
        return 0.6
    if {FAMILY.get(earth), FAMILY.get(expected)} == {"mafic", "volcanic"}:
        return 0.6
    return 0.15


def slope_deg(z: np.ndarray, pixel_x: float, pixel_y: float) -> np.ndarray:
    gy, gx = np.gradient(z, pixel_y, pixel_x)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def mars_slopes(lat: float, lon: float) -> np.ndarray:
    with rasterio.open(MOLA_463) as dem:
        crs = CRS.from_wkt(dem.crs.to_wkt())
        row, col = dem.index(*Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon, lat))
        half = int(WINDOW_KM * 1000 / 2 / abs(dem.transform.a))
        z = dem.read(1, window=Window(col - half, row - half, 2 * half, 2 * half)).astype("float64")
        return slope_deg(z, abs(dem.transform.a) * np.cos(np.radians(lat)), abs(dem.transform.a)).ravel()


def moon_slopes(lat: float, lon: float) -> np.ndarray:
    with rasterio.open(LOLA_SLOPE) as src:
        crs = CRS.from_wkt(src.crs.to_wkt())
        x, y = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(lon, lat)
        row, col = src.index(x, y)
        half = int(WINDOW_KM * 1000 / 2 / abs(src.transform.a))
        data = src.read(1, window=Window(col - half, row - half, 2 * half, 2 * half), masked=True)
        return (data.astype("float64") * (src.scales[0] or 1) + (src.offsets[0] or 0)).compressed()


def earth_window(lat: float, lon: float, pixel_m: float) -> np.ndarray | None:
    """Copernicus DEM heights in a WINDOW_KM box around a point, averaged to pixel_m (rows north to south).

    The DEM comes in 1-degree tiles. The box is laid over every tile it touches: away from the equator 25 km is
    more than a quarter of a degree of longitude, and at 78 N it spans three tiles. (Until the 15 Nov Earth audit
    only the tile under the centre was read and the box was cut at its edge, which squeezed the pixels east-west.)
    Missing tiles are sea; None if more than 30 % of the box has no height.
    """
    n = max(int(WINDOW_KM * 1000 / pixel_m), 8)
    half_lat = WINDOW_KM / 2 / 111.2
    half_lon = half_lat / max(np.cos(np.radians(lat)), 0.05)
    west, east, south, north = lon - half_lon, lon + half_lon, lat - half_lat, lat + half_lat
    z = np.full((n, n), np.nan)
    for tile_lat in range(math.floor(south), math.floor(north) + 1):
        for tile_lon in range(math.floor(west), math.floor(east) + 1):
            w, e = max(west, tile_lon), min(east, tile_lon + 1)
            s, nn = max(south, tile_lat), min(north, tile_lat + 1)
            c0, c1 = round((w - west) / (east - west) * n), round((e - west) / (east - west) * n)
            r0, r1 = round((north - nn) / (north - south) * n), round((north - s) / (north - south) * n)
            if c1 <= c0 or r1 <= r0 or not -90 <= tile_lat < 90:
                continue
            name_lon = (tile_lon + 180) % 360 - 180  # tiles are named by their south-west corner
            url = COP.format(ns="N" if tile_lat >= 0 else "S", lat=abs(tile_lat),
                             ew="E" if name_lon >= 0 else "W", lon=abs(name_lon))
            shift = name_lon - tile_lon  # read across the date line in the tile's own longitudes
            for attempt in range(3):
                try:
                    with rasterio.open(url) as dem:
                        window = from_bounds(w + shift, s, e + shift, nn, dem.transform)
                        window = window.intersection(Window(0, 0, dem.width, dem.height))
                        part = dem.read(1, window=window, out_shape=(r1 - r0, c1 - c0), resampling=Resampling.average,
                                        masked=True)
                    z[r0:r1, c0:c1] = part.astype("float64").filled(np.nan)
                    break
                except Exception as error:  # a tile that does not exist is sea; anything else is worth a retry
                    if "404" in str(error) or "does not exist" in str(error) or attempt == 2:
                        break
    return None if np.isnan(z).mean() > 0.3 else z


def earth_terrain(lat: float, lon: float, pixel_m: float) -> tuple[np.ndarray, float] | None:
    """Slopes (deg) and mean elevation (m) of the box around a point, the same recipe as the planet side."""
    z = earth_window(lat, lon, pixel_m)
    if z is None:
        return None
    pixel = WINDOW_KM * 1000 / z.shape[0]  # the box is WINDOW_KM wide on the ground in both directions
    s = slope_deg(z, pixel, pixel).ravel()
    return s[np.isfinite(s)], float(np.nanmean(z))


def glim_grid():
    path = RAW / "earth" / "glim" / "glim_wgs84_0point5deg.txt.asc"
    header = {}
    with open(path) as fh:
        for _ in range(6):
            key, value = fh.readline().split()
            header[key.lower()] = float(value)
    data = np.loadtxt(path, skiprows=6)
    return header, data


def glim_at(header, data, lat: float, lon: float) -> str | None:
    row = int((header["yllcorner"] + header["nrows"] * header["cellsize"] - lat) / header["cellsize"])
    col = int((lon - header["xllcorner"]) / header["cellsize"])
    if not (0 <= row < data.shape[0] and 0 <= col < data.shape[1]):
        return None
    value = int(data[row, col])
    return GLIM.get(value)


# Share of each dimension in the total (ours). audit.py recomputes every total from these.
WEIGHTS = {
    "mars": {"terrain": 0.30, "mineralogy": 0.20, "albedo": 0.10, "aridity": 0.20, "temperature": 0.10, "altitude": 0.10},
    "moon": {"terrain": 0.25, "mineralogy": 0.25, "aridity": 0.10, "temperature": 0.05, "sun_angle": 0.20, "ice": 0.15},
}
ROCK_POOL_SIZE = 40  # ours: per expected rock class, the best-climate cells of that class
ROCK_POOL_MIN_KM_APART = 200.0


def rock_pools(header, glim) -> dict[tuple[str, str], list[dict]]:
    """B3's pools are climate-only, so they hold almost no basalt or anorthosite. For each body and
    expected rock class, add the best-climate Earth cells *of that class* from B3's global grid."""
    grid = np.load(OUT / "earth_grid.npz")
    lat, lon = grid["lat"], grid["lon"]
    out = {}
    for body, rock in sorted({(s["body"], EXPECTED_ROCK[s["id"]][0]) for s in SITES if s["status"] == "candidate"}):
        score = grid[body]
        order = np.argsort(np.nan_to_num(score, nan=-1), axis=None)[::-1]
        picks: list[dict] = []
        for flat in order:
            if not np.isfinite(score.flat[flat]):
                break
            r, c = np.unravel_index(flat, score.shape)
            la, lo = float(lat[r, c]), float(lon[r, c])
            if glim_at(header, glim, la, lo) != rock:
                continue
            if any(great_circle(la, lo, p["lat"], p["lon"]) < ROCK_POOL_MIN_KM_APART for p in picks):
                continue
            picks.append({"lat": round(la, 3), "lon": round(lo, 3), "source": f"rock:{rock}",
                          "score": round(float(score[r, c]), 3),
                          "dims": {d: (None if not np.isfinite(grid[d][r, c]) else round(float(grid[d][r, c]), 2))
                                   for d in ("aridity", "barren", "swing", "cold", "frozen", "polar")}})
            if len(picks) == ROCK_POOL_SIZE:
                break
        out[(body, rock)] = picks
        print(f"rock pool {body}/{rock}: {len(picks)} cells, e.g. {[(p['lat'], p['lon']) for p in picks[:4]]}")
    return out


def great_circle(lat1, lon1, lat2, lon2, radius_km=6371.0):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * radius_km * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def main() -> None:
    pool = json.loads((OUT / "earth_pool.json").read_text(encoding="utf-8"))
    header, glim = glim_grid()
    by_rock = rock_pools(header, glim)
    candidates = [s for s in SITES if s["status"] == "candidate"]

    # Every Earth cell any candidate will look at, read once per body (the pixel size differs per body).
    cells = {b: {} for b in ("mars", "moon")}
    for site in candidates:
        for cell in pool[site["body"]] + by_rock[(site["body"], EXPECTED_ROCK[site["id"]][0])]:
            cells[site["body"]][(cell["lat"], cell["lon"])] = None
    env = rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
                       GDAL_HTTP_MAX_RETRY="3", GDAL_HTTP_RETRY_DELAY="1")
    with env, ThreadPoolExecutor(max_workers=12) as threads:
        for body, table in cells.items():
            keys = list(table)
            for key, result in zip(keys, threads.map(lambda k, b=body: earth_terrain(k[0], k[1], PIXEL_M[b]), keys)):
                table[key] = result
            print(f"{body}: Copernicus DEM read for {sum(v is not None for v in table.values())} of {len(keys)} cells")

    grid = np.load(OUT / "earth_grid.npz")

    def earth_albedo(cell: dict) -> float | None:
        value = float(grid["albedo"][int((90 - cell["lat"]) / 0.25), int((cell["lon"] + 180) / 0.25)])
        return value if np.isfinite(value) else None

    results = {}
    for site in candidates:
        body = site["body"]
        site_albedo = next((c["value"] for c in site["selection"]["criteria"] if c["id"] == "albedo"), None)
        planet = mars_slopes(site["lat"], site["lon"]) if body == "mars" else moon_slopes(site["lat"], site["lon"])
        expected, rock_note, unit = EXPECTED_ROCK[site["id"]]
        print(f"\n{site['id']} — planet slopes: median {np.median(planet):.2f}, p90 {np.percentile(planet, 90):.2f} deg")
        ranked = []
        for cell in pool[body] + by_rock[(body, expected)]:
            earth = cells[body][(cell["lat"], cell["lon"])]
            slopes, elevation = earth if earth is not None else (None, None)
            terrain = None if slopes is None or slopes.size < 20 else \
                float(np.exp(-wasserstein_distance(planet, slopes) / WASSERSTEIN_SCALE_DEG))
            rock = glim_at(header, glim, cell["lat"], cell["lon"])
            dims = cell["dims"]
            dryness = None if dims["aridity"] is None else 0.5 * dims["aridity"] + 0.5 * (dims["barren"] or 0)
            albedo = earth_albedo(cell)
            if body == "mars":
                scores = {"terrain": terrain, "mineralogy": rock_similarity(expected, rock), "water_history": None,
                          "aridity": dryness,
                          "temperature": None if dims["swing"] is None else 0.6 * dims["swing"] + 0.4 * (dims["cold"] or 0),
                          "albedo": None if albedo is None or site_albedo is None else
                          float(np.clip(1 - abs(albedo - site_albedo) / ALBEDO_SCALE, 0, 1)),
                          "altitude": None if elevation is None else float(np.clip(elevation / FULL_ALTITUDE_M, 0, 1))}
                weights = WEIGHTS["mars"]
            else:
                scores = {"terrain": terrain, "mineralogy": rock_similarity(expected, rock), "aridity": dryness,
                          "temperature": dims["swing"], "sun_angle": dims["polar"], "ice": dims["frozen"]}
                weights = WEIGHTS["moon"]
            complete = all(scores[k] is not None for k in weights)
            total = sum(scores[k] * w for k, w in weights.items()) if complete else None
            ranked.append({**cell, "rock": rock, "rock_name": GLIM_NAMES.get(rock or "nd"),
                           "scores": scores, "total": None if total is None else round(total, 4), "complete": complete,
                           "earth_slope_median": None if slopes is None else round(float(np.median(slopes)), 2),
                           "elevation_m": None if elevation is None else round(elevation),
                           "albedo": None if albedo is None else round(albedo, 3)})
        ranked.sort(key=lambda r: -(r["total"] if r["total"] is not None else -1))
        results[site["id"]] = {"body": body, "expected_rock": expected, "expected_rock_note": rock_note,
                               "mapped_unit": unit, "site_albedo": site_albedo,
                               "planet_slope_median": round(float(np.median(planet)), 2),
                               "planet_slope_p90": round(float(np.percentile(planet, 90)), 2), "ranked": ranked}
        print(f"  {sum(r['complete'] for r in ranked)} of {len(ranked)} cells have every score")
        for r in ranked[:6]:
            label = r.get("name") or f"{r['lat']:.2f}, {r['lon']:.2f}"
            s = {k: (None if v is None else round(v, 2)) for k, v in r["scores"].items()}
            print(f"  {r['total']:.3f}  {label[:38]:38s} rock={r['rock']}  {s}")
    (OUT / "earth_rankings.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT / 'earth_rankings.json'}")


if __name__ == "__main__":
    main()

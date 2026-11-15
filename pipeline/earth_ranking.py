"""B4: rank each body's Earth pool for every candidate, dimension by dimension.

Dimensions (0-1 here; B5 turns them into 0-100 scores and text):
  terrain      slope distribution over a ~25 km window, both sides at the same pixel size
               (Mars: MOLA 463 m, Earth resampled to 463 m; Moon: LOLA 240 m slope map, Earth to 240 m),
               compared with the 1-D Wasserstein distance
  mineralogy   rock-type match: the candidate's expected rock class vs GLiM (Hartmann & Moosdorf 2012,
               0.5 deg) on Earth. Planet-side classes are literature-level, not mapped units -> low confidence
  aridity, temperature (and Moon: sun_angle, ice) from B3 (earth_pool.py)
  water_history (Mars) has no global comparable data -> null

Run after earth_pool.py (and the screenings):
    pipeline/.venv/Scripts/python pipeline/earth_ranking.py
"""

import json
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
POOL = json.loads((OUT / "earth_pool.json").read_text(encoding="utf-8"))

MOLA_463 = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"
LOLA_SLOPE = RAW / "moon" / "ldsm_75s_240m.lbl"
COP = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM/" \
      "Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM.tif"
WINDOW_KM = 25.0
PIXEL_M = {"mars": 463.0, "moon": 240.0}
WASSERSTEIN_SCALE_DEG = 3.0  # ours: a 3 deg mean shift in the slope distribution -> similarity 1/e

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

# Expected rock class at each candidate (ours, from general geology — not a mapped unit).
EXPECTED_ROCK = {
    # Mars candidates as of the 15 Nov audit (the screening was re-run with corrected data)
    "mars-candidate-a": ("sm", "sediments that fill the Utopia basin"),
    "mars-candidate-b": ("vb", "young lava plains of Elysium Planitia"),
    "mars-candidate-c": ("sm", "sediments and lava that fill the Isidis impact basin"),
    "mars-candidate-d": ("sm", "outflow-channel sediments over lowland plains"),
    "mars-candidate-e": ("ss", "layered sandstone, as Opportunity found on the same plain"),
    "moon-candidate-a": ("pb", "anorthositic highland crust"),
    "moon-candidate-b": ("pb", "anorthositic highland crust"),
    "moon-candidate-c": ("pb", "anorthositic highland crust"),
}


def rock_similarity(expected: str, earth: str | None) -> float | None:
    if earth in (None, "nd", "wb"):
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


def earth_slopes(lat: float, lon: float, pixel_m: float) -> np.ndarray | None:
    """Copernicus DEM around a point, resampled to pixel_m, then slope — the same recipe as the planet side."""
    tile_lat, tile_lon = int(np.floor(lat)), int(np.floor(lon))
    url = COP.format(ns="N" if tile_lat >= 0 else "S", lat=abs(tile_lat), ew="E" if tile_lon >= 0 else "W",
                     lon=abs(tile_lon))
    half_lat = WINDOW_KM / 2 / 111.2
    half_lon = half_lat / max(np.cos(np.radians(lat)), 0.05)
    try:
        with rasterio.open(url) as dem:
            window = from_bounds(lon - half_lon, lat - half_lat, lon + half_lon, lat + half_lat, dem.transform)
            window = window.intersection(Window(0, 0, dem.width, dem.height))
            n = max(int(WINDOW_KM * 1000 / pixel_m), 8)
            z = dem.read(1, window=window, out_shape=(n, n), resampling=Resampling.average, masked=True)
    except Exception:
        return None
    z = z.astype("float64").filled(np.nan)
    if np.isnan(z).mean() > 0.3:
        return None
    width_m = (window.width * abs(dem.transform.a)) * 111_200 * np.cos(np.radians(lat))
    height_m = (window.height * abs(dem.transform.e)) * 111_200
    s = slope_deg(z, width_m / z.shape[1], height_m / z.shape[0]).ravel()
    return s[np.isfinite(s)]


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


ROCK_POOL_SIZE = 15  # ours: per expected rock class, the best-climate cells of that class
ROCK_POOL_MIN_KM_APART = 300.0


def rock_pools(header, glim) -> dict[tuple[str, str], list[dict]]:
    """B3's pools are climate-only, so they hold almost no basalt or anorthosite. For each body and
    expected rock class, add the best-climate Earth cells *of that class* from B3's global grid."""
    grid = np.load(OUT / "earth_grid.npz")
    lat, lon = grid["lat"], grid["lon"]
    out = {}
    for body, rock in {(s["body"], EXPECTED_ROCK[s["id"]][0]) for s in SITES if s["status"] == "candidate"}:
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
    header, glim = glim_grid()
    by_rock = rock_pools(header, glim)
    results = {}
    earth_cache: dict[tuple, np.ndarray | None] = {}
    for site in SITES:
        if site["status"] != "candidate":
            continue
        body = site["body"]
        planet = mars_slopes(site["lat"], site["lon"]) if body == "mars" else moon_slopes(site["lat"], site["lon"])
        expected, rock_note = EXPECTED_ROCK[site["id"]]
        print(f"\n{site['id']} — planet slopes: median {np.median(planet):.2f}, p90 {np.percentile(planet, 90):.2f} deg")
        ranked = []
        for cell in POOL[body] + by_rock[(body, expected)]:
            key = (body, cell["lat"], cell["lon"])
            if key not in earth_cache:
                earth_cache[key] = earth_slopes(cell["lat"], cell["lon"], PIXEL_M[body])
            earth = earth_cache[key]
            terrain = None if earth is None or earth.size < 20 else \
                float(np.exp(-wasserstein_distance(planet, earth) / WASSERSTEIN_SCALE_DEG))
            rock = glim_at(header, glim, cell["lat"], cell["lon"])
            dims = cell["dims"]
            if body == "mars":
                temperature = None if dims["swing"] is None else 0.6 * dims["swing"] + 0.4 * (dims["cold"] or 0)
                scores = {"terrain": terrain, "mineralogy": rock_similarity(expected, rock), "water_history": None,
                          "aridity": None if dims["aridity"] is None else 0.5 * dims["aridity"] + 0.5 * (dims["barren"] or 0),
                          "temperature": temperature}
                weights = {"terrain": 0.30, "mineralogy": 0.25, "aridity": 0.25, "temperature": 0.20}
            else:
                scores = {"terrain": terrain, "mineralogy": rock_similarity(expected, rock),
                          "aridity": None if dims["aridity"] is None else 0.5 * dims["aridity"] + 0.5 * (dims["barren"] or 0),
                          "temperature": dims["swing"], "sun_angle": dims["polar"], "ice": dims["frozen"]}
                weights = {"terrain": 0.25, "mineralogy": 0.25, "aridity": 0.10, "temperature": 0.05,
                           "sun_angle": 0.20, "ice": 0.15}
            used = {k: w for k, w in weights.items() if scores.get(k) is not None}
            total = sum(scores[k] * w for k, w in used.items()) / sum(used.values()) if used else None
            ranked.append({**cell, "rock": rock, "rock_name": GLIM_NAMES.get(rock or "nd"),
                           "scores": scores, "total": None if total is None else round(total, 4),
                           "weights_used": round(sum(used.values()), 2),
                           "earth_slope_median": None if earth is None else round(float(np.median(earth)), 2)})
        ranked.sort(key=lambda r: -(r["total"] or -1))
        results[site["id"]] = {"body": body, "expected_rock": expected, "expected_rock_note": rock_note,
                               "planet_slope_median": round(float(np.median(planet)), 2),
                               "planet_slope_p90": round(float(np.percentile(planet, 90)), 2), "ranked": ranked}
        for r in ranked[:6]:
            label = r.get("name") or f"{r['lat']:.2f}, {r['lon']:.2f}"
            s = {k: (None if v is None else round(v, 2)) for k, v in r["scores"].items()}
            print(f"  {r['total']:.3f}  {label[:38]:38s} rock={r['rock']}  {s}")
    (OUT / "earth_rankings.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT / 'earth_rankings.json'}")


if __name__ == "__main__":
    main()

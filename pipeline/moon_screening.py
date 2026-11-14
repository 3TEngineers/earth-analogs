"""B2 (Moon): screen the lunar south pole for permanent base sites.

Criteria (docs/LANDING_CONSTRAINTS.md §4): only sunlit time has published values
(best spots ~85-95 %); Earth visibility, slope and distance to permanent shadow
have no published limits, so those thresholds are ours and labelled as such.

All layers are resampled onto one polar stereographic grid (240 m pixels,
poleward of ~82 deg S, which covers every Artemis III candidate region) and only
the needed blocks are read, so memory stays small.

Run from the repo root:
    pipeline/.venv/Scripts/python pipeline/moon_screening.py
"""

import json
from pathlib import Path

import numpy as np
import rasterio
import requests
from affine import Affine
from pyproj import CRS, Transformer
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "interim"

PGDA = "https://pgda.gsfc.nasa.gov/data/MoonIllumination"
LOLA_POLAR = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img"
SOURCES = {
    "sunlit": f"{PGDA}/AVGVISIB_75S_120M_201608.TIF",  # fraction of time lit, 0-1
    "earth": f"{PGDA}/AVGVISIB_75S_120M_201608_EARTH.TIF",  # fraction of time Earth in view, 0-1
    "psr": f"{PGDA}/LPSR_75S_120M_201608.TIF",  # 1 = permanently shadowed
    "slope": f"{LOLA_POLAR}/ldsm_75s_240m.lbl",  # slope, degrees
}

MOON_RADIUS_M = 1737400.0
PIXEL_M = 240.0
# The whole 75 S product (~75 deg S at the edges). 250 km + 854 x 240 m, so pixel boundaries match the
# first 250 km run exactly — the best-lit ridges are within a few % of each other and a shifted grid
# reorders them.
HALF_EXTENT_M = 250_000.0 + 854 * 240.0

# Thresholds: sunlit is anchored to published values; the rest are ours
# ours: the best published spots are lit ~85-95 % of the time, but that is 2-10 m above ground on a
# 20 m terrain model. PGDA is at the surface and we average it to 240 m, so its peak is ~72 % and
# 50 % already means the top ~1 % of the south-pole grid.
MIN_SUNLIT = 0.50
MIN_EARTH = 0.50  # ours: Earth in view at least half the time
MAX_SLOPE_DEG = 10.0  # ours: no published lunar lander limit found
MAX_PSR_KM = 10.0  # ours: ice within a short traverse
# 2 x 2 pixels (~480 m) must pass: room for a landing pad and a base. Well-lit ground is on narrow
# ridges, so 3 x 3 (~720 m) left almost nothing.
PAD_PX = 2
MIN_KM_BETWEEN_CANDIDATES = 30.0
FAR_FROM_ARTEMIS_KM = 40.0  # ours: "outside NASA's regions" = > 40 km from every named feature
FAR_MIN_KM_APART = 30.0
# Only search the polar lighting regime. Flat ground is lit ~20 % of the time at 86-90 S but ~40 % at
# 78-82 S (an ordinary day/night cycle with ~2-week nights), so 50 % is exceptional only near the pole.
POLAR_LAT = -84.0

ARTEMIS = [  # docs/LANDING_CONSTRAINTS.md §3 — feature centres, not exact regions
    ("Peak near Cabeus B", -82.259, -54.585),  # USGS Gazetteer 8058 (audit: KNOWN list had -82.40, -53.00)
    ("Haworth", -87.45, -5.17),  # USGS Gazetteer 14502 (audit: Wikipedia value -86.9, -4.0 was 17 km off)
    ("Malapert Massif", -85.98, -1.67),
    ("Mons Mouton (and Plateau)", -84.60, 31.00),
    ("Nobile Rim 1 and 2", -85.28, 53.27),
    ("de Gerlache Rim 2", -88.48, -88.34),
    ("Slater Plain", -88.08, 111.29),
]
ARTEMIS_RADIUS_KM = 25.0  # regions sit near, not on, the named feature


def local(url: str) -> Path:
    target = RAW / "moon" / url.rsplit("/", 1)[-1]
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        with requests.get(url, stream=True, timeout=900) as response:
            response.raise_for_status()
            with open(target, "wb") as out:
                for chunk in response.iter_content(1 << 20):
                    out.write(chunk)
    return target


def target_grid(crs) -> tuple[Affine, int]:
    size = int(2 * HALF_EXTENT_M / PIXEL_M)
    return Affine(PIXEL_M, 0, -HALF_EXTENT_M, 0, -PIXEL_M, HALF_EXTENT_M), size


def read_layer(path: Path, crs, transform: Affine, size: int, resampling: Resampling) -> np.ndarray:
    with rasterio.open(path) as src:
        scale, offset = src.scales[0] or 1.0, src.offsets[0] or 0.0  # all layers are scaled int16
        with WarpedVRT(src, crs=crs, transform=transform, width=size, height=size, resampling=resampling) as vrt:
            data = vrt.read(1, masked=True).astype("float32") * scale + offset
            return data.filled(np.nan)


def load_layers():
    if not (RAW / "moon" / "ldsm_75s_240m.img").exists():
        local(SOURCES["slope"].replace(".lbl", ".img"))
    paths = {name: local(url) for name, url in SOURCES.items()}
    with rasterio.open(paths["sunlit"]) as ref:
        crs = ref.crs
    transform, size = target_grid(crs)
    layers = {
        "sunlit": read_layer(paths["sunlit"], crs, transform, size, Resampling.average),
        "earth": read_layer(paths["earth"], crs, transform, size, Resampling.average),
        "psr": read_layer(paths["psr"], crs, transform, size, Resampling.max),
        "slope": read_layer(paths["slope"], crs, transform, size, Resampling.average),
    }
    return crs, transform, size, layers


def lonlat_grid(crs, transform: Affine, size: int):
    cols, rows = np.meshgrid(np.arange(size) + 0.5, np.arange(size) + 0.5)
    x, y = transform * (cols, rows)
    geographic = CRS.from_wkt(crs.to_wkt()).geodetic_crs
    lon, lat = Transformer.from_crs(CRS.from_wkt(crs.to_wkt()), geographic, always_xy=True).transform(x, y)
    return lon, lat


def to_pixel(crs, transform: Affine, lat: float, lon: float) -> tuple[int, int]:
    geographic = CRS.from_wkt(crs.to_wkt()).geodetic_crs
    x, y = Transformer.from_crs(geographic, CRS.from_wkt(crs.to_wkt()), always_xy=True).transform(lon, lat)
    col, row = ~transform * (x, y)
    return int(row), int(col)


def great_circle_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * MOON_RADIUS_M / 1000 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def criteria(values: dict) -> list[dict]:
    """Criteria in the data-contract shape (docs/DATA_CONTRACT.md)."""
    return [
        {"id": "illumination", "label": "Sunlit time", "value": round(100 * values["sunlit"], 1), "unit": "%",
         "rule": f">= {100 * MIN_SUNLIT:.0f} % at the surface (ours; published 85-95 % is 2-10 m above ground)",
         "pass": values["sunlit"] >= MIN_SUNLIT, "source": "LOLA average illumination (NASA PGDA)"},
        {"id": "earth_visibility", "label": "Earth in view", "value": round(100 * values["earth"], 1), "unit": "%",
         "rule": f">= {100 * MIN_EARTH:.0f} % (ours)", "pass": values["earth"] >= MIN_EARTH,
         "source": "LOLA Earth visibility (NASA PGDA)"},
        {"id": "slope", "label": "Slope", "value": round(values["slope"], 1), "unit": "deg",
         "rule": f"<= {MAX_SLOPE_DEG:.0f} deg (ours)", "pass": values["slope"] <= MAX_SLOPE_DEG,
         "source": "LOLA slope map, 240 m"},
        {"id": "ice_distance", "label": "Distance to permanent shadow", "value": round(values["psr_km"], 1),
         "unit": "km", "rule": f"<= {MAX_PSR_KM:.0f} km (ours)", "pass": values["psr_km"] <= MAX_PSR_KM,
         "source": "LOLA permanently shadowed regions (NASA PGDA)"},
    ]


def check_point_65s(lat: float, lon: float) -> dict:
    """Criteria at a single site outside the 75S grid (e.g. Chandrayaan-3 at 69 S).

    Uses the PGDA 65S 240 m products and the slope from the global LOLA DEM around the point.
    """
    paths = {name: local(f"{PGDA}/{file}") for name, file in [
        ("sunlit", "AVGVISIB_65S_240M_201608.TIF"), ("earth", "AVGVISIB_65S_240M_201608_EARTH.TIF"),
        ("psr", "LPSR_65S_240M_201608.TIF")]}
    values = {}
    for name, path in paths.items():
        with rasterio.open(path) as src:
            row, col = to_pixel(src.crs, src.transform, lat, lon)
            scale, offset = src.scales[0] or 1.0, src.offsets[0] or 0.0
            half = 60 if name == "psr" else 1  # psr: ~29 km window to find the nearest shadow
            from rasterio.windows import Window
            data = src.read(1, window=Window(col - half, row - half, 2 * half + 1, 2 * half + 1), masked=True)
            data = data.astype("float32") * scale + offset
            if name == "psr":
                shadow = np.argwhere(data.filled(0) > 0.5)
                values["psr_km"] = (float(np.min(np.hypot(*(shadow - half).T)) * abs(src.transform.a) / 1000)
                                    if len(shadow) else float("inf"))
            else:
                values[name] = float(np.ma.median(data))
    with rasterio.open("https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif") as dem:
        from rasterio.windows import Window
        geographic = CRS.from_wkt(dem.crs.to_wkt()).geodetic_crs
        x, y = Transformer.from_crs(geographic, CRS.from_wkt(dem.crs.to_wkt()), always_xy=True).transform(lon, lat)
        row, col = dem.index(x, y)
        z = dem.read(1, window=Window(col - 2, row - 2, 5, 5)).astype("float64") * (dem.scales[0] or 1.0)
        dy = abs(dem.transform.e)
        dx = abs(dem.transform.a) * np.cos(np.radians(lat))  # equirectangular: x pixels shrink with latitude
        gy, gx = np.gradient(z, dy, dx)
        values["slope"] = float(np.median(np.degrees(np.arctan(np.hypot(gx, gy)))))
    return values


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    crs, transform, size, layers = load_layers()
    values, counts = np.unique(np.round(layers["psr"][np.isfinite(layers["psr"])], 3), return_counts=True)
    print("PSR layer values (top 5):", sorted(zip(counts, values), reverse=True)[:5])
    psr = np.nan_to_num(layers["psr"]) > 0.5
    psr_km = ndimage.distance_transform_edt(~psr) * PIXEL_M / 1000.0

    sunlit, earth, slope = layers["sunlit"], layers["earth"], layers["slope"]
    finite = np.isfinite(sunlit) & np.isfinite(earth) & np.isfinite(slope)
    print("Sunlit-time percentiles in the grid (50/90/99/max):",
          np.round(np.nanpercentile(sunlit, [50, 90, 99, 100]), 3))
    ok = finite & (sunlit >= MIN_SUNLIT) & (earth >= MIN_EARTH) & (slope <= MAX_SLOPE_DEG) & (psr_km <= MAX_PSR_KM)
    safe = ndimage.binary_erosion(ok, structure=np.ones((PAD_PX, PAD_PX), bool))
    print(f"Passing area: {safe.sum() * (PIXEL_M / 1000) ** 2:.1f} km2 in {size}x{size} px grid")

    lon, lat = lonlat_grid(crs, transform, size)

    def values_at(row: int, col: int) -> dict:
        window = np.s_[row - 1 : row + 2, col - 1 : col + 2]
        return {"sunlit": float(np.nanmedian(sunlit[window])), "earth": float(np.nanmedian(earth[window])),
                "slope": float(np.nanmedian(slope[window])), "psr_km": float(np.nanmin(psr_km[window]))}

    # Two groups of candidates:
    #   best overall  — best-lit passing spots (these land next to NASA's regions: a cross-check)
    #   away from NASA — best-lit passing spots > 75 km from every Artemis feature (a new proposal)
    km_to_artemis = np.min([great_circle_km(lat, lon, a[1], a[2]) for a in ARTEMIS], axis=0)
    groups = [("best overall", np.where(safe, sunlit + 0.25 * earth, -np.inf), MIN_KM_BETWEEN_CANDIDATES),
              # ranked on the 3 x 3 mean so a single lucky pixel can't win
              ("away from NASA", np.where(safe & (km_to_artemis > FAR_FROM_ARTEMIS_KM) & (lat <= POLAR_LAT),
                                          ndimage.uniform_filter(np.nan_to_num(sunlit), size=3), -np.inf),
               FAR_MIN_KM_APART)]
    candidates = []
    for group, score, min_apart in groups:
        picked = 0
        for flat in np.argsort(score, axis=None)[::-1]:
            if not np.isfinite(score.flat[flat]):
                break
            row, col = np.unravel_index(flat, score.shape)
            la, lo = float(lat[row, col]), float(lon[row, col])
            if any(great_circle_km(la, lo, c["lat"], c["lon"]) < min_apart for c in candidates):
                continue
            crit = criteria(values_at(row, col))
            if not all(c["pass"] for c in crit):
                continue  # quality gate: the ~720 m neighbourhood must pass too, not just one pixel
            if group == "away from NASA":
                # quality gate: at least as well lit as our weakest best-overall candidate
                weakest = min(c["criteria"][0]["value"] for c in candidates if c["group"] == "best overall")
                if crit[0]["value"] < weakest:
                    break  # sorted by light: nothing further down qualifies either
            nearest = min(ARTEMIS, key=lambda a: great_circle_km(la, lo, a[1], a[2]))
            candidates.append({"lat": round(la, 3), "lon": round(lo, 3), "group": group,
                               "criteria": crit, "nearest_artemis": nearest[0],
                               "km_to_artemis_feature": round(float(great_circle_km(la, lo, nearest[1], nearest[2])), 1)})
            print(f"Candidate ({group}): {la:.3f}, {lo:.3f} — nearest Artemis region: {nearest[0]} "
                  f"({candidates[-1]['km_to_artemis_feature']} km), "
                  + ", ".join(f"{c['id']}={c['value']}" for c in candidates[-1]["criteria"]))
            picked += 1
            if picked == 2:
                break

    # Validation: does each Artemis region contain ground that passes our criteria?
    print("\nValidation — Artemis III regions (passing ground within 25 km of the named feature):")
    validation = []
    for name, la, lo in ARTEMIS:
        near = great_circle_km(lat, lon, la, lo) <= ARTEMIS_RADIUS_KM
        passing_km2 = float((safe & near).sum() * (PIXEL_M / 1000) ** 2)
        best = float(np.nanmax(np.where(near, sunlit, np.nan)))
        validation.append({"region": name, "lat": la, "lon": lo, "passing_km2": round(passing_km2, 2),
                           "best_sunlit_pct": round(100 * best, 1)})
        print(f"  {'yes' if passing_km2 > 0 else 'no '} {name:28s} passing {passing_km2:6.2f} km2, "
              f"best sunlit {100 * best:4.1f} %")

    ch3 = check_point_65s(-69.373, 32.319)
    ch3_criteria = criteria(ch3)
    print("\nChandrayaan-3 (past landing, 69 S):",
          ", ".join(f"{c['id']}={c['value']}{'' if c['pass'] else ' FAIL'}" for c in ch3_criteria))

    np.savez_compressed(OUT / "moon_safe.npz", safe=safe, lat=lat.astype("float32"), lon=lon.astype("float32"))
    (OUT / "moon_screening.json").write_text(json.dumps(
        {"thresholds": {"min_sunlit": MIN_SUNLIT, "min_earth": MIN_EARTH, "max_slope_deg": MAX_SLOPE_DEG,
                        "max_psr_km": MAX_PSR_KM, "pixel_m": PIXEL_M, "pad_px": PAD_PX},
         "candidates": candidates, "validation": validation,
         "chandrayaan3": {"lat": -69.373, "lon": 32.319, "criteria": ch3_criteria}}, indent=2, default=bool))
    print(f"\nWrote {OUT / 'moon_screening.json'}")


if __name__ == "__main__":
    main()

"""B2 (Mars): screen the whole planet for safe landing zones.

Criteria follow published mission constraints (docs/LANDING_CONSTRAINTS.md):
  - atmosphere: MOLA elevation <= -1 km (MSL), shown as estimated surface pressure
  - sunlight:   |latitude| <= 30 deg (MSL, Mars 2020), shown as winter noon Sun elevation
  - dust:       TES thermal inertia >= 100 J m-2 K-1 s-1/2 (Mars 2020)
  - roughness:  km-scale slope and relief from MOLA — our simplification, because
                MOLA can't see the metre-scale slopes missions actually used; the
                limits are calibrated on the past landings (see validate()).
A site must pass every criterion over a whole landing-ellipse-sized area.

Run from the repo root:
    pipeline/.venv/Scripts/python pipeline/mars_screening.py
"""

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.enums import Resampling
from rasterio.warp import reproject
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "interim"

MOLA_URL = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016"
MOLA_NAME = "megt90n000eb"  # topography, 16 px/deg (~3.7 km), int16 metres above the areoid
TES_LABEL = RAW / "global_ti_60n_50s_8ppd.lbl"  # downloaded by check_access.py

MARS_RADIUS_KM = 3389.5
OBLIQUITY_DEG = 25.19

# Thresholds (published unless marked as ours)
MAX_ELEVATION_M = -1000.0  # MSL
MAX_ABS_LAT_DEG = 30.0  # MSL, Mars 2020
MIN_THERMAL_INERTIA = 100.0  # Mars 2020
ELLIPSE_KM = 25.0  # Mars 2020 initial ellipse 25 x 20 km, rounded up to a square
MAX_SLOPE_DEG = 2.0  # ours, at ~4 km scale: rover-style landings except Curiosity sit below 0.6 deg
MAX_RELIEF_M = 500.0  # ours, over ~18 km: same landings sit below 260 m. Curiosity fails both at this
# scale because its ellipse squeezed between Gale's wall and Mount Sharp (precision-guided entry)
MIN_KM_FROM_PAST_LANDING = 500.0  # ours: candidates must be new places, not next door to a lander
MIN_KM_BETWEEN_CANDIDATES = 1500.0  # ours: clearly different regions, not four spots on one plain
MIN_SAFE_AREA_KM2 = 40_000.0  # ours: only large safe areas qualify
MIN_INTERIOR_KM = 40.0  # ours: the pick sits >= 40 km inside the safe area, so a 25 km ellipse fits easily
CANDIDATE_COUNT = 4
MOLA_463_URL = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"

LANDINGS = [  # docs/LANDING_CONSTRAINTS.md §2; "rover" = within the ±30° rover-style rules
    ("Mars 3", -45.04, -157.98, False),
    ("Viking 1", 22.269, -47.951, True),
    ("Viking 2", 47.668, 134.280, False),
    ("Mars Pathfinder", 19.095, -33.253, True),
    ("Spirit", -14.5719, 175.4785, True),
    ("Opportunity", -1.9483, -5.5258, True),
    ("Phoenix", 68.22, -125.75, False),
    ("Curiosity", -4.59, 137.44, True),
    ("InSight", 4.5024, 135.6234, True),
    ("Perseverance", 18.44, 77.45, True),
    ("Zhurong", 25.102, 109.914, True),
]


def surface_pressure_pa(elevation_m: np.ndarray) -> np.ndarray:
    """Rough mean surface pressure: ~610 Pa at the MOLA datum, ~11.1 km scale height."""
    return 610.0 * np.exp(-elevation_m / 11100.0)


def winter_noon_sun_deg(lat_deg: np.ndarray) -> np.ndarray:
    """Noon Sun elevation on the local winter solstice — the worst day for solar power."""
    return 90.0 - np.abs(lat_deg) - OBLIQUITY_DEG


def download(name: str, url: str) -> Path:
    target = RAW / "mola" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        response = requests.get(url, timeout=600)
        response.raise_for_status()
        target.write_bytes(response.content)
    return target


@dataclass
class Grids:
    lat: np.ndarray  # degrees, per row
    lon: np.ndarray  # degrees east, -180..180, per column
    elevation: np.ndarray
    thermal_inertia: np.ndarray
    slope: np.ndarray  # degrees over one pixel (~3.7 km)
    relief: np.ndarray  # metres, max - min over a ~18 km window


def load_grids() -> Grids:
    download(f"{MOLA_NAME}.img", f"{MOLA_URL}/{MOLA_NAME}.img")
    label = download(f"{MOLA_NAME}.lbl", f"{MOLA_URL}/{MOLA_NAME}.lbl")

    with rasterio.open(label) as mola:
        elevation = mola.read(1).astype("float32")
        height, width = elevation.shape
        # The label says column 0 is 0 deg E (centre 180 deg), but GDAL's transform starts at
        # -180 deg. Roll the data half a turn so it matches the transform (checked against
        # Jezero -2561 m and Gale -4485 m).
        elevation = np.roll(elevation, width // 2, axis=1)
        # Simple cylindrical in metres (3705 m = 1/16 deg); convert pixel centres to degrees
        metres_per_deg = abs(mola.transform.a) * height / 180.0
        lat = np.array([mola.xy(r, 0)[1] for r in range(height)]) / metres_per_deg
        lon = np.array([mola.xy(0, c)[0] for c in range(width)]) / metres_per_deg
        thermal_inertia = np.full_like(elevation, np.nan)
        with rasterio.open(TES_LABEL) as tes:
            reproject(
                source=rasterio.band(tes, 1),
                destination=thermal_inertia,
                src_transform=tes.transform,
                src_crs=tes.crs,
                dst_transform=mola.transform,
                dst_crs=mola.crs,
                src_nodata=tes.nodata,
                dst_nodata=np.nan,
                resampling=Resampling.nearest,
            )
    lon = ((lon + 180.0) % 360.0) - 180.0
    thermal_inertia[thermal_inertia <= 0] = np.nan

    pixel_deg = 180.0 / height
    dy = np.radians(pixel_deg) * MARS_RADIUS_KM * 1000.0
    dx = dy * np.cos(np.radians(lat))[:, None]
    grad_y, grad_x = np.gradient(elevation)
    slope = np.degrees(np.arctan(np.hypot(grad_x / dx, grad_y / dy)))
    relief = ndimage.maximum_filter(elevation, size=5, mode="wrap") - ndimage.minimum_filter(elevation, size=5, mode="wrap")
    return Grids(lat, lon, elevation, thermal_inertia, slope.astype("float32"), relief.astype("float32"))


def pixel_of(grids: Grids, lat: float, lon: float) -> tuple[int, int]:
    row = int(np.argmin(np.abs(grids.lat - lat)))
    col = int(np.argmin(np.abs(((grids.lon - lon + 180) % 360) - 180)))
    return row, col


def site_values(grids: Grids, lat: float, lon: float) -> dict:
    """Criteria values at a site, as the median over a ~11 km window (landing-ellipse scale)."""
    row, col = pixel_of(grids, lat, lon)
    window = np.s_[max(row - 1, 0) : row + 2, col - 1 : col + 2]
    return {
        "elevation_m": float(np.nanmedian(grids.elevation[window])),
        "pressure_pa": float(np.nanmedian(surface_pressure_pa(grids.elevation[window]))),
        "winter_sun_deg": float(winter_noon_sun_deg(np.array(lat))),
        "thermal_inertia": float(np.nanmedian(grids.thermal_inertia[window])),
        "slope_deg": float(np.nanmedian(grids.slope[window])),
        "relief_m": float(np.nanmedian(grids.relief[window])),
    }


def great_circle_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * MARS_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def calibrate_roughness(grids: Grids) -> tuple[float, float]:
    """Print the km-scale roughness of the rover-style landings next to our limits.

    Scaling the limit from the roughest landing (Curiosity, next to Mount Sharp) made the
    criterion meaningless, so the limits are fixed constants with ~3x margin over the rest.
    """
    for name, lat, lon, rover in LANDINGS:
        if rover:
            v = site_values(grids, lat, lon)
            print(f"  roughness at {name:16s} slope {v['slope_deg']:5.2f} deg, relief {v['relief_m']:5.0f} m")
    return MAX_SLOPE_DEG, MAX_RELIEF_M


def criteria(values: dict, max_slope: float, max_relief: float) -> list[dict]:
    """Criteria in the data-contract shape (docs/DATA_CONTRACT.md)."""
    min_pressure = float(surface_pressure_pa(np.array(MAX_ELEVATION_M)))
    min_sun = float(winter_noon_sun_deg(np.array(MAX_ABS_LAT_DEG)))
    ti = values["thermal_inertia"]
    return [
        {"id": "pressure", "label": "Air to slow down (est. surface pressure)", "value": round(values["pressure_pa"]),
         "unit": "Pa", "rule": f">= {min_pressure:.0f} Pa (elevation <= -1 km, MSL)",
         "pass": values["elevation_m"] <= MAX_ELEVATION_M, "source": "MOLA MEGDR 16 px/deg"},
        {"id": "winter_sun", "label": "Winter noon Sun elevation", "value": round(values["winter_sun_deg"], 1),
         "unit": "deg", "rule": f">= {min_sun:.1f} deg (|lat| <= 30 deg, MSL / Mars 2020)",
         "pass": values["winter_sun_deg"] >= min_sun, "source": "Latitude, obliquity 25.19 deg"},
        {"id": "thermal_inertia", "label": "Thermal inertia (not dust-covered)",
         "value": None if np.isnan(ti) else round(ti),
         "unit": "J m-2 K-1 s-1/2", "rule": ">= 100 (Mars 2020)",
         "pass": None if np.isnan(ti) else ti >= MIN_THERMAL_INERTIA, "source": "MGS TES thermal inertia"},
        {"id": "slope", "label": "Slope at ~4 km scale", "value": round(values["slope_deg"], 2),
         "unit": "deg", "rule": f"<= {max_slope} deg (ours, ~3x the past landings except Curiosity)",
         "pass": values["slope_deg"] <= max_slope, "source": "MOLA MEGDR 16 px/deg"},
        {"id": "relief", "label": "Relief over ~18 km", "value": round(values["relief_m"]),
         "unit": "m", "rule": f"<= {max_relief:.0f} m (ours, ~2x the past landings except Curiosity)",
         "pass": values["relief_m"] <= max_relief, "source": "MOLA MEGDR 16 px/deg"},
    ]


def screen(grids: Grids, max_slope: float, max_relief: float) -> np.ndarray:
    lat2d = np.broadcast_to(grids.lat[:, None], grids.elevation.shape)
    ok = (
        (grids.elevation <= MAX_ELEVATION_M)
        & (np.abs(lat2d) <= MAX_ABS_LAT_DEG)
        & (np.nan_to_num(grids.thermal_inertia, nan=0) >= MIN_THERMAL_INERTIA)
        & (grids.slope <= max_slope)
        & (grids.relief <= max_relief)
    )
    pixel_km = np.radians(180.0 / grids.elevation.shape[0]) * MARS_RADIUS_KM
    size = int(np.ceil(ELLIPSE_KM / pixel_km)) | 1  # odd window that covers the ellipse
    return ndimage.binary_erosion(ok, structure=np.ones((size, size), bool))


def pick_candidates(grids: Grids, safe: np.ndarray, count: int = CANDIDATE_COUNT) -> list[dict]:
    """Most interior point of the largest safe areas, away from past landings and each other.

    Quality gates: the safe area must be >= MIN_SAFE_AREA_KM2 and the pick >= MIN_INTERIOR_KM from
    its edge; if fewer than `count` areas qualify, fewer candidates are returned.
    """
    labels, n = ndimage.label(safe)
    if n == 0:
        return []
    depth = ndimage.distance_transform_edt(safe)
    index = np.arange(1, n + 1)
    pixel_km = np.radians(180.0 / safe.shape[0]) * MARS_RADIUS_KM
    sizes = ndimage.sum(safe, labels, index=index)
    centres = ndimage.maximum_position(depth, labels, index=index)  # most interior pixel per area
    picks: list[dict] = []
    for i in np.argsort(sizes)[::-1]:
        row, col = centres[i]
        lat, lon = float(grids.lat[row]), float(grids.lon[col])
        area_km2 = float(sizes[i]) * pixel_km**2 * np.cos(np.radians(lat))
        interior_km = float(depth[row, col]) * pixel_km
        if area_km2 < MIN_SAFE_AREA_KM2:
            break  # sorted by size: nothing smaller qualifies
        if interior_km < MIN_INTERIOR_KM:
            continue
        if any(great_circle_km(lat, lon, la, lo) < MIN_KM_FROM_PAST_LANDING for _, la, lo, _ in LANDINGS):
            continue
        if any(great_circle_km(lat, lon, p["lat"], p["lon"]) < MIN_KM_BETWEEN_CANDIDATES for p in picks):
            continue
        picks.append({"lat": round(lat, 3), "lon": round(lon, 3), "safe_area_km2": round(area_km2, -3),
                      "interior_km": round(interior_km)})
        if len(picks) == count:
            break
    return picks


def fine_check(sites: list[tuple[str, float, float]]) -> dict[str, dict]:
    """Second look at 463 m: slope percentiles and relief over a ~25 km window around each site."""
    import rasterio
    from pyproj import CRS, Transformer
    from rasterio.windows import Window

    out = {}
    with rasterio.open(MOLA_463_URL) as dem:
        crs = CRS.from_wkt(dem.crs.to_wkt())
        to_xy = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
        pixel = abs(dem.transform.a)
        for name, lat, lon in sites:
            row, col = dem.index(*to_xy.transform(lon, lat))
            z = dem.read(1, window=Window(col - 27, row - 27, 54, 54)).astype("float64")
            gy, gx = np.gradient(z, pixel, pixel * np.cos(np.radians(lat)))
            slope = np.degrees(np.arctan(np.hypot(gx, gy)))
            out[name] = {"slope_p50_deg": round(float(np.percentile(slope, 50)), 2),
                         "slope_p95_deg": round(float(np.percentile(slope, 95)), 2),
                         "relief_m": round(float(z.max() - z.min()))}
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    grids = load_grids()
    max_slope, max_relief = calibrate_roughness(grids)
    print(f"Roughness limits (ours): slope <= {max_slope} deg, relief <= {max_relief:.0f} m")

    print("\nValidation — the 11 past landings:")
    validation = []
    for name, lat, lon, rover in LANDINGS:
        values = site_values(grids, lat, lon)
        crit = criteria(values, max_slope, max_relief)
        failed = [c["id"] for c in crit if c["pass"] is False]
        validation.append({"name": name, "lat": lat, "lon": lon, "rover_rules": rover, "criteria": crit})
        print(f"  {'PASS' if not failed else 'fail'} {name:16s} p={values['pressure_pa']:4.0f} Pa  "
              f"sun={values['winter_sun_deg']:5.1f}  TI={values['thermal_inertia']:5.0f}  "
              f"slope={values['slope_deg']:.2f}  relief={values['relief_m']:4.0f}  "
              f"{'' if not failed else 'failed: ' + ', '.join(failed)}")

    safe = screen(grids, max_slope, max_relief)
    pixel_area = (np.radians(180.0 / safe.shape[0]) * MARS_RADIUS_KM) ** 2 * np.cos(np.radians(grids.lat))[:, None]
    print(f"\nSafe area: {float((safe * pixel_area).sum()) / 1e6:.2f} million km2 "
          f"({100 * float((safe * pixel_area).sum()) / (4 * np.pi * MARS_RADIUS_KM ** 2):.1f} % of Mars)")

    candidates = []
    for pick in pick_candidates(grids, safe):
        pick["criteria"] = criteria(site_values(grids, pick["lat"], pick["lon"]), max_slope, max_relief)
        candidates.append(pick)
        print(f"Candidate: {pick['lat']:.2f}, {pick['lon']:.2f} (safe area {pick['safe_area_km2']:.0f} km2, "
              f"{pick['interior_km']} km inside) — all pass: {all(c['pass'] for c in pick['criteria'])}")

    # Second look at 463 m for the candidates and the successful landings, to compare like with like
    reference = [(v["name"], v["lat"], v["lon"]) for v in validation
                 if v["name"] in ("Viking 1", "Spirit", "InSight", "Perseverance")]
    fine = fine_check([(f"candidate {i}", c["lat"], c["lon"]) for i, c in enumerate(candidates)] + reference)
    for i, c in enumerate(candidates):
        c["fine_463m"] = fine[f"candidate {i}"]
    print("\n463 m check (slope p50 / p95, relief over ~25 km):")
    for name, v in fine.items():
        print(f"  {name:14s} {v['slope_p50_deg']:5.2f} / {v['slope_p95_deg']:5.2f} deg, {v['relief_m']:5d} m")

    np.savez_compressed(OUT / "mars_safe.npz", safe=safe, lat=grids.lat, lon=grids.lon)
    (OUT / "mars_screening.json").write_text(json.dumps(
        {"thresholds": {"max_elevation_m": MAX_ELEVATION_M, "max_abs_lat_deg": MAX_ABS_LAT_DEG,
                        "min_thermal_inertia": MIN_THERMAL_INERTIA, "max_slope_deg": max_slope,
                        "max_relief_m": max_relief, "ellipse_km": ELLIPSE_KM,
                        "min_safe_area_km2": MIN_SAFE_AREA_KM2, "min_interior_km": MIN_INTERIOR_KM,
                        "min_km_between_candidates": MIN_KM_BETWEEN_CANDIDATES},
         "validation": validation, "candidates": candidates, "reference_463m": {k: fine[k] for k, *_ in reference}},
        indent=2, default=bool))
    print(f"\nWrote {OUT / 'mars_screening.json'} and mars_safe.npz")


if __name__ == "__main__":
    main()

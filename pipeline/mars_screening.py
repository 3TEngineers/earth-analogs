"""B2 (Mars): screen the whole planet for safe landing zones.

Criteria follow published mission constraints (docs/LANDING_CONSTRAINTS.md):
  - atmosphere: MOLA elevation <= -1 km (MSL), shown as estimated surface pressure
  - sunlight:   |latitude| <= 30 deg (MSL, Mars 2020), shown as winter noon Sun elevation
  - dust:       TES thermal inertia >= 100 J m-2 K-1 s-1/2 (MSL, Mars 2020), and where it is below
                150 the TES albedo must be <= 0.25 (MSL: thick dust is low inertia with albedo > 0.25;
                Mars 2020: below ~150 with high albedo is "possibly dusty")
  - slope:      <= 3 deg between MOLA pixels 3.7 km apart (MSL engineering guide: "three degrees or
                less over a 2 to 5 km length scale"). Missions also set limits at 200-500 m, 20-40 m
                and 5 m, which a global map can't see.
  - relief:     <= 500 m over ~18 km — ours: no crater wall or mountain inside the landing area.
A site must pass every criterion over a whole landing-ellipse-sized area.

Run from the repo root:
    pipeline/.venv/Scripts/python pipeline/mars_screening.py
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
import requests
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "interim"

MOLA_URL = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016"
MOLA_NAME = "megt90n000eb"  # topography, 16 px/deg (~3.7 km), int16 metres above the areoid
TES_URL = "https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-special-v1"
TES_TI = "global_ti_60n_50s_8ppd"  # thermal inertia, 8 px/deg, 60 N..50 S
TES_ALBEDO = "global_albedo_8ppd"  # bolometric albedo, 8 px/deg, global

MARS_RADIUS_KM = 3389.5
OBLIQUITY_DEG = 25.19

# Thresholds (published unless marked as ours)
MAX_ELEVATION_M = -1000.0  # MSL
MAX_ABS_LAT_DEG = 30.0  # MSL, Mars 2020
MIN_THERMAL_INERTIA = 100.0  # MSL engineering guide, Mars 2020
DUSTY_BELOW_INERTIA = 150.0  # Mars 2020: below ~150 a high albedo means "possibly dusty"
MAX_ALBEDO_IF_LOW_INERTIA = 0.25  # MSL engineering guide: the dust mode has albedo > 0.25
ELLIPSE_KM = 25.0  # Mars 2020 initial ellipse 25 x 20 km, rounded up to a square
MAX_SLOPE_DEG = 3.0  # MSL engineering guide: "three degrees or less over a 2 to 5 km length scale"
MAX_RELIEF_M = 500.0  # ours, over ~18 km: no crater wall or mountain inside the landing area
MIN_KM_FROM_PAST_LANDING = 500.0  # ours: candidates must be new places, not next door to a lander
MIN_KM_BETWEEN_CANDIDATES = 1500.0  # ours: clearly different regions, not four spots on one plain
MIN_SAFE_AREA_KM2 = 40_000.0  # ours: only large safe areas qualify
MIN_INTERIOR_KM = 40.0  # ours: the pick sits >= 40 km inside the safe area, so a 25 km ellipse fits easily
MAX_CANDIDATES = 8  # a ceiling only: the rules above decide how many there are
MOLA_463_URL = "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"

LANDINGS = [  # docs/LANDING_CONSTRAINTS.md §2; "rover" = within the ±30° rover-style rules
    ("Mars 3", -45.04, -157.98, False),
    ("Viking 1", 22.269, -47.951, True),
    ("Viking 2", 47.668, 134.280, False),
    ("Mars Pathfinder", 19.095, -33.253, True),
    ("Spirit", -14.5719, 175.4785, True),
    ("Opportunity", -1.9483, -5.5258, True),
    ("Phoenix", 68.22, -125.75, False),
    ("Curiosity", -4.5895, 137.4417, True),
    ("InSight", 4.5024, 135.6234, True),
    ("Perseverance", 18.4447, 77.4508, True),
    ("Zhurong", 25.066, 109.925, True),  # CNSA / Liu et al. 2022 (audit: was 25.102, 109.914, ~2 km off)
]
# A site an agency has selected but not yet flown to: a further check on the rules
OTHER_SITES = [
    # ESA: 18.275 N, 335.368 E
    ("Oxia Planum", 18.275, -24.632, "ESA's selected site for the Rosalind Franklin (ExoMars) rover"),
]
# Landers that reached the surface without a working mission. Not used for validation, but a candidate
# next to one would not be a new place (audit, 15 Nov). Positions are good to a few km.
OTHER_TOUCHDOWNS = [
    ("Beagle 2", 11.52, 90.44),  # ESA/UK 2003, found intact in Isidis Planitia; HiRISE image ESP_039308_1915
    ("Schiaparelli", -2.07, -6.21),  # ESA 2016, impact in Meridiani Planum: 353.79 E, 2.07 S (ESA)
]


# What each mission's own team required of its site (docs/LANDING_CONSTRAINTS.md §1): highest allowed
# elevation in km (MOLA) and the latitude band. Checked with our data in validate_own_rules(): a landing
# that fails OUR rules should still pass ITS OWN, because it flew a different mission.
MISSION_RULES = {
    "Mars Pathfinder": (0.0, 10.0, 20.0, "Golombek et al. 1997"),
    "Spirit": (-1.3, -15.0, 5.0, "Golombek et al. 2003 (MER-A)"),
    "Opportunity": (-1.3, -5.0, 15.0, "Golombek et al. 2003 (MER-B)"),
    "Phoenix": (-3.5, 65.0, 72.0, "Arvidson et al. 2008"),
    "Curiosity": (-1.0, -30.0, 30.0, "Golombek et al. 2012 (MSL)"),
    "InSight": (-2.5, 3.0, 5.0, "Golombek et al. 2017"),
    "Perseverance": (-0.5, -30.0, 30.0, "Fergason et al. 2017 (Mars 2020)"),
}


def own_rules(name: str, lat: float, elevation_m: float) -> list[dict]:
    """The mission's own elevation and latitude limits, checked with our MOLA elevation."""
    if name not in MISSION_RULES:
        return []
    max_km, lat_min, lat_max, source = MISSION_RULES[name]
    band = f"{abs(lat_min):g} deg {'S' if lat_min < 0 else 'N'} to {abs(lat_max):g} deg {'S' if lat_max < 0 else 'N'}"
    return [
        {"id": "own_elevation", "label": "Elevation (the mission's own limit)", "value": round(elevation_m / 1000.0, 2),
         "unit": "km", "rule": f"below {max_km:+g} km".replace("+0 km", "0 km"), "pass": bool(elevation_m <= max_km * 1000.0),
         "source": f"{source}; our MOLA elevation"},
        {"id": "own_latitude", "label": "Latitude (the mission's own band)", "value": round(lat, 2),
         "unit": "deg", "rule": band, "pass": bool(lat_min <= lat <= lat_max), "source": source},
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
    albedo: np.ndarray
    slope: np.ndarray  # degrees between neighbouring pixels (3.7 km apart)
    relief: np.ndarray  # metres, max - min over a ~18 km window


def label_value(label: Path, key: str) -> float:
    """A numeric keyword from a PDS3 label, e.g. MAXIMUM_LATITUDE = 60.125 <DEGREE>."""
    match = re.search(rf"^\s*{key}\s*=\s*(-?[0-9.]+)", label.read_text(errors="replace"), re.MULTILINE)
    if not match:
        raise ValueError(f"{key} not found in {label.name}")
    return float(match.group(1))


def read_tes(name: str, lat: np.ndarray, lon_east: np.ndarray) -> np.ndarray:
    """A TES 8 px/deg map sampled at the MOLA pixel centres (each MOLA pixel lies inside one TES pixel)."""
    for ext in ("lbl", "img"):
        if not (RAW / f"{name}.{ext}").exists():
            response = requests.get(f"{TES_URL}/{name}.{ext}", timeout=600)
            response.raise_for_status()
            (RAW / f"{name}.{ext}").write_bytes(response.content)
    label = RAW / f"{name}.lbl"
    with rasterio.open(label) as tes:
        data = tes.read(1).astype("float32")
    ppd = label_value(label, "MAP_RESOLUTION")
    top, west = label_value(label, "MAXIMUM_LATITUDE"), label_value(label, "WESTERNMOST_LONGITUDE")
    assert data.shape == (round((top - label_value(label, "MINIMUM_LATITUDE")) * ppd), round(360 * ppd)), name
    rows = np.floor((top - lat) * ppd).astype(int)
    cols = np.floor(((lon_east - west) % 360.0) * ppd).astype(int)
    inside = (rows >= 0) & (rows < data.shape[0])
    out = np.full((lat.size, lon_east.size), np.nan, dtype="float32")
    out[inside] = data[rows[inside]][:, cols]
    return out


def load_grids() -> Grids:
    download(f"{MOLA_NAME}.img", f"{MOLA_URL}/{MOLA_NAME}.img")
    label = download(f"{MOLA_NAME}.lbl", f"{MOLA_URL}/{MOLA_NAME}.lbl")

    with rasterio.open(label) as mola:
        elevation = mola.read(1).astype("float32")
    height, width = elevation.shape
    ppd = label_value(label, "MAP_RESOLUTION")
    assert (height, width) == (round(180 * ppd), round(360 * ppd))
    # Pixel centres from the label: row r is 90 - (r + 0.5)/16 deg N, column c is (c + 0.5)/16 deg E (0..360).
    # GDAL's PDS driver is NOT used for positions: it places these grids one pixel off (3.7 km for MOLA,
    # 7.4 km for TES). Audit, 15 Nov: checked against the USGS 463 m MOLA GeoTIFF around Gale crater, where
    # the label geometry fits with 89 m RMS and a one-pixel shift with 190-260 m.
    lat = 90.0 - (np.arange(height) + 0.5) / ppd
    lon_east = (np.arange(width) + 0.5) / ppd
    thermal_inertia = read_tes(TES_TI, lat, lon_east)
    albedo = read_tes(TES_ALBEDO, lat, lon_east)
    # Roll every layer half a turn so the columns run -180..180. Audit, 15 Nov: only the elevation used to
    # be rolled, which left thermal inertia 180 deg of longitude away from it (Pathfinder read 80 instead of
    # 400, our Amazonis pick 122 instead of 51).
    elevation = np.roll(elevation, width // 2, axis=1)
    thermal_inertia = np.roll(thermal_inertia, width // 2, axis=1)
    albedo = np.roll(albedo, width // 2, axis=1)
    lon = np.roll(((lon_east + 180.0) % 360.0) - 180.0, width // 2)
    thermal_inertia[thermal_inertia <= 0] = np.nan
    albedo[(albedo <= 0) | (albedo > 1)] = np.nan

    # Slope between neighbouring pixels (3.7 km apart), the 2-5 km scale of the MSL rule; wraps across +-180 deg
    pixel_deg = 180.0 / height
    dy = np.radians(pixel_deg) * MARS_RADIUS_KM * 1000.0
    dx = dy * np.cos(np.radians(lat))[:, None]
    step_x = (np.roll(elevation, -1, axis=1) - elevation) / dx
    step_y = np.diff(elevation, axis=0, append=elevation[-1:]) / dy
    slope = np.degrees(np.arctan(np.hypot(step_x, step_y)))
    relief = (ndimage.maximum_filter(elevation, size=5, mode=("nearest", "wrap"))
              - ndimage.minimum_filter(elevation, size=5, mode=("nearest", "wrap")))
    return Grids(lat, lon, elevation, thermal_inertia, albedo, slope.astype("float32"), relief.astype("float32"))


def pixel_of(grids: Grids, lat: float, lon: float) -> tuple[int, int]:
    row = int(np.argmin(np.abs(grids.lat - lat)))
    col = int(np.argmin(np.abs(((grids.lon - lon + 180) % 360) - 180)))
    return row, col


def site_values(grids: Grids, lat: float, lon: float) -> dict:
    """Criteria values at a site, as the median over a ~11 km window (landing-ellipse scale)."""
    row, col = pixel_of(grids, lat, lon)
    rows = slice(max(row - 1, 0), row + 2)
    cols = np.arange(col - 1, col + 2) % grids.elevation.shape[1]  # wraps across +-180 deg

    def window(layer: np.ndarray) -> np.ndarray:
        return layer[rows][:, cols]

    return {
        "elevation_m": float(np.nanmedian(window(grids.elevation))),
        "pressure_pa": float(np.nanmedian(surface_pressure_pa(window(grids.elevation)))),
        "winter_sun_deg": float(winter_noon_sun_deg(np.array(lat))),
        "thermal_inertia": float(np.nanmedian(window(grids.thermal_inertia))),
        "albedo": float(np.nanmedian(window(grids.albedo))),
        "slope_deg": float(np.nanmedian(window(grids.slope))),
        "relief_m": float(np.nanmedian(window(grids.relief))),
    }


def great_circle_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * MARS_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def calibrate_roughness(grids: Grids) -> tuple[float, float]:
    """Print the km-scale roughness of the rover-style landings next to the limits."""
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
    albedo = values["albedo"]
    dust_ok = (None if np.isnan(ti) or np.isnan(albedo)
               else bool(ti >= DUSTY_BELOW_INERTIA or albedo <= MAX_ALBEDO_IF_LOW_INERTIA))
    return [
        {"id": "pressure", "label": "Air to slow down (est. surface pressure)", "value": round(values["pressure_pa"]),
         "unit": "Pa", "rule": f">= {min_pressure:.0f} Pa (elevation <= -1 km, MSL)",
         "pass": values["elevation_m"] <= MAX_ELEVATION_M, "source": "MOLA MEGDR 16 px/deg"},
        {"id": "winter_sun", "label": "Winter noon Sun elevation", "value": round(values["winter_sun_deg"], 1),
         "unit": "deg", "rule": f">= {min_sun:.1f} deg (|lat| <= 30 deg, MSL / Mars 2020)",
         "pass": values["winter_sun_deg"] >= min_sun, "source": "Latitude, obliquity 25.19 deg"},
        {"id": "thermal_inertia", "label": "Thermal inertia (not dust-covered)",
         "value": None if np.isnan(ti) else round(ti),
         "unit": "J m-2 K-1 s-1/2", "rule": ">= 100 (MSL, Mars 2020)",
         "pass": None if np.isnan(ti) else bool(ti >= MIN_THERMAL_INERTIA), "source": "MGS TES thermal inertia"},
        {"id": "albedo", "label": "Albedo (second dust check)",
         "value": None if np.isnan(albedo) else round(albedo, 2),
         "unit": "", "rule": "<= 0.25 where thermal inertia is below 150 (MSL, Mars 2020: bright and low-inertia = dusty)",
         "pass": dust_ok, "source": "MGS TES bolometric albedo"},
        {"id": "slope", "label": "Slope at ~4 km scale", "value": round(values["slope_deg"], 2),
         "unit": "deg", "rule": f"<= {max_slope:.0f} deg over 2-5 km (MSL)",
         "pass": values["slope_deg"] <= max_slope, "source": "MOLA MEGDR 16 px/deg"},
        {"id": "relief", "label": "Relief over ~18 km", "value": round(values["relief_m"]),
         "unit": "m", "rule": f"<= {max_relief:.0f} m (ours)",
         "pass": values["relief_m"] <= max_relief, "source": "MOLA MEGDR 16 px/deg"},
    ]


def screen(grids: Grids, max_slope: float, max_relief: float) -> np.ndarray:
    lat2d = np.broadcast_to(grids.lat[:, None], grids.elevation.shape)
    ok = (
        (grids.elevation <= MAX_ELEVATION_M)
        & (np.abs(lat2d) <= MAX_ABS_LAT_DEG)
        & (np.nan_to_num(grids.thermal_inertia, nan=0) >= MIN_THERMAL_INERTIA)
        & ((np.nan_to_num(grids.thermal_inertia, nan=0) >= DUSTY_BELOW_INERTIA)
           | (np.nan_to_num(grids.albedo, nan=1) <= MAX_ALBEDO_IF_LOW_INERTIA))
        & (grids.slope <= max_slope)
        & (grids.relief <= max_relief)
    )
    pixel_km = np.radians(180.0 / grids.elevation.shape[0]) * MARS_RADIUS_KM
    size = int(np.ceil(ELLIPSE_KM / pixel_km)) | 1  # odd window that covers the ellipse
    return ndimage.binary_erosion(ok, structure=np.ones((size, size), bool))


def pick_candidates(grids: Grids, safe: np.ndarray, max_count: int = MAX_CANDIDATES) -> list[dict]:
    """The points deepest inside safe ground that are new places, in clearly different regions.

    Repeat: take the safe point farthest from the edge of its safe area, among points that are
    > MIN_KM_FROM_PAST_LANDING from every place a lander has come down and > MIN_KM_BETWEEN_CANDIDATES
    from the picks so far. Stop when the best point left is less than MIN_INTERIOR_KM inside, or its
    area is smaller than MIN_SAFE_AREA_KM2. The number of candidates is whatever this gives.

    (Until the 15 Nov audit only the single most interior point of each area was tried, so Chryse and
    Meridiani, the 2nd and 3rd largest safe areas, were dropped whole: that point is near Viking 1 and
    Opportunity. And the largest area, which runs from Isidis to Elysium, could hold only one pick.)
    """
    # The left and right edges of the grid are the same meridian (+-180 deg). Cut the map where there
    # is no safe ground instead, so an area that crosses +-180 deg is not split in two and distances to
    # its edge are not measured from a cut that isn't there (audit, 15 Nov).
    shift = int(np.argmin(safe.sum(axis=0)))
    if safe[:, shift].any():
        print(f"  note: every meridian has safe ground; cutting at {grids.lon[shift]:.1f} deg E "
              f"({int(safe[:, shift].sum())} safe pixels on the cut)")
    safe = np.roll(safe, -shift, axis=1)
    lon_axis = np.roll(grids.lon, -shift)

    labels, n = ndimage.label(safe)
    if n == 0:
        return []
    depth = ndimage.distance_transform_edt(safe)  # in pixels; ranks how far inside a point is
    pixel_km = np.radians(180.0 / safe.shape[0]) * MARS_RADIUS_KM
    # True area: pixels get narrower away from the equator
    pixel_area = np.broadcast_to((pixel_km**2 * np.cos(np.radians(grids.lat)))[:, None], safe.shape)
    areas = ndimage.sum(pixel_area, labels, index=np.arange(1, n + 1))
    area_of = np.where(labels > 0, areas[np.maximum(labels, 1) - 1], 0.0)
    lat2d = np.broadcast_to(grids.lat[:, None], safe.shape)
    lon2d = np.broadcast_to(lon_axis[None, :], safe.shape)

    def km_to_edge(row: int, col: int) -> float:
        """Great-circle distance from a pixel to the nearest unsafe pixel."""
        half = int(depth[row, col] * 1.3) + 3  # lon pixels shrink by <= 13 % inside +-30 deg
        rows = slice(max(row - half, 0), row + half + 1)
        cols = slice(max(col - half, 0), col + half + 1)
        unsafe = ~safe[rows, cols]
        if not unsafe.any():
            return float(depth[row, col] * pixel_km)
        d = great_circle_km(grids.lat[row], lon_axis[col], lat2d[rows, cols][unsafe], lon2d[rows, cols][unsafe])
        return float(d.min())

    # A new place: far from every successful landing and every other known touchdown or impact site
    allowed = safe & (area_of >= MIN_SAFE_AREA_KM2)
    for _, la, lo, *_ in LANDINGS + OTHER_TOUCHDOWNS:
        allowed &= great_circle_km(lat2d, lon2d, la, lo) >= MIN_KM_FROM_PAST_LANDING

    picks: list[dict] = []
    while len(picks) < max_count and allowed.any():
        row, col = np.unravel_index(np.argmax(np.where(allowed, depth, -1)), safe.shape)
        interior_km = km_to_edge(row, col)
        if interior_km < MIN_INTERIOR_KM:
            print(f"  stop: the best point left is only {interior_km:.0f} km inside its safe area")
            break
        lat, lon = float(grids.lat[row]), float(lon_axis[col])
        picks.append({"lat": round(lat, 3), "lon": round(lon, 3), "safe_area_km2": round(float(area_of[row, col]), -3),
                      "interior_km": round(interior_km)})
        allowed &= great_circle_km(lat2d, lon2d, lat, lon) >= MIN_KM_BETWEEN_CANDIDATES
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
    print(f"Roughness limits: slope <= {max_slope} deg (MSL), relief <= {max_relief:.0f} m (ours)")

    print("\nValidation — the 11 past landings:")
    validation = []
    for name, lat, lon, rover in LANDINGS:
        values = site_values(grids, lat, lon)
        crit = criteria(values, max_slope, max_relief)
        failed = [c["id"] for c in crit if c["pass"] is False]
        validation.append({"name": name, "lat": lat, "lon": lon, "rover_rules": rover, "criteria": crit,
                           "elevation_m": round(values["elevation_m"]), "albedo": round(values["albedo"], 2),
                           "own_rules": own_rules(name, lat, values["elevation_m"])})
        print(f"  {'PASS' if not failed else 'fail'} {name:16s} p={values['pressure_pa']:4.0f} Pa  "
              f"sun={values['winter_sun_deg']:5.1f}  TI={values['thermal_inertia']:5.0f}  alb={values['albedo']:.2f}  "
              f"slope={values['slope_deg']:.2f}  relief={values['relief_m']:4.0f}  "
              f"{'' if not failed else 'failed: ' + ', '.join(failed)}")

    print("\nEach landing against its own mission's limits (elevation, latitude):")
    for v in validation:
        if v["own_rules"]:
            print(f"  {'PASS' if all(r['pass'] for r in v['own_rules']) else 'FAIL'} {v['name']:16s} "
                  + "; ".join(f"{r['value']} {r['unit']} ({r['rule']})" for r in v["own_rules"]))

    # Sites chosen by others that never flew or have not flown yet: a further check on the rules
    print("\nOther selected or shortlisted sites (point check, no 25 km area test):")
    others = []
    for name, lat, lon, note in OTHER_SITES:
        values = site_values(grids, lat, lon)
        crit = criteria(values, max_slope, max_relief)
        failed = [c["id"] for c in crit if c["pass"] is False]
        others.append({"name": name, "lat": lat, "lon": lon, "note": note, "criteria": crit})
        print(f"  {'PASS' if not failed else 'fail'} {name:22s} {'' if not failed else 'failed: ' + ', '.join(failed)}")

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
                        "min_thermal_inertia": MIN_THERMAL_INERTIA, "dusty_below_inertia": DUSTY_BELOW_INERTIA,
                        "max_albedo_if_low_inertia": MAX_ALBEDO_IF_LOW_INERTIA, "max_slope_deg": max_slope,
                        "max_relief_m": max_relief, "ellipse_km": ELLIPSE_KM,
                        "min_safe_area_km2": MIN_SAFE_AREA_KM2, "min_interior_km": MIN_INTERIOR_KM,
                        "min_km_between_candidates": MIN_KM_BETWEEN_CANDIDATES},
         "validation": validation, "other_sites": others, "candidates": candidates,
         "safe_area_million_km2": round(float((safe * pixel_area).sum()) / 1e6, 2),
         "safe_area_pct": round(100 * float((safe * pixel_area).sum()) / (4 * np.pi * MARS_RADIUS_KM ** 2), 1),
         "safe_patches": int(ndimage.label(safe)[1]), "reference_463m": {k: fine[k] for k, *_ in reference}},
        indent=2, default=bool))
    print(f"\nWrote {OUT / 'mars_screening.json'} and mars_safe.npz")


if __name__ == "__main__":
    main()

"""B3: coarse global pass over Earth's land, and one pool of Earth candidates per body.

Climate and surface features are about the same for every candidate on one body, so B3 builds a
Mars-like pool and a Moon-like pool; B4 ranks each pool per candidate on terrain and minerals.

Features on a 0.25 deg land grid:
  - precipitation, mm/yr     GPM IMERG V07 Final climatology, June 2000 - May 2023 (one year is too noisy for
                             deserts: Death Valley got a year's rain in a day in 2023). South of 80 S, where the
                             climatology is empty, the 12 months of 2023 fill in
  - vegetation, max NDVI     MODIS MOD13C2, all 12 months of 2023 (four months missed the green peak in places)
  - day-night LST swing, K   MODIS MOD11C3, all 12 months of 2023
  - mean LST, K              MODIS MOD11C3 — below 273 K means frozen ground most of the year
  - snow/ice and barren %    MODIS MCD12C1 land cover — drops ice sheets (ice, not rock). A cell counts
                             as exposed ground if >= 10 % barren or < 50 % snow/ice: the McMurdo Dry
                             Valleys are 88 % "ice" and 12 % barren at 0.05 deg, and must stay in
                             (their warmest month is only ~263 K, so a temperature rule drops them too)
  - albedo                   MODIS MCD43C3 white-sky shortwave albedo, snow-free, median of four dates in 2023
                             (15 Jan, 15 Apr, 15 Jul, 15 Oct): how dark or bright the bare ground is
  - latitude                 low Sun for the lunar pole

Inputs: pipeline/fetch_earth.py (Earthdata Login) and docs/DATA_SOURCES.md. Run from the repo root:
    pipeline/.venv/Scripts/python pipeline/earth_pool.py
"""

import calendar
import json
import re
from pathlib import Path

import h5py
import numpy as np
from pyhdf.SD import SD, SDC

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "earth"
OUT = ROOT / "data" / "interim"
EARTH_RADIUS_KM = 6371.0

CELL_DEG = 0.25
POOL_SIZE = 100
POOL_MIN_KM_APART = 200.0
MAX_WATER_PCT = 10.0
MIN_LAND_PCT = 90.0


def block_mean(a: np.ndarray, k: int) -> np.ndarray:
    """Mean over k x k blocks, ignoring NaN."""
    h, w = a.shape
    a = a[: h - h % k, : w - w % k].reshape(h // k, k, w // k, k)
    with np.errstate(invalid="ignore"):
        return np.nanmean(a, axis=(1, 3))


def natural_earth_land_pct(k: int) -> np.ndarray:
    """Share of each 0.25 deg cell inside Natural Earth's 10 m country polygons, in %, rasterised at 0.05 deg."""
    import geopandas as gpd
    from rasterio.features import rasterize
    from rasterio.transform import from_origin

    countries = gpd.read_file(f"zip://{RAW / 'naturalearth' / 'countries.zip'}")
    fine = rasterize(((g, 1) for g in countries.geometry), out_shape=(3600, 7200),
                     transform=from_origin(-180, 90, 0.05, 0.05), fill=0, dtype="uint8")
    return block_mean(fine.astype("float64"), k) * 100


def read_modis(path: Path, sds_name: str, scale: float, fill) -> np.ndarray:
    sd = SD(str(path), SDC.READ)
    data = sd.select(sds_name).get().astype("float64")
    sd.end()
    data[data == fill] = np.nan
    return data * scale


def load_features() -> dict[str, np.ndarray]:
    k = int(CELL_DEG / 0.05)
    day, night = [], []
    for f in sorted((RAW / "MOD11C3").glob("*.hdf")):
        day.append(block_mean(read_modis(f, "LST_Day_CMG", 0.02, 0), k))
        night.append(block_mean(read_modis(f, "LST_Night_CMG", 0.02, 0), k))
    ndvi = [block_mean(read_modis(f, "CMG 0.05 Deg Monthly NDVI", 1e-4, -3000), k)
            for f in sorted((RAW / "MOD13C2").glob("*.hdf"))]
    day, night = np.array(day), np.array(night)

    year = None
    for f in sorted((RAW / "GPM_3IMERGM").glob("*.HDF5")):
        month = int(re.search(r"\.2023(\d\d)01-", f.name).group(1))
        with h5py.File(f, "r") as h5:
            rate = h5["Grid/precipitation"][0].astype("float64")
        rate[rate < 0] = np.nan
        mm = rate.T[::-1] * 24 * calendar.monthrange(2023, month)[1]
        year = mm if year is None else year + mm
    import rasterio
    with rasterio.open(next((RAW / "imerg_clim").glob("IMERG-Final.CLIM.*.tif"))) as src:
        clim = src.read(1).astype("float64")
    clim[clim < 0] = np.nan
    precip = np.where(np.isfinite(clim), clim, year)
    precip = block_mean(np.repeat(np.repeat(precip, 2, axis=0), 2, axis=1), k)
    precip_2023 = block_mean(np.repeat(np.repeat(year, 2, axis=0), 2, axis=1), k)

    albedo = []
    for f in sorted((RAW / "MCD43C3").glob("*.hdf")):
        white_sky = read_modis(f, "Albedo_WSA_shortwave", 0.001, 32767)
        white_sky[read_modis(f, "Percent_Snow", 1.0, 255) > 0] = np.nan
        albedo.append(block_mean(white_sky, k))

    cover = SD(str(next((RAW / "MCD12C1").glob("*.hdf"))), SDC.READ)
    percent = cover.select("Land_Cover_Type_1_Percent")
    water = block_mean(percent[:, :, 0].astype("float64"), k)
    snow_ice = block_mean(percent[:, :, 15].astype("float64"), k)
    barren = block_mean(percent[:, :, 16].astype("float64"), k)
    cover.end()

    with np.errstate(invalid="ignore", all="ignore"):
        features = {
            "water_pct": water,
            "ne_land_pct": natural_earth_land_pct(k),
            "snow_ice_pct": snow_ice,
            "barren_pct": barren,
            "precip_mm": precip,
            "precip_2023_mm": precip_2023,
            "albedo": np.nanmedian(np.array(albedo), axis=0),
            "ndvi_max": np.nanmax(np.array(ndvi), axis=0),
            "swing_k": np.nanmean(day - night, axis=0),
            "mean_lst_k": np.nanmean((day + night) / 2, axis=0),
            "warmest_day_k": np.nanmax(day, axis=0),
        }
    rows, cols = features["precip_mm"].shape
    features["lat"] = np.repeat((90 - CELL_DEG * (np.arange(rows) + 0.5))[:, None], cols, axis=1)
    features["lon"] = np.repeat((-180 + CELL_DEG * (np.arange(cols) + 0.5))[None, :], rows, axis=0)
    return features


def clip01(a):
    return np.clip(a, 0.0, 1.0)


def scores(f: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    """0-1 score per dimension (ours), and a pool score per body."""
    land = (np.isfinite(f["mean_lst_k"]) & np.isfinite(f["precip_mm"])
            & (f["water_pct"] < MAX_WATER_PCT) & (f["ne_land_pct"] >= MIN_LAND_PCT))
    exposed = (f["barren_pct"] >= 10) | ((f["snow_ice_pct"] < 50) & np.isfinite(f["ndvi_max"]))
    s = {
        "aridity": clip01(1 - (f["precip_mm"] - 100.0) / 250.0),
        "barren": np.maximum(clip01(1 - (np.nan_to_num(f["ndvi_max"], nan=0) - 0.05) / 0.25), f["barren_pct"] / 100.0),
        "swing": clip01(f["swing_k"] / 35.0),
        "cold": clip01((300.0 - f["mean_lst_k"]) / 50.0),
        "frozen": clip01((280.0 - f["mean_lst_k"]) / 15.0),
        "polar": clip01((np.abs(f["lat"]) - 60.0) / 20.0),
    }
    valid = land & exposed
    s["mars"] = np.where(valid, 0.35 * s["aridity"] + 0.30 * s["barren"] + 0.20 * s["swing"] + 0.15 * s["cold"], np.nan)
    s["moon"] = np.where(valid, 0.20 * s["aridity"] + 0.25 * s["barren"] + 0.25 * s["polar"] + 0.20 * s["frozen"]
                         + 0.10 * s["swing"], np.nan)
    return s


def great_circle_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def known_analogs() -> dict[str, list[dict]]:
    """Known analogs with coordinates from docs/KNOWN_ANALOGS.md §1 (Moon) and §2 (Mars)."""
    text = (ROOT / "docs" / "KNOWN_ANALOGS.md").read_text(encoding="utf-8").replace("−", "-")
    out: dict[str, list[dict]] = {"moon": [], "mars": []}
    body = None
    for line in text.splitlines():
        if line.startswith("## 1."):
            body = "moon"
        elif line.startswith("## 2."):
            body = "mars"
        elif line.startswith("## "):
            body = None
        if body and line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            match = re.search(r"(-?\d+\.\d+),\s*(-?\d+\.\d+)", cells[3]) if len(cells) > 3 else None
            if match:
                out[body].append({"name": cells[1], "country": cells[2],
                                  "lat": float(match.group(1)), "lon": float(match.group(2))})
    return out


def build_pool(f, s, body: str, known: list[dict]) -> list[dict]:
    score = s[body]
    order = np.argsort(np.nan_to_num(score, nan=-1), axis=None)[::-1]
    pool: list[dict] = []
    for flat in order:
        value = score.flat[flat]
        if not np.isfinite(value):
            break
        r, c = np.unravel_index(flat, score.shape)
        lat, lon = float(f["lat"][r, c]), float(f["lon"][r, c])
        if any(great_circle_km(lat, lon, p["lat"], p["lon"]) < POOL_MIN_KM_APART for p in pool):
            continue
        pool.append(cell_record(f, s, body, r, c, source="screened"))
        if len(pool) == POOL_SIZE:
            break
    for k in known:
        r0, c0 = int((90 - k["lat"]) / CELL_DEG), int((k["lon"] + 180) / CELL_DEG)
        best, r, c = -1.0, r0, c0
        reach = int(np.ceil(50 / (111.2 * CELL_DEG * max(np.cos(np.radians(k["lat"])), 0.05))))
        for dr in range(-2, 3):
            for dc in range(-reach, reach + 1):
                rr, cc = r0 + dr, (c0 + dc) % score.shape[1]
                if 0 <= rr < score.shape[0] and np.isfinite(score[rr, cc]) and score[rr, cc] > best \
                        and great_circle_km(k["lat"], k["lon"], f["lat"][rr, cc], f["lon"][rr, cc]) <= 50:
                    best, r, c = float(score[rr, cc]), rr, cc
        rec = cell_record(f, s, body, r, c, source="known")
        rec["name"] = k["name"]
        rec["known_lat"], rec["known_lon"] = k["lat"], k["lon"]
        pool.append(rec)
    return pool


def cell_record(f, s, body, r, c, source: str) -> dict:
    def val(a, nd=1):
        v = float(a[r, c])
        return None if not np.isfinite(v) else round(v, nd)

    return {"lat": round(float(f["lat"][r, c]), 3), "lon": round(float(f["lon"][r, c]), 3), "source": source,
            "score": val(s[body], 3), "precip_mm": val(f["precip_mm"], 0), "ndvi_max": val(f["ndvi_max"], 3),
            "swing_k": val(f["swing_k"]), "mean_lst_k": val(f["mean_lst_k"]),
            "dims": {d: val(s[d], 2) for d in ("aridity", "barren", "swing", "cold", "frozen", "polar")}}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    f = load_features()
    s = scores(f)
    np.savez_compressed(OUT / "earth_grid.npz", **{k: v.astype("float32") for k, v in {**f, **s}.items()})
    known = known_analogs()
    result = {}
    for body in ("mars", "moon"):
        pool = build_pool(f, s, body, known[body])
        result[body] = pool
        screened = [p for p in pool if p["source"] == "screened"]
        print(f"\n{body.upper()} pool: {len(screened)} screened cells + {len(pool) - len(screened)} known analogs")
        for p in screened[:12]:
            print(f"  {p['lat']:7.2f} {p['lon']:8.2f} score {p['score']:.3f}  precip {p['precip_mm']} mm  "
                  f"NDVI {p['ndvi_max']}  swing {p['swing_k']} K  mean {p['mean_lst_k']} K")
        ranks = np.sort(np.nan_to_num(s[body], nan=-1), axis=None)[::-1]
        for p in pool:
            if p["source"] == "known" and p["score"] is not None:
                pct = 100 * np.searchsorted(-ranks, -p["score"]) / np.isfinite(s[body]).sum()
                print(f"  known: {p['name'][:40]:40s} score {p['score']:.3f} (top {pct:4.1f} % of land)")
            elif p["source"] == "known":
                print(f"  known: {p['name'][:40]:40s} no data (ice, ocean or masked)")
    (OUT / "earth_pool.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT / 'earth_pool.json'}")


if __name__ == "__main__":
    main()

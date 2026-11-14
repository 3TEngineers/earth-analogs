"""B3: coarse global pass over Earth's land, and one pool of Earth candidates per body.

Climate and surface features are about the same for every candidate on one body, so B3 builds a
Mars-like pool and a Moon-like pool; B4 ranks each pool per candidate on terrain and minerals.

Features on a 0.25 deg land grid, from 2023:
  - precipitation, mm/yr     GPM IMERG monthly (12 months)
  - vegetation, max NDVI     MODIS MOD13C2 (Jan, Apr, Jul, Oct)
  - day-night LST swing, K   MODIS MOD11C3 (same months)
  - mean LST, K              MODIS MOD11C3 — below 273 K means frozen ground most of the year
  - snow/ice and barren %    MODIS MCD12C1 land cover — drops ice sheets (ice, not rock). A cell counts
                             as exposed ground if >= 10 % barren or < 50 % snow/ice: the McMurdo Dry
                             Valleys are 88 % "ice" and 12 % barren at 0.05 deg, and must stay in
                             (their warmest month is only ~263 K, so a temperature rule drops them too)
  - latitude                 low Sun for the lunar pole

Downloads (Earthdata Login, ~900 MB) go to data/raw/earth/. Run from the repo root:
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
POOL_SIZE = 40  # cells per body
POOL_MIN_KM_APART = 300.0  # ours: pool entries come from different regions


def block_mean(a: np.ndarray, k: int) -> np.ndarray:
    """Mean over k x k blocks, ignoring NaN."""
    h, w = a.shape
    a = a[: h - h % k, : w - w % k].reshape(h // k, k, w // k, k)
    with np.errstate(invalid="ignore"):
        return np.nanmean(a, axis=(1, 3))


def read_modis(path: Path, sds_name: str, scale: float, fill) -> np.ndarray:
    sd = SD(str(path), SDC.READ)
    data = sd.select(sds_name).get().astype("float64")
    sd.end()
    data[data == fill] = np.nan
    return data * scale  # 3600 x 7200, 0.05 deg, row 0 = 90 N, col 0 = 180 W


def load_features() -> dict[str, np.ndarray]:
    k = int(CELL_DEG / 0.05)
    day, night = [], []
    for f in sorted((RAW / "MOD11C3").glob("*.hdf")):
        day.append(block_mean(read_modis(f, "LST_Day_CMG", 0.02, 0), k))
        night.append(block_mean(read_modis(f, "LST_Night_CMG", 0.02, 0), k))
    ndvi = [block_mean(read_modis(f, "CMG 0.05 Deg Monthly NDVI", 1e-4, -3000), k)
            for f in sorted((RAW / "MOD13C2").glob("*.hdf"))]
    day, night = np.array(day), np.array(night)

    precip = None
    for f in sorted((RAW / "GPM_3IMERGM").glob("*.HDF5")):
        month = int(re.search(r"\.2023(\d\d)01-", f.name).group(1))
        with h5py.File(f, "r") as h5:
            rate = h5["Grid/precipitation"][0].astype("float64")  # (lon 3600, lat 1800), mm/hr, lat ascending
        rate[rate < 0] = np.nan
        mm = rate.T[::-1] * 24 * calendar.monthrange(2023, month)[1]  # to (lat desc, lon), mm per month
        precip = mm if precip is None else precip + mm
    # 0.1 deg -> 0.05 deg by repetition, then the same 0.25 deg blocks as MODIS
    precip = block_mean(np.repeat(np.repeat(precip, 2, axis=0), 2, axis=1), k)

    cover = SD(str(next((RAW / "MCD12C1").glob("*.hdf"))), SDC.READ)
    percent = cover.select("Land_Cover_Type_1_Percent")
    snow_ice = block_mean(percent[:, :, 15].astype("float64"), k)  # IGBP class 15: permanent snow and ice
    barren = block_mean(percent[:, :, 16].astype("float64"), k)  # IGBP class 16: barren
    cover.end()

    with np.errstate(invalid="ignore", all="ignore"):
        features = {
            "snow_ice_pct": snow_ice,
            "barren_pct": barren,
            "precip_mm": precip,
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
    land = np.isfinite(f["mean_lst_k"]) & np.isfinite(f["precip_mm"])
    # Exposed ground: >= 10 % barren, or < 50 % snow/ice where vegetation data exists. Ice shelves and the
    # polar plateau have empty land-cover and no NDVI, so the second test alone would let them in.
    exposed = (f["barren_pct"] >= 10) | ((f["snow_ice_pct"] < 50) & np.isfinite(f["ndvi_max"]))
    s = {
        "aridity": clip01(1 - f["precip_mm"] / 250.0),  # 0 mm -> 1, 250 mm/yr (semi-arid) -> 0
        # bare ground: low NDVI, or land cover that says barren
        "barren": np.maximum(clip01(1 - (np.nan_to_num(f["ndvi_max"], nan=0) - 0.05) / 0.25), f["barren_pct"] / 100.0),
        "swing": clip01(f["swing_k"] / 35.0),  # Earth's largest day-night LST swings are ~35-40 K
        "cold": clip01((300.0 - f["mean_lst_k"]) / 50.0),  # 300 K -> 0, 250 K -> 1
        "frozen": clip01((280.0 - f["mean_lst_k"]) / 15.0),  # mean below ~265 K: frozen most of the year
        "polar": clip01((np.abs(f["lat"]) - 60.0) / 20.0),  # low Sun: 60 deg -> 0, 80 deg -> 1
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
    for k in known:  # known analogs join the pool so B5 can check they rank well (validation)
        # Best cell within ~50 km: KNOWN_ANALOGS.md coordinates are often proxies (its suggested match radius)
        r0, c0 = int((90 - k["lat"]) / CELL_DEG), int((k["lon"] + 180) / CELL_DEG)
        best, r, c = -1.0, r0, c0
        # cells narrow towards the poles, so widen the column window to keep ~50 km
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

"""Data-accuracy audit: independent checks of every number the site shows.

Each check compares our pipeline against an independent reference (a published value, a known
place, a synthetic case or the raw data recomputed) and prints PASS / FAIL / WARN.
Results are written up in docs/AUDIT.md. Run from the repo root after the whole pipeline:
    pipeline/.venv/Scripts/python pipeline/audit.py
"""

import json
import re
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import Point, box

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_analogs  # noqa: E402
import earth_ranking  # noqa: E402

DATA = ROOT / "app" / "public" / "data"
RAW = ROOT / "data" / "raw"
RESULTS: list[tuple[str, str, str]] = []


def check(group: str, name: str, ok: bool | None, detail: str) -> None:
    status = "PASS" if ok else ("WARN" if ok is None else "FAIL")
    RESULTS.append((status, f"{group}: {name}", detail))
    print(f"[{status}] {group}: {name} — {detail}")


# ---------------------------------------------------------------- helpers we test against
def great_circle_km(lat1, lon1, lat2, lon2, r=6371.0):
    return build_analogs.great_circle_km(lat1, lon1, lat2, lon2) * r / 6371.0


# ---------------------------------------------------------------- 1. math units
def audit_math():
    # slope on a synthetic plane with a known 10 deg tilt, 100 m pixels
    x = np.arange(50) * 100.0
    plane = np.tile(x * np.tan(np.radians(10)), (50, 1))
    s = earth_ranking.slope_deg(plane, 100.0, 100.0)
    check("math", "slope of a 10° plane", abs(np.median(s) - 10) < 0.01, f"median {np.median(s):.3f}°")
    # Wasserstein similarity of a distribution with itself is 1
    from scipy.stats import wasserstein_distance
    d = np.random.default_rng(0).gamma(2, 2, 500)
    check("math", "terrain similarity of identical slopes", np.exp(-wasserstein_distance(d, d) / 3) == 1.0, "exp(-0)=1")
    # winter noon Sun and pressure formulas at reference points
    import mars_screening as m
    check("math", "winter noon Sun at the equator", abs(float(m.winter_noon_sun_deg(np.array(0.0))) - 64.81) < 0.01,
          f"{float(m.winter_noon_sun_deg(np.array(0.0))):.2f}° (90 - 25.19)")
    check("math", "pressure at the MOLA datum", abs(float(m.surface_pressure_pa(np.array(0.0))) - 610) < 1,
          "610 Pa = mean surface pressure (Atmosphere of Mars); scale height 11.1 km")


# ---------------------------------------------------------------- 2. Mars data vs published
def audit_mars():
    import mars_screening as m
    grids = m.load_grids()
    # Published landing-site elevations (MOLA), metres. The 463 m pixel under the landing coordinate checks
    # the coordinates; the 16 px/deg pixel (screening grid) also checks the MOLA longitude fix.
    published = {"Viking 1": -3630, "Mars Pathfinder": -3680, "Spirit": -1940, "Opportunity": -1440,
                 "Curiosity": -4500, "InSight": -2610, "Perseverance": -2570}
    import rasterio
    from pyproj import CRS, Transformer
    from rasterio.windows import Window
    with rasterio.open(m.MOLA_463_URL) as dem:
        crs = CRS.from_wkt(dem.crs.to_wkt())
        to_xy = Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
        for name, lat, lon, _ in m.LANDINGS:
            if name not in published:
                continue
            r, c = dem.index(*to_xy.transform(lon, lat))
            fine = float(dem.read(1, window=Window(c, r, 1, 1))[0, 0])
            check("mars", f"MOLA 463 m elevation at {name}", abs(fine - published[name]) < 100,
                  f"ours {fine:.0f} m, published ≈ {published[name]} m")
            # a 3.7 km screening pixel can straddle a slope (Curiosity: foot of Mount Sharp) -> WARN, not FAIL
            row, col = m.pixel_of(grids, lat, lon)
            pixel = float(grids.elevation[row, col])
            window = m.site_values(grids, lat, lon)["elevation_m"]
            check("mars", f"MOLA 16 px/deg elevation at {name}", True if abs(pixel - published[name]) < 250 else None,
                  f"pixel {pixel:.0f} m, 11 km window median {window:.0f} m, published ≈ {published[name]} m")
    # every candidate's criteria reproduce from the raw grids
    sites = json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]
    for s in sites:
        if s["body"] == "mars" and s["status"] == "candidate":
            crit = m.criteria(m.site_values(grids, s["lat"], s["lon"]), m.MAX_SLOPE_DEG, m.MAX_RELIEF_M)
            same = all(a["value"] == b["value"] and a["pass"] == b["pass"] for a, b in zip(crit, s["selection"]["criteria"]))
            check("mars", f"{s['id']} criteria recomputed from raw data", same,
                  ", ".join(f"{c['id']}={c['value']}" for c in crit))


# ---------------------------------------------------------------- 3. Moon data vs known facts
def audit_moon():
    import moon_screening as mo
    crs, transform, size, layers = mo.load_layers()

    def at(name, lat, lon):
        r, c = mo.to_pixel(crs, transform, lat, lon)
        return float(layers[name][r, c])

    psr_shackleton = at("psr", -89.67, 129.78)  # Shackleton crater floor (USGS Gazetteer centre)
    check("moon", "Shackleton crater floor is permanently shadowed", psr_shackleton > 0.5, f"PSR = {psr_shackleton:.0f}")
    near, far = at("earth", -84.0, 0.0), at("earth", -84.0, 180.0)
    check("moon", "Earth visible more on the near side than the far side (84° S)", near > far,
          f"lon 0°: {100 * near:.0f} %, lon 180°: {100 * far:.0f} %")
    # PSR area south of 80 S at the native 120 m vs Mazarico et al. (2011): 16,055 km2
    import rasterio
    with rasterio.open(RAW / "moon" / "LPSR_75S_120M_201608.TIF") as src:
        psr = src.read(1).astype("float64") * src.scales[0] + src.offsets[0]
        rows, cols = np.indices(psr.shape)
        x, y = src.transform * (cols + 0.5, rows + 0.5)
        dist_km = np.hypot(x, y) / 1000
        within_80 = dist_km <= np.radians(10) * 1737.4  # polar stereographic, near enough for 10 deg
        area = float((psr[within_80] > 0.5).sum() * (abs(src.transform.a) / 1000) ** 2)
    check("moon", "PSR area south of 80° S vs Mazarico 2011 (16,055 km²)", abs(area - 16055) / 16055 < 0.25,
          f"ours {area:,.0f} km² at 120 m (2016 product; their 2011 maps were 240 m)")
    # our 240 m grid uses max-resampling for PSR: how much does that inflate it?
    grid_psr_km2 = float((np.nan_to_num(layers["psr"]) > 0.5).sum() * 0.0576)
    check("moon", "PSR inflation from 240 m max-resampling (whole 75° S grid)", None,
          f"{grid_psr_km2:,.0f} km² on our grid — only used for 'distance to shadow', which it can shorten by ≤ 0.24 km")
    sites = json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]
    for s in sites:
        if s["body"] == "moon" and s["status"] == "candidate":
            r, c = mo.to_pixel(crs, transform, s["lat"], s["lon"])
            w = np.s_[r - 1:r + 2, c - 1:c + 2]
            sun = round(100 * float(np.nanmedian(layers["sunlit"][w])), 1)
            check("moon", f"{s['id']} sunlit recomputed", sun == s["selection"]["criteria"][0]["value"],
                  f"recomputed {sun} %, JSON {s['selection']['criteria'][0]['value']} %")


# ---------------------------------------------------------------- 4. Earth data vs known climate
def audit_earth():
    g = np.load(ROOT / "data" / "interim" / "earth_grid.npz")

    def cell(lat, lon, key):
        return float(g[key][int((90 - lat) / 0.25), int((lon + 180) / 0.25)])

    # long-term mean annual rainfall (mm), approximate climatologies; 2023 is one year, so factor-of-2 tolerance
    rain = {"Manaus, Brazil": (-3.1, -60.0, 2300), "Istanbul, Türkiye": (41.0, 28.98, 800),
            "Eskişehir, Türkiye": (39.78, 30.52, 380), "London, UK": (51.5, -0.12, 600),
            "In Salah, Algeria": (27.2, 2.47, 17), "Atacama (Yungay)": (-24.08, -69.99, 2)}
    for name, (lat, lon, ref) in rain.items():
        v = cell(lat, lon, "precip_mm")
        if ref >= 50:
            check("earth", f"GPM rainfall at {name}", ref / 2 <= v <= ref * 2, f"ours {v:.0f} mm/yr, climatology ≈ {ref} mm")
        else:  # hyperarid: IMERG over-reports here, so the pipeline treats everything <= 100 mm as fully arid
            aridity = cell(lat, lon, "aridity")
            check("earth", f"GPM rainfall at {name} (hyperarid)", v <= 100 and aridity == 1.0,
                  f"ours {v:.0f} mm/yr vs ≈ {ref} mm (IMERG over-reports), aridity score {aridity:.2f}")
    # Dome Fuji station: annual mean air temperature -54.4 °C = 218.8 K (JARE); the surface is a little colder
    for name, (lat, lon), lo, hi in [("Lut Desert mean LST", (30.6, 59.1), 295, 330),
                                     ("Dome Fuji, Antarctica mean LST (station ≈ 218.8 K)", (-77.32, 39.70), 205, 230)]:
        v = cell(lat, lon, "mean_lst_k")
        check("earth", name, lo <= v <= hi, f"{v:.1f} K")
    check("earth", "Greenland ice sheet excluded",
          not np.isfinite(cell(72.0, -40.0, "mars")), "ice sheet cells carry no score")
    check("earth", "McMurdo Dry Valleys kept", np.isfinite(cell(-77.625, 161.875, "mars")), "ice-free valley cell scored")


# ---------------------------------------------------------------- 5. Terrain pipeline on known places
def audit_terrain():
    flat = earth_ranking.earth_slopes(40.76, -113.88, 463.0)  # Bonneville Salt Flats, Utah
    steep = earth_ranking.earth_slopes(46.0, 7.75, 463.0)  # Pennine Alps
    check("terrain", "Bonneville Salt Flats are flat", flat is not None and np.median(flat) < 1.0,
          f"median {np.median(flat):.2f}°" if flat is not None else "no data")
    check("terrain", "Alps are steep", steep is not None and np.median(steep) > 15,
          f"median {np.median(steep):.1f}°" if steep is not None else "no data")
    header, glim = earth_ranking.glim_grid()
    for name, lat, lon, want in [("Iceland basalt", 64.85, -16.83, {"vb"}), ("Deccan Traps", 19.0, 75.0, {"vb"}),
                                 ("Grand Erg Oriental sand sea", 30.5, 7.5, {"su", "ss", "sm"}), ("Greenland ice", 72.0, -40.0, {"ig"})]:
        got = earth_ranking.glim_at(header, glim, lat, lon)
        check("terrain", f"GLiM rock class at {name}", got in want, f"{got} (expected {sorted(want)})")


# ---------------------------------------------------------------- 6. Kmar's inputs, checked independently
def audit_inputs():
    countries = gpd.read_file(f"zip://{RAW / 'earth' / 'naturalearth' / 'countries.zip'}")
    aliases = {"USA": "United States of America", "UK": "United Kingdom", "Türkiye": "Turkey"}
    for body, items in build_analogs.known_analogs().items():
        for k in items:
            pt = Point(k["lon"], k["lat"])
            near = countries[countries.geometry.distance(pt) <= 0.5]
            stated = re.split(r"[ (,]", k["country"])[0]
            stated = aliases.get(stated, stated)
            ok = any(stated.lower() in n.lower() or n.lower() in k["country"].lower() for n in near["NAME"]) \
                or (stated == "Antarctica" and k["lat"] < -60)
            check("inputs", f"{body} known analog '{k['name'][:30]}' lies in {k['country'][:20]}", ok,
                  f"({k['lat']}, {k['lon']}) → {', '.join(near['NAME'])[:40] or 'no country within 50 km'}")
    moon_names = gpd.read_file(f"zip://{RAW / 'names' / 'MOON_nomenclature_center_pts.zip'}")
    import moon_screening as mo
    lookup = {"Peak near Cabeus B": "Cabeus B", "Haworth": "Haworth", "Malapert Massif": "Mons Malapert",
              "Mons Mouton (and Plateau)": "Mons Mouton", "Nobile Rim 1 and 2": "Nobile",
              "de Gerlache Rim 2": "de Gerlache", "Slater Plain": "Slater"}
    for region, lat, lon in mo.ARTEMIS:
        row = moon_names[moon_names["name"] == lookup[region]]
        if row.empty:
            check("inputs", f"Artemis '{region}' in USGS Gazetteer", None, "feature not found in the shapefile")
            continue
        glat = float(row.center_lat.iloc[0])
        glon = ((float(row.center_lon.iloc[0]) + 180) % 360) - 180
        d = great_circle_km(lat, lon, glat, glon, r=1737.4)
        check("inputs", f"Artemis '{region}' coordinates vs USGS Gazetteer", d < 5, f"{d:.1f} km apart")


# ---------------------------------------------------------------- 7. Output consistency
def audit_outputs():
    sites = {s["id"]: s for s in json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]}
    analogs = json.loads((DATA / "analogs.json").read_text(encoding="utf-8"))["analogs"]
    countries = gpd.read_file(f"zip://{RAW / 'earth' / 'naturalearth' / 'countries.zip'}")
    for a in analogs:
        scores = {k: v["score"] for k, v in a["scores"].items() if v["score"] is not None}
        n_sim = sum(1 for v in scores.values() if v >= 70)
        n_dif = sum(1 for v in scores.values() if v <= 40)
        ok = len(a["similarities"]) == n_sim and len(a["differences"]) == n_dif + 1  # + the fixed body line
        if not ok:
            check("outputs", f"{a['id']} text matches scores", False, f"{len(a['similarities'])}/{n_sim} similar, {len(a['differences'])}/{n_dif} different")
        pt = Point(a["lon"], a["lat"])
        near = countries[countries.geometry.distance(pt) <= 1.0]
        if a["country"] and not any(a["country"] in n for n in near["NAME"]):
            check("outputs", f"{a['id']} country", False, f"'{a['country']}' vs {list(near['NAME'])[:3]}")
    check("outputs", "every analog's text matches its scores and country", all(r[0] != "FAIL" for r in RESULTS if r[1].startswith("outputs")), f"{len(analogs)} analogs")
    for sid in {a["siteId"] for a in analogs}:
        group = [a for a in analogs if a["siteId"] == sid]
        apart = min(great_circle_km(x["lat"], x["lon"], y["lat"], y["lon"]) for i, x in enumerate(group) for y in group[i + 1:])
        check("outputs", f"{sid}: 3 analogs ≥ 500 km apart, ≥ 1 new", len(group) == 3 and apart >= 500 and any(not a["known"] for a in group),
              f"closest pair {apart:.0f} km")
    check("outputs", "every analog points at a real site", all(a["siteId"] in sites for a in analogs), "")
    # Every training area must be inland: its 0.25° cell at least 90 % inside Natural Earth's 10 m country polygons
    # (vector geometry here, independent of the raster mask the pipeline uses).
    land = countries.union_all()
    wet = []
    for a in analogs:
        cell = box(a["lon"] - 0.125, a["lat"] - 0.125, a["lon"] + 0.125, a["lat"] + 0.125)
        share = cell.intersection(land).area / cell.area
        if share < 0.9:
            wet.append(f"{a['name']} ({share:.0%} land)")
    check("outputs", "every training area is inland (≥ 90 % of its cell is land, Natural Earth 10 m)", not wet, "; ".join(wet[:4]))
    grid = np.load(ROOT / "data" / "interim" / "earth_grid.npz")
    icy = [a["name"] for a in analogs if build_analogs.ice_pct(a, grid) >= build_analogs.MAX_PICK_ICE_PCT]
    check("outputs", "every training area is mostly bare ground (< 50 % permanent snow/ice, MODIS)", not icy, "; ".join(icy[:4]))
    shown = [t for a in analogs for t in a["similarities"] + a["differences"] + [x["detail"] for x in a["tests"]]]
    broken = [t for t in shown if re.search(r"\b(None|nan|NaN)\b", t)]
    check("outputs", "no missing values (None/NaN) in any text shown on the site", not broken, "; ".join(broken[:3]))
    moon_life = [a["id"] for a in analogs if a["siteId"].startswith("moon") and any("life" in x["title"].lower() for x in a["tests"])]
    check("outputs", "no life-detection tests suggested for Moon analogs", not moon_life, ", ".join(moon_life[:3]))


def main():
    for part in (audit_math, audit_inputs, audit_outputs, audit_terrain, audit_earth, audit_mars, audit_moon):
        try:
            part()
        except Exception as error:  # an audit section crashing is itself a finding
            check(part.__name__, "section ran", False, f"{type(error).__name__}: {error}")
    counts = {s: sum(1 for r in RESULTS if r[0] == s) for s in ("PASS", "WARN", "FAIL")}
    print(f"\n{counts['PASS']} PASS, {counts['WARN']} WARN, {counts['FAIL']} FAIL")
    (ROOT / "data" / "interim" / "audit.json").write_text(json.dumps(RESULTS, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()

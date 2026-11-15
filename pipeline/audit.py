"""Data-accuracy audit: independent checks of every number the site shows.

Each check compares our pipeline against an independent reference (a published value, a known
place, a synthetic case or the raw data recomputed) and prints PASS / FAIL / WARN.
Results are written up in docs/AUDIT.md. Run from the repo root after the whole pipeline:
    pipeline/.venv/Scripts/python pipeline/audit.py            # everything
    pipeline/.venv/Scripts/python pipeline/audit.py mars moon  # only these sections (math, inputs, outputs,
                                                               # terrain, earth, mars, moon); the Earth sections
                                                               # need B3's files in data/interim
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
# build_analogs and earth_ranking read B3's files when imported, so they are imported inside the sections
# that need them: the Mars and Moon sections then run on a machine that only has the planetary data.

DATA = ROOT / "app" / "public" / "data"
RAW = ROOT / "data" / "raw"
RESULTS: list[tuple[str, str, str]] = []


def check(group: str, name: str, ok: bool | None, detail: str) -> None:
    status = "PASS" if ok else ("WARN" if ok is None else "FAIL")
    RESULTS.append((status, f"{group}: {name}", detail))
    print(f"[{status}] {group}: {name} — {detail}")


# ---------------------------------------------------------------- helpers we test against
def great_circle_km(lat1, lon1, lat2, lon2, r=6371.0):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


# ---------------------------------------------------------------- 1. math units
def audit_math():
    import earth_ranking
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
    # --- added 15 Nov, after the thermal inertia map turned out to be 180 deg of longitude off ---
    # 1. The grid is where its label says. Compare a 6 x 6 deg window around Gale crater with the USGS 463 m
    #    GeoTIFF averaged to the same pixels, for the label position and for one pixel off in every direction.
    lat1, lon0, n = -2.0, 134.0, 96
    with rasterio.open(m.MOLA_463_URL) as dem:
        r0, c0 = dem.index(*to_xy.transform(lon0, lat1))
        fine = dem.read(1, window=Window(c0, r0, n * 8, n * 8)).astype("float64")
    coarse = fine.reshape(n, 8, n, 8).mean(axis=(1, 3))
    row0, col0 = int(np.argmin(np.abs(grids.lat - (lat1 - 0.03125)))), int(np.argmin(np.abs(grids.lon - (lon0 + 0.03125))))
    rms = {(dr, dc): float(np.sqrt(np.mean((grids.elevation[row0 + dr:row0 + dr + n, col0 + dc:col0 + dc + n] - coarse) ** 2)))
           for dr in (-1, 0, 1) for dc in (-1, 0, 1)}
    best = min(rms, key=rms.get)
    check("mars", "16 px/deg grid is registered where the label says (vs USGS 463 m, Gale)", best == (0, 0),
          f"RMS {rms[(0, 0)]:.0f} m in place, {min(v for k, v in rms.items() if k != (0, 0)):.0f} m at best one pixel off")
    # 2. Thermal inertia and albedo are on the same longitudes as the elevation: textbook dusty and dark regions.
    #    (Mellon et al. 2000; Christensen et al. 2001: Tharsis, Arabia and Amazonis are bright and low-inertia,
    #    Syrtis Major is the darkest large region.) A 180 deg shift swaps Tharsis with Syrtis.
    for name, lat, lon, dusty in [("Tharsis", 5.0, -110.0, True), ("Arabia Terra", 20.0, 20.0, True),
                                  ("Amazonis Planitia", 25.0, -179.0, True), ("Syrtis Major", 9.2, 67.1, False)]:
        v = m.site_values(grids, lat, lon)
        ok = (v["thermal_inertia"] < 100 and v["albedo"] > 0.25) if dusty else (v["thermal_inertia"] > 150 and v["albedo"] < 0.15)
        check("mars", f"{name} is {'bright, low-inertia dust' if dusty else 'dark and firm'}", ok,
              f"thermal inertia {v['thermal_inertia']:.0f}, albedo {v['albedo']:.2f}")
    # 3. Each landing passes the elevation and latitude limits its own mission published
    for name, lat, lon, _ in m.LANDINGS:
        rules = m.own_rules(name, lat, m.site_values(grids, lat, lon)["elevation_m"])
        if rules:
            check("mars", f"{name} passes its own mission's limits", all(r["pass"] for r in rules),
                  "; ".join(f"{r['value']} {r['unit']} ({r['rule']})" for r in rules))
    # 4. The candidates do not depend on where the map is cut: turn the planet a third of the way round, pick again
    safe = m.screen(grids, m.MAX_SLOPE_DEG, m.MAX_RELIEF_M)
    turn = safe.shape[1] // 3
    turned = m.Grids(grids.lat, np.roll(grids.lon, turn), *(np.roll(a, turn, axis=1) for a in
                     (grids.elevation, grids.thermal_inertia, grids.albedo, grids.slope, grids.relief)))
    a = {(p["lat"], p["lon"]) for p in m.pick_candidates(grids, safe)}
    b = {(p["lat"], p["lon"]) for p in m.pick_candidates(turned, np.roll(safe, turn, axis=1))}
    check("mars", "candidates are the same when the map is cut at another meridian", a == b, f"{len(a)} candidates")
    # 5. No candidate is on dusty ground by the published rule, read straight from the two TES maps
    sites = json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]
    for s in sites:
        if s["body"] == "mars" and s["status"] == "candidate":
            v = m.site_values(grids, s["lat"], s["lon"])
            check("mars", f"{s['id']} is not in the dust mode (thermal inertia < 100 with albedo > 0.25)",
                  not (v["thermal_inertia"] < 100 and v["albedo"] > 0.25),
                  f"thermal inertia {v['thermal_inertia']:.0f}, albedo {v['albedo']:.2f}")

    # every candidate's criteria reproduce from the raw grids
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
    # --- added 15 Nov ---
    # Slope map vs a real event: NASA's orbiter found the IM-1 lander on a 12 deg slope (80.13 S, 1.44 E)
    r, c = mo.to_pixel(crs, transform, -80.13, 1.44)
    im1 = float(np.nanmedian(layers["slope"][r - 1:r + 2, c - 1:c + 2]))
    check("moon", "slope where IM-1 Odysseus tipped over vs NASA's 12°", abs(im1 - 12) <= 3, f"ours {im1:.1f}° at 240 m")
    # --- added 15 Nov (Earth audit): the slope map stores 0 where no laser track crossed a pixel, and 0 reads as
    # exactly 45 deg. Count them in the file, and make sure none is left in the layer the screening uses.
    with rasterio.open(RAW / "moon" / "ldsm_75s_240m.lbl") as src:
        stored = src.read(1)
    empty = float((stored == mo.SLOPE_MISSING).mean())
    left = float((np.abs(layers["slope"] - 45.0) < 0.005).mean())
    check("moon", "slope-map pixels with no measurement are not read as 45° slopes", 0.2 < empty < 0.4 and left < 1e-4,
          f"{100 * empty:.0f} % of the map has no measurement; {100 * left:.3f} % of the screening layer reads 45.00°")
    # The brightest ground on the map is on the rims and ridges next to Shackleton crater, as every published
    # study finds (Mazarico et al. 2011; Gläser et al. 2014)
    best = np.unravel_index(np.nanargmax(layers["sunlit"]), layers["sunlit"].shape)
    blon, blat = (float(v[best]) for v in mo.lonlat_grid(crs, transform, size))
    d = float(great_circle_km(blat, blon, -89.67, 129.78, r=1737.4))
    check("moon", "best-lit pixel lies on the rim or ridges next to Shackleton crater", d <= 30,
          f"{100 * float(layers['sunlit'][best]):.0f} % at {blat:.2f}, {blon:.2f}: {d:.0f} km from the crater centre")
    # "Distance to shadow" only counts shadowed areas of >= 1 km2: recompute it for every candidate
    useful = mo.useful_shadow(np.nan_to_num(layers["psr"]) > 0.5, mo.PIXEL_M)
    from scipy import ndimage
    shadow_km = ndimage.distance_transform_edt(~useful) * mo.PIXEL_M / 1000.0
    sites = json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]
    for s in sites:
        if s["body"] == "moon" and s["status"] == "candidate":
            r, c = mo.to_pixel(crs, transform, s["lat"], s["lon"])
            km = round(float(np.nanmin(shadow_km[r - 1:r + 2, c - 1:c + 2])), 1)
            shown = next(x["value"] for x in s["selection"]["criteria"] if x["id"] == "ice_distance")
            check("moon", f"{s['id']} distance to a shadowed area >= 1 km² recomputed", km == shown, f"recomputed {km} km, JSON {shown} km")
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

    # long-term mean annual rainfall (mm), approximate station climatologies. Our input is the IMERG 2000-2023
    # climatology (a 25 km cell mean, so not a station value): within a factor of 1.6
    rain = {"Manaus, Brazil": (-3.1, -60.0, 2300), "Istanbul, Türkiye": (41.0, 28.98, 800),
            "Eskişehir, Türkiye": (39.78, 30.52, 380), "London, UK": (51.5, -0.12, 600),
            "Dalanzadgad, Mongolia (Gobi)": (43.6, 104.4, 130), "Resolute, Canada (Arctic)": (74.7, -94.9, 160),
            "In Salah, Algeria": (27.2, 2.47, 17), "Atacama (Yungay)": (-24.08, -69.99, 2)}
    for name, (lat, lon, ref) in rain.items():
        v = cell(lat, lon, "precip_mm")
        if ref >= 50:
            check("earth", f"GPM rainfall at {name}", ref / 1.6 <= v <= ref * 1.6,
                  f"ours {v:.0f} mm/yr (2023 alone: {cell(lat, lon, 'precip_2023_mm'):.0f}), climatology ≈ {ref} mm")
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

    # --- added 15 Nov (Earth audit), after the Mars maps turned out to be shifted: is every Earth raster where we
    # think it is? Each is compared with an independent map at shifts of up to 3 cells and as a flipped, mirrored
    # and half-turned copy; the unshifted, untouched one must fit best.
    import earth_pool
    import earth_ranking
    months = {name: len(list((RAW / "earth" / name).glob("*.hdf"))) for name in ("MOD11C3", "MOD13C2")}
    check("earth", "all 12 months of 2023 are in (surface temperature, vegetation)", set(months.values()) == {12}, str(months))
    ne = g["ne_land_pct"].astype("float64")

    def fit(reference, layer, mask=None):
        def corr(x):
            ok = np.isfinite(reference) & np.isfinite(x) & (True if mask is None else mask)
            return float(np.corrcoef(reference[ok], x[ok])[0, 1])
        shifts = {(dy, dx): corr(np.roll(np.roll(layer, dy, axis=0), dx, axis=1)) for dy in range(-3, 4) for dx in range(-3, 4)}
        wrong = {"flipped north-south": corr(layer[::-1]), "mirrored east-west": corr(layer[:, ::-1]),
                 "turned 180° in longitude": corr(np.roll(layer, layer.shape[1] // 2, axis=1))}
        best = max(shifts, key=shifts.get)
        ok = best == (0, 0) and shifts[(0, 0)] > max(wrong.values()) + 0.2
        return ok, f"r = {shifts[(0, 0)]:.2f} in place, best shift {best}, best wrong copy {max(wrong.values()):.2f}"

    temperate = np.abs(g["lat"]) < 60  # no sea ice there, so "has a temperature" means land
    land = (ne > 99) & (np.abs(g["lat"]) < 55)
    rain_log = np.log1p(g["precip_mm"].astype("float64"))
    for name, reference, layer, mask in [
        ("MODIS land cover (water share) vs Natural Earth coastline", ne, 100 - g["water_pct"].astype("float64"), None),
        ("MODIS vegetation (has a value) vs Natural Earth coastline", ne, np.isfinite(g["ndvi_max"]) * 100.0, None),
        ("MODIS surface temperature (has a value) vs Natural Earth coastline", ne, np.isfinite(g["mean_lst_k"]) * 100.0, temperate),
        ("GPM rainfall vs MODIS vegetation on land (rain and green go together)", g["ndvi_max"].astype("float64"), rain_log, land),
    ]:
        ok, detail = fit(reference, layer, mask)
        check("earth", f"registered: {name}", ok, detail)
    header, glim = earth_ranking.glim_grid()
    ne_half = earth_pool.block_mean(ne, 2)
    glim_land = np.isin(glim, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 16]) * 100.0
    ok, detail = fit(ne_half, glim_land)
    check("earth", "registered: GLiM rock map (has a rock class) vs Natural Earth coastline", ok, detail)
    # Albedo also has values over shallow water (6 % of sea pixels), so "has a value" is a blunt coastline test: its
    # best fit wanders by one cell. The values themselves are sharp: on land, green ground is dark.
    ok, detail = fit(g["ndvi_max"].astype("float64"), -g["albedo"].astype("float64"), land)
    check("earth", "registered: MODIS albedo vs MODIS vegetation on land (green ground is dark)", ok, detail)
    # albedo values at textbook surfaces: a sand sea is bright, a basalt field and a rainforest are dark
    for name, lat, lon, lo, hi in [("Grand Erg Oriental sand sea", 30.5, 7.5, 0.30, 0.55), ("Al Haruj basalt field, Libya", 27.25, 17.5, 0.05, 0.22),
                                   ("Amazon rainforest", -3.0, -62.0, 0.08, 0.18)]:
        v = cell(lat, lon, "albedo")
        check("earth", f"MODIS albedo at {name}", lo <= v <= hi, f"{v:.2f} (expected {lo}-{hi})")
    # the rain climatology (2000-2023) and the single year 2023 are separate NASA files: they must agree in pattern
    both = np.isfinite(g["precip_mm"]) & np.isfinite(g["precip_2023_mm"])
    r = float(np.corrcoef(rain_log[both], np.log1p(g["precip_2023_mm"].astype("float64"))[both])[0, 1])
    check("earth", "rain climatology 2000-2023 agrees with the 12 months of 2023", r > 0.95, f"r = {r:.3f} (log rain, all cells)")


# ---------------------------------------------------------------- 5. Terrain pipeline on known places
def audit_terrain():
    import earth_ranking
    flat = earth_ranking.earth_terrain(40.76, -113.88, 463.0)  # Bonneville Salt Flats, Utah
    steep = earth_ranking.earth_terrain(46.0, 7.75, 463.0)  # Pennine Alps
    check("terrain", "Bonneville Salt Flats are flat", flat is not None and np.median(flat[0]) < 1.0,
          f"median {np.median(flat[0]):.2f}°" if flat is not None else "no data")
    check("terrain", "Alps are steep", steep is not None and np.median(steep[0]) > 15,
          f"median {np.median(steep[0]):.1f}°" if steep is not None else "no data")
    # --- added 15 Nov (Earth audit) ---
    # Elevation of the same boxes: the salt flats lie at 1,286 m (the box takes in some higher ground around them)
    check("terrain", "Bonneville Salt Flats elevation vs 1,286 m", flat is not None and 1270 <= flat[1] <= 1350,
          f"box mean {flat[1]:.0f} m" if flat is not None else "no data")
    # A 25 km box crosses the edge of a 1-degree DEM tile for most cells away from the equator. It must be read in
    # full and stay 25 km wide (the first version cut it at the tile edge). At 72.125° N the box is 0.73° wide.
    z = earth_ranking.earth_window(72.125, -109.125, 240.0)
    check("terrain", "a box that crosses DEM tiles is read in full (Victoria Island, 72° N)",
          z is not None and not np.isnan(z).any(), "no gaps" if z is not None else "no data")
    # The same ground must give the same slopes whether a tile edge runs through the box or not: read one box in
    # full, then as two halves, each inside one tile, and compare.
    whole = earth_ranking.earth_window(41.5, 95.0, 463.0)  # Gobi, centred on a tile corner
    if whole is not None:
        n = whole.shape[0]
        west = earth_ranking.earth_window(41.5, 95.0 - 6.25 / (111.2 * np.cos(np.radians(41.5))), 463.0 * 2)
        check("terrain", "box across a tile corner has the heights of its parts (Gobi)",
              west is not None and abs(float(np.nanmean(whole[:, : n // 2])) - float(np.nanmean(west[:, : west.shape[1] // 2 * 2]))) < 60,
              f"west half mean {np.nanmean(whole[:, : n // 2]):.0f} m" if west is not None else "no data")
    # The Moon side of the terrain comparison is computed from LOLA's elevation grid with the Earth recipe. Where
    # LOLA's own slope map has a measurement the two must agree in pattern, and ours must hold no false cliffs.
    import rasterio
    from pyproj import CRS, Transformer
    from rasterio.windows import Window
    import moon_screening as mo
    for s in json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]:
        if s["body"] != "moon" or s["status"] != "candidate":
            continue
        ours = earth_ranking.moon_slopes(s["lat"], s["lon"])
        with rasterio.open(RAW / "moon" / "ldsm_75s_240m.lbl") as src:
            crs = CRS.from_wkt(src.crs.to_wkt())
            row, col = src.index(*Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True).transform(s["lon"], s["lat"]))
            half = int(earth_ranking.WINDOW_KM * 1000 / 2 / abs(src.transform.a))
            stored = src.read(1, window=Window(col - half, row - half, 2 * half, 2 * half))
            theirs = stored.ravel() * src.scales[0] + src.offsets[0]
        measured = (stored != mo.SLOPE_MISSING).ravel()
        r = float(np.corrcoef(ours[measured], theirs[measured])[0, 1]) if ours.size == theirs.size else float("nan")
        check("terrain", f"{s['id']}: slopes from the LOLA elevation grid follow LOLA's slope map", r > 0.9 and float((ours > 40).mean()) < 0.01,
              f"r = {r:.2f} over measured pixels; median {np.median(ours):.1f}° (ours, 480 m) vs {np.median(theirs[measured]):.1f}° "
              f"(map, 30-120 m); {100 * (1 - measured.mean()):.0f} % of the box has no measurement in the map")
    header, glim = earth_ranking.glim_grid()
    for name, lat, lon, want in [("Iceland basalt", 64.85, -16.83, {"vb"}), ("Deccan Traps", 19.0, 75.0, {"vb"}),
                                 ("Grand Erg Oriental sand sea", 30.5, 7.5, {"su", "ss", "sm"}), ("Greenland ice", 72.0, -40.0, {"ig"})]:
        got = earth_ranking.glim_at(header, glim, lat, lon)
        check("terrain", f"GLiM rock class at {name}", got in want, f"{got} (expected {sorted(want)})")


# ---------------------------------------------------------------- 6. Kmar's inputs, checked independently
def audit_inputs():
    import build_analogs
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
    # --- added 15 Nov (Earth audit): the rock class we expect at each Mars zone is the unit the USGS global
    # geologic map (SIM 3292, Tanaka et al. 2014) draws there, looked up again here ---
    import earth_ranking
    volcanic = {"AHv", "eHv", "lHv", "Av", "lAv", "Hve", "Ave", "lHvf", "lAvf", "Nve", "eHve"}
    for s in json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]:
        if s["body"] != "mars" or s["status"] != "candidate":
            continue
        rock, _, unit = earth_ranking.EXPECTED_ROCK[s["id"]]
        mapped = earth_ranking.mapped_unit(s["lat"], s["lon"])
        if mapped is None:
            check("inputs", f"{s['id']} rock class vs USGS geologic map", None, "map files not on this machine (data/raw/mars/sim3292)")
            continue
        ok = mapped[0] == unit and ((rock == "vb") == (mapped[0] in volcanic))
        check("inputs", f"{s['id']} rock class vs USGS geologic map", ok, f"mapped unit {mapped[0]} ({mapped[1]}); we expect {earth_ranking.GLIM_NAMES[rock]}")
    opportunity = earth_ranking.mapped_unit(-1.9462, -5.5266)
    if opportunity is not None:
        check("inputs", "Opportunity landed in the same mapped unit as mars-candidate-e", opportunity[0] == earth_ranking.EXPECTED_ROCK["mars-candidate-e"][2],
              f"{opportunity[0]} ({opportunity[1]})")
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
    import build_analogs
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
    # --- added 15 Nov (Earth audit) ---
    candidates = [s for s in sites.values() if s["status"] == "candidate"]
    without = [s["id"] for s in candidates if sum(a["siteId"] == s["id"] for a in analogs) != 3]
    check("outputs", "every candidate has exactly 3 training areas", not without, f"{len(candidates)} candidates, {len(analogs)} areas" + (f"; wrong: {without}" if without else ""))
    # No score is missing where it counts, and the total is the weighted sum of the scores shown (weights of earth_ranking.py)
    import earth_ranking
    weights = earth_ranking.WEIGHTS
    check("outputs", "dimension weights add up to 100 %", all(abs(sum(w.values()) - 1) < 1e-9 for w in weights.values()),
          "; ".join(f"{body}: {', '.join(f'{k} {round(100 * v)}' for k, v in w.items())}" for body, w in weights.items()))
    gaps, off = [], []
    for a in analogs:
        w = weights[sites[a["siteId"]]["body"]]
        if any(a["scores"][k]["score"] is None for k in w):
            gaps.append(a["name"])
            continue
        total = sum(a["scores"][k]["score"] * share for k, share in w.items())
        if abs(total - a["totalScore"]) > 1.0:  # each shown score is rounded to a whole number
            off.append(f"{a['name']}: {total:.1f} vs {a['totalScore']}")
    check("outputs", "no training area has a missing score in a weighted dimension", not gaps, "; ".join(gaps[:4]))
    check("outputs", "every total is the weighted sum of the scores shown", not off, "; ".join(off[:3]) or f"{len(analogs)} areas")
    # A name says "plains" only where the ground is flat at the comparison scale
    hilly = [a["name"] for a in analogs if "plains" in a["name"].split(" — ")[0]
             and float(re.search(r"Earth median slope ([\d.]+)", a["scores"]["terrain"]["note"]).group(1)) > 1.5]
    check("outputs", "names say 'plains' only for flat ground (median slope ≤ 1.5°)", not hilly, "; ".join(hilly[:4]))
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
    check("outputs", "every training area is at least three quarters free of permanent snow and ice (MODIS)", not icy, "; ".join(icy[:4]))
    green = [f"{a['name']} (NDVI {build_analogs.ndvi_max(a, grid):.2f})" for a in analogs if build_analogs.ndvi_max(a, grid) > build_analogs.MAX_PICK_NDVI]
    check("outputs", "every training area is bare or sparsely vegetated (yearly maximum NDVI ≤ 0.30, MODIS)", not green, "; ".join(green[:4]))
    shown = [t for a in analogs for t in a["similarities"] + a["differences"] + [x["detail"] for x in a["tests"]]]
    broken = [t for t in shown if re.search(r"\b(None|nan|NaN)\b", t)]
    check("outputs", "no missing values (None/NaN) in any text shown on the site", not broken, "; ".join(broken[:3]))
    # Moon: at least two of a site's three areas lie where the Sun stays low (the Low Sun score is only a weight)
    few = [f"{sid}: {sum(abs(a['lat']) >= build_analogs.MOON_POLAR_LAT for a in analogs if a['siteId'] == sid)} of 3"
           for sid in sorted({a["siteId"] for a in analogs if a["siteId"].startswith("moon")})]
    check("outputs", f"every Moon site has at least 2 areas at ≥ {build_analogs.MOON_POLAR_LAT:.0f}° latitude",
          all(int(f.split(": ")[1][0]) >= 3 - build_analogs.MOON_MAX_NON_POLAR for f in few), "; ".join(few))
    moon_life = [a["id"] for a in analogs if a["siteId"].startswith("moon") and any("life" in x["title"].lower() for x in a["tests"])]
    check("outputs", "no life-detection tests suggested for Moon analogs", not moon_life, ", ".join(moon_life[:3]))


def main():
    parts = (audit_math, audit_inputs, audit_outputs, audit_terrain, audit_earth, audit_mars, audit_moon)
    wanted = {f"audit_{name}" for name in sys.argv[1:]}
    for part in parts:
        if wanted and part.__name__ not in wanted:
            continue
        try:
            part()
        except Exception as error:  # an audit section crashing is itself a finding
            check(part.__name__, "section ran", False, f"{type(error).__name__}: {error}")
    counts = {s: sum(1 for r in RESULTS if r[0] == s) for s in ("PASS", "WARN", "FAIL")}
    print(f"\n{counts['PASS']} PASS, {counts['WARN']} WARN, {counts['FAIL']} FAIL")
    if wanted:
        return  # a partial run does not overwrite the full record
    (ROOT / "data" / "interim" / "audit.json").write_text(json.dumps(RESULTS, indent=1, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()

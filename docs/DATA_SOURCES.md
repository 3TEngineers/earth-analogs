# Data sources

One row per dataset we consider. **Checked** means someone actually read or queried it and confirmed it works — until then treat the notes as unverified. Re-run the checks any time with:

```bash
pipeline/.venv/Scripts/python pipeline/check_access.py     # Windows
pipeline/.venv/bin/python pipeline/check_access.py         # macOS / Linux
```

Last run: **2026-11-14** (Sadık, B1). All checks passed.

**Second check, 2026-11-15 (full audit):** every Mars and Moon layer used by the screening was read again by a second route and compared with an independent source (`AUDIT.md`, errors 11–15). Two read errors were found and fixed; both are in the gotchas of the Mars table below. "Checked" in the planetary tables now means checked both ways.

## Moon

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| LOLA global DEM 118 m | Elevation, slope | https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif — 92160×46080, not tiled; small windows read remotely in ~5 s | **Yes** — Chandrayaan-3 area ≈ 535 m |
| LOLA average sunlit time, south pole 75°S, 120 m | Base-site screening: power | https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_75S_120M_201608.TIF — 83 MB, polar stereographic, values are **fractions 0–1**. Downloaded to `data/raw/` (one-time, ~2 min) | **Yes** — near Mons Mouton 0.0–0.5 |
| LOLA average Earth visibility, 75°S, 120 m | Base-site screening: comms | `…/AVGVISIB_75S_120M_201608_EARTH.TIF` — 43 MB, fractions 0–1 | **Yes** — near Mons Mouton 0.0–0.9 |
| LOLA permanently shadowed regions, 75°S, 120 m | Base-site screening: distance to ice | `…/LPSR_75S_120M_201608.TIF` — 1 MB, 0/1 mask | **Yes** |
| Same products at 65°S 240 m | Chandrayaan-3 check (69°S, outside the 75°S grid) | Same folder; `AVGVISIB_65S_240M_201608.TIF` (60 MB), `_EARTH` (23 MB), `LPSR_65S_240M_201608.TIF` | **Yes** (B2). 15 Nov: also used for IM-1 and IM-2 |
| Same products at 85°S 60 m | Finer pole detail | Same folder; sunlit 34 MB, Earth 25 MB | Files exist (not read) |
| LOLA south-pole slope map, 240 m | Base-site screening: slope | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldsm_75s_240m.lbl + `.img` (29 MB), same polar stereographic grid family as PGDA; DEMs `ldem_75s_*` also there | **Yes** (B2). 15 Nov: in place against the 118 m DEM (best match at zero shift); reads 11.0° where NASA found the IM-1 lander on a 12° slope |

**Scale gotcha:** every PGDA and LOLA polar layer is int16 with a scale/offset (sunlit and Earth ×4e-5; PSR ×2.5e-5 + 0.5; slope ×0.0015 + 45). Always apply `src.scales` / `src.offsets`.
| LRO Diviner | Surface temperature, rock abundance | https://pds-geosciences.wustl.edu/missions/lro/diviner.htm | No |
| Artemis III candidate regions | Validation for base-site screening (2024 list of 9) | NASA announcement; coordinates of the named features in `LANDING_CONSTRAINTS.md` §3 | **Yes** — all 7 feature coordinates match the USGS Gazetteer (audit) |
| Past south-polar landings (Chandrayaan-3, IM-1, IM-2) | Second validation of the base-site rules | Coordinates and sources in `LANDING_CONSTRAINTS.md` §3b | **Yes** (15 Nov) — Chandrayaan-3 matches the Gazetteer's Statio Shiv Shakti |

Note: PGDA's page links `*_COG.TIF` versions, but the server returns 404 for all of them (checked 2026-11-14). Use the plain `.TIF`.

## Mars

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| MOLA MEGDR topography, 16 px/deg (~3.7 km) | Global landing screening: elevation, slope, relief | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.lbl + `.img` (33 MB). **Gotchas:** (1) the label says column 0 is 0°E but GDAL's transform starts at −180°; (2) GDAL's PDS driver also places the grid **one pixel (3.7 km) off**. Do not use GDAL's transform: pixel centres come from the label, row r at 90 − (r + 0.5)/16 °N, column c at (c + 0.5)/16 °E, then roll half a turn for −180..180 (`load_grids()`) | **Yes** (B2; 15 Nov: 89 m RMS against the 463 m DEM around Gale in place, ≥ 194 m one pixel off; all 7 lander elevations within 60 m) |
| MOLA DEM 463 m | Elevation, slope (km scale) | https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif — 46080×23040, not tiled; small windows read remotely in ~7–20 s | **Yes** — Jezero ≈ −2510 m (floor −2675 m) |
| MGS TES thermal inertia, global 8 px/deg | Landing screening: dust / load-bearing surface | https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-special-v1/global_ti_60n_50s_8ppd.lbl + `.img` — 10 MB, 60.125°N–50.125°S, east-positive −180..180. **Gotchas:** GDAL places it one pixel (7.4 km) off, so `read_tes()` takes the geometry from the label; and it must be rolled together with the elevation (until 15 Nov it was not: every value was 180° of longitude away) | **Yes** — Jezero ≈ 311, Pathfinder 400, Opportunity 256; Tharsis, Arabia and Amazonis read as dust, Syrtis Major as firm (15 Nov) |
| MGS TES bolometric albedo, global 8 px/deg | Landing screening: second dust check (bright + low thermal inertia = dust) | `…/mgs-m-tes-special-v1/global_albedo_8ppd.lbl` + `.img`, global, same grid family and the same label-geometry read | **Yes** (15 Nov) — Tharsis, Arabia, Amazonis > 0.25; Syrtis Major < 0.15 |
| TES thermal inertia 2007 day/night maps | Alternative to the above | `https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-5-timap-v1/mgst_9001/data/global_ti_night_2007.img` (+ day, masks) | Files exist (not read) |
| MOLA–HRSC blended DEM 200 m | Higher-res topography (~11 GB) | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m | No — not needed yet |
| Rock abundance (global) | Lander tip-over hazard (MSL: about 10 % of the area) | Searched again on 15 Nov: no global raster we could download and verify. **Not screened**; stated as a limit | No |
| Published landing constraints | Screening thresholds (MER, MSL, Phoenix, InSight, Mars 2020) | https://marsoweb.nas.nasa.gov/landingsites/msl/memoranda/MSL_Eng_User_Guide_v2.pdf and https://www.hou.usra.edu/meetings/lpsc2017/pdf/2163.pdf, both **read in full** on 15 Nov; the rest from abstracts — all in `LANDING_CONSTRAINTS.md` | **Yes** |
| USGS Gazetteer of Planetary Nomenclature, centre points (Mars and Moon) | Official names and coordinates: checks the Artemis features and Chandrayaan-3's site, names our candidates | https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.zip and `MOON_nomenclature_center_pts.zip` (shapefiles, a few MB) → `data/raw/names/` | **Yes** (audit) |
| HiRISE DTMs | Very high-res topography, small areas only | https://stac.astrogeology.usgs.gov/docs/data/mars/hirise_dtms/ | No |

## Earth

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| Copernicus DEM GLO-30 | Elevation, slope, roughness | AWS open data, no login: `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM/...tif` — 1°×1° cloud-optimized tiles, windows read in ~2 s | **Yes** — Lake Salda 1135.5 m (true ≈ 1140 m) |
| MODIS land surface temperature (MOD11A2 v061, 8-day 1 km) | Day/night temperature swing | Earthdata (search: no login; download: login) | **Search yes** — 46 files / 216 MB for one year over Salda |
| MODIS vegetation index (MOD13A2 v061, 16-day 1 km) | Vegetation cover | Earthdata | **Search yes** — 24 files / 277 MB per year |
| GPM IMERG monthly (GPM_3IMERGM v07) | Precipitation / aridity | Earthdata (GES DISC) — **needs the "NASA GESDISC DATA ARCHIVE" app authorised once in your Earthdata profile** (Applications → Authorized Apps), else `EulaNotAccepted`. HDF5, read with `h5py`: `Grid/precipitation` (lon, lat ascending), mm/hr | **Yes** (B3) — 12 global files for 2023, 214 MB |
| MODIS LST monthly CMG (MOD11C3 v061, 0.05°) | Global day/night temperature swing, mean temperature | Earthdata (LP DAAC). HDF4 — GDAL in the rasterio wheel can't read it, use `pyhdf`: `LST_Day_CMG`, `LST_Night_CMG`, × 0.02 K, fill 0 | **Yes** (B3) — Jan/Apr/Jul/Oct 2023, ~280 MB |
| MODIS NDVI monthly CMG (MOD13C2 v061, 0.05°) | Global vegetation | Earthdata (LP DAAC), HDF4 via `pyhdf`: `CMG 0.05 Deg Monthly NDVI`, × 1e-4, fill −3000. No data over Antarctica | **Yes** (B3) — same 4 months, ~390 MB |
| MODIS land cover CMG (MCD12C1 v061, 0.05°) | Ice-sheet mask and barren fraction | Earthdata (LP DAAC), HDF4 via `pyhdf`: `Land_Cover_Type_1_Percent` (IGBP class 15 snow/ice, 16 barren). **Gotchas:** ice shelves and the polar plateau have empty percentages; the McMurdo Dry Valleys are mostly "ice" at 0.05° | **Yes** (B3) — 2023, 1.2 GB |
| EMIT L2B mineral identification (60 m) | Surface minerals, arid regions only (±54° lat) | Earthdata | **Search yes** — 33 granules / 3 GB over Salda since 2022: too big to pull everywhere, subset or pick single granules |
| Permafrost extent | Frozen ground | Not used — mean MODIS surface temperature below 0 °C is our proxy | — |
| GLiM global lithological map, 0.5° (Hartmann & Moosdorf 2012) | Rock type (basalt `vb`, basic plutonic incl. anorthosite `pb`, sediments `su/ss/sm`, …) | https://doi.pangaea.de/10.1594/PANGAEA.788537 ; zip from https://epic.awi.de/id/eprint/31092/ (38 kB, ASCII grid + `Classnames.txt`) | **Yes** (B4) — Iceland `vb`, Atacama `su` |
| Natural Earth regions and countries (10m) | Naming Earth places | https://naciscdn.org/naturalearth/10m/physical/ne_10m_geography_regions_polys.zip, …/cultural/ne_10m_admin_0_countries.zip | **Yes** (B5) |

## Access notes

- **Earthdata Login** (free, https://urs.earthdata.nasa.gov/) is needed to *download* MODIS, GPM and EMIT; searching works without it. Put credentials in a local `.env` (see `.env.example`), never in code.
- MODIS and GPM files are global or tiled — for many locations, AppEEARS (https://appeears.earthdatacloud.nasa.gov/) can subset server-side.
- Downloaded files go to `data/raw/` (git-ignored).

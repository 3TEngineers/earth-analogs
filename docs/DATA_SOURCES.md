# Data sources

One row per dataset we consider. **Checked** means someone actually read or queried it and confirmed it works — until then treat the notes as unverified. Re-run the checks any time with:

```bash
pipeline/.venv/Scripts/python pipeline/check_access.py     # Windows
pipeline/.venv/bin/python pipeline/check_access.py         # macOS / Linux
```

Last run: **2026-11-14** (Sadık, B1). All checks passed.

## Moon

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| LOLA global DEM 118 m | Elevation, slope | https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif — 92160×46080, not tiled; small windows read remotely in ~5 s | **Yes** — Chandrayaan-3 area ≈ 535 m |
| LOLA average sunlit time, south pole 75°S, 120 m | Base-site screening: power | https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_75S_120M_201608.TIF — 83 MB, polar stereographic, values are **fractions 0–1**. Downloaded to `data/raw/` (one-time, ~2 min) | **Yes** — near Mons Mouton 0.0–0.5 |
| LOLA average Earth visibility, 75°S, 120 m | Base-site screening: comms | `…/AVGVISIB_75S_120M_201608_EARTH.TIF` — 43 MB, fractions 0–1 | **Yes** — near Mons Mouton 0.0–0.9 |
| LOLA permanently shadowed regions, 75°S, 120 m | Base-site screening: distance to ice | `…/LPSR_75S_120M_201608.TIF` — 1 MB, 0/1 mask | **Yes** |
| Same products at 65°S 240 m | Chandrayaan-3 check (69°S, outside the 75°S grid) | Same folder; `AVGVISIB_65S_240M_201608.TIF` (60 MB), `_EARTH` (23 MB), `LPSR_65S_240M_201608.TIF` | **Yes** (B2) |
| Same products at 85°S 60 m | Finer pole detail | Same folder; sunlit 34 MB, Earth 25 MB | Files exist (not read) |
| LOLA south-pole slope map, 240 m | Base-site screening: slope | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldsm_75s_240m.lbl + `.img` (29 MB), same polar stereographic grid family as PGDA; DEMs `ldem_75s_*` also there | **Yes** (B2) |

**Scale gotcha:** every PGDA and LOLA polar layer is int16 with a scale/offset (sunlit and Earth ×4e-5; PSR ×2.5e-5 + 0.5; slope ×0.0015 + 45). Always apply `src.scales` / `src.offsets`.
| LRO Diviner | Surface temperature, rock abundance | https://pds-geosciences.wustl.edu/missions/lro/diviner.htm | No |
| Artemis III candidate regions | Validation for base-site screening (2024 list of 9) | NASA announcements — Kmar collects coordinates in K3b | No |

Note: PGDA's page links `*_COG.TIF` versions, but the server returns 404 for all of them (checked 2026-11-14). Use the plain `.TIF`.

## Mars

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| MOLA MEGDR topography, 16 px/deg (~3.7 km) | Global landing screening: elevation, slope, relief | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.lbl + `.img` (33 MB). **Gotcha:** the label says column 0 is 0°E but GDAL's transform starts at −180°; roll the data half a turn (checked: Jezero −2561 m, Gale −4485 m) | **Yes** (B2) |
| MOLA DEM 463 m | Elevation, slope (km scale) | https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif — 46080×23040, not tiled; small windows read remotely in ~7–20 s | **Yes** — Jezero ≈ −2510 m (floor −2675 m) |
| MGS TES thermal inertia, global 8 px/deg | Landing screening: dust / load-bearing surface | https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-special-v1/global_ti_60n_50s_8ppd.lbl + `.img` — 10 MB, 60°N–50°S, east-positive −180..180; GDAL reads the PDS3 label directly | **Yes** — Jezero ≈ 314 |
| TES thermal inertia 2007 day/night maps | Alternative to the above | `https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-5-timap-v1/mgst_9001/data/global_ti_night_2007.img` (+ day, masks) | Files exist (not read) |
| MOLA–HRSC blended DEM 200 m | Higher-res topography (~11 GB) | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m | No — not needed yet |
| Rock abundance (global) | Lander tip-over hazard | Not found — optional | No |
| Published landing constraints | Screening thresholds (MER, MSL, Phoenix, InSight, Mars 2020) | e.g. https://marsoweb.nas.nasa.gov/landingsites/msl/memoranda/MSL_Eng_User_Guide_v2.pdf, https://pubs.usgs.gov/publication/70025013 — Kmar collects in K3b | No |
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
| Permafrost extent | Frozen ground | To find | No |
| Global lithology map | Rock type (e.g. anorthosite vs basalt) | To find | No |

## Access notes

- **Earthdata Login** (free, https://urs.earthdata.nasa.gov/) is needed to *download* MODIS, GPM and EMIT; searching works without it. Put credentials in a local `.env` (see `.env.example`), never in code.
- MODIS and GPM files are global or tiled — for many locations, AppEEARS (https://appeears.earthdatacloud.nasa.gov/) can subset server-side.
- Downloaded files go to `data/raw/` (git-ignored).

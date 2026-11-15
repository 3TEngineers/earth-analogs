# pipeline/

Python code that downloads and processes Earth, Moon and Mars data, screens candidate sites, scores Earth training areas and writes `app/public/data/*.json`. Owner: Sadık. Steps B0–B9: [`docs/PROJECT_PLAN.md`](../docs/PROJECT_PLAN.md).

## Setup (once)

Python 3.12.

```bash
python -m venv pipeline/.venv
pipeline/.venv/Scripts/python -m pip install -r pipeline/requirements.txt   # Windows
pipeline/.venv/bin/python -m pip install -r pipeline/requirements.txt       # macOS / Linux
```

## Files

| File | What it does |
|---|---|
| `schema.py` | Pydantic models for the output JSON — keep in sync with `docs/DATA_CONTRACT.md` |
| `check_access.py` | B1: reads a small window from every dataset and searches Earthdata; results recorded in `docs/DATA_SOURCES.md` |
| `mars_screening.py` | B2: screens all of Mars for safe landing zones (elevation, latitude, thermal inertia + albedo, slope, relief), validates on the 11 past landings against our rules **and** each mission's own limits → `data/interim/mars_screening.json` |
| `moon_screening.py` | B2: screens the lunar south pole for base sites, validates on Artemis III regions and three real landings (Chandrayaan-3, IM-1, IM-2) → `data/interim/moon_screening.json` |
| `build_sites.py` | Writes `app/public/data/sites.json` and `landings.json` from both screenings and the text in `content/`; keeps existing training areas only for candidates that have not moved and prints which ones need `earth_ranking.py` + `build_analogs.py` |
| `content/past_landings.json` | Why each past mission went where it did, and why a rule it fails did not matter for it — every statement with a source |
| `content/purposes.json` | Why a mission would go to each of **our** candidates (Kmar; empty until written) |
| `make_maps.py` | Draws the screening maps into `docs/images/` (for the team and the slides) |
| `fetch_earth.py` | Downloads the Earth inputs of B3 (MODIS, GPM; ~4 GB, Earthdata Login) into `data/raw/earth/` |
| `earth_pool.py` | B3: global 0.25° Earth land grid (precipitation, vegetation, temperature, land cover, albedo) and a Mars-like and a Moon-like pool of Earth candidates → `data/interim/earth_pool.json` |
| `earth_ranking.py` | B4: per-candidate ranking of the Earth pools on terrain (slope distributions), rock type (USGS Mars geologic map vs GLiM) and, for Mars, surface brightness and elevation → `data/interim/earth_rankings.json` |
| `build_analogs.py` | B5+B7+B8: 3 training areas per candidate, report text, writes `app/public/data/analogs.json` |
| `audit.py` | Data accuracy audit: checks every output against independent references, see `docs/AUDIT.md`. Run after the chain; expect 0 FAIL. `audit.py mars moon` runs only those sections (no Earth files needed) |
| `requirements.txt` | Python dependencies |

Results and their explanation: [`docs/SCREENING_RESULTS.md`](../docs/SCREENING_RESULTS.md) (B2) and [`docs/ANALOG_RESULTS.md`](../docs/ANALOG_RESULTS.md) (B3–B8).

Downloaded data goes to `data/raw/` (git-ignored).

## Order

`mars_screening.py` → `moon_screening.py` → `build_sites.py` → `earth_pool.py` (only if the climate inputs changed) → `earth_ranking.py` → `build_analogs.py` → `audit.py` → `make_maps.py`. **Whenever a candidate moves, everything after `build_sites.py` must be run again.**

## Reading the Mars PDS grids

Do not trust GDAL's georeferencing for `megt90n000eb` or the TES maps: it is one pixel off, and its longitudes start at −180° where the file starts at 0°E. `load_grids()` and `read_tes()` take the geometry from the PDS labels. `audit.py` checks the result against the USGS 463 m DEM and against regions whose dustiness is textbook knowledge.

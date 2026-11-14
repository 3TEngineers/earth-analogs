# Project plan

Updated 2026-11-14 after mentor feedback (see [`PROJECT_HISTORY.md`](PROJECT_HISTORY.md#12-mentor-feedback-and-the-new-direction-14-nov)). The core idea (interactive globe → site → Earth analogs → report) is the team's own; the landing-site screening step came from our mentor; method and technical structure were worked out with AI assistance, which must be disclosed in the submission.

## In one sentence

We learn from where humanity has already landed, **find new candidate landing and base sites on Mars and the Moon ourselves**, and show where on Earth astronauts and engineers could **train and test** for each of them — all from open data, in an interactive website.

Project name: **TBD** (repo name is `earth-analogs` for now).

## What changed (mentor feedback)

- **Before:** past landing sites → their Earth analogs. Partly done already (NASA has publicly compared Lake Salda to Jezero).
- **Now:** past landings become **validation**; our own **candidate sites** become the main result. Each candidate gets Earth **training areas**.
- People and roles stay the same. Backend gets one more step (B2, screening); frontend changes are small.

## How it covers the challenge

| The challenge asks for | Where we cover it |
|---|---|
| Analogs for **candidate permanent Moon-base locations** and **future Mars landing/exploration sites** | We find the candidates ourselves (screening), then their Earth analogs |
| Explain what makes it analogous, using data | Per-dimension scores and the "Where it's similar" section |
| Explain where the analogy breaks down | "Where it's different" plus fixed limits (gravity, atmosphere/vacuum, radiation) |
| How the analog helps prepare for exploration | "What you can test here" section — Earth training areas |
| Look beyond well-known analogs | Every analog labelled *known* or *new*; at least one of each candidate's top 3 is new |
| Processes as well as places | Process notes on every site and analog |
| Consider scale | Results are specific ~10 km spots |
| Remember Earth's limits | Fixed limits on every report |
| Surprise us | Sites nobody has landed on yet, plus a checkable screening method |

## User flow

1. **Opening:** rotating Moon or Mars. Side list with two groups: **Our candidates** (highlighted) and **Past landings** (validation).
2. **Pick a site:** the globe flies to it. The card shows the mission/summary and a **"Why this site"** checklist (e.g. ✓ elevation −2.4 km ≤ −1 km). For past landings the same checklist shows they pass our criteria — that's the validation.
3. **To Earth:** "Show Earth training areas" — the camera switches to Earth and zooms to the best match; the other two stay marked.
4. **Report panel:** total score, per-dimension bars with confidence, known/new label, side-by-side images, process note, *where it's similar*, *where it's different*, *what you can test here*, *what Earth can't reproduce*, sources.
5. **Extra pages:** Method (screening criteria + analog scoring), Limitations, About (data sources, AI usage).

Stretch: a suitability overlay on the Moon/Mars globe showing where the criteria pass.

## Sites

| Body | Our candidates (main result) | Validation |
|---|---|---|
| Mars | 2 safe landing zones found by screening | Past landings (all 11 should pass; Curiosity and Perseverance shown in the app) |
| Moon | 2 permanent base sites near the south pole | NASA's 9 Artemis III candidate regions (our picks should overlap them); Chandrayaan-3 shown as a landing that is fine for a short mission but not for a base |

## Method

### Step 1 — Screening for candidate sites (new)

Rules come from **published mission constraints**, not machine learning: 11 Mars landings are too few to learn from, but enough to validate.

**Mars — safe landing zone**

| Criterion | Why | Past constraints (for reference) | Data |
|---|---|---|---|
| Elevation | Enough atmosphere to slow down | MER below −1.3 km; Phoenix below −3.5 km; MSL up to +1 km | MOLA DEM |
| Latitude | Solar power, temperature | MER 10°N–15°S; MSL within ±45° | Coordinates |
| Slope | Safe touchdown | MSL < 3° over 2–5 km | MOLA DEM (km scale) |
| Thermal inertia | Low values mean thick dust that can't bear load | Dusty, low-inertia areas avoided | MGS TES thermal inertia map |
| Rock abundance | Rocks can tip a lander | MSL/InSight ≲ 10% | Global map not found yet — optional |

**Moon — permanent base site (south pole)**

| Criterion | Why | Data |
|---|---|---|
| Sunlit time | Continuous solar power | LOLA polar illumination (NASA PGDA, cloud-optimized GeoTIFF) |
| Earth in view | Direct communication with Earth | LOLA Earth visibility (PGDA) |
| Slope | Landing and construction | LOLA DEM |
| Distance to permanent shadow | Ice for water and fuel | Permanently shadowed region map (to confirm) |

Thresholds are set in B2 from the published constraints Kmar collects (K3b). Pick 2 candidates per body from the passing areas, away from past landing sites.

**Validation:** all 11 past Mars landings pass the Mars criteria; our Moon picks overlap the Artemis III regions.

### Step 2 — Earth training areas (as before)

1. Profile each candidate from orbital data.
2. Profile Earth candidates with matching data: coarse global pass, then a closer look (~10 km).
3. Score each dimension 0–100:

   | Dimension | Moon / Mars data | Earth data | Comparison |
   |---|---|---|---|
   | Terrain | LOLA / MOLA DEM | Copernicus DEM | Slope distributions |
   | Mineralogy / rock type | Highland vs. mare maps; published Mars detections | EMIT, geological maps | Overlap of mineral / rock groups |
   | Water history (Mars) | Lake, delta, river landforms | Lake, delta, shoreline deposits | Landform type match |
   | Aridity | None | GPM rainfall, MODIS vegetation | Closer to zero is better |
   | Temperature | Diviner / Mars thermal data | MODIS LST | Day–night swing |
   | Sun angle (Moon) | From latitude | From latitude | Low-Sun regime |
   | Ice (Moon) | Polar ice / cold traps | Permafrost | Presence |

4. Rank by weighted total, top 3 from distinct regions, confidence per dimension.
5. Text rules: ≥ 70 → "similar" + mapped test; ≤ 40 → "different"; fixed limits always.
6. Validation of this step: for Perseverance, Lake Salda should rank high.

### Strong dimension → test or training

| Strong dimension | Suggested test / training |
|---|---|
| Terrain | Rover driving, EVA route rehearsal, landing-hazard detection |
| Mineralogy / rock type | Instrument calibration, sample selection, field geology training |
| Water history | Biosignature search methods |
| Aridity | Remote-sensing ground truth |
| Temperature | Equipment and material durability |
| Sun angle | Low-light camera navigation, solar power tests |
| Ice | Ice drilling, water extraction (ISRU) |

## Tech stack

- **Frontend (`app/`):** React + TypeScript + Vite, Tailwind CSS v4, `react-globe.gl`, Lucide icons; NASA public-domain textures; deployed on Vercel. Shared UI state in `app/src/state/`.
- **Backend (`pipeline/`):** Python 3.12, `earthaccess`, `rasterio` / `rioxarray`, `numpy`, `pandas`, `scipy`, `geopandas`, `pydantic`; Jupyter for exploration. Copernicus DEM and PGDA maps read directly as cloud-optimized GeoTIFFs.
- **No database, no API server:** everything is precomputed into small JSON files, so the deployed site can't go down or fall asleep during judging (which runs into December). FastAPI stays an option if we add on-demand scoring later.
- **Contract:** [`DATA_CONTRACT.md`](DATA_CONTRACT.md).

## Team split

People and roles are unchanged. Backend load grew; Kmar takes the constraint research (K3b) to offset it.

### Backend — Sadık (`pipeline/`, `notebooks/`)

| Step | Task | Output | Due |
|---|---|---|---|
| B0 | Data contract + mock JSON | Done (v2 adds `selection`) | ✓ |
| B1 | Python environment; confirm data access incl. TES thermal inertia and PGDA illumination / Earth visibility | Access scripts, `DATA_SOURCES.md` updated | Sat afternoon |
| **B2** | **Screening:** Mars and Moon suitability maps from the criteria; pick 2 candidates per body | Candidate sites + criteria values | Sat evening |
| **B2b** | **Validation:** 11 Mars landings pass; Moon picks vs Artemis regions | Validation note | Sat evening |
| B3 | Earth candidate pool: coarse global pass, shortlist | Candidate regions | Sat night |
| B4 | Close look (~10 km) at the shortlist | Earth profiles | Sat night |
| B5 | Scoring, weights, top 3 from distinct regions, confidence, known/new | Ranking | Sun morning |
| B6 | Validation of the analog step (Jezero → Lake Salda) | Validation note | Sun morning |
| B7 | Text rules: similar / different / tests | Report text | Sun morning |
| B8 | Real JSON + images, validated with pydantic | `app/public/data/` | **Sun noon** |
| B9 | Technical notes for the Method page | Short text | Sun noon |

**Fallback if B2 runs late:** use NASA's Artemis III regions as the Moon candidates and published candidate landing sites for Mars; everything after B2 stays the same.

### Frontend 1 — Deniz: globes and animation (`app/src/globe/`)

| Step | Task | Due |
|---|---|---|
| D1 | Scaffold, shared state, data loading, placeholder globe; Vercel deploy | Done except deploy |
| D2 | NASA textures, bump maps, atmosphere, idle rotation | Sat afternoon |
| D3 | Sites on the globe — candidates highlighted, past landings muted; click → fly to site | Sat afternoon |
| D4 | Moon/Mars → Earth transition; training-area markers; zoom to best match | Sat evening–night |
| D5 | Switching between analogs; "back to the site" | Sun morning |
| D6 | Real data; performance; mobile check | Sun noon |
| D7 | Screenshots and a short screen recording | Sun afternoon |
| D8 (stretch) | Suitability overlay on the Moon/Mars globe | If time |

### Frontend 2 — Kmar: interface, content and presentation (`app/src/panels/`, `app/src/pages/`)

| Step | Task | Due |
|---|---|---|
| K1 | Site list with two groups (**Our candidates**, **Past landings**); mission card with the **"Why this site"** checklist from `selection` | Sat afternoon |
| K2 | Site summaries (past landings now; candidates once B2 picks them) | Sat afternoon / evening |
| K3 | Known analogs list + test/training mapping, with sources — needed for B5–B7 | **Sat evening** |
| **K3b** | **Published landing/base constraints** (MER, MSL, Phoenix, InSight, Mars 2020; Artemis III regions with coordinates), with sources — needed for B2 | **Sat afternoon** |
| K4 | Report panel (scores, confidence, known/new, sections, limits, images) | Sat night |
| K5 | Method (screening + scoring), Limitations, About pages; references and AI usage | Sun morning |
| K6 | 7-slide demo | Sun afternoon |
| K7 | Project page text | Sun afternoon |
| K8 | Final QA and submission checklist | Sun evening |

### Hand-offs

| Who | Needs from | What | By |
|---|---|---|---|
| Sadık | Kmar | Published constraints + Artemis regions (K3b) | Sat afternoon |
| Kmar | Sadık | Picked candidates + criteria values (for summaries) | Sat evening |
| Sadık | Kmar | Known analogs list, test mapping (K3) | Sat evening |
| Deniz, Kmar | Sadık | Real JSON (mock until then) | Sun noon |
| Kmar | Sadık | Method notes | Sun noon |
| Kmar | Deniz | Screenshots | Sun afternoon |

### Sync points

Sat 13:00 · 18:00 · 23:00 — Sun 10:00 · 15:00 · 19:00 — **submit by Sun 21:00** (hard deadline 23:59 local).

## Submission checklist

- [ ] Project page in English: name, summary, detailed description, NASA data, other references, AI usage
- [ ] Demo: 7 slides max (team name, members, challenge, screenshots, user flow, NASA data)
- [ ] Final project link: deployed site + repo made **public**
- [ ] Screening described as **pre-screening** with simplified criteria, not a final landing-site selection
- [ ] No NASA logos or mission insignia anywhere; AI-generated images watermarked
- [ ] Every external resource (code, textures, images, text) listed in references
- [ ] Links tested in a private browser window

## Risks and fallbacks

| Risk | Fallback |
|---|---|
| Screening (B2) runs late | Artemis III regions (Moon) and published candidate sites (Mars) as candidates |
| No global rock-abundance map | Leave rock abundance out; say so on the Limitations page |
| Permanent-shadow map not found | Use Diviner temperature or published PSR outlines |
| EMIT too large or slow | Global geological map |
| 3D animation takes too long | Simpler globe switch; visuals second |
| Global Earth pass doesn't finish | Score a pre-selected set of 20–30 regions |
| No data for a dimension | Show it as "no data" |

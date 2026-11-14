# Project plan

Draft agreed in chat on 2026-11-14. The core idea (interactive globe → landing site → Earth analogs → report) is the team's own; the method and technical structure were worked out with AI assistance, which must be disclosed in the submission.

## In one sentence

An interactive website where you pick a landing site on the Moon or Mars, and it flies you to the places on Earth that resemble it most — found with data — showing where each analog holds, where it breaks down, and what could be tested or trained there.

Project name: **TBD** (repo name is `earth-analogs` for now).

## How it covers the challenge

| The challenge asks for | Where we cover it |
|---|---|
| Earth analogs for candidate Moon-base locations and Mars landing/exploration sites | Top 3 Earth analogs per site; one Moon site is an Artemis candidate region |
| Explain what makes it analogous, using data | Per-dimension scores and the "Where it's similar" section |
| Explain where the analogy breaks down | "Where it's different" section plus fixed limits (gravity, atmosphere, vacuum, radiation) |
| How the analog helps prepare for exploration | "What you can test here" section |
| Look beyond well-known analogs | Every result is labelled *known analog* or *new candidate*; at least one of the top 3 must be new |
| Processes as well as places | Each site has process notes and their Earth counterparts |
| Consider scale | Results are specific spots (~10 km), not whole deserts |
| Remember Earth's limits | Fixed limits on every report |

## User flow

1. **Opening:** a rotating 3D Moon. On the right, a list of landing sites (Moon and Mars).
2. **Pick a site:** the globe rotates and zooms to it; a card shows the mission summary.
3. **To Earth:** "Show Earth analogs" — the camera pulls out, switches to the Earth globe, rotates and zooms to the best match. The other two candidates stay marked.
4. **Report panel:** total score, per-dimension score bars with confidence, known/new label, side-by-side images, process note, and three sections: *where it's similar*, *where it's different*, *what you can test here*, plus data sources.
5. **Extra pages:** Method, Limitations, About (incl. data sources and AI usage).

## Landing sites (proposed — team to confirm)

| Body | Site | Status | Why |
|---|---|---|---|
| Moon | Chandrayaan-3 (2023) | Past landing | One of the closest landings to the south pole |
| Moon | One Artemis III candidate region (e.g. Mons Mouton) | Future candidate | Covers "permanent Moon-base locations" directly |
| Mars | Curiosity, Gale crater (2012) | Past landing, still active | Layered sediments, ancient lake |
| Mars | Perseverance, Jezero crater (2021) | Past landing, still active | Ancient delta, biosignature search; Lake Salda gives us a validation case |

Optional: Apollo 11 for storytelling.

## Method

1. **Site profile** for each landing site from orbital data, plus rover/lander findings as ground truth.
2. **Earth candidate profiles** with matching Earth datasets: coarse global pass, then a closer look (~10 km) at the most promising regions.
3. **Score each dimension 0–100**:

   | Dimension | Moon / Mars data | Earth data | Comparison |
   |---|---|---|---|
   | Terrain | LOLA / MOLA–HRSC DEM | Copernicus DEM | Slope distributions |
   | Mineralogy / rock type | Highland vs. mare maps; CRISM, rover findings | EMIT, geological maps | Overlap of mineral / rock groups |
   | Water history (Mars) | Lake, delta, river landforms | Lake, delta, shoreline deposits | Landform type match |
   | Aridity | None (Mars/Moon are dry) | GPM rainfall, MODIS vegetation | Closer to zero is better |
   | Temperature | Diviner / Mars thermal data | MODIS LST | Day–night swing, not absolute |
   | Sun angle (Moon) | From latitude | From latitude | Low-sun regime |
   | Ice (polar Moon) | Polar ice / cold-trap data | Permafrost | Presence |

4. **Rank** by a weighted total (weights depend on the site); keep the top 3, each from a different region; attach a confidence value per dimension.
5. **Turn scores into text with fixed rules:** score ≥ 70 → a "similar" bullet and a mapped test; score ≤ 40 → a "different" bullet; every report also lists Earth's fixed limits.
6. **Validate:** for Jezero, Lake Salda (publicly compared to Jezero by NASA) should rank high.

### Strong dimension → test or training

| Strong dimension | Suggested test / training |
|---|---|
| Terrain | Rover driving, EVA route rehearsal, landing-site selection |
| Mineralogy / rock type | Instrument calibration, sample selection, field geology training |
| Water history | Biosignature search methods |
| Aridity | Remote-sensing ground truth |
| Temperature | Equipment and material durability |
| Sun angle | Low-light camera navigation, solar power tests |
| Ice | Ice drilling, water extraction (ISRU) |

## Tech stack

- **Frontend (`app/`):** React + TypeScript + Vite, Tailwind CSS, `react-globe.gl` for the globes, NASA public-domain textures for the Moon, Mars and Earth, deployed on Vercel.
- **Backend (`pipeline/`):** Python 3.12, `earthaccess`, `rasterio` / `rioxarray`, `numpy`, `pandas`, `scipy`, `geopandas`, `pydantic`; Jupyter for exploration. Copernicus DEM read directly from AWS. Google Earth Engine is optional.
- **Contract:** the backend writes `app/public/data/sites.json`, `app/public/data/analogs.json` and `app/public/images/`; the frontend only reads them. See [`DATA_CONTRACT.md`](DATA_CONTRACT.md).

## Team split

### Backend — Sadık (`pipeline/`, `notebooks/`)

| Step | Task | Output | Due |
|---|---|---|---|
| B0 | Fix the data contract with the frontend; commit mock JSON | Contract + mock files | Sat noon, first |
| B1 | Python environment; confirm data access | Access scripts, `DATA_SOURCES.md` updated | Sat noon |
| B2 | Profiles for the 4 sites | Site profiles | Sat afternoon |
| B3 | Earth candidate pool: coarse global pass, shortlist | Candidate regions | Sat evening |
| B4 | Close look (~10 km) at the shortlist | Candidate profiles | Sat night |
| B5 | Scoring, weights, top 3 from distinct regions, confidence, known/new label | Ranking | Sat night |
| B6 | Validation (Jezero → Lake Salda) | Validation note | Sun morning |
| B7 | Text rules: similar / different / tests | Report text | Sun morning |
| B8 | Real JSON + images, validated with pydantic | `app/public/data/` | **Sun noon** |
| B9 | Technical notes for the Method page | Short text | Sun noon |

### Frontend 1 — Deniz: globes and animation (`app/src/globe/`)

| Step | Task | Due |
|---|---|---|
| D1 | Scaffold Vite + React + TS + Tailwind inside `app/`; first Vercel deploy; set up shared state (selected site, selected analog) with Kmar | Sat noon |
| D2 | Globe component: Moon, Mars, Earth textures; idle rotation | Sat afternoon |
| D3 | Sites on the globe from mock data; click → fly to site | Sat afternoon |
| D4 | Moon/Mars → Earth transition; analog markers; zoom to best match | Sat evening–night |
| D5 | Switching between analogs; "back to the landing site" | Sun morning |
| D6 | Switch to real data; performance; mobile check | Sun noon |
| D7 | Screenshots and a short screen recording for the slides | Sun afternoon |

### Frontend 2 — Kmar: interface, content and presentation (`app/src/panels/`, `app/src/pages/`)

| Step | Task | Due |
|---|---|---|
| K1 | Layout: landing-site list, mission summary card | Sat afternoon |
| K2 | Summaries for the 4 sites (mission, year, findings, process notes) | Sat afternoon |
| K3 | **Known analogs list** and **test/training mapping**, with sources — the backend needs these for B5–B7 | **Sat evening** |
| K4 | Report panel (scores, confidence, known/new, three sections, process note, images) | Sat night |
| K5 | Method, Limitations, About pages; references and AI usage statement | Sun morning |
| K6 | 7-slide demo | Sun afternoon |
| K7 | Project page text (summary, description, NASA data, references) | Sun afternoon |
| K8 | Final QA and submission checklist | Sun evening |

Deniz owns `app/src/globe/`, Kmar owns `app/src/panels/` and `app/src/pages/`; they meet in the shared state. The frontend works on mock data until B8 lands.

### Hand-offs

| Who | Needs from | What | By |
|---|---|---|---|
| Everyone | Together | Data contract | Sat noon, first |
| Sadık | Kmar | Known analogs list, test mapping | Sat evening |
| Deniz, Kmar | Sadık | Real JSON (mock until then) | Sun noon |
| Kmar | Sadık | Method notes | Sun noon |
| Kmar | Deniz | Screenshots | Sun afternoon |

### Sync points

Short check-ins (10–15 min: done / blocked / next), and update `STATUS.md`:
Sat 13:00 · 18:00 · 23:00 — Sun 10:00 · 15:00 · 19:00 — **submit by Sun 21:00** (hard deadline 23:59 local).

## Submission checklist

- [ ] Project page in English: name, summary, detailed description, NASA data, other references, AI usage
- [ ] Demo: 7 slides max (team name, members, challenge, screenshots, user flow, NASA data)
- [ ] Final project link: deployed site + repo made **public**
- [ ] No NASA logos or mission insignia anywhere; AI-generated images watermarked
- [ ] Every external resource (code, textures, images, text) listed in references
- [ ] Links tested in a private browser window

## Risks and fallbacks

| Risk | Fallback |
|---|---|
| EMIT too large or slow | Global geological map |
| Mars mineral maps hard to process | Rover findings and published detections |
| 3D animation takes too long | Simpler globe switch; visuals second |
| Global pass doesn't finish | Score a pre-selected set of 20–30 candidate regions |
| No data for a dimension | Show it as "no data" in the report |

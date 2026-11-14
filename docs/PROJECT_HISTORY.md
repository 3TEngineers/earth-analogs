# Project history

How we got here, step by step, with the reasoning behind each decision. Written so that every teammate — and every teammate's Claude session — can pick up the full context without having been in the original conversation.

- **What we're building and who does what:** [`PROJECT_PLAN.md`](PROJECT_PLAN.md)
- **What's done and what's next right now:** [`STATUS.md`](STATUS.md)
- **This file:** why things are the way they are.

The original discussion happened in Turkish between Sadık and Claude (Claude Code, Opus 5.5) on 13–14 November 2026. Everything below is a faithful English summary.

---

## 1. The team and how we work (13 Nov)

- Team **3TE**: three computer engineering students — Sadık (backend), Deniz (frontend: globes), Kmar (frontend: panels, content, slides).
- Each of us has a **separate Claude account**, so Claude's memory is not shared between us. **The repo is the shared memory**: `CLAUDE.md` holds the rules, `STATUS.md` the live state, this file the history.
- Event: NASA Space Apps Challenge 2026, **14–15 November**. Submissions open Saturday 09:00 and close **Sunday 23:59 local time**; we aim to submit by Sunday 21:00.

## 2. Choosing the challenge (13 Nov)

There are 14 challenges this year. We dropped the two games (Junior Astronaut Mission Trainer, Space Mission Design Game), the storytelling one (Abandoned but not Forgotten), the Earth Information Jukebox and Health Monitoring Software — none of them interested us.

We compared the remaining nine. Short version of the comparison:

| Challenge | What it asks | Our take |
|---|---|---|
| **Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars** | Find Earth places that resemble Moon-base / Mars sites, explain why, where it breaks, how to use them | **Chosen.** Most room for original thinking; "surprise us" brief |
| Flame in Freefall | AI dashboard over ISS combustion experiments (NASA PSI data) | Strong runner-up: AI-centred, niche, small data |
| Harmonization of MODIS and VIIRS Hot Spots | Merge two satellite fire records into a fire calendar web app | Safest and clearest, but little room for creativity |
| Lunar Landing Site Navigator | Sun/Earth position and comms windows at lunar sites | Very visual, but spec-driven — every team builds the same thing |
| Planet X and SPHEREx | Web tool that blinks SPHEREx sky images to spot moving objects | Very well specified, astronomy learning curve |
| Earth System Trend Detective | Pick a variable and region, test if the trend is significant | Easy but generic, likely crowded |
| Interplanetary Survival Guide: Martian Map | Layered map/HUD for a Mars EVA | Fun, risk of being "just a map" |
| Field Shift | Crop-rotation decision support | Too broad, US-centric data |
| Dancing with the SARs | Visualise NISAR radar change | Heavy radar processing for 48 h |

**The principle that decided it (Sadık's):** every team will use AI, so pure computation gets commoditised. What differentiates is the **concept and imagination**, so we wanted a challenge where those count.

The full comparison of all nine is in Sadık's local notes (`challenge-ozetleri.md`, Turkish, not in this repo).

## 3. Shaping the direction (13 Nov)

- Claude first suggested a playful concept ("click anywhere on Earth, find your twin on Mars"). **Sadık rejected it as too general**: the challenge title is about **permanent Moon-base locations and Mars landing sites**, and the project should be **scientific**.
- A more scientific framing followed: profile the Artemis south-pole candidate regions from LRO data, then find Earth test sites per condition (terrain, low Sun, cold traps, rock type), compared with distribution-based metrics and validated on known analogs.
- **Data sufficiency check.** Earth data is rich; Moon/Mars data is good for terrain, mineralogy and dryness, usable for temperature and ice only in relative terms, and weak for caves and atmosphere. The real problem isn't missing data but making Earth and planetary data comparable (resolution and physics differ). Gaps should be shown honestly — the challenge explicitly rewards saying where an analogy breaks down.
- **Open scientific question (unverified):** the lunar south pole is highland (anorthositic) terrain, while the most-used lunar analogs (Hawaii, Lanzarote) are basaltic, i.e. closer to the maria. If true, that's a strong story. Verify with sources before claiming it.

## 4. Repository setup (13–14 Nov)

- GitHub org **`3TEngineers`**, repo **`earth-analogs`**, local clone outside OneDrive (big data files would choke the sync).
- **Public vs private:** we briefly made the repo public so GitHub could protect `main` (the free plan only protects `main` on public repos), then went **back to private** — keeping the idea away from other teams matters more. It goes public at submission.
- Because GitHub can't protect `main` on a private free repo, **`.githooks/pre-push` blocks pushes to `main`**. Everyone runs `git config core.hooksPath .githooks` once. Force push is never used.
- Merges are squash-only and branches are deleted after merge. Claude Code's auto mode refuses to merge a PR on Claude's own initiative; merges happen when a teammate asks for them.

## 5. What the submission must contain (14 Nov)

From the official Project Submission Guide and Judging & Awards Guide:

- **Project page** (judges mostly read this): name, high-level summary, detailed description, NASA data used, other references, AI usage. **Everything in English.**
- **Demo:** max **7 slides** *or* max **30-second video**. Exceeding the limit removes us from global judging. We chose **slides**.
- **Final project link:** public, no login. For us: the deployed site and the repo (made public at submission).
- **Judging criteria**, each scored 1–5: **Impact, Creativity, Validity, Relevance** (NASA data must be core, not decoration), **Presentation** (the guide says to give it as much attention as the other four).
- **AI rule:** AI tools are allowed, but **AI must not come up with the idea of how to solve the challenge**. We must disclose where AI was used; AI-generated images/video need a visible watermark. **No NASA logos, flags or mission insignia** in generated content.
- At least one NASA dataset is required for global awards; partner-agency data is encouraged (ESA, ISRO, JAXA, Turkish Space Agency and others are partners this year).
- No images or likeness of people under 18.

## 6. The idea (Sadık's, 14 Nov)

Sadık wanted a **website, not a report**:

1. A rotating 3D Moon or Mars with a list of landing sites on the side.
2. Click a site → the globe rotates and zooms to it, with a short mission summary.
3. Click again → animated transition to an Earth globe that rotates and zooms to the matching analog locations.
4. A detailed report: in what ways it's similar, in what ways it isn't.

Refinements agreed afterwards:

- **Both the Moon and Mars**, about two sites each.
- **Earth analogs come from data**, not from historical astronaut training sites (Sadık explicitly dropped those).
- To stay on-challenge, the Moon list should include a **future Artemis candidate region**, not only past landings. Past landings are valuable because they have in-situ ground truth (Apollo samples, rover measurements), which helps validate the method.

### How many landings so far (for context; verify before publishing)

- **Moon:** about 24 fully successful soft landings plus about 4 partial ones (Luna, Surveyor, six crewed Apollo landings, Chang'e 3–6, Chandrayaan-3, SLIM, Blue Ghost 1, IM-1, IM-2). Chang'e 7 (south pole) slipped to 2027. Other 2026 commercial landings were not checked.
- **Mars:** 11 — Mars 3, Viking 1 and 2, Pathfinder, Spirit, Opportunity, Phoenix, Curiosity, InSight, Perseverance, Zhurong.

## 7. "What can you do there?" is required (14 Nov)

Sadık spotted that the challenge also requires explaining **how each analog helps prepare for exploration**: testing instruments and technology, rehearsing robotic or human operations, searching for resources or habitability, reducing risk. So the report panel got a third section, **"What you can test here"**. Suggestions are derived from which dimensions score high (terrain → rover driving and EVA rehearsal, mineralogy → instrument calibration and sampling, ice → drilling, low Sun → camera navigation, and so on) and limited by the mismatches (e.g. gravity changes wheel traction).

## 8. The method (14 Nov)

1. Profile each landing site from orbital data, using rover and lander findings as ground truth.
2. Profile Earth candidates with matching Earth data: a coarse global pass, then a closer look (~10 km) at promising regions.
3. Score each dimension 0–100 with a comparison suited to it: whole slope distributions for terrain, overlap of mineral groups, landform type for water history, closeness to zero for aridity, the **day–night swing** (not absolute values) for temperature, plus sun angle and ice on the Moon.
4. Rank by a weighted total; keep the top 3 from distinct regions; attach a confidence per dimension.
5. Fixed text rules: score ≥ 70 → "similar" bullet and a mapped test; ≤ 40 → "different" bullet; every report lists Earth's fixed limits (gravity, atmosphere/vacuum, radiation).
6. **Validation:** NASA has publicly compared Lake Salda (Türkiye) to Jezero crater, so our method should rank Salda high for Perseverance.

Details and the dimension/dataset table are in [`PROJECT_PLAN.md`](PROJECT_PLAN.md#method).

## 9. Checking the plan against the challenge (14 Nov)

We re-read the challenge text line by line. Most requirements were covered. Four gaps were found and folded into the plan:

1. **Moon-base candidates** — Apollo 11 is on the equator and not a base candidate, so an **Artemis candidate region** is added (Chandrayaan-3 + e.g. Mons Mouton).
2. **"Look beyond well-known analogs"** — every result is labelled **known analog / new candidate**, and at least one of each site's top 3 must be new.
3. **"Processes as well as places"** — each site and analog carries **process notes** (delta sedimentation, wind erosion, impact cratering…).
4. **"Consider scale"** — results are **specific ~10 km spots**, not whole deserts.

Nice-to-haves if time allows: per-dimension confidence (now in the contract), visual-vs-data similarity shown side by side, a dust/wind dimension for Mars, a downloadable analog report card, and a clear "who is this for" statement for Impact.

## 10. Stack, split and contract (14 Nov)

- **Stack:** React + TypeScript + Vite + Tailwind + `react-globe.gl`, deployed on Vercel; Python 3.12 pipeline with `earthaccess`, `rasterio`/`rioxarray`, `numpy`/`pandas`/`scipy`, `pydantic`. Chosen because it's what the team already knows.
- **Split (Sadık's decision):** backend = Sadık; frontend = Deniz (globes and animation) + Kmar (panels, pages, content, slides). Step lists B0–B9, D1–D7, K1–K8 are in the plan.
- **Data contract** (`DATA_CONTRACT.md`): the pipeline writes `app/public/data/sites.json` and `analogs.json`; the app only reads them. **Mock files** in that shape are committed and validated against `pipeline/schema.py`, so the frontend can start before the analysis exists. Types: `app/src/types/data.ts`.

## 11. Still open

- Project name.
- Final confirmation of the four sites (proposed: Chandrayaan-3, an Artemis candidate region, Curiosity, Perseverance; Apollo 11 optional).
- Dimension weights per site.

## 12. AI usage so far (for the submission's disclosure)

Keep this list updated — the project page must state where AI was used.

- **Idea:** the website concept (globe → landing site → Earth analogs → report) and the choice of challenge are the team's. Claude proposed alternatives that the team rejected or reshaped.
- **Claude (Claude Code) was used for:** summarising and comparing the challenges; checking data availability and landing statistics via web search; drafting the scoring method, the data contract and the project plan; repository setup and documentation; mock data.
- Code written with AI help must be acknowledged in the project description; any AI-generated images need a watermark.

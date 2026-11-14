# Status

Single source of truth for what is done, in progress and next. Update it in the same PR as the work. Newest entries on top in each section.

**Hackathon:** 14–15 November 2026.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-13 | Challenge: *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars* | Most room for original thinking; every team uses AI, so the concept matters more than raw computation. |
| 2026-11-14 | Output is an **interactive website**: Moon/Mars globe → landing site → Earth analogs → report (similar / different / what to test) | Team's own idea; see `docs/PROJECT_PLAN.md` |
| 2026-11-14 | Split: **backend Sadık**, **frontend Deniz (globes) + Kmar (panels, content, slides)** | Two clear sides that only meet at the data contract |
| 2026-11-14 | Stack: React + TS + Vite + Tailwind + react-globe.gl on Vercel; Python 3.12 pipeline (earthaccess, rasterio, pydantic) | Matches what the team already knows |
| 2026-11-14 | Data contract fixed in `docs/DATA_CONTRACT.md`, mock JSON committed | Frontend can start before the analysis is done |
| 2026-11-14 | **New direction (mentor feedback):** we find our own candidate sites (Mars safe landing zones, Moon permanent base sites) by screening with published constraints, then their Earth training areas. Past landings and Artemis III regions become validation | Using past sites alone isn't new; finding candidates ourselves answers the challenge title directly. See `PROJECT_HISTORY.md` §12 |
| 2026-11-14 | No database, no API server — results precomputed into JSON | Site can't go down or sleep during judging (runs into December) |
| 2026-11-14 | `sites.json` v2: new `selection` block (goal, role, criteria, note) | Card shows "Why this site"; past landings show validation |
| 2026-11-14 | Globe and panels share one UI state (`app/src/state/`) with a fixed set of actions; neither side calls the other directly | Deniz and Kmar can build in parallel without merge conflicts |
| 2026-11-14 | Repo back to **private** until submission; a local pre-push hook (`.githooks/pre-push`) blocks pushes to `main` | Keeping the idea away from other teams matters more than GitHub's branch protection, which the free plan only offers on public repos. Make the repo public when submitting. |

## Current direction

See `docs/PROJECT_PLAN.md`. Main result: 2 candidate sites per body found by our screening (B2), each with 3 Earth training areas. Validation: past Mars landings and Artemis III regions. Still to confirm: project name.

Open question to verify before relying on it: the south pole is highland (anorthositic) terrain, while the most-used lunar analogs (Hawaii, Lanzarote) are basaltic, i.e. closer to the maria.

## Done

- 2026-11-14: K1 — site panel in `app/src/panels/`: Moon | Mars toggle, site list in two groups (Our candidates / Past landings), mission card with coordinates, processes, image placeholder and the "Why this site" / "Checked against our criteria" checklist, and the Show Earth training areas button. Mobile: bottom sheet. `StateDebugPanel` now shows only in the Earth phase until K4 replaces it.
- 2026-11-14: **B1 — data access confirmed** (`pipeline/check_access.py`, results in `docs/DATA_SOURCES.md`). Copernicus DEM (Lake Salda 1135.5 m), MOLA (Jezero −2510 m), LOLA, TES thermal inertia (Jezero 314), PGDA lunar sunlit time / Earth visibility / permanent shadow (75°S, fractions 0–1), and Earthdata searches for MODIS LST, MODIS NDVI, GPM IMERG, EMIT all work. Gotcha: PGDA's `_COG.TIF` links are 404 — use the plain `.TIF`. EMIT is ~3 GB per region, so subset it. Python env: `pipeline/requirements.txt`.
- 2026-11-14: K3b — `docs/LANDING_CONSTRAINTS.md`: published landing constraints for Pathfinder, MER, Phoenix, MSL, InSight and Mars 2020; the 11 Mars landings with coordinates; the 9 Artemis III regions (feature-centre coordinates); lunar base-site criteria. Section 5 has notes for B2: not all 11 landings can pass one latitude rule, and MSL's slope limit is < 30° at 2–5 **m**, not km.
- 2026-11-14: New direction written up (`PROJECT_PLAN.md`, `PROJECT_HISTORY.md` §12); data contract v2 with `selection`; mock data now has one Moon and one Mars candidate (5 sites, 15 analogs), validated with `pipeline/schema.py`; app builds and lints.
- 2026-11-14: D1 (part 1) — app scaffold in `app/`: Vite + React + TypeScript, Tailwind v4, `react-globe.gl`, Lucide. Shared UI state (`src/state/`), data loading (`src/data/`), proposed design tokens (`src/index.css`), placeholder globe with site/analog points and fly-to, temporary state panel. Runs on mock data; build and lint pass. See `app/README.md`.
- 2026-11-14: `docs/PROJECT_HISTORY.md` — full step-by-step history of the decisions so far. Kmar (`kmarrabid-ai`) joined with write access.
- 2026-11-14: Project plan, team split, data contract with mock JSON, TypeScript types and pydantic schema (mock JSON validated against the schema).
- 2026-11-13: Repo skeleton, working rules (`CLAUDE.md`), challenge brief, data source list.

## In progress

- Deniz: D1 (part 2) — first Vercel deploy. The free plan may not deploy private org repos from GitHub; fallback is deploying with the Vercel CLI.

## Next

- Everyone runs `git config core.hooksPath .githooks` in their clone (blocks pushes to `main`).
- Everyone creates a free NASA Earthdata Login account.
- Sadık: B2 — screening. Mars: MOLA elevation shown as estimated surface pressure (atmosphere), latitude shown as winter noon Sun elevation (solar power), slope, TES thermal inertia. Moon: PGDA sunlit time, Earth visibility, slope, distance to permanent shadow. Thresholds from `docs/LANDING_CONSTRAINTS.md` (read §5 first: not all 11 landings pass one latitude rule; MSL slope limit is at metre scale). Entry flight-path angle is mission-specific — noted as a limitation, not computed.
- Deniz: D2 — NASA textures, bump maps, atmosphere, idle rotation. D3 now shows candidates highlighted and past landings muted (`site.selection.role`).
- Deniz + Kmar: agree on the design tokens in `app/src/index.css` (proposal: per-body accent colors, glass panels, Space Grotesk / Inter / JetBrains Mono).
- **Kmar: K3 next** (known analogs + test mapping, `docs/KNOWN_ANALOGS.md`) — needed by Sadık Saturday evening. Then K2 (site summaries) and K4 (report panel). Specs in `app/src/panels/README.md`.

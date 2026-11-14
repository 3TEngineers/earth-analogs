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
| 2026-11-14 | Repo back to **private** until submission; a local pre-push hook (`.githooks/pre-push`) blocks pushes to `main` | Keeping the idea away from other teams matters more than GitHub's branch protection, which the free plan only offers on public repos. Make the repo public when submitting. |

## Current direction

See `docs/PROJECT_PLAN.md`. Still to confirm as a team: project name, and the four landing sites (proposed: Chandrayaan-3 and an Artemis candidate region on the Moon; Curiosity and Perseverance on Mars).

Open question to verify before relying on it: the south pole is highland (anorthositic) terrain, while the most-used lunar analogs (Hawaii, Lanzarote) are basaltic, i.e. closer to the maria.

## Done

- 2026-11-14: Project plan, team split, data contract with mock JSON, TypeScript types and pydantic schema (mock JSON validated against the schema).
- 2026-11-13: Repo skeleton, working rules (`CLAUDE.md`), challenge brief, data source list.

## In progress

- Nothing yet — steps B1, D1 and K1/K2 are next.

## Next

- Invite Kmar to the org and give them write access to this repo.
- Everyone runs `git config core.hooksPath .githooks` in their clone (blocks pushes to `main`).
- Everyone creates a free NASA Earthdata Login account.
- Sadık: B1 — confirm data access for the datasets in `docs/DATA_SOURCES.md`.
- Deniz: D1 — scaffold the app inside `app/` and deploy to Vercel.
- Kmar: K1/K2 — site list layout and the four site summaries.

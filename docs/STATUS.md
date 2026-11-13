# Status

Single source of truth for what is done, in progress and next. Update it in the same PR as the work. Newest entries on top in each section.

**Hackathon:** 14–15 November 2026.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-13 | Challenge: *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars* | Most room for original thinking; every team uses AI, so the concept matters more than raw computation. |
| 2026-11-13 | Repo stays **private** until submission | Avoid other teams copying the idea during the event. Make it public when submitting. |

## Current direction (not final)

Focus on the **Artemis lunar south pole candidate base regions**:

1. Build a requirement profile for 3–4 candidate regions from LRO data: slope distribution and roughness, illumination, temperature, permanently shadowed ice, rock abundance, rock type.
2. Compute the matching features for Earth locations (terrain, high-latitude low sun, permafrost, lithology, aridity, vegetation).
3. Compare per condition with distribution-based metrics (not one overall score).
4. Validate: known lunar analogs used by NASA/CSA should rank well on the relevant conditions.
5. Output per candidate region: best Earth test site for each need (mobility, low-sun navigation, ice drilling, …) and the conditions no Earth site can reproduce.
6. Mars landing sites as an optional second step to show the method generalizes.

Open question to verify before relying on it: the south pole is highland (anorthositic) terrain, while the most-used lunar analogs (Hawaii, Lanzarote) are basaltic, i.e. closer to the maria.

## Done

- 2026-11-13: Repo skeleton, working rules (`CLAUDE.md`), challenge brief, data source list.

## In progress

- Team registration on spaceappschallenge.org.

## Next

- Agree on the approach and the team split; fill in owners in `CLAUDE.md`.
- Everyone creates a free NASA Earthdata Login account.
- Verify the key datasets in `docs/DATA_SOURCES.md` are downloadable and note their real sizes.
- Fix the data contract between `pipeline/` and `app/` (file names and columns) so the app can start with mock data.

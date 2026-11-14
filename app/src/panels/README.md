# src/panels/ — start here, Kmar

Owner: **Kmar** (`kmarrabid-ai`). This file tells you (and your Claude session) exactly what already exists, what you build, and where it plugs in. Written by Deniz on 2026-11-14 after D1 (PR #5).

Read first: root `CLAUDE.md` (rules), `docs/STATUS.md` (live state), `docs/PROJECT_PLAN.md` (your steps K1–K8), `app/README.md` (stack, shared state API, design tokens).

## 0. Why it's built this way

- **Two people build one screen at the same time.** Deniz builds the globe, you build the panels. If either side called the other's code directly, every change would need both of you and every merge would conflict. So the globe and the panels only share **one state object** (`src/state/`) with a fixed set of actions. You change the state, the globe follows; the globe changes it, your panel follows. You can build and test your part without waiting for Deniz, and the reverse.
- **The backend isn't done yet, so we work on mock data.** Sadık fixed the shape of the JSON first (`docs/DATA_CONTRACT.md`) and committed fake data in that shape. Build against it now; when the real data lands (Sunday noon) the UI keeps working because the shape doesn't change. That's also why you never edit `public/data/*.json` by hand — the pipeline overwrites it.
- **One set of design tokens.** Colors and fonts live in one file (`src/index.css`) so the panels and the globe look like one product, and the accent color can follow the body on screen (Moon → Mars → Earth) everywhere at once.
- **Folders = ownership.** You own `src/panels/` and `src/pages/`, Deniz owns `src/globe/`. Staying in your own folder means you two almost never edit the same file, so merges are painless.
- **Small PRs, `STATUS.md` updated each time.** We each use our own Claude account and memory isn't shared. The repo is the only shared memory: if it isn't in `STATUS.md`, the other two (and their Claude sessions) don't know it happened.

## When to pull

Pull `main` (`git switch main && git pull`, then `cd app && npm install`):

- **At the start of every work session** and after every team check-in (Sat 13:00 · 18:00 · 23:00, Sun 10:00 · 15:00 · 19:00).
- **When a teammate says they merged something** you depend on — especially changes to `src/state/`, `src/index.css`, `src/types/` or the data files.
- **Before you create a new branch**, so it starts from the latest `main`.

While you're working on a branch and want a teammate's new work from `main`: `git pull origin main` on your branch. With the hooks enabled (`git config core.hooksPath .githooks`), `npm install` runs by itself after a pull or branch switch whenever `app/package.json` changed; without them, run it yourself.

## 1. Set up (once)

Needs Git and Node.js LTS (20.19+).

```bash
git clone https://github.com/3TEngineers/earth-analogs.git
cd earth-analogs
git config core.hooksPath .githooks     # blocks pushes to main
cd app
npm install
npm run dev                              # http://localhost:5173
```

Already cloned? `git switch main && git pull`, then `cd app && npm install`.

Every piece of work: branch from an up-to-date `main` (`feat/site-list`, `feat/report-panel`, …), small PR, update `docs/STATUS.md` in the same PR. Everything in the repo and the UI is in **English**.

## 2. What is in this folder (after the 14 Nov redesign)

| File | What it shows | Used by |
|---|---|---|
| `SiteDock.tsx` | `browse` phase: a short introduction (top left) and the sites as cards in a dock along the bottom; on phones a list in the bottom sheet | `ExplorePage` |
| `SiteDetail.tsx` | `site` phase: one site in the side panel — tabs **Overview** (view from orbit, why go there, how it was picked), **Why it passed** (`SelectionChecklist`), **On Earth** (its training areas, what Earth can't copy); the footer button flies to Earth | `ExplorePage` |
| `AnalogReport.tsx` | One training area — tabs **How close it is**, **What to test**, **Limits and sources** | `ExplorePage` (`earth` phase) and `EarthPage` |
| `ui.tsx` | `SidePanel` (glass card on the right, bottom sheet on phones; tells the 3D scene how much room it takes), `Tabs`, `PassBadge`, `RuleTicks`, `GroupTitle` | all of the above |
| `SelectionChecklist.tsx`, `OrbitalView.tsx`, `orbitalImage.ts`, `BodyToggle.tsx`, `format.ts` | rule rows · close-up image with crosshair and scale bar · live map-server image URLs · Mars/Moon switch (phones) · text helpers | — |

Rules that still hold:

- The globe and the panels never talk to each other. Panels read `useAppState()` / `useSelection()` and call its actions (`selectSite`, `showAnalogs`, `selectAnalog`, `backToSite`, `reset`); the globe follows by itself.
- Show text exactly as given in the JSON — never recompute similarities from scores. Never hand-edit `public/data/*.json`; the pipeline writes it.
- `image` may be `null`, lists like `differences` or `tests` may be empty, `purpose` is `null` until Kmar's text lands in `pipeline/content/purposes.json`.
- A panel that covers part of the screen reports it with `useSceneInset` (`src/globe/sceneStore.ts`), so the planet stays centred in the free area.
- Design tokens and type helpers: `app/README.md` → Design tokens.

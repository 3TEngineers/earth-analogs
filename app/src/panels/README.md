# src/panels/ — start here, Kmar

Owner: **Kmar** (`kmarrabid-ai`). This file tells you (and your Claude session) exactly what already exists, what you build, and where it plugs in. Written by Deniz on 2026-11-14 after D1 (PR #5).

Read first: root `CLAUDE.md` (rules), `docs/STATUS.md` (live state), `docs/PROJECT_PLAN.md` (your steps K1–K8), `app/README.md` (stack, shared state API, design tokens).

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

## 2. What already exists (don't rebuild it)

| Piece | Where | What you use it for |
|---|---|---|
| Shared UI state | `src/state/AppState.tsx` | `useAppState()` — what is selected and the actions that change it |
| Resolved selection | `src/state/useSelection.ts` | `useSelection()` — the selected site / analog as full objects |
| Data loading | `src/data/DataProvider.tsx` | `useData()` — loading / error / ready + both JSON files |
| Image paths | `src/data/assetUrl.ts` | `assetUrl(site.image)` turns `images/...` into a URL |
| Types | `src/types/data.ts` | `Site`, `Analog`, `Dimension`, `DimensionScore`, `Test` |
| Design tokens | `src/index.css` | Tailwind classes such as `bg-panel`, `text-accent` (see section 5) |
| Globe | `src/globe/` (Deniz) | Already reacts to the shared state — you never call it directly |
| Temporary panel | `src/dev/StateDebugPanel.tsx` | Shows the flow works. **Delete it** (and its line in `App.tsx`) once your site list and report panel replace it |

The globe and your panels never talk to each other. When you call `selectSite('perseverance', 'mars')`, the globe flies there by itself. When the user clicks a point on the globe, the same state changes and your panel updates by itself.

## 3. The shared state

```tsx
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'

const { phase, body, displayBody, setBody, selectSite, showAnalogs, selectAnalog, backToSite, reset } = useAppState()
const { sitesForBody, site, analogs, analog, dimensions } = useSelection()
```

| `phase` | What the user sees | Your panel shows | Buttons call |
|---|---|---|---|
| `browse` | Rotating Moon or Mars | Moon \| Mars toggle + site list (`sitesForBody`) | `setBody('moon' \| 'mars')`, `selectSite(s.id, s.body)` |
| `site` | Globe zoomed to `site` | Mission card for `site` | **Show Earth analogs** → `showAnalogs(analogs[0].id)`; another site → `selectSite(...)`; close → `reset()` |
| `earth` | Earth globe with the 3 analogs | Report panel for `analog` | Switch analog → `selectAnalog(a.id)`; back → `backToSite()` |

- `analogs` is already sorted by rank (1..3); `dimensions` only contains the dimensions for the site's body.
- Do not add new state or actions inside your components for anything the globe also needs. If you need a new shared field, change `src/state/` in its own small PR and tell Deniz.

## 4. Your steps and what "done" means

### K1 — Site list + mission card (`src/panels/`)
Suggested files: `SitePanel.tsx` (decides what to show from `phase`), `BodyToggle.tsx`, `SiteList.tsx`, `SiteCard.tsx`, `MissionCard.tsx`.
- Moon | Mars toggle; one card per site: `name`, `agency`, `year` (or "Future" when `null`), badge **Past landing** / **Future candidate** from `status`.
- Mission card: name, mission, agency, year, coordinates in `font-mono` (e.g. `-69.37°, 32.32°`), `summary`, `processes` as tags, primary button **Show Earth analogs →**.
- Done when: the whole flow works without `StateDebugPanel`, which is deleted.

### K2 — Site summaries (content)
Real text for the 4 sites' `summary` and `processes` (mission, year, key findings, processes). The JSON is written by the pipeline, so **send the text to Sadık** (or add it in `docs/` and tell him) — don't hand-edit `public/data/*.json`.

### K3 — Known analogs list + test mapping (content, **needed by Sadık Saturday evening**)
A sourced list of already-known Earth analogs per site and the "strong dimension → test/training" mapping. Put it in `docs/` (e.g. `docs/KNOWN_ANALOGS.md`) and tell Sadık; he uses it for scoring (B5–B7).

### K4 — Report panel (`src/panels/`)
Suggested files: `ReportPanel.tsx`, `ScoreBar.tsx`, `AnalogSwitcher.tsx`.
For `analog` (with `site` for context):
- Header: `name`, `country`, big `totalScore`/100 in `font-mono`, badge **Known analog** (muted) or **New candidate** (accent — new ones should stand out).
- One bar per entry in `dimensions`: `label`, `analog.scores[d.id].score`, confidence (`high`/`medium`/`low`). `score: null` → show **No data**.
- Sections **Where it's similar** (`similarities`, `text-similar`), **Where it's different** (`differences`, `text-different`), **What you can test here** (`tests`: `title` + `detail`).
- Fixed box **What Earth can't reproduce** from `site.limits` — always shown.
- `processes`, `sources` as links, `image` via `assetUrl()`.
- `1 · 2 · 3` switcher → `selectAnalog(a.id)`; **← Back to {site.name}** → `backToSite()`.
- Show text exactly as given — never recompute similarities from scores.

### K5–K8
Method, Limitations, About pages (`src/pages/`), slides, project page text, final QA — see `docs/PROJECT_PLAN.md`. Pages need routing; React Router is the plan, add it in that PR and say so.

## 5. Layout and design

The globe fills the whole screen behind everything. Keep it visible:

| Area | Who | Position |
|---|---|---|
| Title + tagline | `App.tsx` | Top left (already there) |
| Your panel | Kmar | **Right side**, `absolute top-4 right-4 bottom-4 w-[380px]`, scrolls inside. On mobile (< `md`): bottom sheet, `inset-x-0 bottom-0 max-h-[55vh]` |
| Globe | Deniz | Everything else; Deniz shifts the globe's center left so the panel doesn't cover the selected point |

Design tokens (proposed by Deniz — say if you want changes, they live in `src/index.css`):

- Panels: `rounded-xl border border-line bg-panel backdrop-blur-md p-4`
- Text: `text-ink`, secondary `text-ink-muted`; headings `font-display`; numbers, scores, coordinates, years `font-mono`
- Accent: `text-accent` / `bg-accent` / `border-accent` — automatically silver on the Moon, rust on Mars, cyan on Earth. Add `accent-transition` to fade it.
- Similar `text-similar` (green), different `text-different` (amber, not red: "different", not "wrong")
- Icons: `lucide-react`, e.g. `import { ArrowLeft } from 'lucide-react'`
- Buttons need visible focus styles; everything must be usable without the globe (keyboard, screen readers).

## 6. Data you must handle

- Both JSON files have `"mock": true` until Sadık's real output lands (B8, Sunday noon). Texts start with `MOCK.` — don't fix them in the UI.
- `image` is `null` everywhere for now → show a placeholder, not a broken image.
- `differences`, `sources`, `processes` can be empty arrays → hide the section or show a short "None noted" line.
- `knownRef` can be `null` even when `known` is `true`.
- `year` is `null` for future candidates.

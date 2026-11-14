# app/

Web application that presents the results. Redesigned on 14 Nov (see `docs/STATUS.md`). Plan and steps: [`docs/PROJECT_PLAN.md`](../docs/PROJECT_PLAN.md).

Stack: React + TypeScript + Vite, Tailwind CSS v4, React Router, three.js + `three-globe` (one shared 3D scene), Lucide icons, deployed on Vercel.

## Run it

Needs Node.js 20.19+ (LTS recommended).

```bash
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run lint     # oxlint
```

## Pages and flow

```
 /  Landing                 /explore/:body  Explore              /earth  Earth              /calculations      /about
 ┌───────────────────┐      ┌──────────────────────────┐        ┌────────────────────┐     ┌──────────────┐   ┌────────┐
 │ what the project  │      │ Moon or Mars in focus    │        │ Earth in focus     │     │ the method,  │   │ team   │
 │ is, as a scroll   │─────▶│  sites as cards (dock)   │        │  all 21 training   │     │ step by step │   │ data   │
 │ story over the    │      │  → one site (side panel) │◀──────▶│  areas, grouped by │     │ + "Details"  │   │ AI use │
 │ planets           │      │  → its 3 areas on Earth  │        │  the site they fit │     │ drawers      │   │        │
 └───────────────────┘      └──────────────────────────┘        └────────────────────┘     └──────────────┘   └────────┘
     header on every page: Earth Analogs (home) · Moon · Mars · Earth · Calculations · About
```

| Route | File | What happens |
|---|---|---|
| `/` | `src/pages/LandingPage.tsx` | Seven sections, each with `data-stage="0…6"`: the question and what an analog is, with a live pair (one of our sites linked to its match on Earth by an arc in the 3D scene); the method in three steps; Mars; the Moon (it tips its south pole toward the viewer); the check against real missions; Earth; where to go next. The scroll position between section centres drives the planet poses in `src/globe/space/story.ts`. |
| `/explore/moon`, `/explore/mars` | `src/pages/ExplorePage.tsx` | The URL sets `body`; the rest (`site` → `earth`) is the shared state. `?site=<id>` opens straight on a site. Leaving the page resets the selection. |
| `/earth`, `/earth/<analog id>` | `src/pages/EarthPage.tsx` | Earth with every training area as a marker, coloured by the world it stands in for. The selection lives in the URL. |
| `/calculations` | `src/pages/CalculationsPage.tsx` | How the sites were found and matched, one idea per section; each section's **Details** button opens a drawer (`src/components/Drawer.tsx`) with thresholds, formulas and tables. Facts follow `docs/SCREENING_RESULTS.md`, `docs/ANALOG_RESULTS.md`, `docs/AUDIT.md` — keep them in sync. |
| `/about` | `src/pages/AboutPage.tsx` | The challenge, the team, data and image credits, AI usage. |

Shared pieces: `src/components/SiteHeader.tsx` (top bar; folds into a menu below 768 px) and `src/components/Drawer.tsx`.

### The 3D scene (`src/globe/`)

One three.js scene sits behind every page and never unmounts, so page changes are one continuous animation:

| Where | Scene |
|---|---|
| first load | **intro** — a slow push-in from deep space once the textures are in; page text then fades in (`.reveal`) |
| `/` | **story** — the planets take the pose of the section on screen (`space/story.ts`); on the first screen an arc links a site to its Earth match and both bodies turn those spots toward the viewer |
| `/calculations`, `/about` | **story**, parked on the quiet "backdrop" stage behind a veil |
| `/explore/<body>` | **focus** — that body flies to the middle of the free area (the screen minus the panels), the others drift far away; drag to orbit. Its sites are markers: our candidates bright with pulsing rings, past landings muted |
| site selected | the camera flies to the site |
| `phase: 'earth'`, `/earth` | **focus on Earth** — markers are training areas; the camera flies to the selected one |

- `SpaceScene.tsx` — React side: turns the route + shared state into a layout and markers.
- `sceneStore.ts` — what pages tell the scene outside React state: the story stage, the landing pair, and panel insets (`useSceneInset` on a panel makes the planet centre in the space that is left).
- `space/SpaceEngine.ts` — three.js side: planets (`three-globe`), lights, camera, orbit controls, tweens, arcs, clicks and hover.
- `space/story.ts` — the poses of the scroll story, in screen fractions (sizes keep the real Earth : Mars : Moon ratio).
- `space/planets.ts` — per-planet textures, colors, spin.
- Motion rules (from Emil Kowalski's animation skill): ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for entrances, ease-in-out for on-screen moves, buttons press to `scale(0.97)` in 160 ms (`.press`), hover effects only on fine pointers. `prefers-reduced-motion` turns flights into cuts and keeps only fades. Tokens live in `src/index.css`.
- Textures (`public/textures/`, public domain): Moon — NASA SVS CGI Moon Kit (LRO); Mars — USGS Viking color mosaic + MOLA elevation; Earth — NASA Blue Marble (via three-globe examples). Credited on the About page.

## Structure

| Path | What |
|---|---|
| `src/globe/` | The 3D scene: globes, markers, camera flights, the scroll story |
| `src/panels/` | Site dock, site detail, training-area report and their shared pieces (`ui.tsx`) |
| `src/pages/` | One file per route |
| `src/state/` | Shared UI state between globe and panels — change by agreement |
| `src/components/` | Header and drawer |
| `src/data/` | Loads `public/data/*.json` once (`useData()`) |
| `src/types/data.ts` | Types for the data files (shared contract) |
| `public/data/` | Pipeline output — Sadık writes, the app reads |
| `src/index.css` | Design tokens (colors, fonts, motion) — change by agreement |

## Shared state (`src/state/`)

The globe and the panels never talk to each other directly. Both read the same state and change it through the same actions:

```tsx
const { phase, body, siteId, analogId, displayBody, selectSite, showAnalogs, selectAnalog, backToSite, setBody, reset } = useAppState()
const { sitesForBody, site, analogs, analog, dimensions } = useSelection() // ids resolved to objects
```

| `phase` | Screen | Reached by |
|---|---|---|
| `browse` | Rotating Moon or Mars, no site selected | start, `setBody()`, `reset()` |
| `site` | Globe zoomed to the selected landing site, site detail panel | `selectSite(id, body)`, `backToSite()` |
| `earth` | Earth globe with the site's analogs, report panel | `showAnalogs(rank1AnalogId)`, `selectAnalog(id)` |

`displayBody` is the body drawn on the globe (`moon`, `mars` or `earth`).

## Design tokens (`src/index.css`)

Use them as Tailwind classes:

| Token | Class examples | Value |
|---|---|---|
| Background | `bg-space` | `#04060B` |
| Glass panel | `glass` (background, border, blur, shadow in one) | `rgba(10,13,22,.74)`, 11 % white border |
| Text | `text-ink`, `text-ink-muted` | `#EEF0F3`, `#939CAB` |
| **Body accent** | `text-accent`, `bg-accent`, `border-accent` | Moon `#CFD4DC`, Mars `#E56F3E`, Earth `#56C7EE` — follows `displayBody`; a section can pin it with `style={{ '--body-accent': 'var(--color-mars)' }}` |
| Similar / different | `text-similar`, `text-different` | `#5FD39B`, `#F0B14A` |
| Fonts | `font-display`, `font-sans`, `font-mono` | Jost (headings, names), IBM Plex Sans (text), IBM Plex Mono (coordinates, values) |
| Type helpers | `headline`, `eyebrow`, `on-sky` | tight Jost headline · small spaced caps label · dark halo for text straight on the sky |

Add `accent-transition` to an element to fade its accent color when the body changes.

## Data

Read data only through `useData()` / `useSelection()`. Image paths in the JSON (e.g. `images/sites/x.png`) go through `assetUrl()` from `src/data/assetUrl.ts`. `image` may be `null` and lists like `differences` may be empty — handle both.

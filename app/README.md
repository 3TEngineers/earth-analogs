# app/

Web application that presents the results. Owners: Deniz (`src/globe/`) and Kmar (`src/panels/`, `src/pages/`). Plan and steps: [`docs/PROJECT_PLAN.md`](../docs/PROJECT_PLAN.md).

Stack: React + TypeScript + Vite, Tailwind CSS v4, `react-globe.gl`, Lucide icons, deployed on Vercel.

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
 /  Landing page                    /explore/:body  Explore page                       /about
 ┌──────────────────────────┐       ┌──────────────────────────────────────────┐       ┌─────────┐
 │ title + intro            │ click │ 3D globe of the Moon or Mars             │       │ team    │
 │ (Moon) (Earth) (Mars)    │──────▶│   browse → pick a site → site card       │       │ method  │
 │ key numbers              │ Moon/ │   → "Show Earth training areas"          │       │ data    │
 │ link to About            │ Mars  │   → Earth globe + 3 analogs + report     │       │ AI use  │
 └──────────────────────────┘       └──────────────────────────────────────────┘       └─────────┘
        header on every page: Earth Analogs (home) · Moon · Mars · About
```

| Route | File | What happens | Owner |
|---|---|---|---|
| `/` | `src/pages/LandingPage.tsx` | Star field, small Moon / Earth / Mars (`src/globe/PlanetLineup.tsx`), intro text, key numbers counted from the data. Clicking the Moon or Mars flies it to the center and grows it (`LAUNCH_MS`), then opens `/explore/<body>`. Earth is decoration. | Layout + planets: Deniz. Text: Kmar |
| `/explore/moon`, `/explore/mars` | `src/pages/ExplorePage.tsx` | The URL sets `body` in the shared state; the rest (`site` → `earth`) is the shared state. Loaded lazily, so three.js isn't downloaded on the landing page. Leaving the page resets the selection. Unknown bodies redirect to `/`. | Globe: Deniz. Panels: Kmar |
| `/about` | `src/pages/AboutPage.tsx` | Team, method, NASA data, references, AI usage. | Kmar |

Shared layout pieces: `src/components/StarField.tsx` (background on every page) and `src/components/SiteHeader.tsx` (top bar).

Planned (Deniz, D2–D4): NASA textures on the small planets and the globes; the landing planet hands over seamlessly to the 3D globe at the same size and spot.

## Structure

| Path | What | Owner |
|---|---|---|
| `src/globe/` | 3D globes, markers, camera flights, transitions | Deniz |
| `src/panels/` | Site list, mission card, report panel | Kmar |
| `src/pages/` | Method, Limitations, About | Kmar |
| `src/state/` | Shared UI state between globe and panels | Shared — change by agreement |
| `src/components/` | Layout pieces used on every page (header, star field) | Shared |
| `src/data/` | Loads `public/data/*.json` once (`useData()`) | Shared |
| `src/types/data.ts` | Types for the data files | Shared contract |
| `src/dev/` | Temporary helpers; `StateDebugPanel` goes away once K1/K4 land | — |
| `public/data/` | Pipeline output (mock until B8) | Sadık writes, app reads |
| `src/index.css` | Design tokens (colors, fonts) | Shared — change by agreement |

## Shared state (`src/state/`)

The globe and the panels never talk to each other directly. Both read the same state and change it through the same actions:

```tsx
const { phase, body, siteId, analogId, displayBody, selectSite, showAnalogs, selectAnalog, backToSite, setBody, reset } = useAppState()
const { sitesForBody, site, analogs, analog, dimensions } = useSelection() // ids resolved to objects
```

| `phase` | Screen | Reached by |
|---|---|---|
| `browse` | Rotating Moon or Mars, no site selected | start, `setBody()`, `reset()` |
| `site` | Globe zoomed to the selected landing site, mission card | `selectSite(id, body)`, `backToSite()` |
| `earth` | Earth globe with the site's analogs, report panel | `showAnalogs(rank1AnalogId)`, `selectAnalog(id)` |

`displayBody` is the body drawn on the globe (`moon`, `mars` or `earth`).

## Design tokens (`src/index.css`)

Proposed, not final — adjust together. Use them as Tailwind classes:

| Token | Class examples | Value |
|---|---|---|
| Background | `bg-space` | `#05070D` |
| Glass panel | `bg-panel border-line backdrop-blur-md` | `rgba(10,14,24,.7)`, 10 % white border |
| Text | `text-ink`, `text-ink-muted` | `#E8ECF2`, `#8A94A6` |
| **Body accent** | `text-accent`, `bg-accent`, `border-accent` | Moon `#C9D1DC`, Mars `#E0663A`, Earth `#3FD0E8` — follows `displayBody` automatically |
| Similar / different | `text-similar`, `text-different` | `#4ADE80`, `#F5A524` |
| Fonts | `font-display`, `font-sans`, `font-mono` | Space Grotesk, Inter, JetBrains Mono |

Add `accent-transition` to an element to fade its accent color when the body changes.

## Data

Read data only through `useData()` / `useSelection()`. Image paths in the JSON (e.g. `images/sites/x.png`) go through `assetUrl()` from `src/data/assetUrl.ts`. `image` may be `null` and lists like `differences` may be empty — handle both.

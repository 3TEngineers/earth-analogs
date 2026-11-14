# Screening results (B2)

Our own candidate sites, found by screening Mars and the lunar south pole with published mission constraints (`docs/LANDING_CONSTRAINTS.md`), and the validation against past landings and NASA's Artemis III regions. Produced by `pipeline/mars_screening.py`, `pipeline/moon_screening.py`, `pipeline/build_sites.py` and `pipeline/make_maps.py` on 2026-11-14. The app reads the result from `app/public/data/sites.json`.

**Result: 4 Mars candidates, 3 Moon candidates.** We only kept candidates that pass every quality gate below; a fourth Moon site would have meant lowering the bar.

This is a **pre-screening** at kilometre scale (Mars) and 240 m scale (Moon). Real landing-site selection uses metre-scale imagery and takes years; the site must say so.

Maps (also for the slides):

- `docs/images/mars_screening.png` — safe zones, candidates, past landings, Oxia Planum
- `docs/images/moon_screening.png` — south pole: sunlit time, permanent shadow, passing spots, Artemis features, candidates, the 84° S polar-zone circle
- `docs/images/moon_screening_pole_zoom.png` — central 120 km around the pole

## Mars — safe landing zones

### Criteria

| Criterion | Rule | Basis |
|---|---|---|
| Air to slow down | Elevation ≤ −1 km, shown as estimated surface pressure ≥ 677 Pa (`610 Pa × exp(−h / 11.1 km)`) | MSL |
| Winter sun | \|latitude\| ≤ 30°, shown as winter noon Sun elevation ≥ 34.8° (`90° − |lat| − 25.19°`) | MSL, Mars 2020 |
| Not dust-covered | TES thermal inertia ≥ 100 J m⁻² K⁻¹ s⁻½ | Mars 2020 |
| Slope | ≤ 2° at ~4 km scale | **Ours** — MOLA can't see the metre-scale slopes missions used |
| Relief | ≤ 500 m over ~18 km | **Ours** |
| Area | All of the above over a 25 km square (landing-ellipse size) | Mars 2020 ellipse |

Data: MOLA MEGDR 16 px/deg (~3.7 km), MGS TES thermal inertia 8 px/deg. Entry flight-path angle is mission-specific (launch window, arrival geometry), so it is **not** computed — the latitude rule stands in for it.

Safe area found: **6.2 million km², 4.3 % of Mars**, in 1003 separate patches.

### How candidates are picked (quality gates, all ours)

1. Safe patch of at least **40 000 km²**.
2. The pick is the most interior point, at least **40 km** from the patch edge, so a 25 km ellipse fits easily.
3. More than **500 km** from any past landing (a new place), and more than **1500 km** from the other candidates (different regions, not four spots on one plain).
4. Taken in order of patch size until 4 are found.
5. **Second look at 463 m** (MOLA 463 m DEM, ~25 km window) and compared with successful landings measured the same way.

### Candidates

| Id | Name | Lat, lon | Pressure | Winter sun | TI | Safe patch | 463 m: slope p95 / relief |
|---|---|---|---|---|---|---|---|
| `mars-candidate-a` | Southern Elysium Planitia | 0.031°, 167.719° | 799 Pa | 64.8° | 327 | 4.33 M km², 220 km in | 1.05° / 50 m |
| `mars-candidate-b` | Chryse–Acidalia plains | 28.344°, −24.406° | 861 Pa | 36.5° | 206 | 209 k km², 85 km in | 0.40° / 62 m |
| `mars-candidate-c` | Margaritifer Terra lowland | −18.594°, −30.969° | 730 Pa | 46.2° | 190 | 50 k km², 41 km in | 3.82° / 298 m |
| `mars-candidate-d` | Western Amazonis Planitia | 25.281°, −178.906° | 836 Pa | 39.5° | 122 | 46 k km², 57 km in | 1.07° / 84 m |

Same 463 m check at past landings: InSight 0.53° / 90 m, Viking 1 0.94° / 72 m, Spirit 1.49° / 297 m, Perseverance 10.48° / 1117 m (Jezero's delta and rim; landed with terrain-relative navigation).

A, B and D are as smooth as the smoothest past landing sites. **C is rougher** — similar to Spirit's site, much smoother than Perseverance's — and is kept because it is the only large safe area in the southern hemisphere; its note in the app says so.

Names: nearest regional features in the USGS Gazetteer of Planetary Nomenclature.

### Validation — the 11 past landings

| Landing | Result | Why |
|---|---|---|
| Viking 1, Spirit, InSight, Perseverance | **Pass** all criteria | — |
| Mars Pathfinder (TI 80), Opportunity (TI 99), Zhurong (TI 54) | Fail thermal inertia only | The ≥ 100 rule is Mars 2020's; earlier landers accepted dustier ground. TES is also coarse (~7 km) |
| Curiosity | Fails slope and relief | At ~4 km scale the Gale ellipse includes Mount Sharp and the crater wall; precision-guided entry made the landing possible |
| Viking 2, Phoenix, Mars 3 | Fail winter sun (Mars 3 also pressure and roughness) | Polar or high-latitude targets by design (Phoenix went north for ice) |

Extra check: **Oxia Planum**, ESA's selected landing site for the Rosalind Franklin rover (~18.3° N, −24.7° E), passes every criterion (807 Pa, 46.5°, TI 233, 0.26°, 88 m). Mawrth Vallis, a finalist that was not selected, fails slope and relief at this scale (we don't know why it was not chosen, so we don't claim a reason).

## Moon — permanent base sites (south pole)

### Criteria

| Criterion | Rule | Basis |
|---|---|---|
| Sunlit time | ≥ 50 % at the surface | **Ours.** Published best spots are lit 85–95 % of the time 2–10 m above ground on a 20 m terrain model; PGDA is at the surface and we average to 240 m, so its peak is ~72 % |
| Earth in view | ≥ 50 % of the time | **Ours** (no published threshold) |
| Slope | ≤ 10° | **Ours** (no published lunar limit found) |
| Distance to permanent shadow | ≤ 10 km | **Ours**. Every well-lit spot near the pole passes — lit ridges sit next to dark crater floors |
| Area | All of the above over 2 × 2 pixels (~480 m) | **Ours** — 720 m left almost nothing, because well-lit ground is narrow ridges |

Data: NASA PGDA LOLA average illumination, Earth visibility and permanently shadowed regions (75° S, 120 m), LOLA slope map (75° S, 240 m), resampled to 240 m over the whole 75° S product.

### Why 50 % sunlight only means something near the pole

Typical sunlit time on flat ground (slope < 3°) by latitude:

| Latitude | Flat ground | What ≥ 50 % means |
|---|---|---|
| 86–90° S | 20 % | +30 points — exceptional, the Sun skims the horizon and high ground stays lit |
| 84–86° S | 31 % | +19 points |
| 82–84° S | 38 % | +12 points |
| 78–82° S | 39 % | ordinary |
| 75–78° S | 43 % | ordinary day/night cycle with ~2-week nights |

So candidates are only taken **south of 84° S** (the polar lighting zone, dashed circle on the map). Outside it, many spots pass the numbers but are not base-quality.

### How candidates are picked (quality gates, all ours)

1. **Best overall:** the best-lit passing spots (score = sunlit + 0.25 × Earth in view), at least 30 km apart.
2. **Outside NASA's regions:** passing spots south of 84° S and more than 40 km from every Artemis III named feature, ranked on the 3 × 3 mean of sunlit time so a single lucky pixel can't win, at least 30 km apart.
3. Every candidate's ~720 m neighbourhood (the values shown in the app) must pass all criteria, not just one pixel.
4. An outside-NASA candidate must be at least as well lit as our weakest best-overall candidate. **Only one site met this** — a second one (sunlit 50.5 %, Earth 53 %) was dropped.

### Candidates

| Id | Name | Group | Lat, lon | Sunlit | Earth in view | Slope | To permanent shadow | Nearest Artemis feature |
|---|---|---|---|---|---|---|---|---|
| `moon-candidate-a` | de Gerlache rim ridge | best overall | −88.670°, −68.294° | 53.6 % | 57.8 % | 5.7° | 3.9 km | de Gerlache Rim 2, 16 km |
| `moon-candidate-b` | Shackleton–de Gerlache connecting ridge | best overall | −89.474°, −137.234° | 52.6 % | 55.9 % | 5.6° | 0.3 km | de Gerlache Rim 2, 38 km |
| `moon-candidate-c` | Cabeus–Malapert ridge | outside NASA's regions | −85.488°, −19.049° | **54.2 %** | **92.4 %** | 4.3° | 2.6 km | Malapert Massif, 42 km |

- A and B sit next to NASA's own regions: our method lands where NASA did, which supports it. B is a ridge the literature already lists among the best-lit places at the pole.
- C is our proposal outside NASA's regions: the best lit of the three, with Earth in view 92 % of the time, on the ridge between Cabeus crater (where NASA's LCROSS impact found water ice in 2009) and Mons Malapert.

### Validation — Artemis III regions and Chandrayaan-3

Passing ground within 25 km of each region's named feature (NASA gives no region coordinates):

| Region | Passing ground | Best sunlit |
|---|---|---|
| Peak near Cabeus B | **no** | 41.4 % |
| Haworth | **no** | 34.0 % |
| Malapert Massif | yes (1.04 km²) | 65.9 % |
| Mons Mouton (and Plateau) | yes (3.17 km²) | 64.8 % |
| Nobile Rim 1 and 2 | **no** | 41.5 % |
| de Gerlache Rim 2 | yes (0.17 km²) | 68.9 % |
| Slater Plain | yes (0.06 km²) | 68.2 % |

**4 of 7** named features have ground passing our criteria. NASA also weighs science, launch windows and trajectories, which we don't model. Feature centres are from the USGS Gazetteer (audit, 14 Nov: the first run used centres 8–17 km off for Cabeus B and Haworth, which made Cabeus B pass; see `docs/AUDIT.md`). The Cabeus B region is a *peak near* the crater, so a 25 km circle around the crater centre may miss it.

**Chandrayaan-3** (−69.373°, 32.319°): sunlit 48.3 % ✗ (a normal day/night cycle), Earth in view 100 %, slope 0.8°, no permanent shadow within ~29 km ✗ — a good landing site, but not a permanent base site.

## Re-running

```bash
pipeline/.venv/Scripts/python pipeline/mars_screening.py
pipeline/.venv/Scripts/python pipeline/moon_screening.py
pipeline/.venv/Scripts/python pipeline/build_sites.py
pipeline/.venv/Scripts/python pipeline/make_maps.py
```

First runs download ~35 MB (Mars) and ~330 MB (Moon) into `data/raw/`; the Mars 463 m check reads small windows remotely.

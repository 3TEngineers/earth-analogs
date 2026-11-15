# Screening results (B2)

Our own candidate sites, found by screening Mars and the lunar south pole with published mission constraints (`docs/LANDING_CONSTRAINTS.md`), and the validation against past landings and NASA's Artemis III regions. Produced by `pipeline/mars_screening.py`, `pipeline/moon_screening.py`, `pipeline/build_sites.py` and `pipeline/make_maps.py`. The app reads the result from `app/public/data/sites.json`.

**Re-run on 15 Nov 2026 after the full audit** (`docs/AUDIT.md`, errors 11–15). The Mars result changed: the thermal inertia map had been read 180° of longitude away from the elevation, and both Mars grids were one pixel off. The Moon candidates did not change.

**Result: 5 Mars candidates, 3 Moon candidates.** The number is not chosen: it is what the rules below give.

This is a **pre-screening** at kilometre scale (Mars) and 240 m scale (Moon). Real landing-site selection uses metre-scale imagery and takes years; the site must say so.

Maps (also for the slides):

- `docs/images/mars_screening.png` — safe zones, candidates, past landings, Oxia Planum
- `docs/images/moon_screening.png` — south pole: sunlit time, permanent shadow, passing spots, Artemis features, candidates, the 84° S polar-zone circle
- `docs/images/moon_screening_pole_zoom.png` — central 120 km around the pole

## Mars — safe landing zones

### Criteria

| Criterion | Rule | Basis |
|---|---|---|
| Air to slow down | Elevation ≤ −1 km, shown as estimated surface pressure ≥ 668 Pa (`610 Pa × exp(−h / 11.1 km)`) | MSL |
| Winter sun | \|latitude\| ≤ 30°, shown as winter noon Sun elevation ≥ 34.8° (`90° − |lat| − 25.19°`) | MSL, Mars 2020 |
| Not dust-covered | TES thermal inertia ≥ 100 J m⁻² K⁻¹ s⁻½ | MSL engineering guide, Mars 2020 |
| Not dust-covered, second check | TES albedo ≤ 0.25 where thermal inertia is below 150 | MSL guide: thermal inertia < 100 with albedo > 0.25 is "not suitable for landing spacecraft or driving rovers"; Mars 2020: below ~150 with high albedo "may also be dusty" |
| Slope | ≤ 3° between MOLA pixels 3.7 km apart | MSL engineering guide: "three degrees or less over a 2 to 5 km length scale". Its finer limits (5° over 200–500 m, 15° over 20–40 m and 5 m) need images a global map does not have |
| Relief | ≤ 500 m over ~18 km | **Ours**: no crater wall or mountain inside the landing area |
| Area | All of the above over a 25 km square (landing-ellipse size) | Mars 2020 ellipse |

Data: MOLA MEGDR 16 px/deg (~3.7 km), MGS TES thermal inertia and bolometric albedo 8 px/deg. Pixel positions come from the PDS labels, not from GDAL's georeferencing (which is one pixel off for these files; `docs/AUDIT.md` error 12). Entry flight-path angle is mission-specific (launch window, arrival geometry), so it is **not** computed — the latitude rule stands in for it. Rock abundance is not screened: we found no global map we could download and check.

Safe area found: **6.45 million km², 4.5 % of Mars**, in 895 separate patches.

### How candidates are picked (quality gates, all ours)

1. Take the safe point **deepest inside safe ground** (farthest from the edge of its safe area). The area must be at least **40 000 km²**.
2. It must be a **new place**: more than **500 km** from the 11 successful landings and from the two landers that reached the ground without a working mission (Beagle 2 in Isidis Planitia, Schiaparelli in Meridiani Planum).
3. Take the next deepest point that is also more than **1500 km** from the candidates already chosen (different regions), and repeat.
4. Stop when the best point left is less than **40 km** inside its safe area. That happened after five; the sixth would have been 30 km inside.
5. **Second look at 463 m** (MOLA 463 m DEM, ~25 km window), compared with successful landings measured the same way.

The map's left and right edges (±180°) are the same meridian; the picking cuts the map where there is no safe ground, and the audit checks that the result is the same when the planet is turned a third of the way round.

### Candidates

| Id | Name | Lat, lon | Pressure | Winter sun | TI | Albedo | Slope | Relief | Inside safe area | 463 m: slope p95 / relief |
|---|---|---|---|---|---|---|---|---|---|---|
| `mars-candidate-a` | Southern Utopia Planitia | 27.719°, 126.719° | 889 Pa | 37.1° | 163 | 0.19 | 0.09° | 18 m | 4.16 M km², 108 km in | 0.31° / 37 m |
| `mars-candidate-b` | Northern Elysium Planitia | 14.094°, 159.094° | 734 Pa | 50.7° | 273 | 0.19 | 0.18° | 62 m | 4.16 M km², 103 km in | 0.81° / 99 m |
| `mars-candidate-c` | Western Isidis Planitia | 10.719°, 81.844° | 864 Pa | 54.1° | 307 | 0.20 | 0.23° | 74 m | 4.16 M km², 99 km in | 2.31° / 202 m |
| `mars-candidate-d` | Chryse–Acidalia plains | 28.344°, −24.344° | 862 Pa | 36.5° | 301 | 0.14 | 0.14° | 42 m | 984 k km², 76 km in | 0.50° / 74 m |
| `mars-candidate-e` | Eastern Meridiani Planum | 0.344°, 3.031° | 687 Pa | 64.5° | 447 | 0.20 | 0.41° | 90 m | 322 k km², 55 km in | 1.36° / 148 m |

Same 463 m check at past landings: InSight 0.53° / 90 m, Viking 1 0.94° / 72 m, Spirit 1.49° / 297 m, Perseverance 10.48° / 1117 m (Jezero's delta and rim; landed with terrain-relative navigation).

- A, B and C lie in the largest safe area on Mars, which runs from Isidis through southern Utopia to Elysium.
- D is the same place as the 14 Nov candidate "Chryse–Acidalia plains" (4 km away: the one-pixel fix).
- C is the roughest of the five at 463 m, still far smoother than Jezero.
- All five are in the northern lowlands or on Meridiani Planum. South of the equator most ground is above −1 km, and the patches that pass are too small to hold a point 40 km from their edge.

**What happened to the 14 Nov candidates.** With the maps aligned: *Southern Elysium Planitia* has thermal inertia 104 and albedo 0.28 — bright and low-inertia, so it fails the second dust check. *Western Amazonis Planitia* has thermal inertia 49 and albedo 0.27: dust by any rule (the misaligned map had shown 122). *Margaritifer Terra lowland* still passes at its own point, but its safe area is 15 000 km² and it sits 36 km inside it, so it fails both quality gates.

Names: the USGS Gazetteer feature each point lies in (Utopia Planitia, Elysium Planitia, Isidis Planitia, Acidalia/Chryse Planitia, Meridiani Planum).

### Validation — the 11 past landings

| Landing | Our rules | Why the mission went there (sources in `pipeline/content/past_landings.json`) |
|---|---|---|
| Viking 1, Mars Pathfinder, Spirit, Opportunity, InSight, Zhurong | **Pass** all | Science at a safe site: flood deposits (Pathfinder), a possible lake bed (Spirit), hematite on a very smooth plain (Opportunity), a site chosen "for safety" (InSight) |
| Curiosity | Fails relief (1406 m over 18 km) | Gale crater was chosen for habitability; the layered mountain it climbs is inside our window. Guided entry (designed for ≤ 10 km error) made the flat floor beside it enough |
| Perseverance | Fails relief (517 m vs 500 m) | Jezero held a lake and a river delta; the delta scarp and crater rim are inside our window. Terrain-relative navigation steers away from hazards |
| Viking 2 | Fails winter sun (48° N) | Same goals as Viking 1; the Viking landers were nuclear powered |
| Phoenix | Fails winter sun (68° N); no TES data | Went north on purpose, to reach ground ice |
| Mars 3 | Fails pressure, winter sun, relief | 45° S, +1.7 km, rough ground; no source found for the choice |

**6 of the 8 landings inside ±30° pass every rule** (before the audit: 4, because the misaligned dust map failed Pathfinder, Opportunity and Zhurong). The two that fail are the two that carried precision landing systems so that they could land next to steep ground.

**Each landing against its own mission's limits** (elevation from our MOLA grid; limits from `LANDING_CONSTRAINTS.md` §1): all seven we have limits for pass.

| Landing | Elevation limit | Ours | Latitude band | Landed |
|---|---|---|---|---|
| Mars Pathfinder | below 0 km | −3.68 km | 10° N–20° N | 19.09° N |
| Spirit | below −1.3 km | −1.93 km | 15° S–5° N | 14.57° S |
| Opportunity | below −1.3 km | −1.38 km | 5° S–15° N | 1.95° S |
| Phoenix | below −3.5 km | −4.13 km | 65° N–72° N | 68.22° N |
| Curiosity | below −1 km | −4.49 km | ±30° | 4.59° S |
| InSight | below −2.5 km | −2.60 km | 3° N–5° N | 4.50° N |
| Perseverance | below −0.5 km | −2.56 km | ±30° | 18.44° N |

Extra check: **Oxia Planum**, ESA's selected landing site for the Rosalind Franklin rover (18.275° N, 335.368° E), passes every criterion at its centre (807 Pa, 46.5°, TI 405, albedo 0.19, 0.26°, 85 m).

## Moon — permanent base sites (south pole)

### Criteria

| Criterion | Rule | Basis |
|---|---|---|
| Sunlit time | ≥ 50 % at the surface | **Ours.** Published best spots are lit 85–95 % of the time 2–10 m above ground on a 20 m terrain model; PGDA is at the surface (its own 120 m maximum is 90 %) and we average to 240 m, so the peak on our grid is ~72 % |
| Earth in view | ≥ 50 % of the time | **Ours** (no published threshold) |
| Slope | ≤ 10° | **Ours.** For scale: ISRO built the Chandrayaan-3 lander for slopes up to 12° |
| Distance to permanent shadow | ≤ 10 km to a shadowed area of **at least 1 km²** | **Ours.** Until 15 Nov any shadowed pixel counted; the grid holds 35 996 shadow patches and only 3 864 are ≥ 1 km² |
| Area | All of the above over 2 × 2 pixels (~480 m) | **Ours** — 720 m left almost nothing, because well-lit ground is narrow ridges |

Data: NASA PGDA LOLA average illumination, Earth visibility and permanently shadowed regions (75° S, 120 m), LOLA slope map (75° S, 240 m), resampled to 240 m over the whole 75° S product. Passing area: 62.9 km². (It read 19.4 km² until the 15 Nov Earth audit: 29 % of the slope map's pixels hold no measurement and were being read as 45° slopes, which failed the measured ground next to them. The candidates, their values and the validation below did not change — `AUDIT.md`, error 23.)

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
4. An outside-NASA candidate must be at least as well lit as our weakest best-overall candidate. **Only one site met this.**

### Candidates

| Id | Name | Group | Lat, lon | Sunlit | Earth in view | Slope | To a shadow ≥ 1 km² | Nearest Artemis feature |
|---|---|---|---|---|---|---|---|---|
| `moon-candidate-a` | de Gerlache rim ridge | best overall | −88.670°, −68.294° | 53.6 % | 57.8 % | 5.7° | 5.5 km | de Gerlache Rim 2, 16 km |
| `moon-candidate-b` | Shackleton–de Gerlache connecting ridge | best overall | −89.474°, −137.234° | 52.6 % | 55.9 % | 5.6° | 2.2 km | de Gerlache Rim 2, 38 km |
| `moon-candidate-c` | Cabeus–Malapert ridge | outside NASA's regions | −85.488°, −19.049° | **54.2 %** | **92.4 %** | 4.3° | 2.6 km | Malapert Massif, 42 km |

- A and B sit next to NASA's own regions: our method lands where NASA did, which supports it. In the raw 120 m product the brightest places are the Shackleton rim, the connecting ridge (B), Mons Malapert and Mons Mouton — the places the literature names.
- C is our proposal outside NASA's regions: the best lit of the three, with Earth in view 92 % of the time, on the ridge between Cabeus crater (where NASA's LCROSS impact found water ice in 2009) and Mons Malapert.
- Names checked against the USGS Gazetteer: A is on the rim of de Gerlache (16 km from its centre, radius 16 km); B is between Shackleton and Spudis craters; C is 42 km from the centre of Mons Malapert and 56 km from the centre of Cabeus.

### Validation — Artemis III regions

Passing ground within 25 km of each region's named feature (NASA gives no region coordinates):

| Region | Passing ground | Best sunlit |
|---|---|---|
| Peak near Cabeus B | **no** | 41.4 % |
| Haworth | **no** | 34.0 % |
| Malapert Massif | yes (0.40 km²) | 65.9 % |
| Mons Mouton (and Plateau) | yes (3.17 km²) | 64.8 % |
| Nobile Rim 1 and 2 | **no** | 41.5 % |
| de Gerlache Rim 2 | yes (0.17 km²) | 68.9 % |
| Slater Plain | yes (0.06 km²) | 68.2 % |

**4 of 7** named features have ground passing our criteria. NASA also weighs science, launch windows and trajectories, which we don't model. The Cabeus B region is a *peak near* the crater, so a 25 km circle around the crater centre may miss it.

### Validation — the three landers that reached the south polar region

| Landing | Sunlit | Earth in view | Slope | To a shadow ≥ 1 km² | Why it went there |
|---|---|---|---|---|---|
| Chandrayaan-3 (2023), −69.373°, 32.319° | 48.3 % ✗ | 100 % | 0.8° | none within 30 km ✗ | To show a soft landing and a rover drive, for one lunar day; site chosen for slope, boulders, light for power and contact with Earth |
| IM-1 Odysseus (2024), −80.13°, 1.44° | 39.1 % ✗ | 100 % | 11.0° ✗ | 8.1 km | NASA wanted to learn about terrain and communications near the pole; Malapert A is "relatively flat and safe" |
| IM-2 Athena (2025), −84.791°, 29.196° | 46.5 % ✗ | 92.3 % | 2.7° | 6.6 km | To drill for water ice on Mons Mouton (NASA's PRIME-1) |

All three were built to work for about one lunar day: they needed two weeks of daylight, not light all year. That is the difference between a landing site and a base site. NASA's orbiter found IM-1 resting on a **12° slope**; our map reads **11.0°** at the same spot — an independent check of the slope layer.

## Re-running

```bash
pipeline/.venv/Scripts/python pipeline/mars_screening.py
pipeline/.venv/Scripts/python pipeline/moon_screening.py
pipeline/.venv/Scripts/python pipeline/build_sites.py      # sites.json, landings.json; keeps training areas only for sites that did not move
pipeline/.venv/Scripts/python pipeline/earth_ranking.py    # needed when a candidate changed (uses B3's data/interim files)
pipeline/.venv/Scripts/python pipeline/build_analogs.py
pipeline/.venv/Scripts/python pipeline/make_maps.py
pipeline/.venv/Scripts/python pipeline/audit.py
```

First runs download ~55 MB (Mars) and ~330 MB (Moon) into `data/raw/`; the Mars 463 m check reads small windows remotely.

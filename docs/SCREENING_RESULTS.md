# Screening results (B2)

Our own candidate sites, found by screening Mars and the lunar south pole with published mission constraints (`docs/LANDING_CONSTRAINTS.md`), and the validation against past landings and NASA's Artemis III regions. Produced by `pipeline/mars_screening.py`, `pipeline/moon_screening.py` and `pipeline/build_sites.py` on 2026-11-14. The app reads the result from `app/public/data/sites.json`.

This is a **pre-screening** at kilometre scale (Mars) and 240 m scale (Moon). Real landing-site selection uses metre-scale imagery and takes years; the site must say so.

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
| New place | > 500 km from any past landing; candidates > 1000 km apart | **Ours** |

Data: MOLA MEGDR 16 px/deg (~3.7 km), MGS TES thermal inertia 8 px/deg. Entry flight-path angle is mission-specific (launch window, arrival geometry), so it is **not** computed — the latitude rule stands in for it.

Safe area found: **6.2 million km², 4.3 % of Mars**.

### Candidates

| Id | Name | Lat, lon | Pressure | Winter sun | Thermal inertia | Slope | Relief |
|---|---|---|---|---|---|---|---|
| `mars-candidate-a` | Southern Elysium Planitia | 0.03°, 167.72° | 799 Pa | 64.8° | 327 | 0.02° | 35 m |
| `mars-candidate-b` | Chryse–Acidalia plains | 28.34°, −24.41° | 861 Pa | 36.5° | 206 | 0.13° | 39 m |

Names come from the USGS Gazetteer of Planetary Nomenclature (nearest regional features).

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
| Sunlit time | ≥ 50 % at the surface | **Ours.** Published best spots are lit 85–95 % of the time 2–10 m above ground on a 20 m terrain model; PGDA is at the surface and we average to 240 m, so its peak is ~72 % and 50 % is the top ~1 % of the grid |
| Earth in view | ≥ 50 % of the time | **Ours** (no published threshold) |
| Slope | ≤ 10° | **Ours** (no published lunar limit found) |
| Distance to permanent shadow | ≤ 10 km | **Ours**. Every well-lit spot passes — lit ridges sit next to dark crater floors |
| Area | All of the above over 2 × 2 pixels (~480 m) | **Ours** — 720 m left almost nothing, because well-lit ground is narrow ridges |

Data: NASA PGDA LOLA average illumination, Earth visibility and permanently shadowed regions (75° S, 120 m), LOLA slope map (75° S, 240 m), resampled to 240 m poleward of ~82° S.

Passing area: **12.8 km²** over the whole south pole.

### Candidates

| Id | Name | Lat, lon | Sunlit | Earth in view | Slope | To permanent shadow |
|---|---|---|---|---|---|---|
| `moon-candidate-a` | de Gerlache rim ridge | −88.670°, −68.294° | 53.6 % | 57.8 % | 5.7° | 3.9 km |
| `moon-candidate-b` | Shackleton–de Gerlache connecting ridge | −89.474°, −137.234° | 52.6 % | 55.9 % | 5.6° | 0.3 km |

`moon-candidate-b` is a ridge the literature already lists among the best-lit places at the pole — finding it independently supports the method rather than being a new discovery.

### Validation — Artemis III regions and Chandrayaan-3

Passing ground within 25 km of each region's named feature (NASA gives no region coordinates):

| Region | Passing ground | Best sunlit |
|---|---|---|
| Peak near Cabeus B | yes (0.12 km²) | 53.9 % |
| Haworth | **no** | 42.3 % |
| Malapert Massif | yes (1.04 km²) | 65.9 % |
| Mons Mouton (and Plateau) | yes (3.17 km²) | 64.8 % |
| Nobile Rim 1 and 2 | **no** | 41.5 % |
| de Gerlache Rim 2 | yes (0.17 km²) | 68.9 % |
| Slater Plain | yes (0.06 km²) | 68.2 % |

**5 of 7** named features have ground passing our criteria. NASA also weighs science, launch windows and trajectories, which we don't model.

**Chandrayaan-3** (−69.373°, 32.319°): sunlit 48.3 % ✗ (a normal day/night cycle), Earth in view 100 %, slope 0.8°, no permanent shadow within ~29 km ✗ — a good landing site, but not a permanent base site.

## Re-running

```bash
pipeline/.venv/Scripts/python pipeline/mars_screening.py
pipeline/.venv/Scripts/python pipeline/moon_screening.py
pipeline/.venv/Scripts/python pipeline/build_sites.py
```

First runs download ~35 MB (Mars) and ~250 MB (Moon) into `data/raw/`.

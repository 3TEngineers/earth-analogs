# Data accuracy audit

Mentors told us data accuracy is what NASA Space Apps judges care about most. So on 14 Nov we checked every number the backend produces against something **independent**: a published value, a known place, a synthetic case, or the raw data recomputed from scratch. Input documents written by the team were checked too, not trusted.

Run it any time after the pipeline:

```bash
pipeline/.venv/Scripts/python pipeline/audit.py   # prints PASS / WARN / FAIL, writes data/interim/audit.json
```

## Result

| | PASS | WARN | FAIL |
|---|---|---|---|
| First run | 84 | 2 | 5 |
| After the fixes below | **98** | **2** | **0** |

The two remaining WARNs are explained under [Remaining limits](#remaining-limits).

## What is checked

| Section | Checks | Reference |
|---|---|---|
| **Math** | slope of a synthetic 10° plane; identical slope distributions score 1; equator winter noon Sun = 90° − 25.19°; pressure formula gives 610 Pa at the MOLA datum | geometry, Mars axial tilt, mean surface pressure |
| **Inputs** | all 37 known-analog coordinates (`KNOWN_ANALOGS.md`) fall in the country the doc names; all 7 Artemis III feature coordinates match the USGS Gazetteer | Natural Earth countries, USGS Gazetteer of Planetary Nomenclature |
| **Mars data** | MOLA elevation under 7 landers vs published values, on the 463 m DEM and on our 16 px/deg screening grid; every Mars candidate's 5 criteria recomputed from the raw grids | published landing-site elevations |
| **Moon data** | Shackleton floor is permanently shadowed; Earth is in view more on the near side than the far side; total shadowed area south of 80° S; every Moon candidate's sunlight recomputed | Mazarico et al. (2011), geometry |
| **Earth terrain and rock** | Bonneville Salt Flats come out flat (0.03°), the Alps steep (24.6°); GLiM rock class at Iceland, Deccan Traps (basalt), Grand Erg Oriental (sand), Greenland (ice) | known geology |
| **Earth climate** | GPM rainfall at Manaus, Istanbul, Eskişehir, London, In Salah, Atacama; MODIS surface temperature in the Lut Desert and at Dome Fuji (Antarctica); Greenland ice sheet excluded, McMurdo Dry Valleys kept | climatology, Dome Fuji station mean −54.4 °C |
| **Outputs** | every "similar"/"different" sentence matches its score; country names match the coordinates; 3 analogs per candidate ≥ 500 km apart with ≥ 1 new; no missing values (None/NaN) in any text; no life-detection tests for the Moon | `analogs.json`, `sites.json` |

## Errors found and fixed

| # | Error | Effect | Fix |
|---|---|---|---|
| 1 | Two Artemis III feature coordinates were off: **Cabeus B by 7.7 km**, **Haworth by 16.8 km** (Haworth came from Wikipedia) | Cabeus B wrongly passed our validation | USGS Gazetteer values in `moon_screening.py` and `LANDING_CONSTRAINTS.md`. Validation is now **4 of 7** Artemis features with passing ground (was 5) |
| 2 | GPM IMERG **over-reports rain in the driest deserts**: Atacama 59 mm/yr vs ~2 mm measured | The dryness score punished the most Mars-like deserts | Rain ≤ 100 mm/yr now counts as fully dry (`earth_pool.py`). The Mars training areas changed; see `ANALOG_RESULTS.md` |
| 3 | Report sentences showed **"None mm of rain"**, **"None °C"** | Visible on the site for most analogs | B4's rock-pool cells carried only scores; `build_analogs.py` now fills the raw values from B3's grid. New audit check: no None/NaN in any text |
| 4 | Moon training areas suggested **life-detection drilling** (from the dryness test mapping) | Wrong for the Moon | The life-detection test is given only for Mars |
| 5 | Mars text said the day–night swing on Mars is **"hundreds of degrees"** | Wrong: that is the Moon (~300 K); Mars' surface swings up to ~100 K (Curiosity REMS) | Separate wording per body |
| 6 | Mars reports often had **no "different" line** | Read as "identical to Mars" | Every report now ends with what no Earth site has: air pressure, gravity, magnetic field (NASA NSSDC fact sheets) |
| 7 | `LANDING_CONSTRAINTS.md`: Mars 2020 elevation limit written as **below −0.5 km**; it is **below +0.5 km**. Thermal inertia limit is 100–150, not just 100 | Doc only; the code uses MSL's −1 km, which was right | Doc corrected, history line fixed (Phoenix −3.5 → MER −1.3 → MSL −1 → Mars 2020 +0.5 km) |
| 8 | `PROJECT_PLAN.md` said MSL allowed **up to +1 km**; that was an early plan, the final limit was **below −1 km** | Doc only | Corrected |
| 9 | "Done before at analog sites" examples (`KNOWN_ANALOGS.md` §3, shown in every report): each of the 16 claims was checked against its source page | 4 wrong, 3 imprecise | **Removed:** D-RATS 2022 night EVAs (not in the NASA record). **Corrected:** Mauna Kea → Hawaii and DLR removed (the page names NASA/CSA instruments); Lanzarote years removed (page gives none); Icebreaker years removed (page gives none). **Reworded:** Desert RATS, "Bridget" (a rover prototype carrying ExoMars instruments), RESOLVE (a NASA payload on CSA's Artemis Jr. rover) |

The Navarro-González et al. (2003, *Science* 302:1018) page could not be fetched (paywall); it is a well-known paper and stays, marked as read from the abstract.

## What passed and supports the method

- **Coordinates written by the team are right:** all 37 known analogs lie in the stated country, and the 463 m MOLA elevation under 7 Mars landers matches the published values within **56 m** (Curiosity −4495 m vs −4500 m).
- **The screening is reproducible:** all 4 Mars candidates' criteria and all 3 Moon candidates' sunlight recompute exactly from the raw data.
- **The Earth data behaves as expected:** flat salt flats, steep Alps, basalt in Iceland and the Deccan, rain within a factor of 2 of climatology outside the hyperarid deserts, Antarctic surface temperature 214.5 K vs the 218.8 K station air mean.

## Remaining limits

- **WARN — Curiosity on the 16 px/deg grid:** the 3.7 km pixel under Curiosity sits on the foot of Mount Sharp (−4096 m vs −4500 m). The 463 m DEM gets it right. It does not change any result: every lander's elevation passes the −1 km rule either way.
- **WARN — shadow area on our 240 m grid:** keeping a cell as "shadowed" if any of its 120 m sub-cells is shadowed inflates the area (39,149 km² over the whole 75° S map), but it is only used for "distance to shadow", which it can shorten by at most 0.24 km.
- **Permanently shadowed area +22 %** vs Mazarico et al. (2011): we use the newer 120 m product (2016); their maps were 240 m.
- **Rainfall is one year (2023)** and IMERG can be up to ~2× off in temperate places (Eskişehir 734 mm vs ~380 mm climatology). The training areas are all in deserts or polar regions, where the dryness score is saturated, so this does not change the picks.
- **Lake Salda is not reproduced** as a Jezero analog: its similarity is mineral (carbonates) and setting (a lake with a delta), and no global dataset we have covers that. Stated in `ANALOG_RESULTS.md`.
- Rock type is coarse (GLiM, 0.5°) and the planet-side rock family is our reading of the site's geology (confidence: low in every report).

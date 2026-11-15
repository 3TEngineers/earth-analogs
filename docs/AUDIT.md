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
| After the fixes below (14 Nov) | 98 | 2 | 0 |
| After error 10 (15 Nov) | 100 | 2 | 0 |
| After the full audit of the screening (15 Nov, errors 11–15), Mars and Moon sections only | **48** | **1** | **0** |

The last row is a partial run (`audit.py mars moon`): the Earth sections need B3's files and the re-made training areas, so the **full count must be re-run after `earth_ranking.py` and `build_analogs.py`**. The remaining WARN is explained under [Remaining limits](#remaining-limits).

The Mars section reads the USGS 463 m DEM over the network. On 15 Nov one run out of four stopped there and reported a single FAIL ("section ran"); the three other runs gave 48 / 1 / 0. If that line appears, run the audit again before reading anything into it.

## The full audit of 15 Nov

After training areas turned up on frozen sea (error 10), the team asked for a complete re-check of the screening itself: every data layer read again by an independent route, every threshold traced to its source, and every past landing asked "why did the mission go there?". It found five more errors, two of them serious.

| # | Error | Effect | Fix |
|---|---|---|---|
| 11 | **Mars thermal inertia was read 180° of longitude away from the elevation.** `load_grids()` rolled the elevation half a turn to run −180..180 but not the thermal inertia reprojected onto the same grid. The earlier audit could not see it: it recomputed our values with our own code | Every thermal inertia value was the other side of the planet's. Pathfinder read 80 (really 400), Opportunity 99 (256), Zhurong 54 (265), so three good landings "failed". Our Amazonis candidate read 122 (really **49: dust**), our Elysium candidate 327 (really 104, and bright) | All layers are rolled together. New checks: Tharsis, Arabia and Amazonis must come out bright and low-inertia, Syrtis Major dark and firm — a shift swaps them. **Validation is now 6 of 8 equatorial landings passing (was 4); the Mars candidates were chosen again** |
| 12 | **GDAL places the MOLA MEGDR and TES grids one pixel off** (3.7 km and 7.4 km): its PDS driver reads the label's projection offset one pixel differently from how these files were written | Values were sampled 3.7–7.4 km north-west of the place asked for. On plains it hardly matters; at Gale crater it put Curiosity on the foot of Mount Sharp (the old WARN: −4096 m vs −4500 m) and at Jezero it missed the delta scarp | Pixel positions come from the label (row r = 90 − (r + 0.5)/16° N, column c = (c + 0.5)/16° E). Checked against the USGS 463 m GeoTIFF around Gale: 89 m RMS in place, 194 m or more one pixel off in any direction. Curiosity now reads −4509 m. The LOLA slope map was tested the same way (against the USGS 118 m DEM) and is in place |
| 13 | **Candidate picking stopped at the map's edge and tried one point per safe area.** `ndimage.label` and the distance transform do not wrap at ±180°, so a safe area crossing it was cut in two and "distance to the edge" was measured from the cut (the Amazonis pick sat 59 km from it). And only each area's single most interior point was tried: Chryse (1 M km²) and Meridiani (0.3 M km²), the 2nd and 3rd largest safe areas, were dropped whole because that point is near Viking 1 and Opportunity. Areas were also sized with the latitude of one point | Candidates depended on where the map happened to be cut, and two of the three largest safe areas could never yield one | The map is cut where there is no safe ground; areas are summed pixel by pixel; the pick is the deepest safe point that is a new place, repeated until none is ≥ 40 km inside. New check: the candidates are the same when the planet is turned a third of the way round |
| 14 | **Error 7's "correction" was wrong.** Mars 2020's elevation limit is **below −0.5 km** ("MOLA elevation below −0.5 km for sufficient atmosphere", Fergason et al. 2017, LPSC abstract 2163, read in full) — as `LANDING_CONSTRAINTS.md` first said | Doc only | Doc restored. Lesson: a correction needs its source read, like anything else |
| 15 | Zhurong's coordinates were 2 km off (25.102° N, 109.914° E; published 25.066° N, 109.925° E). Curiosity and Perseverance were rounded to two decimals in the screening list | Negligible for the results | Corrected in `mars_screening.py`, `landings.json`, `LANDING_CONSTRAINTS.md` |

Changes that are improvements rather than errors:

- **Slope rule is now a published one.** The MSL engineering guide gives "three degrees or less over a 2 to 5 km length scale". We had "≤ 2° at ~4 km, ours", measured with a 7.4 km baseline. It is now ≤ 3° between pixels 3.7 km apart.
- **Second dust check from TES albedo** (MSL guide; Mars 2020). It is what rejects the old Elysium candidate.
- **Beagle 2 and Schiaparelli count as past landing sites** for the "new place" rule.
- **Moon: distance to shadow only counts shadowed areas ≥ 1 km².** Any shadowed 240 m pixel used to count. The three candidates stayed; their distances are now 5.5, 2.2 and 2.6 km.
- **Every past landing has a sourced "why the mission went there"**, and each Mars landing is checked against its own mission's elevation and latitude limits with our data (all seven pass).
- **Three real south-polar landings** (Chandrayaan-3, IM-1, IM-2) are run through the base-site rules.

What the new checks confirmed:

- The 16 px/deg elevation matches the published value under all 7 landers within 60 m (Curiosity −4509 m vs −4500 m).
- The Moon screening reproduces exactly on a second machine from a fresh download.
- The brightest ground in the raw illumination map is on the Shackleton rim and the connecting ridge, Mons Malapert and Mons Mouton, where the literature puts it.
- Our slope map reads 11.0° where NASA's orbiter found the IM-1 lander on a 12° slope.
- USGS Gazetteer: all 7 Artemis feature coordinates, Chandrayaan-3's site (Statio Shiv Shakti) and the names of all 8 candidates.

Not done, and why: rock abundance (no global map we could download and verify); Zhurong's and the Vikings' own engineering limits (sources not reachable); the full audit count (needs the Earth sections).

## What is checked

| Section | Checks | Reference |
|---|---|---|
| **Math** | slope of a synthetic 10° plane; identical slope distributions score 1; equator winter noon Sun = 90° − 25.19°; pressure formula gives 610 Pa at the MOLA datum | geometry, Mars axial tilt, mean surface pressure |
| **Inputs** | all 37 known-analog coordinates (`KNOWN_ANALOGS.md`) fall in the country the doc names; all 7 Artemis III feature coordinates match the USGS Gazetteer | Natural Earth countries, USGS Gazetteer of Planetary Nomenclature |
| **Mars data** | MOLA elevation under 7 landers vs published values, on the 463 m DEM and on our 16 px/deg screening grid; the grid's registration against the 463 m DEM around Gale; thermal inertia and albedo in four textbook regions; each landing against its own mission's limits; candidates unchanged when the map is cut elsewhere; no candidate in the dust mode; every Mars candidate's criteria recomputed from the raw grids | published landing-site elevations, USGS 463 m DEM, Mellon et al. (2000), Christensen et al. (2001), mission site-selection papers |
| **Moon data** | Shackleton floor is permanently shadowed; Earth is in view more on the near side than the far side; total shadowed area south of 80° S; the slope where IM-1 tipped over; the best-lit pixel is next to Shackleton; every Moon candidate's sunlight and distance to shadow recomputed | Mazarico et al. (2011), NASA/LRO (IM-1), geometry |
| **Earth terrain and rock** | Bonneville Salt Flats come out flat (0.03°), the Alps steep (24.6°); GLiM rock class at Iceland, Deccan Traps (basalt), Grand Erg Oriental (sand), Greenland (ice) | known geology |
| **Earth climate** | GPM rainfall at Manaus, Istanbul, Eskişehir, London, In Salah, Atacama; MODIS surface temperature in the Lut Desert and at Dome Fuji (Antarctica); Greenland ice sheet excluded, McMurdo Dry Valleys kept | climatology, Dome Fuji station mean −54.4 °C |
| **Outputs** | every training area is inland (≥ 90 % land, Natural Earth) and mostly bare ground (< 50 % ice, MODIS); every "similar"/"different" sentence matches its score; country names match the coordinates; 3 analogs per candidate ≥ 500 km apart with ≥ 1 new; no missing values (None/NaN) in any text; no life-detection tests for the Moon | `analogs.json`, `sites.json` |

## Errors found and fixed

| # | Error | Effect | Fix |
|---|---|---|---|
| 1 | Two Artemis III feature coordinates were off: **Cabeus B by 7.7 km**, **Haworth by 16.8 km** (Haworth came from Wikipedia) | Cabeus B wrongly passed our validation | USGS Gazetteer values in `moon_screening.py` and `LANDING_CONSTRAINTS.md`. Validation is now **4 of 7** Artemis features with passing ground (was 5) |
| 2 | GPM IMERG **over-reports rain in the driest deserts**: Atacama 59 mm/yr vs ~2 mm measured | The dryness score punished the most Mars-like deserts | Rain ≤ 100 mm/yr now counts as fully dry (`earth_pool.py`). The Mars training areas changed; see `ANALOG_RESULTS.md` |
| 3 | Report sentences showed **"None mm of rain"**, **"None °C"** | Visible on the site for most analogs | B4's rock-pool cells carried only scores; `build_analogs.py` now fills the raw values from B3's grid. New audit check: no None/NaN in any text |
| 4 | Moon training areas suggested **life-detection drilling** (from the dryness test mapping) | Wrong for the Moon | The life-detection test is given only for Mars |
| 5 | Mars text said the day–night swing on Mars is **"hundreds of degrees"** | Wrong: that is the Moon (~300 K); Mars' surface swings up to ~100 K (Curiosity REMS) | Separate wording per body |
| 6 | Mars reports often had **no "different" line** | Read as "identical to Mars" | Every report now ends with what no Earth site has: air pressure, gravity, magnetic field (NASA NSSDC fact sheets) |
| 7 | `LANDING_CONSTRAINTS.md`: Mars 2020 elevation limit written as **below −0.5 km**; it is **below +0.5 km**. Thermal inertia limit is 100–150, not just 100 | Doc only; the code uses MSL's −1 km, which was right | Doc corrected, history line fixed (Phoenix −3.5 → MER −1.3 → MSL −1 → Mars 2020 +0.5 km). **This correction was itself wrong — see error 14: the limit is below −0.5 km** |
| 8 | `PROJECT_PLAN.md` said MSL allowed **up to +1 km**; that was an early plan, the final limit was **below −1 km** | Doc only | Corrected |
| 9 | "Done before at analog sites" examples (`KNOWN_ANALOGS.md` §3, shown in every report): each of the 16 claims was checked against its source page | 4 wrong, 3 imprecise | **Removed:** D-RATS 2022 night EVAs (not in the NASA record). **Corrected:** Mauna Kea → Hawaii and DLR removed (the page names NASA/CSA instruments); Lanzarote years removed (page gives none); Icebreaker years removed (page gives none). **Reworded:** Desert RATS, "Bridget" (a rover prototype carrying ExoMars instruments), RESOLVE (a NASA payload on CSA's Artemis Jr. rover) |

| 10 | **Six training areas were on frozen sea** (found 15 Nov by looking at their satellite close-ups): all three for the Cabeus–Malapert ridge, two more for the Moon and one for Mars D, with 66–100 % water in their cells. The land mask only asked for surface temperature and rainfall data, and MODIS reports temperature over sea ice while GPM covers the oceans. Fixing that showed a second weakness: five Moon areas were ice caps (73–90 % permanent ice) let in by the "≥ 10 % bare rock" rule meant for the Dry Valleys | Training areas shown on the site were sea or ice | Land now needs < 10 % water (MODIS) **and** ≥ 90 % inside the Natural Earth 10 m coastline; picked areas need < 50 % permanent snow/ice. New audit checks for both. All 9 Moon areas and 1 Mars area changed; every close-up checked by eye |

The Navarro-González et al. (2003, *Science* 302:1018) page could not be fetched (paywall); it is a well-known paper and stays, marked as read from the abstract.

## What passed and supports the method

- **Coordinates written by the team are right:** all 37 known analogs lie in the stated country, and the 463 m MOLA elevation under 7 Mars landers matches the published values within **56 m** (Curiosity −4495 m vs −4500 m).
- **The screening is reproducible:** all 5 Mars candidates' criteria and all 3 Moon candidates' sunlight and distance to shadow recompute exactly from the raw data, and the Mars candidates come out the same when the map is cut at another meridian.
- **The Earth data behaves as expected:** flat salt flats, steep Alps, basalt in Iceland and the Deccan, rain within a factor of 2 of climatology outside the hyperarid deserts, Antarctic surface temperature 214.5 K vs the 218.8 K station air mean.

## Remaining limits

- ~~WARN — Curiosity on the 16 px/deg grid~~ — gone: it was the one-pixel shift of error 12.
- **WARN — shadow area on our 240 m grid:** keeping a cell as "shadowed" if any of its 120 m sub-cells is shadowed inflates the area (39,149 km² over the whole 75° S map), but it is only used for "distance to shadow", which it can shorten by at most 0.24 km.
- **Permanently shadowed area +22 %** vs Mazarico et al. (2011): we use the newer 120 m product (2016); their maps were 240 m.
- **Rainfall is one year (2023)** and IMERG can be up to ~2× off in temperate places (Eskişehir 734 mm vs ~380 mm climatology). The training areas are all in deserts or polar regions, where the dryness score is saturated, so this does not change the picks.
- **Lake Salda is not reproduced** as a Jezero analog: its similarity is mineral (carbonates) and setting (a lake with a delta), and no global dataset we have covers that. Stated in `ANALOG_RESULTS.md`.
- Rock type is coarse (GLiM, 0.5°) and the planet-side rock family is our reading of the site's geology (confidence: low in every report).

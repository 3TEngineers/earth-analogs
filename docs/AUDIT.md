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
| After the full audit of the screening (15 Nov, errors 11–15), Mars and Moon sections only | 48 | 1 | 0 |
| After the Earth audit (15 Nov, errors 16–24), full run | 159 | 1 | 0 |
| After the final review (15 Nov, errors 25–27), full run | **167** | **0** | **0** |

The last row is the full run on the final data (math 4, inputs 50, outputs 21, Earth terrain and rock 12, Earth climate 23, Mars 42, Moon 15). The one WARN of the earlier runs is gone: it described the coarsened shadow map that error 25 removed.

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
- **Moon: distance to shadow only counts shadowed areas ≥ 1 km².** Any shadowed 240 m pixel used to count. The three candidates stayed; their distances were then 5.5, 2.2 and 2.6 km (corrected to 7.0, 6.0 and 2.9 km by error 25).
- **Every past landing has a sourced "why the mission went there"**, and each Mars landing is checked against its own mission's elevation and latitude limits with our data (all seven pass).
- **Three real south-polar landings** (Chandrayaan-3, IM-1, IM-2) are run through the base-site rules.

What the new checks confirmed:

- The 16 px/deg elevation matches the published value under all 7 landers within 60 m (Curiosity −4509 m vs −4500 m).
- The Moon screening reproduces exactly on a second machine from a fresh download.
- The brightest ground in the raw illumination map is on the Shackleton rim and the connecting ridge, Mons Malapert and Mons Mouton, where the literature puts it.
- Our slope map reads 11.0° where NASA's orbiter found the IM-1 lander on a 12° slope.
- USGS Gazetteer: all 7 Artemis feature coordinates, Chandrayaan-3's site (Statio Shiv Shakti) and the names of all 8 candidates.

Not done, and why: rock abundance (no global map we could download and verify); Zhurong's and the Vikings' own engineering limits (sources not reachable). The full audit count came with the Earth audit below.

## The Earth audit of 15 Nov

The full audit above covered the Mars and Moon screening. The same was then done for the Earth side (`earth_pool.py`, `earth_ranking.py`, `build_analogs.py`): every input read again by an independent route, every rule asked "would this let a wrong place through?", and every picked area looked at from orbit. It found nine more errors. **All 24 training areas were made again** (`ANALOG_RESULTS.md`).

| # | Error | Effect | Fix |
|---|---|---|---|
| 16 | **The rock we expected at Mars zones A and C was a guess, and wrong.** After the zones were chosen again (error 11) the table said "basin sediments" for Utopia and Isidis. The USGS global geologic map (SIM 3292, Tanaka et al. 2014), looked up at the coordinates, draws lava plains at both | A and C were matched to sedimentary basins on Earth instead of basalt plains | The rock class now follows the mapped unit: A and B `AHv`, C `eHv` (volcanic → basalt), D `lHt` (transition → mixed sediments), E `HNhu`, the same polygon Opportunity landed in (→ sandstone). The audit repeats the lookup from the map's GIS files |
| 17 | **Earth slopes were read from one elevation tile only.** A 25 km box crosses the edge of a 1° Copernicus tile for most cells away from the equator; it was cut at the edge and the remaining pixels were treated as if they still spanned 25 km | East–west pixel size was wrong, so slopes came out up to ~40 % too steep at high latitudes (a Victoria Island cell: median 1.66° → 1.18°). Worst for the Arctic areas offered to the Moon sites | The box is assembled from every tile it touches, across the date line too. New checks: a box at 72° N is read without gaps; a box centred on a tile corner has the heights of its parts |
| 18 | **A missing score helped a place.** The total was the average of whatever scores existed, so a cell with no rock data outranked one with a known mismatch | Places with gaps in the data floated up | A training area needs every weighted score. New checks: none is missing; every total is the weighted sum of the scores shown |
| 19 | **Rain was one year (2023); vegetation and temperature were four months of it** | One year is noise in a desert (IMERG gives Death Valley 180 mm for 2023 and 100 mm a year on average); four months missed the green season in places | Rain is the NASA IMERG V07 climatology June 2000 – May 2023; vegetation and temperature use all 12 months. Closer to station values at the test points (Manaus 2,490 vs ~2,300 mm, was 1,596; Eskişehir 561 vs ~380, was 734). `pipeline/fetch_earth.py` now downloads every Earth input, so anyone can rebuild the pass |
| 20 | **"New place" was claimed inside published analog regions.** The rule was "no known analog within 50 km", but the Atacama, Qaidam and Lut are whole regions | An area 139 km from Yungay in the Atacama was called new | A place in the same named region as a listed analog, within 400 km, is marked known and names the analog (`knownName`). Three of the 24 are now marked; the reports link the source |
| 21 | **Candidates chose their places in list order** | The first site in the list got the best places whether or not they fitted it best | In each round the best (site, place) pair is settled first |
| 22 | **Some Moon areas were green tundra (NDVI 0.4–0.6), glaciers or coastal strips**, and names said "plains" for mountains | Training areas that are neither bare nor what the name says | A picked area needs yearly maximum NDVI ≤ 0.30, under 25 % permanent ice (was 50 %) and ≥ 90 % land on the vector coastline itself; the landform word follows the measured slope. A check for each |
| 23 | **LOLA's slope map has no value in 29 % of its pixels, and we read them as 45° slopes.** The map is made along the laser tracks; a pixel no track crossed stores 0, which the map's scaling turns into exactly 45.00°. The label declares another missing value, so nothing warned us. Found when the lunar slopes were recomputed from the elevation grid and one site disagreed | **Screening:** no unsafe ground passed (the false cliffs fail the 10° rule), but measured ground next to a gap failed too: the passing area was 19.4 km² and is **62.9 km²**. The three sites, their values, the 4 of 7 Artemis features and the three polar landings are unchanged. **Terrain matching:** 7 % of the box around the Cabeus–Malapert ridge was false 45° cliffs (90th percentile slope 20.6°, really 16.8°) | The empty pixels are left out of the screening's average, and a pixel with no measurement cannot pass. New check: none of the screening layer reads 45.00° |
| 24 | **The Moon's terrain was not measured the way Earth's was.** The slope map gives slopes over 30–120 m along the tracks; the Earth side measures height differences 480 m apart | Smaller than feared: median slope 13.0 → 12.7°, 13.5 → 13.1° and (with error 23) 11.2 → 10.2° at the three sites. The Moon really is that steep | Lunar slopes for the comparison come from the LOLA 240 m elevation grid with the Earth recipe. New check: they follow the slope map where it has data (r = 0.94–0.98) |

Smaller corrections: the Moon "different" sentence quoted the ~300 K day–night swing as if it held at the pole (it now says "at the equator"); "Desierto De Atacama" is spelled "Desierto de Atacama".

Changes that are improvements rather than errors:

- **Two new Mars factors.** "Surface brightness": TES albedo at the zone against MODIS snow-free albedo on Earth — it catches a cell the coarse rock map calls basalt but that is bright sand. "Thin air": mean elevation of the box. Mars weights are now terrain 30, rock 20, dryness 20, brightness 10, temperature 10, thin air 10.
- **Wider pools:** 100 climate cells and 40 per rock class, 200 km apart (was 40 and 15, 300 km), so terrain and rock choose from more than a thin sample of the world's deserts.

What the new checks confirmed:

- **Every Earth raster is where we think it is.** After the Mars maps turned out to be shifted (errors 11, 12), each Earth layer was compared with an independent map at shifts of up to three cells and as a flipped, mirrored and half-turned copy: MODIS land cover, vegetation and surface temperature and the GLiM rock map against the Natural Earth coastline; rainfall and albedo against vegetation. The untouched, unshifted layer fits best every time.
- The rain climatology and the single year 2023, two separate NASA files, agree in pattern (r = 0.98).
- Albedo reads 0.43 on the Grand Erg Oriental sand sea, 0.13 on the Al Haruj basalt field and 0.13 over the Amazon.
- `sites.json` and `landings.json` reproduce byte for byte on a second machine, and `sites.json` is unchanged by error 23's fix.
- All 24 areas were looked at on their satellite close-ups: on land, bare, and what the name says (notes in `ANALOG_RESULTS.md`).

One check was replaced: "albedo has a value" against the coastline is a blunt test (albedo also has values over shallow water, 6 % of sea pixels) and its best fit wandered by one cell; albedo against vegetation on land is sharp and sits at zero shift.

## The final review of 15 Nov

Before submitting, Sadık asked for one more pass "with the eyes of a NASA engineer": every site recomputed by a route the pipeline does not use, and every sentence on the site read against its source. The method held; three errors were found, one of them in numbers shown on the site.

| # | Error | Effect | Fix |
|---|---|---|---|
| 25 | **Distance to permanent shadow was measured on a coarsened map.** The 120 m shadow map was first enlarged to our 240 m grid, keeping a pixel as shadowed if any part of it was. That joined small specks into "areas" of 1 km² the 120 m map does not have (3,864 such patches instead of 2,306), and the distance was taken from the nearest edge of the site's 720 m window, not from the site. Found by recomputing the three distances at 120 m with a k-d tree. The old audit note that this could shorten a distance "by at most 0.24 km" was wrong | Distances on the site were too short: **5.5 → 7.0 km, 2.2 → 6.0 km, 2.6 → 2.9 km**. All three ridges still pass (≤ 10 km) and the same three come out. Passing area 62.9 → 44.3 km²; IM-1 8.1 → 9.2 km, IM-2 6.6 → 9.8 km; still 4 of 7 Artemis features with passing ground (Malapert Massif 0.46 → 0.06 km², Mons Mouton 3.92 → 3.74 km²) | Patches are sized and distances measured on the 120 m map, then averaged onto the grid; the value shown is at the site itself. The audit recomputes each distance by the independent route |
| 26 | **A training area was named after a region 118 km away.** A point outside every Natural Earth outline took the nearest region's name within ~1.5° | Mars E3, in the desert basin south of the Tian Shan, was called "Tian Shan" | A point more than 25 km outside the nearest outline is named by distance and direction: "120 km south of Tian Shan" |
| 27 | **Sentences that said more than the data, or something slightly wrong.** (a) "Thin air" said the air at 5,000 m is "about 90 times denser than on Mars": that is the pressure ratio (about 85); in density it is nearer 40. (b) A training area at 1,500 m was described as having air "about as thick as at sea level" (it is 83 %). (c) The ±30° latitude rule was explained as "for power", and attributed to Curiosity, which is nuclear powered: its team set the band for the rover's thermal design. (d) The landing page said the rules were "taken from real missions" for the Moon too (the four base rules are ours), that three landings "aimed for high latitudes on purpose" (we have no source for Mars 3) and that "every landing passes its own mission's limits" (we found limits for 7 of 11). (e) "Slopes match" was used for medians of 0.62° and 0.09°. (f) Zone B was "west of the Cerberus Fossae"; it lies inside the Gazetteer's outline of the fossae, near their western end. (g) "The surroundings of each site must pass every rule": it is the median over the surroundings | Wording only; no number changed | Each sentence corrected; the Sun sentences now give the highest Sun of the year at that latitude |

What the review confirmed, by routes independent of the pipeline (now part of `audit.py`):

- **Mars zones on a second elevation product.** On the USGS 463 m DEM the 26 km square around each zone has a median height within 20 m of the screening grid's and no ground above −1 km (highest points: −4,162, −1,997, −3,828, −3,790 and −1,261 m). Slopes at the 3.7 km scale recomputed from it stay below 1.4° everywhere in the square; relief over 18 km is 26–116 m.
- **Distances and "new place" claims** recomputed by hand: every zone is more than 500 km from every landing and touchdown site (closest: zone C, 501 km from Beagle 2 and 522 km from Jezero; zone E, 524 km from Opportunity) and the zones are at least 1,954 km apart.
- **The Moon maps are not mirrored east to west.** Near the pole most checks cannot tell. Two can: the LCROSS impact site in Cabeus (84.675° S, 48.725° W) is permanently shadowed on our map and its mirror point is lit ground; Mons Mouton (84.6° S, 31° E) stands 5 km high and its mirror point does not.
- **Moon site values against the 120 m data directly**, with the polar stereographic projection written out by hand: sunlit time, Earth visibility and slope under each site's window agree with the values shown. All three sites pass the slope rule whether slope is taken from LOLA's slope map (medians 6.4°, 6.9°, 3.6°) or from the elevation grid at 240 m or 480 m baselines (2.6–5.4°).
- **Mapped rock unit over the whole 25 km box** of each Mars zone, not just its centre: one unit each (`AHv`, `AHv`, `eHv`, `lHt`, `HNhu`).
- **Names** against the Gazetteer's outlines: zones A, C, D and E lie inside Utopia, Isidis, Acidalia and Meridiani; zone B lies 2.7° north of the Gazetteer's outline of Elysium Planitia, inside that of the Cerberus Fossae — its summary now says "northern edge".
- **The close-ups show the right ground.** The live orbital images for two Moon sites, zone D and Curiosity were compared with shaded relief made from the elevation data for the same box: the craters, the rim and Mount Sharp are where they should be.
- Landing coordinates, years, mission limits and physical constants (gravity, pressure, axial tilt, scale height) were re-read against their sources; none changed.

What a reader should know about the Moon values: a site's sunlit time, Earth visibility and slope are **medians over about 720 m**. The ridges are narrow, so single 120 m pixels inside that window range widely (sunlit 26–85 %, Earth in view 0–58 % at site B); the far side of a crest can lose sight of Earth within a few hundred metres.

## What is checked

| Section | Checks | Reference |
|---|---|---|
| **Math** | slope of a synthetic 10° plane; identical slope distributions score 1; equator winter noon Sun = 90° − 25.19°; pressure formula gives 610 Pa at the MOLA datum | geometry, Mars axial tilt, mean surface pressure |
| **Inputs** | all 37 known-analog coordinates (`KNOWN_ANALOGS.md`) fall in the country the doc names; all 7 Artemis III feature coordinates match the USGS Gazetteer; the rock class of every Mars zone against the USGS geologic map | Natural Earth countries, USGS Gazetteer of Planetary Nomenclature, USGS SIM 3292 |
| **Mars data** | MOLA elevation under 7 landers vs published values, on the 463 m DEM and on our 16 px/deg screening grid; the grid's registration against the 463 m DEM around Gale; thermal inertia and albedo in four textbook regions; each landing against its own mission's limits; candidates unchanged when the map is cut elsewhere; no candidate in the dust mode; every candidate's landing square on the 463 m DEM; every Mars candidate's criteria recomputed from the raw grids | published landing-site elevations, USGS 463 m DEM, Mellon et al. (2000), Christensen et al. (2001), mission site-selection papers |
| **Moon data** | Shackleton floor is permanently shadowed; Earth is in view more on the near side than the far side; total shadowed area south of 80° S; the slope where IM-1 tipped over; no empty slope-map pixel is read as 45°; east and west not swapped (LCROSS site, Mons Mouton); the best-lit pixel is next to Shackleton; every Moon candidate's sunlight recomputed, and its distance to shadow by an independent route at 120 m | Mazarico et al. (2011), NASA/LRO (IM-1), geometry |
| **Earth terrain and rock** | Bonneville Salt Flats come out flat (0.03°) and at the right height, the Alps steep (20.9°); a box across elevation tiles is read whole; lunar slopes from the elevation grid follow LOLA's slope map; GLiM rock class at Iceland, Deccan Traps (basalt), Grand Erg Oriental (sand), Greenland (ice) | known geology, LOLA slope map |
| **Earth climate** | GPM rainfall at Manaus, Istanbul, Eskişehir, London, Dalanzadgad, Resolute, In Salah, Atacama; MODIS surface temperature in the Lut Desert and at Dome Fuji (Antarctica); Greenland ice sheet excluded, McMurdo Dry Valleys kept; every raster's registration; albedo at a sand sea, a basalt field and a rainforest | climatology, Dome Fuji station mean −54.4 °C, Natural Earth coastline |
| **Outputs** | every candidate has exactly 3 training areas; each is inland (≥ 90 % land, Natural Earth), under 25 % permanent ice and bare (NDVI ≤ 0.30); at least 2 of each Moon site's 3 areas at ≥ 60° latitude; no weighted score is missing and every total is the weighted sum; "plains" only for flat ground; every "similar"/"different" sentence matches its score; country names match the coordinates; 3 areas per candidate ≥ 500 km apart with ≥ 1 new; no missing values (None/NaN) in any text; no life-detection tests for the Moon | `analogs.json`, `sites.json` |

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
- **The Earth data behaves as expected:** flat salt flats, steep Alps, basalt in Iceland and the Deccan, rain within a factor of 1.6 of climatology outside the hyperarid deserts, Antarctic surface temperature 213.8 K vs the 218.8 K station air mean.

## Remaining limits

- ~~WARN — Curiosity on the 16 px/deg grid~~ — gone: it was the one-pixel shift of error 12.
- ~~WARN — shadow area on our 240 m grid~~ — gone: distances are now measured on the 120 m map (error 25). The coarsened layer is only drawn on the maps in `docs/images/`.
- **Moon site values are medians over ~720 m** on ridges where single pixels vary widely; see the final review.
- **Permanently shadowed area +22 %** vs Mazarico et al. (2011): we use the newer 120 m product (2016); their maps were 240 m.
- **Satellite rainfall is a 25 km average**, not a station value: the 2000–2023 climatology is still ~1.5× high at Eskişehir (561 mm vs ~380 mm) and reads 36 mm in the Atacama where gauges record ~2 mm. Rain at or below 100 mm a year counts as fully dry for that reason.
- **Vegetation, surface temperature and albedo are from one year (2023).**
- **MOLA at 463 m is interpolated between orbit tracks**, so Mars looks smoother than it is at that scale and Mars terrain scores lean high.
- **Lake Salda is not reproduced** as a Jezero analog: its similarity is mineral (carbonates) and setting (a lake with a delta), and no global dataset we have covers that. Stated in `ANALOG_RESULTS.md`.
- Rock type is coarse (GLiM, 0.5°): a cell mapped as basalt can be mostly sand at the surface. The Mars rock class follows the mapped USGS unit, but turning a unit into a rock is our step (confidence: low in every report).

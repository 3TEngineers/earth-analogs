# Landing and base-site constraints (K3b)

Published constraints that past missions used to choose where to land, collected for **B2 (screening)**. Every number has a source. Where a number came from an abstract or a secondary page rather than the full paper, the **Confidence** column says so. Researched 2026-11-14 by Kmar with Claude (web search); full papers behind paywalls were not read.

- Coordinates: degrees, latitude north positive, longitude **east positive, −180..180** (as in `DATA_CONTRACT.md`).
- "MOLA elevation" means height relative to the MOLA areoid.

---

## 1. Mars — engineering constraints by mission

| Mission (landed) | Elevation | Latitude | Slope / relief | Rock abundance | Thermal inertia / dust | Other | Confidence | Source |
|---|---|---|---|---|---|---|---|---|
| **Mars Pathfinder** (1997) | Below 0 km | 10°N–20°N | Smooth, flat area ~70 × 200 km | "Moderate"; < 1 % of surface covered by rocks > 0.5 m high (same rule as MER) | Little dust | Average radar reflectivity; ellipse 300 × 100 km | Medium (abstract + MER memo) | [P1], [M1] |
| **MER Spirit / Opportunity** (2004) | Below **−1.3 km** MOLA (enough air for the parachute) | 15°S–5°N (MER-A), 5°S–15°N (MER-B); final papers say 10°N–15°S overall | Slopes "generally less than 15°"; no scarps, large hills or fresh craters > 5 km | < 1 % covered by rocks > 0.5 m; total rock cover **< 20 %** from thermal infrared | Avoid fine-component thermal inertia below **125–165 J m⁻² s⁻½ K⁻¹** (dust, not load-bearing); avoid very high albedo | Radar reflectivity > 0.05; winds < ~20 m/s; ellipse 30 km wide, 80–360 km long | High (original memo) | [M1], [M2] |
| **Phoenix** (2008) | Below **−3.5 km** | **65°N–72°N** (polar ice was the goal) | Slopes and rocks no worse than at the Viking Lander 2 site | Same as above (no worse than Viking 2) | — | Low winds; a few cm of soil over ice | Medium (abstract) | [PH1] |
| **MSL Curiosity** (2012) | Below **−1 km** | **±30°** (rover thermal management) | Relief < 100–130 m at 1–1000 m baselines; slopes **< 30° at 2–5 m** | "Moderate" (to protect the belly pan) | Radar-reflective, load-bearing, trafficable, not dominated by fine dust | Initial sites 25 × 20 km | High for the six criteria (quoted abstract); thresholds for rocks and thermal inertia not verified | [MSL1] |
| **InSight** (2018) | Below about **−2.5 km** | 15°S–5°N at first, narrowed to **3°N–5°N** (solar power, thermal) | Slopes **< 15°** at 84 m and 2 m scales | **< 10 %** | Load-bearing, confirmed with thermal inertia and radar; one source gives ~100–140 J m⁻² s⁻½ K⁻¹ | Ellipse ~130 × 27 km; 3–5 m of fine regolith for the heat probe | Medium (abstract + secondary pages) | [I1] |
| **Mars 2020 Perseverance** (2021) | Below **−0.5 km** MOLA | ±30° | Relief < ~100 m at 1–1000 m; slopes **< 25°–30° at 2–5 m** | ~7–12 %, locally up to 20 % (Terrain Relative Navigation avoids hazards) | Thermal inertia **> 100 J m⁻² s⁻½ K⁻¹**; < ~150 with high albedo = possibly dusty, check further | Ellipse 25 × 20 km, later 13 × 7 km with range trigger; final 7.7 × 6.6 km | High for elevation, relief, slope, TI (abstract read in full); rock abundance Medium (secondary page) | [M20-1], [M20-2] |

### What the constraints mean (plain English, for the Method page)

- **Elevation** — lower ground has more atmosphere above it, so the parachute has more time to slow the spacecraft. Every mission set a "must be below" height. Better entry systems allowed higher sites over time (Phoenix −3.5 km → MER −1.3 km → Mars 2020 −0.5 km).
- **Latitude** — near the equator there is more sunlight for solar power and milder temperatures. Phoenix is the exception: it went north on purpose to dig into ice.
- **Slope and relief** — steep ground can fool the landing radar, tip the lander or waste fuel during powered descent.
- **Rocks** — big rocks can puncture airbags or hit the bottom of the lander.
- **Thermal inertia** — low values mean fine dust: too soft to drive on, and it coats solar panels.

---

## 2. Mars — the 11 successful landings

| Mission | Year | Site | Latitude | Longitude (E, −180..180) | Source |
|---|---|---|---|---|---|
| Mars 3 | 1971 | Ptolemaeus crater area | −45.04 | −157.98 | [W-M3] (Wikipedia; converted from 202.02°E) |
| Viking 1 | 1976 | Chryse Planitia | 22.269 | −47.951 | [ODE] |
| Viking 2 | 1976 | Utopia Planitia | 47.668 | 134.280 | [ODE] |
| Mars Pathfinder | 1997 | Ares Vallis | 19.095 | −33.253 | [ODE] |
| Spirit (MER-A) | 2004 | Gusev crater | −14.5719 | 175.4785 | [ODE] (Doppler solution) |
| Opportunity (MER-B) | 2004 | Meridiani Planum | −1.9483 | −5.5258 | [ODE] (Doppler solution) |
| Phoenix | 2008 | Vastitas Borealis | 68.22 | −125.75 | [ODE] |
| Curiosity (MSL) | 2012 | Gale crater | −4.59 | 137.44 | [ODE] |
| InSight | 2018 | Elysium Planitia | 4.5024 | 135.6234 | [W-IN] (Wikipedia) |
| Perseverance | 2021 | Jezero crater (Octavia E. Butler Landing) | 18.44 | 77.45 | [W-PE] (Wikipedia, citing NASA GISS Mars24) |
| Zhurong (Tianwen-1) | 2021 | Utopia Planitia | 25.102 | 109.914 | [W-ZH] (Wikipedia) |

ODE values come from the PDS Geosciences Node; their own citations are Folkner et al. 1997 (Viking, Pathfinder), Smith et al. 2009 (Phoenix) and Seelos et al. 2014 (Curiosity). Wikipedia values should be cross-checked before the final JSON.

---

## 3. Moon — NASA's 9 Artemis III candidate regions (Oct 2024)

NASA gives **no coordinates** for the regions, only names and an image. The table uses the centre of the **named feature** from the USGS Gazetteer, which is close to the region but **not the region itself**. Good enough to check overlap at a coarse scale, not for exact placement.

| Region (NASA name) | Feature used | Latitude | Longitude | Source | Note |
|---|---|---|---|---|---|
| Peak near Cabeus B | Cabeus B crater | −82.40 | −53.00 | [G-8058] | The region is a peak near this crater |
| Haworth | Haworth crater | −86.9 | −4.0 | [W-HA] | Wikipedia only, no USGS check |
| Malapert Massif | Mons Malapert | −85.98 | −1.67 | [G-16338] | |
| Mons Mouton Plateau | Mons Mouton | −84.60 | 31.00 | [G-16070] | Plateau on the same massif |
| Mons Mouton | Mons Mouton | −84.60 | 31.00 | [G-16070] | |
| Nobile Rim 1 | Nobile crater | −85.28 | 53.27 | [G-4321] | Region is on the rim, not the centre |
| Nobile Rim 2 | Nobile crater | −85.28 | 53.27 | [G-4321] | Region is on the rim, not the centre |
| de Gerlache Rim 2 | de Gerlache crater | −88.48 | −88.34 | [G-1439] | Region is on the rim, not the centre |
| Slater Plain | Slater crater | −88.08 | 111.29 | [G-15325] | Plain next to the crater |

**NASA's stated selection factors:** "science potential, launch window availability, terrain suitability, communication capabilities with Earth, and lighting conditions", plus trajectory limits of SLS, Orion and Starship HLS. Regions are "in no priority order", and specific sites inside them will be chosen once launch dates are known. [A1]

> **Check before we write about Artemis III:** Wikipedia's Artemis III page says (Feb 2026) that Artemis III was redesignated as a low-Earth-orbit test and that Artemis IV is now expected to be the first crewed landing. We did not confirm this on a NASA page. Safer wording for the site: "NASA's 2024 south-pole candidate regions for the first Artemis crewed landing". [W-A3]

---

## 4. Moon — what makes a good permanent base site

| Criterion | Published values | Confidence | Source |
|---|---|---|---|
| **Sunlit time** | Best south-pole spots are lit **92.27 %** of the time at 2 m above ground and **95.65 %** at 10 m (20 m/pixel LOLA terrain model) | High (abstract) | [L1] |
| | Shackleton rim ~**85.5 %**; a ridge near de Gerlache ~**92.1 %** | Medium (search summary of the abstract) | [L2] |
| | Average illumination maps over a full lunar cycle exist as data (LOLA, NASA PGDA product 69) | High | [L3] |
| **Earth in view** | NASA lists "communication capabilities with Earth" as a selection factor. **No published threshold found** (e.g. "% of time Earth is visible"). PGDA also publishes Earth-visibility maps. | — | [A1], [L3] |
| **Slope** | NASA lists "terrain suitability"; some regions (de Gerlache and Nobile rims) are narrow with slopes not suited to landing. **No numeric limit found** in the sources read. | — | [A1], [A2] |
| **Distance to permanent shadow** | Lit high ground and permanently dark crater floors sit close together at the south pole; ice is expected in the shadow. **No published distance limit found.** | — | [L2], [A1] |

---

## 5. Notes for Sadık (B2)

These are **suggestions**, not decisions. Sadık sets the thresholds in B2.

1. **Validation will not pass all 11 Mars landings with one set of rules.** `STATUS.md` says all 11 should pass, but with a ±30° latitude rule, Phoenix (68°N), Viking 2 (47.7°N) and Mars 3 (45°S) fail. Each mission had its own latitude band for its own purpose (e.g. Phoenix wanted ice). Options: (a) validate rovers against rover-style rules and explain the polar landers separately, or (b) widen latitude and lose meaning. Option (a) is more honest and matches the "a ✗ is fine for validation" rule in `panels/README.md`.
2. **Slope scale.** `PROJECT_PLAN.md` says "MSL < 3° over 2–5 km". The MSL abstract says **< 30° at 2–5 m** (metres, not km) plus **relief < 100–130 m at 1–1000 m**. MOLA can't see metre-scale slopes, so a km-scale slope or relief rule from MOLA is our own simplification — worth stating on the Limitations page.
3. **Possible Mars starting thresholds:** elevation ≤ −1 km (MSL; covers MER, InSight, Phoenix), latitude within ±30° (MSL and Mars 2020), thermal inertia ≥ 100 J m⁻² s⁻½ K⁻¹ (Mars 2020), rock abundance ≤ 10–20 % if a map is found.
4. **Moon:** only illumination has published numbers (~85–95 % for the best spots). Earth visibility, slope and distance to shadow need thresholds we choose ourselves; label them as our choice.

---

## Sources

- **[P1]** Golombek, Cook, Moore & Parker (1997), *Selection of the Mars Pathfinder landing site*, JGR 102(E2), 3967–3988, doi:10.1029/96JE03318 — https://www.usgs.gov/publications/selection-mars-pathfinder-landing-site
- **[M1]** Golombek & Parker (2000), *Preliminary Definition of MER Landing Site Engineering Requirements* (NASA memo) — https://marsoweb.nas.nasa.gov/landingsites/mer2003/doc/original.html
- **[M2]** Golombek et al. (2003), *Selection of the Mars Exploration Rover landing sites*, JGR 108(E12), 8072, doi:10.1029/2003JE002074 — https://www.usgs.gov/publications/selection-mars-exploration-rover-landing-sites
- **[PH1]** Arvidson et al. (2008), *Mars Exploration Program 2007 Phoenix landing site selection and characteristics*, JGR, doi:10.1029/2007JE003021 — https://pubs.usgs.gov/publication/70034555
- **[MSL1]** Golombek et al. (2012), *Selection of the Mars Science Laboratory Landing Site*, Space Sci. Rev. 170, 641–737, doi:10.1007/s11214-012-9916-y — https://authors.library.caltech.edu/35374
- **[I1]** Golombek et al. (2017), *Selection of the InSight Landing Site*, Space Sci. Rev. 211, doi:10.1007/s11214-016-0321-9 — https://www.usgs.gov/publications/selection-insight-landing-site
- **[M20-1]** Fergason et al. (2017), *Mars 2020 landing site evaluation: slope and physical property assessment*, LPSC XLVIII, 2163 — https://www.hou.usra.edu/meetings/lpsc2017/pdf/2163.pdf
- **[M20-2]** Grant et al. (2018), *The science process for selecting the landing site for the 2020 Mars rover*, Planet. Space Sci. — https://www.sciencedirect.com/science/article/abs/pii/S0032063318301077 ; rock-abundance figures via LPSC 2015 abstract 1653 — https://www.hou.usra.edu/meetings/lpsc2015/pdf/1653.pdf
- **[ODE]** PDS Geosciences Node, Orbital Data Explorer, *Landing Sites* — https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm
- **[W-M3]** https://en.wikipedia.org/wiki/Mars_3 · **[W-IN]** https://en.wikipedia.org/wiki/InSight · **[W-PE]** https://en.wikipedia.org/wiki/Octavia_E._Butler_Landing · **[W-ZH]** https://en.wikipedia.org/wiki/Zhurong_(rover)
- **[A1]** NASA (28 Oct 2024), *NASA Provides Update on Artemis III Moon Landing Regions* — https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/
- **[A2]** Astronomy.com, *Here are the nine sites where Artemis 3 might land on the Moon* — https://www.astronomy.com/space-exploration/here-are-the-nine-sites-where-artemis-3-might-land-on-the-moon/
- **[W-A3]** https://en.wikipedia.org/wiki/Artemis_III
- **[G-…]** USGS Gazetteer of Planetary Nomenclature, feature pages: Cabeus B https://planetarynames.wr.usgs.gov/Feature/8058 · Mons Malapert https://planetarynames.wr.usgs.gov/Feature/16338 · Mons Mouton https://planetarynames.wr.usgs.gov/Feature/16070 · Nobile https://planetarynames.wr.usgs.gov/Feature/4321 · de Gerlache https://planetarynames.wr.usgs.gov/Feature/1439 · Slater https://planetarynames.wr.usgs.gov/Feature/15325
- **[W-HA]** https://en.wikipedia.org/wiki/Haworth_(crater)
- **[L1]** Gläser et al. (2014), *Illumination conditions at the lunar south pole using high resolution Digital Terrain Models from LOLA*, Icarus 243, 78–90
- **[L2]** Gläser et al. (2018), *Illumination conditions at the lunar poles: Implications for future exploration*, Planet. Space Sci. 162
- **[L3]** Mazarico et al. (2011), *Illumination conditions of the lunar polar regions using LOLA topography*, Icarus 211, 1066–1081; data: NASA PGDA *Lunar Polar Illumination* — https://pgda.gsfc.nasa.gov/products/69

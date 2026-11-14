# Known Earth analogs and test mapping (K3)

For **B5–B7**: Sadık uses section 1–2 to label each Earth result **Known analog** (`known: true`, `knownRef` = the URL) or **New candidate**, and section 3 for the "What you can test here" text. Researched 2026-11-14 by Kmar with Claude (web search, pages read unless marked).

> **Status:** Moon list and test mapping are done. **Mars list is still being researched** — see section 2. Until it lands, use the Mars sites already marked `known: true` in the mock data only with their `knownRef`.

Coordinates: decimal degrees, east positive. "WP" = taken from the Wikipedia infobox. "Proxy" = a nearby point, not the exact test site. Use a match radius of ~50 km when deciding if a result is "known".

---

## 1. Known lunar analogs

| # | Site | Country | Lat, Lon | Lunar aspect | Used by | Source |
|---|---|---|---|---|---|---|
| 1 | Mauna Kea flanks (PISCES test sites) | USA (Hawaii) | 19.82, −155.47 (WP summit, proxy) | Volcanic tephra as regolith; ISRU, ice prospecting | NASA ISRU tests with CSA, DLR (2008); RESOLVE (2012) | [M1], [M2] |
| 2 | Lanzarote (Caldera Blanca etc.) | Spain | 29.04, −13.64 (WP) | Basaltic volcanism, compared by ESA to the maria; lava tubes; rover tests | ESA PANGAEA (2017–2026); PANGAEA-X rover tests (2017–18) | [M3], [M4] |
| 3 | Nördlinger Ries crater | Germany | 48.88, 10.57 (WP) | Impact cratering, impact rocks | Apollo 14 and 17 crews (1970); ESA PANGAEA | [M5], [M6] |
| 4 | Lofoten anorthosite (Nusfjord) | Norway | 68.04, 13.35 (WP, proxy) | **Anorthosite = lunar highlands**, relevant to the Artemis south-pole regions | ESA PANGAEA (2025) | [M7] |
| 5 | Kamestastin (Mistastin) crater, Labrador | Canada | 55.88, −63.30 (WP) | Impact crater **with anorthosite** (highlands) | CSA/NASA astronaut training (2021); Artemis II crew (2023) | [M8], [M9] |
| 6 | Haughton crater, Devon Island | Canada | 75.38, −89.67 (WP) | Impact cratering; similar size to Shackleton crater; polar, cold, isolated | Haughton-Mars Project (NASA-funded, ~22 seasons); CSA training (2013) | [M10], [M8] |
| 7 | Meteor Crater | USA (Arizona) | 35.03, −111.02 (WP) | Impact crater | Apollo crews (1963–70); Artemis-era crews | [M11] (weak: historical marker; no NASA page found) |
| 8 | Black Point Lava Flow / SP Crater | USA (Arizona) | 35.58, −111.63 (WP SP Crater, proxy) | Basaltic lava terrain; rover operations; night EVAs for low polar Sun | NASA Desert RATS (2008–11, 2022); JETT3 (2022) | [M12] |
| 9 | San Francisco Volcanic Field | USA (Arizona) | ~45 min north of Flagstaff (no coordinate found) | Volcanic terrain; low-Sun south-pole lighting with spotlights | NASA JETT5 for Artemis III (2024) | [M13], [M14] |
| 10 | Cinder Lake crater field | USA (Arizona) | 35.33, −111.52 (Atlas Obscura, not authoritative) | Artificial crater field, copy of an Apollo landing area | USGS for NASA (1967 →); Apollo and Artemis training | [M15] |
| 11 | Sudbury Basin | Canada | 46.60, −81.18 (WP) | Large impact structure, breccias | Apollo 16 crew (1971); no Artemis-era use found | [M8] |
| 12 | Iceland highlands (Askja / Vatnajökull) | Iceland | 65.03, −16.78 (WP Askja, proxy) | Volcanism, breccias, icy soils like the south pole | Apollo-era training; Artemis II crew (2024) | [M16], [M8] |
| 13 | Stillwater Complex, Montana | USA | 45.39, −109.90 (WP) | Anorthosite; source rock for highland simulant | Lunar simulant production | [M17] |
| 14 | Fiskenæsset Complex | Greenland | not found | Anorthosite compared with lunar samples (1970s papers) | Research only, no training use | [M18] (search summary only) |
| 15 | NEEMO, Aquarius Reef Base | USA (Florida) | 24.95, −80.45 (WP) | Isolation; underwater "moonwalks" for partial-gravity EVA | NASA NEEMO (2001 →); ESA NEEMO NXT (2019) | [M19] |
| 16 | Concordia Station, Dome C | Antarctica | −75.10, 123.33 (WP) | Isolation, extreme cold, months of darkness | ESA/IPEV winter-over research, linked to Artemis | [M20] |
| 17 | Potrillo Volcanic Field (NM), SW Nevada Volcanic Field | USA | not found | Volcanic terrain | Selected NASA Artemis training sites (2022) | [M14] |

### What this means for our story

- **Most lunar training sites are volcanic (basalt), like the dark lunar plains (maria).** NASA's selected Artemis field sites are volcanic fields [M14], and ESA says Lanzarote's lava "compare[s] to the vast plains of the lunar maria" [M3].
- **The lunar south pole is highland anorthosite.** Chandrayaan-3's rover found its samples were mostly ferroan anorthosite (Vadawale et al., *Nature* 2024, doi:10.1038/s41586-024-07870-7) [M21]. Anorthosite is "relatively uncommon on Earth" [M9].
- **Agencies have only recently added anorthosite sites:** Kamestastin (2021, 2023) and Lofoten (2025). This supports the open question in `STATUS.md`: a south-pole base needs anorthosite analogs, and few are used yet. **That is a gap our project can point at.**
- Caveat: impact craters (Ries, Meteor Crater, Haughton, Sudbury, Kamestastin) are also a big share of training. No single source says "most analogs are basaltic"; it's our inference from the site lists.
- **No natural Earth site is used for permanently shadowed regions.** NASA simulates polar light with night EVAs and spotlights [M12], [M13]; DLR/ESA's indoor LUNA hall has a polar sun simulator [M22].

### Corrections for the mock data

- **Svalbard** is marked `known: true` for Moon sites. Sources only show it as a **Mars** analog (AMASE expeditions). For the Moon it would be a new candidate.
- **Nain anorthosite** (`known: false`): correct, no published lunar use found. The used Labrador site is Kamestastin.
- **Fiskenæsset** (`known: false`): defensible; only 1970s research comparisons, no training use.

---

## 2. Known Mars analogs

**In progress** — research was still running when Kmar stopped on 2026-11-14. It covers Lake Salda, Atacama, Hanksville/MDRS, Haughton, McMurdo Dry Valleys, Rio Tinto, Pilbara, Iceland, Svalbard, Mojave/Death Valley, Danakil, Qaidam, Ladakh, Tibet, Lut, Morocco, Tirez Lake, Makgadikgadi, Namib, Hawaii (HI-SEAS), Shark Bay, Lake Magadi and Harrat Khaybar, with coordinates and sources. It will be added to this file in a follow-up PR.

Already confirmed by the test-mapping research (section 3): Pilbara (Mars 2020 + ExoMars field training, 2019), Lake Salda (Perseverance team, 2019), Walker Lake, Nevada (Mars 2020 ROASTT, 2020), Atacama (ARADS 2016–19; ESA rover tests 2013), Erfoud, Morocco (ESA rover tests, 2018), Green River, Utah (rover-ops simulation, 2016), Haughton and University Valley, Antarctica (Icebreaker drilling, ~2011–13).

---

## 3. Test / training mapping

Updated from the draft in `PROJECT_PLAN.md` to match what agencies have actually done. B7 should use the **"Use this wording"** column.

| Strong dimension | Use this wording | Real examples | Evidence |
|---|---|---|---|
| **Terrain** | Rover driving and autonomous navigation, EVA route rehearsal, landing-hazard detection | NASA Desert RATS pressurized rovers, Black Point, AZ (2010) [T1]; ESA self-driving rover trial, Erfoud, Morocco (2018) [T2]; ESA ExoMars prototype "Bridget", Atacama (2013) [T3] | Strong |
| **Mineralogy / rock type** | Field geology training, sample selection, instrument calibration and prototype testing, ground truth for orbital spectra | ESA PANGAEA, Lanzarote (2017, 2021) [T4]; NASA/CSA/DLR field mineral instruments, Mauna Kea (2008) [M1]; rover-ops spectrometer test vs. orbital data, Green River, Utah (2016) [T5] | Strong |
| **Water history** (Mars) | Biosignature search and sample-selection training (stromatolites, microbialites, carbonates) | Mars 2020 + ExoMars field trip, Pilbara (2019) [T6]; Perseverance team at Lake Salda (2019) [T7]; Mars 2020 ROASTT, Walker Lake, Nevada (2020) [T8] | Strong |
| **Aridity** | Life-detection limits and drilling for life underground in near-sterile, dry soil | NASA ARADS rover + 2 m drill, Atacama (2016–19) [T9]; Viking-style tests found almost no organics in Atacama's dry core (Navarro-González et al., *Science* 2003) [T10] | Strong |
| **Temperature** | Durability of habitats and hardware in extreme cold (Antarctica). Earth **cannot** reproduce the Moon's ~300 °C day–night swing; that is tested in vacuum chambers | Inflatable lunar habitat left 13 months at McMurdo (2008–09) [T11] | **Weak** — news source only |
| **Sun angle** (Moon) | Navigation and EVAs under long shadows and low Sun (simulated with night walks and lights) | NASA JETT5, San Francisco Volcanic Field (2024) [M13]; JPL rover drives at dawn/dusk, Colorado Desert (2026) [T12]; D-RATS 2022 night EVAs [T13] (snippet only) | Medium. **No evidence for solar-power tests** at analog sites — removed |
| **Ice / permafrost** | Drilling into ice-cemented ground; resource prospecting and water extraction (ISRU) | Icebreaker drill, Haughton and Antarctica (~2011–13) [T14]; NASA/CSA RESOLVE prospecting, Hawaii (2012) [T15] | Strong |

**Changes from the draft:** aridity was "Remote-sensing ground truth" (no evidence tied to aridity; moved to mineralogy); temperature reworded and marked weak; "solar power tests" dropped from sun angle.

### Why analog sites matter (for the Method page)

- NASA: analogs "help NASA test systems, protocols, and scenarios on Earth" [G1].
- NASA Science: analogs "help NASA plan for future robotic and human missions" [G2].
- Léveillé (2009): analogs serve science, technology testing and training (abstract only) [G3].

---

## Sources

**Lunar sites**
- [M1] phys.org (2008), NASA lunar rovers and oxygen production tests in Hawaii — https://phys.org/news/2008-11-nasa-lunar-rovers-oxygen-production.html
- [M2] NASA ARES report — https://ntrs.nasa.gov/api/citations/20150003825/downloads/20150003825.pdf
- [M3] ESA (2026), Space explorers in the land of volcanoes — https://www.esa.int/ESA_Multimedia/Images/2026/09/Space_explorers_in_the_land_of_volcanoes
- [M4] ESA (2017), Roving in Lanzarote — https://www.esa.int/ESA_Multimedia/Images/2017/11/Roving_in_Lanzarote
- [M5] Geopark Ries, science — https://en.geopark-ries.de/wissenschaft/
- [M6] ESA (2024), Geology training for the Moon — https://www.esa.int/ESA_Multimedia/Images/2024/10/Geology_training_for_the_Moon
- [M7] ESA CAVES & PANGAEA blog (2025) — https://blogs.esa.int/caves/?p=2843
- [M8] Canadian Space Agency, Training in geology — https://www.asc-csa.gc.ca/eng/astronauts/about-the-job/space-mission-simulations/training-in-geology.asp
- [M9] Western University (2021), astronaut training at Kamestastin — https://news.westernu.ca/2021/08/astronaut-training/
- [M10] Haughton-Mars Project FAQ — https://www.marsinstitute.no/hmp-faqs
- [M11] Historical Marker Database, Meteor Crater — https://www.hmdb.org/m.asp?m=161618
- [M12] NASA (2022), Artemis moonwalking and roving operations in Arizona — https://www.nasa.gov/humans-in-space/nasa-to-practice-artemis-moonwalking-roving-operations-in-arizona-desert
- [M13] USGS (2024), Artemis III mission tests in San Francisco Volcanic Field — https://www.usgs.gov/centers/astrogeology-science-center/news/artemis-iii-mission-tests-san-francisco-volcanic-field
- [M14] NASA NTRS (2022), Artemis volcanic field training sites — https://ntrs.nasa.gov/citations/20220013521
- [M15] USGS, Cinder Lake crater field — https://www.usgs.gov/publications/cinder-lake-crater-field-location-test
- [M16] NASA (2024), Artemis II crew trains in Iceland — https://science.nasa.gov/missions/artemis/nasas-artemis-ii-crew-uses-iceland-terrain-for-lunar-training/
- [M17] NASA Earth Observatory, Montana's Moon-like rocks — https://science.nasa.gov/earth/earth-observatory/montanas-moon-like-rocks-146650
- [M18] Univ. of Arizona, REE in Fiskenæsset rocks — https://experts.arizona.edu/en/publications/rare-earth-element-abundances-in-rocks-and-minerals-from-the-fisk/
- [M19] ESA (2019), Subsea scouting with NEEMO NXT — https://www.esa.int/ESA_Multimedia/Images/2019/09/Subsea_scouting_with_NEEMO_NXT
- [M20] ESA (2024), From Concordia to the Moon — https://www.esa.int/ESA_Multimedia/Images/2024/07/From_Concordia_to_the_Moon
- [M21] Vadawale et al. (2024), *Nature*, doi:10.1038/s41586-024-07870-7
- [M22] DLR (2025), Water ice on the Moon simulated in the LUNA facility — https://www.dlr.de/en/latest/news/2025/water-ice-on-the-moon-simulated-detection-in-the-luna-facility

**Tests and training**
- [T1] ASU, Arizona stands in for the Moon and Mars (Desert RATS 2010) — https://news.asu.edu/content/arizona-stands-moon-and-mars
- [T2] ESA (2018), Self-driving rovers tested in Mars-like Morocco — https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Self-driving_rovers_tested_in_Mars-like_Morocco
- [T3] ESA (2013), Test rover begins exploring Atacama — https://www.esa.int/Enabling_Support/Space_Engineering_Technology/ESA_s_test_rover_begins_exploring_Atacama_Desert
- [T4] ESA (2021), Geological training in Moon and Mars analogue environments — https://www.esa.int/ESA_Multimedia/Images/2021/03/Geological_training_in_terrestrial_Moon_and_Mars_analogue_environments
- [T5] Spectroscopy Online, field VNIR spectrometry for rover operations (Green River, Utah) — https://www.spectroscopyonline.com/view/field-portable-vnir-spectrometry-applications-mars-rover-operational-strategies-testing-terrestrial
- [T6] NASA JPL (2019), Scientists explore Outback as testbed for Mars — https://www.jpl.nasa.gov/news/scientists-explore-outback-as-testbed-for-mars
- [T7] NASA (2021), What a lake in Turkey can tell us about Mars — https://science.nasa.gov/blogs/earth-matters/2021/02/17/what-a-lake-in-turkey-can-tell-us-about-mars
- [T8] NASA JPL (2020), Perseverance scientists train in the Nevada desert — https://www.jpl.nasa.gov/news/nasa-perseverance-mars-rover-scientists-train-in-the-nevada-desert/
- [T9] NASA, ARADS — https://www.nasa.gov/universe/atacama-rover-astrobiology-drilling-studies-arads
- [T10] Navarro-González et al. (2003), *Science* 302:1018, doi:10.1126/science.1089143 (abstract only)
- [T11] UPI (2007), NASA to test lunar habitat in Antarctic — https://www.upi.com/Science_News/2007/11/28/NASA-to-test-lunar-habitat-in-Antarctic/88371196264072/
- [T12] NASA JPL (2026), Testing advanced capabilities for Moon and Mars rovers — https://www.jpl.nasa.gov/news/nasa-testing-advanced-capabilities-for-moon-mars-rovers/
- [T13] NASA NTRS, D-RATS 2022 — https://ntrs.nasa.gov/citations/20230007175 (not read)
- [T14] NASA Astrobiology, Icebreaking Mars — https://astrobiology.nasa.gov/news/icebreaking-mars/
- [T15] phys.org (2012), NASA mission simulations in Hawaii — https://phys.org/news/2012-07-nasa-mission-simulations-hawaii.html

**General**
- [G1] NASA, Analog Missions — https://www.nasa.gov/analogs
- [G2] NASA Science, 10 Things to Know About Planetary Analogs — https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/
- [G3] Léveillé (2009), *Comptes Rendus Palevol* 8:637–648 — https://sciencepress.mnhn.fr/en/periodiques/comptes-rendus-palevol/8/fasc7/validation-astrobiology-technologies-and-instrument-operations-terrestrial-analogue-environments

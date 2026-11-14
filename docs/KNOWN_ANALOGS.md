# Known Earth analogs and test mapping (K3)

For **B5–B7**: Sadık uses section 1–2 to label each Earth result **Known analog** (`known: true`, `knownRef` = the URL) or **New candidate**, and section 3 for the "What you can test here" text. Researched 2026-11-14 by Kmar with Claude (web search, pages read unless marked).

> **Status:** all three parts done — Moon list (§1), Mars list (§2), test mapping (§3).

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

"Read" means the source page was opened; rows marked *(abstract)* rest on an abstract or search summary only — recheck before citing on the site.

| # | Site | Country | Lat, Lon | Martian aspect | Used by | Linked Mars site | Source |
|---|---|---|---|---|---|---|---|
| 1 | Lake Salda | Türkiye | 37.55, 29.68 (WP) | Lake/delta, carbonates, microbialites | Mars 2020 science team (2019–20) | **Jezero** (NASA) | [R1], [T7] |
| 2 | Atacama, Yungay area | Chile | ≈ −24.08, −69.99 (McKay et al. 2003, approximate) | Hyperarid, oxidising soils, limits of life | NASA ARADS drill (2016–17); Navarro-González et al. 2003 | Viking soil results | [R2], [T9], [T10] |
| 3 | Mars Desert Research Station, Hanksville | USA (Utah) | 38.41, −110.79 (WP) | Terrain, inverted channels, concretions, crew isolation | Mars Society crews (~2001 →) | Meridiani "blueberries" | [R3] *(abstract)* |
| 4 | Haughton crater, Devon Island (HMP, FMARS) | Canada | 75.38, −89.67 (WP) | Impact crater, polar desert, permafrost, isolation | NASA Ames HMP (1997 →); Mars Society FMARS (2000 →) | general | [G2], [T14] |
| 5 | McMurdo Dry Valleys | Antarctica | −77.47, 162.52 (WP) | Cold hyperarid, dry permafrost, ice | Phoenix mission analog (2007–08) | **Phoenix site** | [R4] |
| 6 | Río Tinto (source area, Peña de Hierro) | Spain | 37.70, −6.55 (Spanish WP) | Acidic, sulfates, iron, subsurface life | NASA–CAB MARTE drilling (2003–05); Europlanet facility | — | [R5] |
| 7 | Pilbara (Marble Bar stromatolites) | Australia | −21.17, 119.75 (WP Marble Bar) | ~3.5 Ga stromatolite biosignatures | Mars 2020 + ExoMars field trip (2019); NASA/ESA (2023) | Jezero (indirect) | [T6] |
| 8 | Iceland, Holuhraun (and Askja) | Iceland | 64.85, −16.83 (WP) | Basaltic lava, volcanic terrain | NASA PSTAR "RAVEN" rover/drone (2021–22) | general | [R6] |
| 9 | Svalbard, Bockfjorden (AMASE) | Norway | 79.47, 13.33 (WP) | Carbonates, volcanic, hydrothermal, permafrost | AMASE expeditions (~2003–11), tested MSL and ExoMars instruments | ALH84001 carbonates | [R7] |
| 10 | Mojave (Dumont Dunes) and Death Valley | USA (California) | 35.68, −116.22 and 36.25, −116.82 (WP) | Aeolian dunes, volcanic rubble | Viking prep (1970s); Curiosity mobility tests (2012); JPL drone tests (2025) | Curiosity / Ingenuity dune fields | [R8] |
| 11 | Danakil Depression / Dallol | Ethiopia | 14.24, 40.29 (WP) | Hydrothermal, acidic sulfates, salts, extreme life | Europlanet field work (2017); Cavalazzi et al. 2019 | Gusev (mentioned) | [R9] |
| 12 | Qaidam Basin, Dalangtan playa | China | ≈ 38.3, 91.7 (Kong et al. 2018) | Mg-sulfates, chlorides, perchlorates, hyperarid | Studied since 2008; Europlanet facility | — | [R10] |
| 13 | Ladakh: Tso Kar and Puga | India | 33.30, 77.98 (WP Tso Kar) | Brines, saline permafrost, hydrothermal, clays | ISRO HOPE crew analog at Tso Kar (Aug 2025); Pandey et al. 2019 | "early Mars" (ISRO) | [R11], [R12] |
| 14 | Lut Desert | Iran | 30.61, 59.07 (WP) | Megaripples like Mars transverse aeolian ridges, yardangs | Foroutan & Zimbelman 2016 (*Icarus*) | Mars TARs | [R13] *(abstract)* |
| 15 | Erfoud, Ibn Battuta Centre | Morocco | 31.44, −4.23 (WP Erfoud) | Terrain for rover navigation | ESA autonomous rovers (2018); ExoMars radar tests; OeWF MARS2013 | general | [T2], [R14] |
| 16 | Laguna de Tírez | Spain | 39.54, −3.36 (regional tourism site) | Gypsum/sulfates, wet-to-dry transition, biosignatures | ExoMars IR instrument tests (Preston et al. 2020) | Mars sulfate deposits | [R15] |
| 17 | Makgadikgadi salt pans | Botswana | −20.80, 25.33 (WP) | Layered evaporites and clays, dust devils | Europlanet facility (BIUST); INTA dust-devil campaign (2021) | equatorial layered terrains | [R16] |
| 18 | Namib Desert (near Gobabeb) | Namibia | −23.55, 15.03 (WP Gobabeb) | Fog-wetted dune slumping | Bourke et al. 2020 (GSA abstract only) | Mars north polar dunes | [R17] — **weak** |
| 19 | HI-SEAS, Mauna Loa | USA (Hawaii) | 19.60, −155.49 (WP) | Crew isolation, basalt | NASA Human Research Program (2013–18) | general | [R18] |
| 20 | Kaʻū Desert, Kīlauea | USA (Hawaii) | 19.41, −155.30 (WP) | Acid-sulfate alteration, silica | Schiffman et al. 2006; Seelos et al. 2010 | Spirit's silica and MER jarosite | [R19] *(title only)* |
| 21 | Shark Bay, Hamelin Pool | Australia | −26.44, 114.35 (WP) | Stromatolite biosignatures | Suosaari et al. 2016 | fossil-life search | [R20] |
| 22 | Walker Lake | USA (Nevada) | not retrieved | Ancient lakebed, stromatolites | Mars 2020 ROASTT rover-ops training (2020) | Jezero | [T8] |
| 23 | Green River | USA (Utah) | not retrieved | Clays, layered sediments | Rover-ops spectrometer simulation (2016) | Mawrth Vallis | [T5] |
| 24 | Kangerlussuaq | Greenland | 67.01, −50.69 (WP town) | Glacial/periglacial | Europlanet facility (Aarhus University) | — | [R21] |
| 25 | Puna plateau, Argentinian Andes | Argentina | ≈ −23.46, −67.36 (WP Puna) | Hypersaline lakes, high UV, microbialites | Europlanet facility | — | [R22] *(summary)* |

### Not published as Mars analogs (→ "New candidate" for us)

| Site | In mock data | Finding |
|---|---|---|
| **Harrat Khaybar** (Saudi Arabia, 25.72, 39.94) | `known: false` ✓ | No Mars-analog study; only a NASA image caption saying it looks "lunar or Martian" [R23] |
| **Kunlun / Ashikule** (China, 35.77, 81.62) | — | No Mars-analog study found |
| **Lake Magadi** (Kenya, −1.92, 36.27) | `known: false` ✓ | Published as an **early-Earth** analog [R24]; Mars link only in a PhD thesis. Borderline, fine as new |

### Corrections for the mock data

- **Danakil Depression** is `known: true` ✓ — correct.
- **Lut Desert yardangs** is `known: false`, but there is one published Mars-analog paper (Foroutan & Zimbelman 2016, *Icarus*) about its megaripples. Strictly it is **known**; Sadık decides.
- **Namib gravel plains** is `known: false`: only a conference abstract links the Namib *dunes* to Mars — gravel plains are fine as new.

### Catalogues worth knowing

- **USGS, *Known Terrestrial Analog Sites for Planetary Science*** (Hunter, 2020), doi:10.5066/P9J72921 — a global **point layer** with a location for each site. Best machine-readable source for the "known" check, if Sadık can download it (blocked for us).
- **ESA / Open University, *Catalogue of Planetary Analogues*** (2012) — executive summary: https://nebula.esa.int/sites/default/files/neb_tec_study/1115/C4000104716ExS.pdf
- **Europlanet TA1 field sites** (no coordinates) — https://www.europlanet.org/europlanet-2024-ri/ta1-pfa/
- Preston & Dartnell (2014), *Int. J. Astrobiology* 13(1):81–98, doi:10.1017/S1473550413000396 — review of 33 analog sites.

---

## 3. Test / training mapping

Updated from the draft in `PROJECT_PLAN.md` to match what agencies have actually done. B7 should use the **"Use this wording"** column.

| Strong dimension | Use this wording | Real examples | Evidence |
|---|---|---|---|
| **Terrain** | Rover driving and autonomous navigation, EVA route rehearsal, landing-hazard detection | NASA Desert RATS crewed rover field test, Black Point lava flow, AZ (2010) [T1]; ESA self-driving rover trial, Erfoud, Morocco (2018) [T2]; ESA rover prototype "Bridget" with ExoMars prototype instruments, Atacama (2013) [T3] | Strong |
| **Mineralogy / rock type** | Field geology training, sample selection, instrument calibration and prototype testing, ground truth for orbital spectra | ESA astronaut geology training, Lanzarote [T4]; NASA/CSA field mineral instruments (Mössbauer, XRD, Raman), Hawaii (2008) [M1]; rover-ops spectrometer test vs. orbital data, Green River, Utah (2016) [T5] | Strong |
| **Water history** (Mars) | Biosignature search and sample-selection training (stromatolites, microbialites, carbonates) | Mars 2020 + ExoMars field trip, Pilbara (2019) [T6]; Perseverance team at Lake Salda (2019) [T7]; Mars 2020 ROASTT, Walker Lake, Nevada (2020) [T8] | Strong |
| **Aridity** | Life-detection limits and drilling for life underground in near-sterile, dry soil | NASA ARADS rover + 2 m drill, Atacama (2016–19) [T9]; Viking-style tests found almost no organics in Atacama's dry core (Navarro-González et al., *Science* 2003) [T10] | Strong |
| **Temperature** | Durability of habitats and hardware in extreme cold (Antarctica). Earth **cannot** reproduce the Moon's ~300 °C day–night swing; that is tested in vacuum chambers | Inflatable lunar habitat left 13 months at McMurdo (2008–09) [T11] | **Weak** — news source only |
| **Sun angle** (Moon) | Navigation and EVAs under long shadows and low Sun (simulated with night walks and lights) | NASA JETT5, San Francisco Volcanic Field (2024) [M13]; JPL rover drives at dawn/dusk, Colorado Desert (2026) [T12] | Medium. **No evidence for solar-power tests** at analog sites — removed |
| **Ice / permafrost** | Drilling into ice-cemented ground; resource prospecting and water extraction (ISRU) | Icebreaker drill in ice-cemented ground, Haughton Crater (Arctic) and University Valley (Antarctica) [T14]; NASA RESOLVE payload on CSA's Artemis Jr. rover, prospecting near Hilo, Hawaii (2012) [T15] | Strong |

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

**Mars sites**
- [R1] NASA, Lake Salda beach — https://science.nasa.gov/?p=998926
- [R2] NASA Astrobiology, life-detection drill in the Atacama — https://astrobiology.nasa.gov/news/nasa-tests-life-detection-drill-in-the-atacama-desert/ ; review: https://doi.org/10.3389/fspas.2021.810426
- [R3] Clarke & Stoker (2011), *Int. J. Astrobiology*, doi:10.1017/S1473550411000048
- [R4] NASA NTRS, McMurdo Dry Valleys – a Mars Phoenix mission analog — https://ntrs.nasa.gov/citations/20100003844
- [R5] NASA Astrobiology, Mars drilling near an acidic Spanish river — https://astrobiology.nasa.gov/news/scientists-practice-mars-drilling-near-acidic-spanish-river/
- [R6] Univ. of Arizona, Mars exploration drones in Iceland — https://news.arizona.edu/news/3m-nasa-grant-uarizona-scientists-will-test-mars-exploration-drones-iceland
- [R7] NASA Astrobiology Institute, AMASE flight-instrument testing — https://astrobiology.nasa.gov/nai/annual-reports/2011/ciw/project-6-application-of-laboratory-experimentation-to-flight-instrument-testing/index.html
- [R8] NASA JPL (2025), drones in Death Valley — https://www.jpl.nasa.gov/news/nasa-tests-drones-in-death-valley-preps-for-martian-sands-and-skies/
- [R9] Europlanet release (2019), microbes in Danakil — https://astrobiology.com/2019/05/28/ultra-small-microbes-exhibit-extreme-survival-skills-in-ethiopias-mars-like-wonderland/
- [R10] Kong et al. (2018), *Astrobiology*, Qaidam Basin — https://pmc.ncbi.nlm.nih.gov/articles/PMC6205091
- [R11] ISRO, Space Analog Mission (Ladakh) — https://www.isro.gov.in/Space_Analog_Mission.html
- [R12] Pandey et al. (2019), *Int. J. Astrobiology*, doi:10.1017/S1473550419000119
- [R13] Foroutan & Zimbelman (2016), *Icarus* 274:99, doi:10.1016/j.icarus.2016.03.025
- [R14] Ibn Battuta Centre — https://ibnbattutacentre.org/
- [R15] Preston et al. (2020), *Astrobiology*, Laguna de Tírez — https://pmc.ncbi.nlm.nih.gov/articles/PMC6987737
- [R16] Europlanet, Makgadikgadi facility — https://www.europlanet.org/europlanet-2024-ri/ta1-pfa/ta1-facility-5-makgadikgadi-salt-pans-botswana/
- [R17] Bourke et al. (2020), GSA abstract — https://studio.m-anage.com/gsa/2020AM/webprogram/Paper358969.html
- [R18] NASA, HI-SEAS 8-month mission — https://www.nasa.gov/feature/hi-seas-team-completes-8-month-isolation-mission
- [R19] USGS, Silica in a Mars analog environment, Kaʻū Desert — https://www.usgs.gov/publications/silica-a-mars-analog-environment-ka-u-desert-kilauea-volcano-hawaii
- [R20] NASA Astrobiology (2016), Shark Bay — https://astrobiology.nasa.gov/news/bacteria-could-aid-search-for-creatures-on-other-planets/
- [R21] Europlanet TA1 field analogues — https://www.europlanet.org/europlanet-2024-ri/ta1-pfa/
- [R22] Europlanet Society, Argentinian Andes facility — https://www.europlanet-society.org/?p=14039
- [R23] NASA Earth Observatory, Harrat Khaybar — https://science.nasa.gov/earth/earth-observatory/harrat-khaybar-volcanic-field-8650
- [R24] Reinhardt et al. (2019), *Biogeosciences*, Lake Magadi — https://bg.copernicus.org/articles/16/2443/2019/

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
- [T13] (removed 14 Nov audit: NTRS D-RATS 2022 record does not mention night EVAs)
- [T14] NASA Astrobiology, Icebreaking Mars — https://astrobiology.nasa.gov/news/icebreaking-mars/
- [T15] phys.org (2012), NASA mission simulations in Hawaii — https://phys.org/news/2012-07-nasa-mission-simulations-hawaii.html

**General**
- [G1] NASA, Analog Missions — https://www.nasa.gov/analogs
- [G2] NASA Science, 10 Things to Know About Planetary Analogs — https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/
- [G3] Léveillé (2009), *Comptes Rendus Palevol* 8:637–648 — https://sciencepress.mnhn.fr/en/periodiques/comptes-rendus-palevol/8/fasc7/validation-astrobiology-technologies-and-instrument-operations-terrestrial-analogue-environments

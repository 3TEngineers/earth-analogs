# Space Apps submission — draft answers

Text to paste into the project submission form. Numbers follow `docs/SCREENING_RESULTS.md`, `docs/ANALOG_RESULTS.md` and `docs/AUDIT.md` as of 15 Nov (after PR #27); if any of them change, change them here too.

**Before submitting:**

- [ ] Agree on the project name (below is a proposal).
- [ ] Make the repository **public** (Settings → General → Danger Zone). The form needs links that open without a login.
- [ ] Deniz has redeployed https://earth-analogs.vercel.app after the final review PR (24 training areas, Moon shadow distances 7.0 / 6.0 / 2.9 km, audit 167/0/0).
- [ ] Demo: at most **7 slides** (title and introduction count) **or** a video of at most **30 seconds**, on a public link. Not made yet.
- [ ] Open every link in the two data lists once in a private window. (Checked from a script on 15 Nov: all answer; the Natural Earth site refuses scripts but opens in a browser.)

---

## Project Name

**Earth Analogs: Rehearsing the Moon and Mars on Earth**

(Shorter: *Earth Analogs*.)

## Summary

*Paste as is. About 1,160 characters, 199 words (limit 1,500 characters; 50–200 words suggested).*

> Earth Analogs is an interactive 3D website that finds where on Earth astronauts and rovers can rehearse for the Moon's south pole and for Mars. Most analog studies start from a site someone already chose. We started from the data: we applied published mission limits to the whole of Mars and base-site rules to the lunar south pole, using NASA elevation, thermal and illumination maps, and chose our own sites — 5 safe Mars landing zones and 3 permanent Moon base ridges. We then tested those rules on history: 6 of 11 past Mars landings pass all of them, and Curiosity and Perseverance fail only because they landed beside the mountain and delta they came to study. Finally we ranked all land on Earth against each site on terrain, rock type, dryness and temperature, and kept three training areas per site: 24 in all, 21 of them places not listed as analogs before. Every report shows where the place matches, where it doesn't, what could be tested there, and what no place on Earth can reproduce: low gravity, vacuum, Mars' thin air and space radiation. An audit script checked every number against independent references (167 checks passed, 0 failed).

## Project Demonstration

*Link to the slides or the video once it exists.* Suggested 7 slides:

1. Title: Earth Analogs — team 3TE, the challenge name, the site URL.
2. The question and the usual way vs ours (start from the maps, not from a chosen site).
3. Mars: five rules, 4.5 % of the planet passes, 5 zones (screening map from `docs/images/`).
4. Moon: four rules at the south pole, 3 ridges; 4 of 7 Artemis III features have passing ground.
5. The check: 6 of 11 Mars landings pass; Curiosity and Perseverance fail only relief, because they went to a mountain and a delta.
6. Earth: 24 training areas, one report on screen (similar / different / what to test / what Earth can't reproduce).
7. Trust: the audit (167 passed, 27 errors found and fixed) and the limits.

## Project

https://earth-analogs.vercel.app

(Code: https://github.com/3TEngineers/earth-analogs — only after the repository is made public.)

## Project Details

*Paste as is.*

**What it does**

Earth Analogs answers the challenge in three steps and shows the result on a 3D globe of the Moon, Earth and Mars.

1. **Screen — choose the sites ourselves.** On Mars we applied five rules, four of them taken from mission documents (Curiosity's engineering guide, Perseverance's site selection): low enough elevation for air to brake in, within 30° of the equator (warmth, and power for a solar lander), firm ground rather than dust (thermal inertia and albedo), gentle slopes (≤ 3° over 2–5 km), plus low relief, our own. 4.5 % of Mars passes (6.45 million km² in 895 patches); from it we chose 5 landing zones, each deep inside a large safe area and more than 500 km from every past landing: southern Utopia Planitia, northern Elysium Planitia, western Isidis Planitia, the Chryse–Acidalia plains and eastern Meridiani Planum. At the lunar south pole a permanent base needs power, a radio link, level ground and water ice nearby: sunlit at least half the time, Earth in view at least half the time, slope ≤ 10°, and within 10 km of a permanently shadowed area of at least 1 km². These four thresholds are our own, as no mission has published base-site limits; three ridges pass every rule — two next to NASA's de Gerlache Rim 2 region, which our screening never used, and one outside NASA's regions, the Cabeus–Malapert ridge.
2. **Check — test the rules on real missions.** 6 of 11 past Mars landings pass every rule. Curiosity and Perseverance fail only low relief: they went to a mountain and a river delta, with guided landing systems built for that. Viking 2, Phoenix and Mars 3 fail the latitude rule; Viking was nuclear powered and Phoenix went north for ice on purpose. Every landing whose own published limits we found passes them on our maps. On the Moon, 4 of the 7 named Artemis III features have passing ground within 25 km, and the three robotic landers near the south pole (Chandrayaan-3, IM-1, IM-2) fail as base sites, as expected for missions built to last one lunar day.
3. **Match — rank all land on Earth.** Earth's land on a 0.25° grid is scored against each site: terrain (slopes measured the same way and at the same pixel size on both worlds), rock type (the unit mapped at the Mars site on the USGS geologic map against a global lithological map of Earth), dryness (23 years of NASA rainfall data and bare ground), day–night temperature swing and cold, and for Mars ground brightness and thin air, for the Moon a low Sun and frozen ground. Three places per site, at least 500 km apart, bare and inland, become its training areas: 24 in all. Mars matches score 77–88 out of 100 (basalt fields in Libya and Saudi Arabia, sandstone plains in the Atacama and the Qaidam Basin); Moon matches 47–62, because no cold, dry place on Earth is as steep as a lunar polar ridge — and the reports say so.

Each training area has a report: a score per dimension, where it is similar, where it differs, tests that fit it (with where such tests have been done before), and a fixed line on what no place on Earth has.

**Benefits and intended impact**

Mission planners and analog-research teams get a transparent, reproducible shortlist of training sites for specific landing and base locations, not for "Mars" in general. Every rule is traced to a mission document or labelled as our own choice, every number can be recomputed from public data, and the limits are stated on every page. Students and the public can explore why a place was chosen, and why a famous landing site would fail a different mission's rules.

**How it is built**

- Data pipeline in Python 3.12 (rasterio, NumPy, SciPy, GeoPandas, earthaccess, pydantic): screening of Mars and the Moon, a global Earth grid, ranking and report text, written to small JSON files with a validated schema. No database or server, so the site cannot go down during judging.
- Website in React, TypeScript, Vite and Tailwind CSS with a single three.js scene (three-globe): the Moon, Earth and Mars on one page, a flight from each site to its Earth training areas, and live orbital close-ups (THEMIS, LRO WAC, Sentinel-2). Hosted on Vercel.
- An audit script compares every output with something we did not produce: published landing-site elevations, known geology, station climatologies, the raw data recomputed, and every map tested for being shifted, flipped or mirrored. With our own reviews it turned up 27 errors in our own work — including a Mars dust map read half a planet away from the elevation, and lunar slope-map gaps read as 45° cliffs — all fixed and documented. Final run: 167 checks passed, 0 warnings, 0 failed.

**What makes it creative**

We turned the challenge around: instead of matching Earth to sites others chose, we chose the sites ourselves from published mission limits, used past landings and NASA's Artemis III regions as the test of our rules, and only then searched Earth. We also asked why each past mission went where it did: a landing that fails our rules is not a bad site — it flew a different mission.

**Factors we considered**

- Scientific honesty: Earth cannot reproduce lunar or Martian gravity, the vacuum, Mars' thin CO₂ air or space radiation; every report says so.
- Scale: our screening is kilometre-scale on Mars and 240 m on the Moon. Real site selection uses metre-scale images and takes years.
- Data limits we state on the site: the global rock map is coarse (about 50 km), water history on Mars has no global dataset to compare, satellite rainfall reads high in the driest deserts, and "low Sun" on Earth is never as low as at the lunar pole.
- Accessibility: the site works on phones; every figure has a plain-language explanation and a Details panel with formulas and tables.

## Use of Super Intelligence (SI)

**Select:** Writing, Editing, or Translation; and the options for **code** and **data analysis** if the form lists them. Do **not** select image, video or audio options: no AI-generated images, video or audio are used (close-ups are real USGS / EOX imagery, globe textures are NASA and USGS mosaics).

If there is a free-text field, paste:

> Yes, we used AI in our project, as an assistant. The idea, the choice to select our own sites, every rule and design decision, and all reviews are the team's; the "find our own candidate sites first" step came from our mentor. Where it helped:
>
> **Development support:** Claude (Anthropic, through Claude Code) assisted with writing, reviewing and optimising code for the data pipeline, the audit and the website, including the 3D scene and its animations, and with debugging and library suggestions. The team directed the work, and reviewed and tested the results.
>
> **Research and documentation:** Claude helped us compare the challenges, find datasets and published mission limits, cross-check our numbers against independent sources, and draft and edit the documentation and site text.
>
> **Not AI:** all numbers are computed from the public datasets listed below. No AI-generated images, video or audio are used. This is also stated on the website's About page and in the repository (docs/PROJECT_HISTORY.md §13).

## NASA Data

| Link Text | Link URL |
|---|---|
| MGS MOLA Mission Experiment Gridded Data Record, 16 px/deg (Mars topography) | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/ |
| Mars MGS MOLA DEM 463 m (via USGS Astrogeology) | https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif |
| MGS TES thermal inertia and albedo maps (Mars) | https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-special-v1/ |
| MSL (Curiosity) Engineering User's Guide for landing-site selection | https://marsoweb.nas.nasa.gov/landingsites/msl/memoranda/MSL_Eng_User_Guide_v2.pdf |
| THEMIS day IR mosaic (Mars close-ups, via USGS Astrogeology) | https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map |
| Viking MDIM 2.1 colour mosaic (Mars globe, via USGS Astrogeology) | https://astrogeology.usgs.gov/search/map/mars_viking_mdim21_clrmosaic_global_232m |
| LOLA lunar illumination, Earth visibility and permanent shadow maps (NASA PGDA) | https://pgda.gsfc.nasa.gov/products/69 |
| LRO LOLA south-pole slope and elevation grids, 240 m | https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ |
| LRO LOLA global DEM 118 m (via USGS Astrogeology) | https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif |
| LRO WAC mosaics (Moon close-ups, via USGS Astrogeology) | https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_spole.map |
| NASA SVS CGI Moon Kit (Moon globe) | https://svs.gsfc.nasa.gov/4720 |
| NASA update on Artemis III Moon landing regions | https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ |
| NASA LRO images of the IM-1 Odysseus lander | https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander/ |
| GPM IMERG V07 precipitation climatology 2000–2023 | https://gpm.nasa.gov/data/imerg/precipitation-climatology |
| GPM IMERG Final monthly precipitation (GPM_3IMERGM) | https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary |
| MODIS land surface temperature, monthly (MOD11C3) | https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061 |
| MODIS vegetation index, monthly (MOD13C2) | https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061 |
| MODIS land cover (MCD12C1) | https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd12c1-061 |
| MODIS albedo (MCD43C3) | https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd43c3-061 |
| NASA GIBS Blue Marble shaded relief (Earth globe) | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA NSSDC Mars fact sheet | https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html |
| NASA NSSDC Moon fact sheet | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |

## Space Agency Partner & Other Data

| Link Text | Link URL |
|---|---|
| Copernicus DEM GLO-30 (ESA / Copernicus, on AWS Open Data) | https://registry.opendata.aws/copernicus-dem/ |
| Sentinel-2 cloudless 2020 by EOX (Earth close-ups; contains modified Copernicus Sentinel data) | https://s2maps.eu |
| ISRO Chandrayaan-3 mission details | https://www.isro.gov.in/Chandrayaan3_Details.html |
| USGS Geologic Map of Mars, SIM 3292 (Tanaka et al. 2014) | https://pubs.usgs.gov/sim/3292/ |
| USGS Gazetteer of Planetary Nomenclature | https://planetarynames.wr.usgs.gov |
| GLiM global lithological map (Hartmann & Moosdorf 2012) | https://doi.pangaea.de/10.1594/PANGAEA.788537 |
| Natural Earth 1:10m countries and regions | https://www.naturalearthdata.com |
| Mars 2020 landing-site constraints (Fergason et al. 2017, LPSC abstract 2163) | https://www.hou.usra.edu/meetings/lpsc2017/pdf/2163.pdf |
| Known analog sites and their sources (our compiled list) | https://github.com/3TEngineers/earth-analogs/blob/main/docs/KNOWN_ANALOGS.md |
| three.js | https://threejs.org |
| three-globe | https://github.com/vasturiano/three-globe |
| React | https://react.dev |
| Vite | https://vite.dev |
| Tailwind CSS | https://tailwindcss.com |
| Lucide icons | https://lucide.dev |
| Google Fonts: Jost, IBM Plex Sans, IBM Plex Mono | https://fonts.google.com |
| Python geospatial stack: rasterio, GeoPandas, NumPy, SciPy | https://rasterio.readthedocs.io |
| earthaccess (NASA Earthdata access library) | https://github.com/nsidc/earthaccess |
| Claude by Anthropic, used through Claude Code (SI assistant) | https://www.anthropic.com/claude |
| Vercel (hosting) | https://vercel.com |

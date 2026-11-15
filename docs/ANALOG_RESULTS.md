# Earth training areas (B3–B8)

How we found three Earth training areas for each of our 8 candidate sites (5 Mars landing zones, 3 Moon base sites), and how far the result can be trusted. Produced by `pipeline/earth_pool.py` (B3), `pipeline/earth_ranking.py` (B4) and `pipeline/build_analogs.py` (B5, B7, B8). First run on 2026-11-14; **re-made on 2026-11-15 after the Earth audit** (`docs/AUDIT.md`, errors 16–24), so every area below is from that run. The app reads the result from `app/public/data/analogs.json` (`version: 3`, `mock: false`).

## Method

1. **B3 — global pass.** Earth's land on a 0.25° grid from NASA data:
   - rainfall: GPM IMERG V07 climatology, June 2000 – May 2023 (the 12 months of 2023 only fill the gap south of 80° S, where the climatology is empty);
   - vegetation (MODIS NDVI, yearly maximum) and day–night and mean surface temperature (MODIS LST), all 12 months of 2023;
   - ice, water and bare ground (MODIS land cover); ice sheets are removed, the Dry Valleys kept;
   - ground brightness: MODIS snow-free white-sky shortwave albedo, median of four dates in 2023.

   A cell counts as land only if under 10 % of it is water (MODIS, sea ice included) **and** at least 90 % of it lies inside Natural Earth's 10 m coastline. Rainfall at or below 100 mm a year counts as fully dry, because IMERG over-reports the driest deserts (Atacama: tens of mm vs ~2 mm measured). From these, a Mars-like climate score (dry 35 %, bare 30 %, day–night swing 20 %, cold 15 %) and a Moon-pole-like score (bare 25 %, polar low Sun 25 %, dry 20 %, frozen ground 20 %, swing 10 %). Pool per body: the **100 best cells, ≥ 200 km apart**, plus every known analog from `KNOWN_ANALOGS.md` (23 for Mars, 14 for the Moon).
2. **B4 — per candidate.**
   - **Terrain:** all slopes in a ~25 km box around the candidate against the same box on Earth, **both computed the same way** (height differences two pixels apart) **at the same pixel size**: MOLA 463 m for Mars, LOLA 240 m elevation for the Moon, Copernicus DEM averaged to 463 m or 240 m for Earth. The Earth box is assembled from every 1° DEM tile it touches. The two slope distributions are compared with the Wasserstein distance W; score = exp(−W / 3°).
   - **Rock type:** the rock class of the unit mapped at the candidate against the global lithological map GLiM (Hartmann & Moosdorf 2012, 0.5°). For Mars the unit is read from the USGS global geologic map (SIM 3292, Tanaka et al. 2014) at the candidate's coordinates:

     | Zone | Mapped unit | Rock class we look for on Earth |
     |---|---|---|
     | A — Southern Utopia Planitia | `AHv`, Amazonian and Hesperian volcanic | basalt |
     | B — Northern Elysium Planitia | `AHv` | basalt |
     | C — Western Isidis Planitia | `eHv`, Early Hesperian volcanic | basalt |
     | D — Chryse–Acidalia plains | `lHt`, Late Hesperian transition | mixed sediments |
     | E — Eastern Meridiani Planum | `HNhu`, the polygon Opportunity landed in | sandstone (what Opportunity found) |

     For the Moon it is the anorthositic highland crust of the south pole (GLiM's "basic plutonic" class). Because B3's pools are climate-only and hold almost no basalt or anorthosite-family rock, B4 adds, per expected rock class, the **40 best-climate Earth cells of that class**, ≥ 200 km apart.
   - **Surface brightness (Mars):** MGS TES bolometric albedo at the zone against MODIS albedo on Earth; a difference of 0.20 scores 0. Dark rock and gravel match Mars' plains; bright sand and salt do not.
   - **Thin air (Mars):** mean elevation of the box; 5,000 m scores 100. Even there the air is about 90 times denser than on Mars.
   - Dryness and temperature (and for the Moon low Sun and frozen ground) from B3.
   - **Weighted total.** Mars: terrain 30 %, rock 20 %, dryness 20 %, brightness 10 %, temperature 10 %, thin air 10 %. Moon: terrain 25 %, rock 25 %, low Sun 20 %, frozen ground 15 %, dryness 10 %, temperature 5 %. **A cell with any score missing gets no total** and cannot be picked, so missing data never helps a place.
3. **B5 — pick 3.** A training area must be at least three quarters free of permanent snow and ice, bare or sparsely vegetated all year (yearly maximum NDVI ≤ 0.30) and ≥ 90 % land on the Natural Earth vector coastline. Three rounds; in each round every candidate gets one place, and **the best (candidate, place) pair is settled first**, so a place two candidates want goes to the one it fits better. A candidate's three places are ≥ 500 km apart, and a place given to one candidate is closed (300 km) to the others on the same body. A place counts as **known** if a published analog lies within 50 km, or within 400 km in the same named region (the Atacama, Qaidam and Lut are whole regions); at least one of the three must be new. Names: rock label + landform word from the measured slope (plains ≤ 1.5°, hills ≤ 6°, mountains above) + the most specific Natural Earth region, plus the country — descriptive on purpose; we don't invent exact place names we can't check.
4. **B7 — text.** Score ≥ 70 → a "similar" sentence and a test from `KNOWN_ANALOGS.md` §3 (with where it has been done before); score ≤ 40 → a "different" sentence. Every report also lists what no Earth site has (air pressure, gravity, magnetic field; NASA NSSDC fact sheets). Temperature never yields a test (weak evidence, §3), and dryness gives the life-detection test only for Mars.
5. **B8 — output.** Validated against `pipeline/schema.py`; past landings get no analogs (the app hides the button).

## Result: 24 Earth training areas

Weighted total, 0–100, in brackets.

| Candidate | 1 | 2 | 3 |
|---|---|---|---|
| Mars A — Southern Utopia Planitia | Basalt plains — Lut Desert, Iran (79) † | Basalt plains — Sahara, Algeria (79) | Basalt plains — Gobi Desert, China (77) |
| Mars B — Northern Elysium Planitia | Basalt plains — Al Harüj al Aswad, Libya (81) | Basalt plains — Arabian Peninsula, Saudi Arabia (80) | Basalt plains — Syrian Desert, Saudi Arabia (80) |
| Mars C — Western Isidis Planitia | Basalt plains — Plateau of Tibet, China (88) | Basalt plains — Mongolian Plateau, Mongolia (84) | Basalt plains — Groot Karasberge, Namibia (82) |
| Mars D — Chryse–Acidalia plains | Sedimentary plains — Gobi Desert, China (84) | Sedimentary plains — Rigestan, Afghanistan (78) | Sedimentary plains — Garagum Desert, Turkmenistan (77) |
| Mars E — Eastern Meridiani Planum | Sandstone plains — Desierto de Atacama, Chile (88) † | Sandstone plains — Qaidam Basin, China (86) † | Sandstone plains — Tian Shan, China (84) |
| Moon A — de Gerlache rim ridge | Sandstone mountains — Taymyr Peninsula, Russia (57) | Metamorphic hills — Baffin Island, Canada (50) | Gabbro and anorthosite hills — Plateau of Tibet, China (49) |
| Moon B — Shackleton–de Gerlache ridge | Volcanic mountains — Chukchi Range, Russia (62) | Gabbro and anorthosite mountains — Cordillera Occidental, Peru (54) | Sedimentary hills — Queen Elizabeth Islands, Canada (47) |
| Moon C — Cabeus–Malapert ridge | Gabbro and anorthosite plains — Victoria Island, Canada (61) | Gabbro and anorthosite mountains, Greenland (57) | Basalt hills — Central Siberian Plateau, Russia (51) |

† In the named region of a published analog (Lut Desert, 302 km from the listed point; Atacama, 139 km from Yungay; Qaidam Basin, 284 km from Dalangtan playa). The report says so and links the source. The other **21 are new places**.

What the numbers say:

- **Mars totals are 77–88, Moon totals 47–62.** Earth has dry, bare, flat ground of the right rock; it has nothing like a lunar polar ridge. The reports show this dimension by dimension.
- **Two Moon areas are nowhere near a pole** (Plateau of Tibet at 35° N, the Peruvian Andes at 12° S). They are there for the rock (gabbro and anorthosite) and, in Peru, the slopes (median 13.5° against 13.1° on the ridge); their "Low Sun" score is 0 and the report lists it under "different". No place we found has the rock, the slopes and the low Sun together.

### Looked at from orbit

Every one of the 24 was checked on its Sentinel-2 close-up (25 km) and a 200 km view on 15 Nov: all are on land and bare. What the pictures add to the numbers:

- **Mars A2 (Sahara, Algeria) and A3 (Gobi)** are mapped as basalt on the 0.5° rock map, but the 25 km box is mostly pale sand and gravel with dark volcanic outcrops. Their brightness scores (47 and 56) are the lowest of the basalt areas for that reason.
- **Mars D2 (Rigestan) and D3 (Garagum)** are sand seas, brighter than the dark Chryse plains (albedo 0.27 against 0.14): brightness scores 34, listed under "different".
- **Mars B1–B3** are dark lava fields (Al Harüj, and two harrats in Saudi Arabia) and look the part.
- **Moon B3 (Queen Elizabeth Islands)** is snow-covered in the cloud-free mosaic; MODIS land cover gives 5 % permanent ice there, so the snow is seasonal.

## Validation (B6)

- **Global (B3, climate only):** published Mars analogs rank in the top 1.6 % of Earth's land — Qaidam and the Puna plateau (top 0.1 %), Atacama (0.3 %), McMurdo Dry Valleys (1.0 %), Lut (1.1 %), Ladakh (1.3 %), Namib (1.6 %). Haughton crater ranks in the top 0.4 % for the lunar pole. The method was never told these places exist.
- **Three of the 15 Mars areas fell inside published analog regions** (Lut, Atacama, Qaidam) on their own — the † rows above.
- **Per candidate (B4), the published spots themselves rank in the middle or lower half of the pool**, which now holds the ~140 best cells on Earth: Qaidam (Dalangtan), Atacama (Yungay) and Namib (Gobabeb) are 60th–65th of 133 for Mars E, 71st–80th of 143 for C and 95th–99th of 143 for A and B. They lose on rock type — GLiM maps all three cells as loose sediment, which is a partial match for sandstone and a mismatch for basalt — and Yungay's and Dalangtan's own boxes are rougher than the zones (median slope 1.2° and 2.0° against 0.1–0.7°). Our Atacama and Qaidam areas are flatter sandstone ground in the same deserts.
- **Haughton for the Moon ranks 58th of 131**: an impact crater in sedimentary and carbonate rock on flat ground (terrain 4, rock 15), not the steep anorthosite-family crust of the south pole. Terrain and rock separate it, as they should.
- **McMurdo Dry Valleys get no total for Mars**: there is no snow-free albedo that far south, and a missing score is not filled in.
- **Lake Salda for Jezero: not reproduced.** Salda's analogy is mineral (carbonates) and setting (a lake with a delta); our global data has no carbonate or delta layer. We don't claim to find it.

## Limits (for the Limitations page)

- **Rock type is coarse.** GLiM is 0.5° (about 50 km) and its classes are broad: "basic plutonic" includes anorthosite but also gabbro and dolerite, and a cell mapped as basalt can be mostly sand at the surface (Mars A2, A3). On the planet side the Mars rock class follows the mapped USGS unit; turning a unit into a rock ("volcanic → basalt", "transition unit → mixed sediments") is still our step. Confidence: low.
- **Water history (Mars) is not scored** — no global, comparable data for lakes, deltas or hydrated minerals.
- **Lunar terrain matches are weak.** The polar ridges have median slopes of 10–13° over 480 m; most cold, dry, bare places on Earth are far smoother. The reports say so under "different".
- **Mars looks smoother than it is at 463 m**: MOLA is interpolated between orbit tracks at that scale, so the real ground has more small-scale slope than the map. Terrain scores for Mars lean high.
- **Brightness is broadband albedo, not colour or mineralogy.** A dark limestone gravel plain and a basalt plain score the same.
- **Thin air is a ranking aid, not a likeness.** The highest area (5,094 m, Plateau of Tibet) has about 55 % of sea-level pressure; Mars has under 1 %.
- **Earth can't reproduce** reduced gravity, the lunar vacuum, the thin Martian atmosphere, the Moon's surface temperature swing (about 300 K at the equator) or space radiation — every report has a line saying so.
- Names are descriptive (rock label + landform + region); Kmar can replace them with sourced place names. "Tian Shan" for Mars E3 is the Natural Earth region; the box lies in the desert basin south of the range.

## Re-running

```bash
pipeline/.venv/Scripts/python pipeline/fetch_earth.py     # once: MODIS, GPM (Earthdata Login in .env)
pipeline/.venv/Scripts/python pipeline/earth_pool.py      # ~3 min
pipeline/.venv/Scripts/python pipeline/earth_ranking.py   # ~3 min, reads Copernicus DEM over the network
pipeline/.venv/Scripts/python pipeline/build_analogs.py
pipeline/.venv/Scripts/python pipeline/audit.py           # expect 0 FAIL
```

Downloads: ~4 GB of MODIS/GPM into `data/raw/earth/` (Earthdata Login with the GES DISC app authorised), GLiM (38 kB), Natural Earth (~7 MB), the USGS Mars geologic map GIS files (`data/raw/mars/sim3292`, only for the audit's lookup) and the LOLA 240 m polar elevation grid (29 MB, fetched by `earth_ranking.py`); Copernicus DEM windows are read remotely.

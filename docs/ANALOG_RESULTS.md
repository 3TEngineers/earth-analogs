# Earth training areas (B3–B8)

How we found three Earth training areas for each of our 7 candidate sites, and how far the result can be trusted. Produced by `pipeline/earth_pool.py` (B3), `pipeline/earth_ranking.py` (B4) and `pipeline/build_analogs.py` (B5, B7, B8) on 2026-11-14. The app reads the result from `app/public/data/analogs.json` (`mock: false`).

## Method

1. **B3 — global pass.** Earth's land on a 0.25° grid, from 2023 NASA data: rainfall (GPM IMERG), vegetation (MODIS NDVI), day–night and mean surface temperature (MODIS LST), ice and bare ground (MODIS land cover; ice sheets removed, the Dry Valleys kept). A Mars-like climate score (dry, bare, big day–night swing, cold) and a Moon-pole-like score (dry, bare, polar low Sun, frozen ground). Pool per body: the 40 best cells ≥ 300 km apart, plus every known analog from `KNOWN_ANALOGS.md`.
2. **B4 — per candidate.**
   - **Terrain:** the slope distribution over ~25 km around the candidate (Mars: MOLA 463 m; Moon: LOLA 240 m slope map) against the same distribution on Earth from the Copernicus DEM, **resampled to the same pixel size**, compared with the Wasserstein distance.
   - **Rock type:** the candidate's expected rock family (our reading of its geology, not a mapped unit) against the global lithological map GLiM (Hartmann & Moosdorf 2012, 0.5°). Because B3's pools are climate-only and held almost no basalt or anorthosite-family rock, B4 adds, per expected rock class, the 15 best-climate Earth cells **of that class**.
   - Dryness and temperature (and for the Moon low Sun and frozen ground) from B3.
   - Weighted total. Mars: terrain 30 %, rock 25 %, dryness 25 %, temperature 20 %. Moon: terrain 25 %, rock 25 %, low Sun 20 %, frozen ground 15 %, dryness 10 %, temperature 5 %.
3. **B5 — pick 3.** Candidates take turns (round-robin) choosing their best remaining place; a candidate's three places are ≥ 500 km apart, and a place given to one candidate is closed (300 km) to the other candidates on the same body, so the seven reports don't repeat the same places. At least one place per candidate must be new (no known analog within 50 km). Names: rock label + the most specific Natural Earth region, plus the country — descriptive on purpose; we don't invent exact place names we can't check.
4. **B7 — text.** Score ≥ 70 → a "similar" sentence and a test from `KNOWN_ANALOGS.md` §3 (with where it has been done before); score ≤ 40 → a "different" sentence. Temperature never yields a test (weak evidence, §3).
5. **B8 — output.** Validated against `pipeline/schema.py`; past landings get no analogs (the app hides the button).

## Result: 21 Earth training areas

| Candidate | 1 | 2 | 3 |
|---|---|---|---|
| Mars A — Southern Elysium Planitia | Basalt plains — Sahara, Libya (86) | Basalt plains — Sahara, Chad (85) | Basalt plains — Ahaggar Mts., Algeria (79) |
| Mars B — Chryse–Acidalia plains | Sedimentary plains — Plateau du Tademaït, Algeria (87) | Sedimentary plains — Libyan Desert, Egypt (85) | Sedimentary plains — Tian Shan, China (85) |
| Mars C — Margaritifer Terra lowland | Sedimentary plains — Altun Mts., China (88) | Sedimentary plains — Kunlun Mountains, China (86) | Sedimentary plains — Sahara, Libya (86) |
| Mars D — Western Amazonis Planitia | Basalt plains — Al Harūj al Aswad, Libya (85) | Basalt plains — Lut Desert, Iran (82) | Basalt plains — Tibesti Mts., Chad (70) |
| Moon A — de Gerlache rim ridge | Gabbro/anorthosite ground — Ellesmere Island, Canada (69) | Gabbro/anorthosite ground — Qeqertarsuaq, Greenland (59) | Barren ground — Queen Elizabeth Islands, Canada (55) |
| Moon B — Shackleton–de Gerlache ridge | Gabbro/anorthosite ground — Franz Josef Land, Russia (66) | Metamorphic ground — Queen Maud Mountains, Antarctica (60) | Barren ground — Peary Land, Greenland (57) |
| Moon C — Cabeus–Malapert ridge | Gabbro/anorthosite ground — Severnaya Zemlya, Russia (64) | Gabbro/anorthosite ground — Victoria Island, Canada (58) | Barren ground — King Frederik VIII Land, Greenland (55) |

All 21 are **new candidates** (no published analog within 50 km). Scores are the weighted total, 0–100.

## Validation (B6)

- **Global (B3, climate only):** published Mars analogs rank in the top 1 % of Earth's land — McMurdo Dry Valleys and Qaidam (top 0.0 %), Atacama (0.3 %), Lut and Namib (0.9 %). Haughton crater ranks in the top 0.6 % for the lunar pole.
- **Per candidate (B4):** the pools are already the world's best climate matches, so this is a much harder test. Qaidam still ranks **10th–17th of ~75** for every Mars candidate; Haughton **14th of 73** for Mars C.
- **Haughton for the Moon ranks ~42nd of 68**: it is an impact crater in sedimentary and carbonate rock, not the anorthosite-family crust of the lunar south pole — the rock-type dimension separates it, as it should.
- **Lake Salda for Jezero: not reproduced.** Salda's analogy is mineral (carbonates) and setting (a lake with a delta); our global data has no carbonate or delta layer, so Salda ranks low on climate. We don't claim to find it.

## Limits (for the Limitations page)

- **Rock type is coarse and partly assumed.** GLiM is 0.5° and its "basic plutonic" class includes anorthosite but also gabbro and dolerite; the planet-side rock family is our reading of the site's geology. Confidence: low.
- **Water history (Mars) is not scored** — no global, comparable data for lakes, deltas or hydrated minerals.
- **Lunar terrain matches are weak (terrain scores 1–24):** the polar ridges have median slopes of 11–13° at 240 m; the polar Earth places are smoother at that scale. The reports say so under "different".
- **Earth can't reproduce** reduced gravity, the lunar vacuum, the thin Martian atmosphere, the Moon's ~300 °C day–night swing or space radiation — every report lists these.
- Names are descriptive (rock label + region); Kmar can replace them with sourced place names.

## Re-running

```bash
pipeline/.venv/Scripts/python pipeline/earth_pool.py
pipeline/.venv/Scripts/python pipeline/earth_ranking.py
pipeline/.venv/Scripts/python pipeline/build_analogs.py
```

Downloads: ~2.5 GB of MODIS/GPM into `data/raw/earth/` (Earthdata Login with the GES DISC app authorised), GLiM (38 kB) and Natural Earth (~7 MB); Copernicus DEM windows are read remotely.

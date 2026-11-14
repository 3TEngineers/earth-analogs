"""B5 + B7 + B8: pick 3 Earth training areas per candidate, write the report text, save analogs.json.

B5  from data/interim/earth_rankings.json (earth_ranking.py): best 3 per candidate, > 500 km apart,
    at least one new (not a known analog within 50 km, docs/KNOWN_ANALOGS.md §1-2), named with
    Natural Earth regions and countries, scores as 0-100 with a confidence.
B7  fixed rules: score >= 70 -> "similar" bullet and a test (docs/KNOWN_ANALOGS.md §3 wording),
    score <= 40 -> "different" bullet.
B8  validate with pipeline/schema.py and write app/public/data/analogs.json. Past landings get no
    analogs (allowed by the contract; the app hides the button).

Run after earth_ranking.py:
    pipeline/.venv/Scripts/python pipeline/build_analogs.py
"""

import json
import re
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
from shapely.geometry import Point

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from earth_ranking import EXPECTED_ROCK, GLIM_NAMES  # noqa: E402
from schema import AnalogsFile  # noqa: E402

DATA = ROOT / "app" / "public" / "data"
INTERIM = ROOT / "data" / "interim"
NE = ROOT / "data" / "raw" / "earth" / "naturalearth"

MIN_ANALOG_KM_APART = 500.0  # ours: three clearly different places
MIN_KM_FROM_OTHER_CANDIDATES = 300.0  # ours: an Earth place serves one candidate per body, so the
# seven reports don't show the same three places; candidates take turns (round-robin) to stay fair
KNOWN_MATCH_KM = 50.0  # KNOWN_ANALOGS.md: coordinates are often proxies
SIMILAR, DIFFERENT = 70, 40

DIMENSIONS = [
    {"id": "terrain", "label": "Terrain", "bodies": ["moon", "mars"],
     "description": "Slope distribution over ~25 km at the same pixel size (MOLA 463 m / LOLA 240 m vs Copernicus DEM)"},
    {"id": "mineralogy", "label": "Rock type", "bodies": ["moon", "mars"],
     "description": "Expected rock family at the site vs the global lithological map GLiM on Earth"},
    {"id": "water_history", "label": "Water history", "bodies": ["mars"],
     "description": "Lake, delta and river deposits — no global data we could compare, so not scored"},
    {"id": "aridity", "label": "Dryness", "bodies": ["moon", "mars"],
     "description": "Rainfall (GPM IMERG) and bare ground (MODIS NDVI and land cover)"},
    {"id": "temperature", "label": "Temperature", "bodies": ["moon", "mars"],
     "description": "Day-night surface temperature swing and cold (MODIS land surface temperature)"},
    {"id": "sun_angle", "label": "Low Sun", "bodies": ["moon"], "description": "How low the Sun stays (latitude)"},
    {"id": "ice", "label": "Frozen ground", "bodies": ["moon"],
     "description": "Mean surface temperature below freezing (MODIS) as a permafrost proxy"},
]
CONFIDENCE = {"terrain": "high", "mineralogy": "low", "water_history": "low", "aridity": "high",
              "temperature": "medium", "sun_angle": "high", "ice": "medium"}
DATA_SOURCES = {
    "mars": ["https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"],
    "moon": ["https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"],
    "earth": ["https://registry.opendata.aws/copernicus-dem/",
              "https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergm-07",
              "https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061",
              "https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061",
              "https://doi.pangaea.de/10.1594/PANGAEA.788537"],
}
ALWAYS_DIFFERENT = {  # NASA NSSDC fact sheets: Mars 6.36 mb surface pressure, 3.71 m/s2; Moon 1.62 m/s2
    "mars": "Mars itself differs from every Earth site: under 1 % of Earth's air pressure (mostly CO₂), "
            "0.38 g gravity and no global magnetic field to block radiation",
    "moon": "The Moon itself differs from every Earth site: no air at all, 0.17 g gravity "
            "and no global magnetic field to block radiation",
}
FACT_SHEETS = {"mars": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
               "moon": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html"}
PROCESSES = {"vb": "Basaltic lava flows", "py": "Volcanic ash and cinder", "pb": "Mafic plutonic crust",
             "mt": "Metamorphosed crust", "su": "Loose sediments and dunes", "ss": "Sedimentary layers",
             "sm": "Mixed sedimentary layers", "sc": "Carbonate rocks", "ev": "Salt and evaporite deposits"}


def great_circle_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return float(2 * 6371.0 * np.arcsin(np.sqrt(np.clip(a, 0, 1))))


def known_analogs() -> dict[str, list[dict]]:
    """Known analogs with a source URL, from docs/KNOWN_ANALOGS.md."""
    text = (ROOT / "docs" / "KNOWN_ANALOGS.md").read_text(encoding="utf-8").replace("−", "-")
    urls = {m.group(1): m.group(2) for m in re.finditer(r"^- \[(\w+)\].*?(https?://\S+)", text, re.M)}
    out: dict[str, list[dict]] = {"moon": [], "mars": []}
    body = None
    for line in text.splitlines():
        body = "moon" if line.startswith("## 1.") else "mars" if line.startswith("## 2.") else \
            (None if line.startswith("## ") else body)
        if not (body and line.startswith("|")):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        match = re.search(r"(-?\d+\.\d+),\s*(-?\d+\.\d+)", cells[3]) if len(cells) > 3 else None
        if match:
            refs = re.findall(r"\[(\w+)\]", cells[-1])
            out[body].append({"name": cells[1], "country": cells[2], "lat": float(match.group(1)),
                              "lon": float(match.group(2)), "ref": next((urls[r] for r in refs if r in urls), None)})
    return out


def test_mapping() -> dict[str, tuple[str, str]]:
    """Strong dimension -> (wording, real examples) from docs/KNOWN_ANALOGS.md §3."""
    text = (ROOT / "docs" / "KNOWN_ANALOGS.md").read_text(encoding="utf-8")
    section = text.split("## 3.")[1].split("##")[0]
    keys = {"Terrain": "terrain", "Mineralogy": "mineralogy", "Water history": "water_history",
            "Aridity": "aridity", "Temperature": "temperature", "Sun angle": "sun_angle", "Ice": "ice"}
    out = {}
    for line in section.splitlines():
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) >= 3:
            for label, key in keys.items():
                if cells[0].strip("* ").startswith(label):
                    examples = re.sub(r"\s*\[\w+\]", "", cells[2]).strip()
                    out[key] = (cells[1], examples)
    return out


ROCK_LABEL = {"vb": "Basalt plains", "py": "Volcanic ground", "pb": "Gabbro and anorthosite ground",
              "mt": "Metamorphic ground", "sm": "Sedimentary plains", "su": "Sediment plains",
              "ss": "Sedimentary plains", "sc": "Carbonate ground", "ev": "Salt flats"}


class Namer:
    """Descriptive name: rock label + the most specific Natural Earth region, and the country.

    Natural Earth's named points are too sparse to name the exact spot, and we don't invent place
    names we can't check — Kmar can replace these with sourced names (K2).
    """

    def __init__(self):
        self.regions = gpd.read_file(f"zip://{NE / 'regions.zip'}")
        self.regions = self.regions[~self.regions["FEATURECLA"].isin(["Continent"])]
        self.countries = gpd.read_file(f"zip://{NE / 'countries.zip'}")

    @staticmethod
    def _title(name: str) -> str:
        if not name.isupper():
            return name
        return " ".join(w.capitalize() if w not in ("OF", "AND") else w.lower() for w in name.split())

    def __call__(self, lat: float, lon: float, rock: str | None) -> tuple[str, str]:
        point = Point(lon, lat)
        countries = self.countries[self.countries.contains(point)]
        if countries.empty:  # small islands fall between polygons: nearest country within ~1 degree
            distance = self.countries.geometry.distance(point)
            countries = self.countries[distance <= 1.0].assign(d=distance).sort_values("d")
        country = next(iter(countries["NAME"]), None)
        regions = self.regions[self.regions.contains(point)].sort_values("SCALERANK", ascending=False)
        if regions.empty:
            distance = self.regions.geometry.distance(point)
            regions = self.regions[distance <= 1.5].assign(d=distance).sort_values("d")
        region = next(iter(regions["NAME"]), None)
        label = ROCK_LABEL.get(rock or "", "Barren ground")
        if region and not (country and region.lower() == country.lower()):
            return f"{label} — {self._title(region)}", country or ""
        return label, country or ("Antarctica" if lat < -60 else "")


def sentence_for(dim: str, good: bool, entry: dict, rank: dict, body: str) -> str:
    planet = "Mars" if body == "mars" else "the Moon"
    expected_note = rank["expected_rock_note"]
    rock = entry.get("rock_name") or "unknown rock"
    pm, em = rank["planet_slope_median"], entry.get("earth_slope_median")
    mean_c = None if entry.get("mean_lst_k") is None else round(entry["mean_lst_k"] - 273.15)
    if dim == "terrain":
        return (f"Slopes match at the same scale (median {em}° here vs {pm}° at the site)" if good else
                f"Terrain is {'much flatter' if em is not None and em < pm else 'rougher'} than at the site "
                f"(median slope {em}° here vs {pm}°)")
    if dim == "mineralogy":
        return (f"Same rock family: {rock}, like the {expected_note}" if good else
                f"Different rock type: {rock}, not the {expected_note}")
    if dim == "aridity":
        return (f"Very dry and bare ({entry.get('precip_mm'):.0f} mm of rain a year, satellite estimate)" if good else
                f"Wetter or greener than {planet} ({entry.get('precip_mm'):.0f} mm of rain a year)")
    if dim == "temperature":
        return (f"Large day-night surface temperature swing ({entry.get('swing_k')} K)" if good else
                f"Mild day-night swing ({entry.get('swing_k')} K) — far from "
                + ("the Moon's ~300 K" if body == "moon" else "the up to ~100 K on Mars' surface (Curiosity REMS)"))
    if dim == "sun_angle":
        return (f"The Sun stays low all year at {abs(entry['lat']):.0f}° latitude, with long shadows" if good else
                "The Sun climbs much higher than at the lunar pole")
    if dim == "ice":
        return (f"Ground frozen most of the year (mean surface {mean_c} °C)" if good else
                f"No lasting frozen ground (mean surface {mean_c} °C)")
    return ""


def add_climate(e: dict, grid) -> None:
    """B4's rock-pool cells carry only scores; fill the raw values the sentences quote from B3's grid."""
    r, c = int((90 - e["lat"]) / 0.25), int((e["lon"] + 180) / 0.25)
    for key, digits in (("precip_mm", 0), ("swing_k", 1), ("mean_lst_k", 1)):
        if e.get(key) is None:
            v = float(grid[key][r, c])
            e[key] = round(v, digits) if np.isfinite(v) else None


def candidate_entries(rank: dict, known: list[dict]) -> list[dict]:
    seen, entries = set(), []
    for e in rank["ranked"]:  # dedupe: a cell can be in both the climate and the rock pool
        key = (round(e["lat"], 2), round(e["lon"], 2))
        if e["total"] is not None and key not in seen:
            seen.add(key)
            entries.append(e)
    for e in entries:
        near = min(known, key=lambda k: great_circle_km(e["lat"], e["lon"], k["lat"], k["lon"]))
        e["known_match"] = near if great_circle_km(e["lat"], e["lon"], near["lat"], near["lon"]) <= KNOWN_MATCH_KM else None
    return entries


def pick_round_robin(sites: list[dict], rankings: dict, known: dict) -> dict[str, list[dict]]:
    """Each candidate takes its best remaining place in turn; places are not shared within a body."""
    entries = {s["id"]: candidate_entries(rankings[s["id"]], known[s["body"]]) for s in sites}
    picks: dict[str, list[dict]] = {s["id"]: [] for s in sites}
    for _ in range(3):
        for s in sites:
            taken = [(p, sid) for sid, ps in picks.items() for p in ps
                     if sid != s["id"] and next(x for x in sites if x["id"] == sid)["body"] == s["body"]]
            for e in entries[s["id"]]:
                if any(e is p for p in picks[s["id"]]):
                    continue
                if any(great_circle_km(e["lat"], e["lon"], p["lat"], p["lon"]) < MIN_ANALOG_KM_APART for p in picks[s["id"]]):
                    continue
                if any(great_circle_km(e["lat"], e["lon"], p["lat"], p["lon"]) < MIN_KM_FROM_OTHER_CANDIDATES for p, _ in taken):
                    continue
                picks[s["id"]].append(e)
                break
    for s in sites:  # contract: at least one new candidate per site
        ps = picks[s["id"]]
        if ps and all(p["known_match"] for p in ps):
            new = next((e for e in entries[s["id"]] if not e["known_match"] and all(
                great_circle_km(e["lat"], e["lon"], p["lat"], p["lon"]) >= MIN_ANALOG_KM_APART for p in ps[:2])), None)
            if new:
                ps[2] = new
    return picks


def build_for(site: dict, rank: dict, picks: list[dict], tests: dict, namer: Namer) -> list[dict]:
    body = site["body"]
    dims = [d["id"] for d in DIMENSIONS if body in d["bodies"]]
    analogs = []
    for rank_no, e in enumerate(picks, start=1):
        k = e["known_match"]
        region, country = namer(e["lat"], e["lon"], e.get("rock"))
        name = k["name"] if k else region
        scores = {}
        for d in dims:
            raw = e["scores"].get(d)
            scores[d] = {"score": None if raw is None else round(100 * raw), "confidence": CONFIDENCE[d],
                         "note": "No global data we could compare" if raw is None else ""}
        scores["terrain"]["note"] = f"Earth median slope {e.get('earth_slope_median')}°, site {rank['planet_slope_median']}°"
        scores["mineralogy"]["note"] = f"Earth: {e.get('rock_name')} (GLiM). Site: {rank['expected_rock_note']} (our reading, not a mapped unit)"
        similar = [d for d in dims if scores[d]["score"] is not None and scores[d]["score"] >= SIMILAR]
        different = [d for d in dims if scores[d]["score"] is not None and scores[d]["score"] <= DIFFERENT]
        test_list = []
        for d in similar:
            if d == "temperature":  # temperature tests are weak evidence (KNOWN_ANALOGS §3)
                continue
            if d == "aridity" and body == "moon":  # the aridity tests are about life detection, a Mars goal
                continue
            if d in tests:
                wording, examples = tests[d]
                test_list.append({"title": wording, "detail": f"Done before at analog sites: {examples}"})
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]
        analogs.append({
            "id": f"{site['id']}-{slug}", "siteId": site["id"], "rank": rank_no, "name": name,
            "country": k["country"] if k else country, "lat": round(e["lat"], 3), "lon": round(e["lon"], 3),
            "radiusKm": 12.5, "known": bool(k), "knownRef": k["ref"] if k else None,
            "totalScore": round(100 * e["total"]), "scores": scores,
            "similarities": [sentence_for(d, True, e, rank, body) for d in similar],
            "differences": [sentence_for(d, False, e, rank, body) for d in different] + [ALWAYS_DIFFERENT[body]],
            "tests": test_list,
            "processes": [p for p in [PROCESSES.get(e.get("rock") or "")] if p],
            "image": None,
            "sources": ([k["ref"]] if k and k["ref"] else []) + DATA_SOURCES[body] + DATA_SOURCES["earth"] + [FACT_SHEETS[body]],
        })
    return analogs


def main() -> None:
    sites = json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]
    rankings = json.loads((INTERIM / "earth_rankings.json").read_text(encoding="utf-8"))
    known, tests, namer = known_analogs(), test_mapping(), Namer()
    candidates = [s for s in sites if s["status"] == "candidate"]
    picks = pick_round_robin(candidates, rankings, known)
    grid = np.load(INTERIM / "earth_grid.npz")
    for ps in picks.values():
        for e in ps:
            add_climate(e, grid)
    analogs = []
    for site in sites:
        if site["status"] == "candidate":
            built = build_for(site, rankings[site["id"]], picks[site["id"]], tests, namer)
            analogs += built
            print(f"\n{site['id']} ({site['name']}):")
            for a in built:
                tag = "known" if a["known"] else "NEW  "
                print(f"  {a['rank']}. {tag} {a['totalScore']:3d}  {a['name']}, {a['country']} ({a['lat']}, {a['lon']})"
                      f"  similar {len(a['similarities'])}, different {len(a['differences'])}, tests {len(a['tests'])}")
    out = {"version": 2, "mock": False, "dimensions": DIMENSIONS, "analogs": analogs}
    AnalogsFile.model_validate(out)
    (DATA / "analogs.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWrote {len(analogs)} analogs to {DATA / 'analogs.json'}")


if __name__ == "__main__":
    main()

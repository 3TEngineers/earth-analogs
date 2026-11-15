"""B5 + B7 + B8: pick 3 Earth training areas per candidate, write the report text, save analogs.json.

B5  from data/interim/earth_rankings.json (earth_ranking.py): 3 per candidate, > 500 km apart, only cells
    with every score, at least one new (not a known analog within 50 km, docs/KNOWN_ANALOGS.md §1-2), named
    with Natural Earth regions and countries, scores as 0-100 with a confidence. A place two candidates want
    goes to the one it fits better (pick_best_pairs).
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
from shapely.geometry import Point, box

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from earth_ranking import EXPECTED_ROCK, GLIM_NAMES  # noqa: E402
from schema import AnalogsFile  # noqa: E402

DATA = ROOT / "app" / "public" / "data"
INTERIM = ROOT / "data" / "interim"
NE = ROOT / "data" / "raw" / "earth" / "naturalearth"

MIN_ANALOG_KM_APART = 500.0  # ours: three clearly different places
MIN_KM_FROM_OTHER_CANDIDATES = 300.0  # ours: an Earth place serves one candidate per body, so the
# reports don't show the same three places
KNOWN_MATCH_KM = 50.0  # KNOWN_ANALOGS.md: coordinates are often proxies
# A place in the same named desert or basin as a published analog is not "new", even 200 km from the spot the
# paper used: Atacama and Qaidam are whole regions. Same Natural Earth region and within this distance (ours).
KNOWN_REGION_KM = 400.0
# What a training area must be, on top of B3's land mask (ours). Known analogs are ranked without these rules.
MAX_PICK_ICE_PCT = 25.0  # at least three quarters free of permanent snow and ice (MODIS land cover)
MAX_PICK_NDVI = 0.30  # bare or sparsely vegetated all year: green tundra is no stand-in for the Moon or Mars
MIN_PICK_LAND_SHARE = 0.90  # inland, measured on the Natural Earth 10 m coastline itself (not its raster)
# Moon: at most one of a site's three areas may lie outside the polar regions (ours). The low Sun is only a 20 %
# score, so a place with the right rock and slopes can win without it (the Tibetan Plateau, the Peruvian Andes);
# one such place shows that trade-off, but most of the list must have a low Sun.
MOON_POLAR_LAT = 60.0  # where the "Low Sun" score starts to rise above 0
MOON_MAX_NON_POLAR = 1
SIMILAR, DIFFERENT = 70, 40

DIMENSIONS = [
    {"id": "terrain", "label": "Terrain", "bodies": ["moon", "mars"],
     "description": "Slope distribution over ~25 km at the same pixel size (MOLA 463 m / LOLA 240 m vs Copernicus DEM)"},
    {"id": "mineralogy", "label": "Rock type", "bodies": ["moon", "mars"],
     "description": "Rock class of the unit mapped at the site (Mars: USGS geologic map SIM 3292; Moon: highland crust) "
                    "vs the global lithological map GLiM on Earth"},
    {"id": "water_history", "label": "Water history", "bodies": ["mars"],
     "description": "Lake, delta and river deposits — no global data we could compare, so not scored"},
    {"id": "aridity", "label": "Dryness", "bodies": ["moon", "mars"],
     "description": "Rainfall (GPM IMERG climatology 2000-2023) and bare ground (MODIS NDVI and land cover)"},
    {"id": "temperature", "label": "Temperature", "bodies": ["moon", "mars"],
     "description": "Day-night surface temperature swing and cold (MODIS land surface temperature)"},
    {"id": "albedo", "label": "Surface brightness", "bodies": ["mars"],
     "description": "Broadband albedo of the ground: MGS TES at the site vs MODIS (snow-free) on Earth. Dark rock and "
                    "gravel match Mars' plains; bright sand and salt do not"},
    {"id": "altitude", "label": "Thin air", "bodies": ["mars"],
     "description": "Elevation (Copernicus DEM): higher ground has thinner air and stronger UV. 5,000 m scores 100, "
                    "and even there the air is about 90 times denser than on Mars"},
    {"id": "sun_angle", "label": "Low Sun", "bodies": ["moon"], "description": "How low the Sun stays (latitude)"},
    {"id": "ice", "label": "Frozen ground", "bodies": ["moon"],
     "description": "Mean surface temperature below freezing (MODIS) as a permafrost proxy"},
]
CONFIDENCE = {"terrain": "high", "mineralogy": "low", "water_history": "low", "aridity": "high",
              "temperature": "medium", "albedo": "medium", "altitude": "high", "sun_angle": "high", "ice": "medium"}
DATA_SOURCES = {
    "mars": ["https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
             "https://pubs.usgs.gov/sim/3292/"],
    "moon": ["https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"],
    "earth": ["https://registry.opendata.aws/copernicus-dem/",
              "https://gpm.nasa.gov/data/imerg/precipitation-climatology",
              "https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod11c3-061",
              "https://www.earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061",
              "https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd43c3-061",
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


ROCK_LABEL = {"vb": "Basalt", "py": "Volcanic", "pb": "Gabbro and anorthosite", "mt": "Metamorphic",
              "sm": "Sedimentary", "su": "Loose-sediment", "ss": "Sandstone", "sc": "Carbonate", "ev": "Salt",
              "va": "Volcanic", "vi": "Volcanic", "pa": "Granite", "pi": "Plutonic"}


def landform(median_slope: float | None) -> str:
    """Word for the ground from its median slope at the comparison scale (ours): the name must not say "plains"
    about mountains, as the first version did."""
    if median_slope is None:
        return "ground"
    return "plains" if median_slope <= 1.5 else "hills" if median_slope <= 6 else "mountains"


class Namer:
    """Descriptive name: rock label + the most specific Natural Earth region, and the country.

    Natural Earth's named points are too sparse to name the exact spot, and we don't invent place
    names we can't check — Kmar can replace these with sourced names (K2).
    """

    def __init__(self):
        self.regions = gpd.read_file(f"zip://{NE / 'regions.zip'}")
        self.regions = self.regions[~self.regions["FEATURECLA"].isin(["Continent"])]
        self.countries = gpd.read_file(f"zip://{NE / 'countries.zip'}")
        self.land = self.countries.union_all()

    @staticmethod
    def _title(name: str) -> str:
        if not name.isupper():
            return name
        return " ".join(w.capitalize() if w not in ("OF", "AND", "DE") else w.lower() for w in name.split())

    def region_name(self, lat: float, lon: float) -> str | None:
        """Most specific Natural Earth region at the point, or the nearest one within ~1.5 degrees."""
        point = Point(lon, lat)
        regions = self.regions[self.regions.contains(point)].sort_values("SCALERANK", ascending=False)
        if regions.empty:
            distance = self.regions.geometry.distance(point)
            regions = self.regions[distance <= 1.5].assign(d=distance).sort_values("d")
        return next((n for n in regions["NAME"] if isinstance(n, str)), None)

    def __call__(self, lat: float, lon: float, rock: str | None, median_slope: float | None = None) -> tuple[str, str]:
        point = Point(lon, lat)
        countries = self.countries[self.countries.contains(point)]
        if countries.empty:  # small islands fall between polygons: nearest country within ~1 degree
            distance = self.countries.geometry.distance(point)
            countries = self.countries[distance <= 1.0].assign(d=distance).sort_values("d")
        country = next(iter(countries["NAME"]), None)
        region = self.region_name(lat, lon)
        label = f"{ROCK_LABEL.get(rock or '', 'Barren')} {landform(median_slope)}"
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
                + ("the airless Moon, whose surface swings by about 300 K at the equator" if body == "moon"
                   else "the up to ~100 K on Mars' surface (Curiosity REMS)"))
    if dim == "albedo":
        here, there = entry.get("albedo"), rank.get("site_albedo")
        return (f"Ground about as dark as at the site (albedo {here:.2f} here, {there:.2f} there)" if good else
                f"Ground much {'brighter' if here > there else 'darker'} than at the site (albedo {here:.2f} vs {there:.2f})")
    if dim == "altitude":
        elevation = entry.get("elevation_m") or 0
        pressure = round(100 * float(np.exp(-elevation / 8434.0)))  # scale height of Earth's lower atmosphere
        return (f"High ground at {elevation:,} m: air pressure about {pressure} % of sea level, and stronger UV" if good else
                f"Low ground at {elevation:,} m: air about as thick as at sea level")
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


def ice_pct(e: dict, grid) -> float:
    r, c = int((90 - e["lat"]) / 0.25), int((e["lon"] + 180) / 0.25)
    return float(grid["snow_ice_pct"][r, c])


def ndvi_max(e: dict, grid) -> float:
    r, c = int((90 - e["lat"]) / 0.25), int((e["lon"] + 180) / 0.25)
    return float(np.nan_to_num(grid["ndvi_max"][r, c], nan=0.0))


def land_share(e: dict, land) -> float:
    """Share of the 0.25 deg cell that is land, from the coastline polygons."""
    cell = box(e["lon"] - 0.125, e["lat"] - 0.125, e["lon"] + 0.125, e["lat"] + 0.125)
    return cell.intersection(land).area / cell.area


def fit_to_train(e: dict, grid, land) -> bool:
    return (ice_pct(e, grid) < MAX_PICK_ICE_PCT and ndvi_max(e, grid) <= MAX_PICK_NDVI
            and land_share(e, land) >= MIN_PICK_LAND_SHARE)


GENERIC_WORDS = {"desert", "desierto", "basin", "plateau", "mountains", "mts", "range", "area", "near", "lake", "crater",
                 "island", "islands", "valley", "valleys", "station", "and", "the", "of", "de", "land", "plain", "plains"}


def key_words(name: str) -> set[str]:
    """Proper-name words of a place ("Qaidam Basin, Dalangtan playa" -> {qaidam, dalangtan, playa})."""
    return {w for w in re.findall(r"[a-zà-ÿ]{3,}", name.lower()) if w not in GENERIC_WORDS}


def candidate_entries(rank: dict, known: list[dict], grid, namer: "Namer") -> list[dict]:
    seen, entries = set(), []
    for e in rank["ranked"]:  # dedupe: a cell can be in both the climate and the rock pool
        key = (round(e["lat"], 2), round(e["lon"], 2))
        # "complete": every score exists, so missing data never helps a place (earth_ranking.py)
        if e.get("complete") and key not in seen and fit_to_train(e, grid, namer.land):
            seen.add(key)
            entries.append(e)
    for k in known:
        if "region" not in k:
            k["region"] = namer.region_name(k["lat"], k["lon"])
    for e in entries:
        near = min(known, key=lambda k: great_circle_km(e["lat"], e["lon"], k["lat"], k["lon"]))
        e["known_match"] = near if great_circle_km(e["lat"], e["lon"], near["lat"], near["lon"]) <= KNOWN_MATCH_KM else None
        e["known_region"] = None
        if e["known_match"] is None:
            region = namer.region_name(e["lat"], e["lon"])
            same = [(great_circle_km(e["lat"], e["lon"], k["lat"], k["lon"]), k) for k in known
                    if region and (k["region"] == region or key_words(k["name"]) & key_words(region))]
            same = [(d, k) for d, k in same if d <= KNOWN_REGION_KM]
            if same:
                d, k = min(same, key=lambda item: item[0])
                e["known_region"] = {**k, "km": round(d)}
    return entries


def pick_best_pairs(sites: list[dict], rankings: dict, known: dict, grid, namer: "Namer") -> dict[str, list[dict]]:
    """Three rounds; in each, every candidate gets one place, and places are not shared within a body.

    Within a round the (candidate, place) pair with the highest score is settled first, so a place that two
    candidates want goes to the one it fits better. (The first version let candidates choose in list order,
    which gave the first one the best places whether or not they fitted it best.) A Moon site takes at most
    MOON_MAX_NON_POLAR place below MOON_POLAR_LAT.
    """
    entries = {s["id"]: candidate_entries(rankings[s["id"]], known[s["body"]], grid, namer) for s in sites}
    body = {s["id"]: s["body"] for s in sites}
    picks: dict[str, list[dict]] = {s["id"]: [] for s in sites}

    def allowed(sid: str, e: dict) -> bool:
        if any(great_circle_km(e["lat"], e["lon"], p["lat"], p["lon"]) < MIN_ANALOG_KM_APART for p in picks[sid]):
            return False
        if body[sid] == "moon" and abs(e["lat"]) < MOON_POLAR_LAT and \
                sum(abs(p["lat"]) < MOON_POLAR_LAT for p in picks[sid]) >= MOON_MAX_NON_POLAR:
            return False
        return not any(great_circle_km(e["lat"], e["lon"], p["lat"], p["lon"]) < MIN_KM_FROM_OTHER_CANDIDATES
                       for other, ps in picks.items() if other != sid and body[other] == body[sid] for p in ps)

    for _ in range(3):
        waiting = [s["id"] for s in sites]
        while waiting:
            offers = [(sid, next((e for e in entries[sid] if allowed(sid, e)), None)) for sid in waiting]
            offers = [(sid, e) for sid, e in offers if e is not None]
            if not offers:
                break
            sid, e = max(offers, key=lambda o: o[1]["total"])
            picks[sid].append(e)
            waiting.remove(sid)
    for s in sites:  # contract: at least one new candidate per site
        ps = picks[s["id"]]
        if ps and all(p["known_match"] or p["known_region"] for p in ps):
            new = next((e for e in entries[s["id"]] if not e["known_match"] and not e["known_region"] and all(
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
        in_region = e["known_region"]
        region, country = namer(e["lat"], e["lon"], e.get("rock"), e.get("earth_slope_median"))
        name = k["name"] if k else region
        scores = {}
        for d in dims:
            raw = e["scores"].get(d)
            scores[d] = {"score": None if raw is None else round(100 * raw), "confidence": CONFIDENCE[d],
                         "note": "No global data we could compare" if raw is None else ""}
        scores["terrain"]["note"] = f"Earth median slope {e.get('earth_slope_median')}°, site {rank['planet_slope_median']}°"
        scores["mineralogy"]["note"] = f"Earth: {e.get('rock_name')} (GLiM, 0.5° map). Site: {rank['expected_rock_note']}"
        if "albedo" in scores and e.get("albedo") is not None:
            scores["albedo"]["note"] = f"Earth {e['albedo']:.2f} (MODIS shortwave), site {rank['site_albedo']:.2f} (MGS TES)"
        if "altitude" in scores and e.get("elevation_m") is not None:
            scores["altitude"]["note"] = f"Mean elevation {e['elevation_m']:,} m"
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
            "radiusKm": 12.5, "known": bool(k or in_region), "knownRef": (k or in_region or {}).get("ref"),
            "knownName": k["name"] if k else f"{in_region['name']}, {in_region['km']} km away" if in_region else None,
            "totalScore": round(100 * e["total"]), "scores": scores,
            "similarities": [sentence_for(d, True, e, rank, body) for d in similar],
            "differences": [sentence_for(d, False, e, rank, body) for d in different] + [ALWAYS_DIFFERENT[body]],
            "tests": test_list,
            "processes": [p for p in [PROCESSES.get(e.get("rock") or "")] if p],
            "image": None,
            "sources": ([(k or in_region)["ref"]] if (k or in_region) and (k or in_region)["ref"] else [])
                       + DATA_SOURCES[body] + DATA_SOURCES["earth"] + [FACT_SHEETS[body]],
        })
    return analogs


def main() -> None:
    sites = json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]
    rankings = json.loads((INTERIM / "earth_rankings.json").read_text(encoding="utf-8"))
    known, tests, namer = known_analogs(), test_mapping(), Namer()
    candidates = [s for s in sites if s["status"] == "candidate"]
    grid = np.load(INTERIM / "earth_grid.npz")
    picks = pick_best_pairs(candidates, rankings, known, grid, namer)
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
                if a["knownName"] and a["knownName"] != a["name"]:
                    tag = "KNOWN REGION"
                print(f"  {a['rank']}. {tag} {a['totalScore']:3d}  {a['name']}, {a['country']} ({a['lat']}, {a['lon']})"
                      f"  similar {len(a['similarities'])}, different {len(a['differences'])}, tests {len(a['tests'])}")
    out = {"version": 3, "mock": False, "dimensions": DIMENSIONS, "analogs": analogs}
    AnalogsFile.model_validate(out)
    (DATA / "analogs.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWrote {len(analogs)} analogs to {DATA / 'analogs.json'}")


if __name__ == "__main__":
    main()

"""Write app/public/data/sites.json and landings.json from the B2 screening results.

Reads data/interim/mars_screening.json and moon_screening.json (run mars_screening.py and
moon_screening.py first) and adds the hand-written context below and in content/. Training areas in
analogs.json are kept only for sites that did not move; run earth_ranking.py and build_analogs.py
after this when a candidate changed.

Run from the repo root:
    pipeline/.venv/Scripts/python pipeline/build_sites.py
"""

import copy
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INTERIM = ROOT / "data" / "interim"
DATA = ROOT / "app" / "public" / "data"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from schema import AnalogsFile, LandingsFile, SitesFile  # noqa: E402

MOON_LIMITS = [
    "Earth's gravity is about 6 times the Moon's",
    "The Moon has no atmosphere; Earth sites cannot reproduce vacuum",
    "Permanently shadowed lunar craters reach far colder temperatures than anywhere on Earth",
]
MARS_LIMITS = [
    "Earth's gravity is about 2.6 times Mars gravity",
    "Mars air is about 100 times thinner and mostly CO2",
    "Surface radiation on Mars is far higher",
]

# Context for each candidate, in screening order (deepest inside safe ground first). Names follow the
# USGS Gazetteer feature each point lies in. Summaries are first drafts from the data; Kmar refines them.
MARS_CONTEXT = [
    ("mars-candidate-a", "Southern Utopia Planitia", ["Lowland plains deposits", "Wind erosion"],
     "Smooth lowland plains in the south of Utopia Planitia, about 900 km east of where China's Zhurong rover "
     "landed. The point deepest inside the largest safe area on Mars."),
    ("mars-candidate-b", "Northern Elysium Planitia", ["Volcanic plains", "Wind erosion"],
     "Lava plains in the north of Elysium Planitia, west of the Cerberus Fossae fractures and about 1,500 km "
     "from InSight's landing site."),
    ("mars-candidate-c", "Western Isidis Planitia", ["Impact basin fill", "Wind erosion"],
     "The flat floor of the Isidis impact basin, in its western part: about 500 km from Jezero crater, where "
     "Perseverance landed, and from the place where Beagle 2 came down in 2003."),
    ("mars-candidate-d", "Chryse-Acidalia plains", ["Outflow-channel deposits", "Wind erosion"],
     "Low plains on the boundary between Chryse and Acidalia Planitia, on the same meridian as "
     "ESA's Oxia Planum landing site about 600 km to the south."),
    ("mars-candidate-e", "Eastern Meridiani Planum", ["Layered sedimentary rock", "Wind erosion"],
     "The eastern part of Meridiani Planum, a little over 500 km east of where Opportunity landed and drove "
     "across the same plain."),
]
MOON_CONTEXT = [
    ("moon-candidate-a", "de Gerlache rim ridge", ["Impact cratering", "Cold trapping of volatiles in permanent shadow"],
     "A well-lit ridge on the rim of de Gerlache crater, about 16 km from the named feature of NASA's "
     "de Gerlache Rim 2 candidate region."),
    ("moon-candidate-b", "Shackleton-de Gerlache connecting ridge", ["Impact cratering", "Cold trapping of volatiles in permanent shadow"],
     "The ridge between Shackleton and de Gerlache craters, already known in the literature as one of the "
     "best-lit places at the south pole. Our screening found it independently."),
    ("moon-candidate-c", "Cabeus-Malapert ridge", ["Impact cratering", "Cold trapping of volatiles in permanent shadow"],
     "A ridge between the rim of Cabeus crater and Mons Malapert, outside NASA's candidate regions. Cabeus is "
     "where NASA's LCROSS impact found water ice in 2009; this spot is the best lit of our lunar candidates and "
     "keeps Earth in view most of the time."),
]
FINE_REFERENCE = "InSight 0.53 deg / 90 m, Viking 1 0.94 deg / 72 m, Spirit 1.49 deg / 297 m"

# Why each past mission went where it did, and why a rule it fails did not matter for it (sourced).
PAST = json.loads((Path(__file__).resolve().parent / "content" / "past_landings.json").read_text(encoding="utf-8"))

# "Why would a mission go there?" per candidate, with sources — written by Kmar in
# pipeline/content/purposes.json ({"mars-candidate-a": {"text": "...", "sources": ["https://..."]}, ...}).
PURPOSES = json.loads((Path(__file__).resolve().parent / "content" / "purposes.json").read_text(encoding="utf-8"))


# Past landings used for validation: one plain sentence each (the mock-era text carried a "MOCK." prefix).
VALIDATION_SUMMARY = {
    "chandrayaan-3": "India's 2023 lander, one of the landings closest to the lunar south pole, on old highland "
                     "terrain lit by a low Sun.",
    "curiosity": "NASA rover exploring the layered sediments of Mount Sharp inside Gale crater, a former lake basin.",
    "perseverance": "NASA rover exploring an ancient river delta in Jezero crater, searching for signs of past life "
                    "and caching samples.",
}


def clean(criteria: list[dict], why: dict[str, str] | None = None) -> list[dict]:
    """Make criteria valid JSON (infinite distances become null with pass false) and, for a past landing,
    attach why a failed rule did not matter for that mission."""
    out = []
    for c in criteria:
        c = dict(c)
        if isinstance(c["value"], float) and not math.isfinite(c["value"]):
            c["value"], c["pass"] = None, False
            c["rule"] += " — none found within 30 km"
        c["why"] = (why or {}).get(c["id"]) if c["pass"] is False else None
        out.append(c)
    return out


def past_site(old: dict, body: str, name: str, goal: str, criteria: list[dict], mission_rules: list[dict]) -> dict:
    """A past landing as a validation card: why the mission went there, our rules, its own rules."""
    info = PAST[body][name]
    site = copy.deepcopy(old)
    site["summary"] = VALIDATION_SUMMARY[site["id"]]
    site["purpose"] = {"text": info["purpose"], "sources": info["sources"]}
    crit = clean(criteria, info["why"])
    failed = [c["label"].lower() for c in crit if c["pass"] is False]
    if not failed:
        note = "Passes every one of our rules, as a place where a landing worked should."
    else:
        note = ("Fails " + " and ".join(failed) + ". That is not a fault of the site: the mission was built for a "
                "different job than the one our rules describe. The rule check gives the reason for each.")
    if mission_rules:
        ok = all(r["pass"] for r in mission_rules)
        note += (" Against the limits its own team set, it passes." if ok else
                 " Against the limits its own team set, our data disagrees — see the rule check.")
    site["selection"] = {"goal": goal, "role": "validation", "criteria": crit, "note": note,
                         "missionRules": [dict(r, why=None) for r in mission_rules]}
    return site


def candidate_site(ctx, result: dict, body: str, goal: str, note: str) -> dict:
    site_id, name, processes, summary = ctx
    return {
        "id": site_id, "body": body, "name": name, "mission": f"Our candidate: {goal.lower()}",
        "agency": "3TE", "year": None, "status": "candidate", "lat": result["lat"], "lon": result["lon"],
        "summary": summary, "processes": processes, "limits": MARS_LIMITS if body == "mars" else MOON_LIMITS,
        "image": None,
        "selection": {"goal": goal, "role": "candidate", "criteria": clean(result["criteria"]), "note": note,
                      "missionRules": []},
        "purpose": PURPOSES.get(site_id),
    }


def main() -> None:
    mars = json.loads((INTERIM / "mars_screening.json").read_text())
    moon = json.loads((INTERIM / "moon_screening.json").read_text())
    old_sites = {s["id"]: s for s in json.loads((DATA / "sites.json").read_text(encoding="utf-8"))["sites"]}

    sites = []
    for ctx, result in zip(MOON_CONTEXT, moon["candidates"]):
        if result["group"] == "best overall":
            note = (f"Passes all four criteria; among the best-lit spots at the pole. It sits next to NASA's "
                    f"{result['nearest_artemis']} region ({result['km_to_artemis_feature']} km from its named feature), "
                    "which cross-checks our method against NASA's own choice.")
        else:
            note = (f"Passes all four criteria, {result['km_to_artemis_feature']:.0f} km from the nearest NASA Artemis "
                    "feature: a proposal outside NASA's regions, inside the polar lighting zone (south of 84 S) and "
                    "at least as well lit as our candidates next to NASA's regions.")
        sites.append(candidate_site(ctx, result, "moon", "Permanent base site", note))

    sites.append(past_site(old_sites["chandrayaan-3"], "moon", "Chandrayaan-3", "Permanent base site",
                           moon["chandrayaan3"]["criteria"], []))

    for ctx, result in zip(MARS_CONTEXT, mars["candidates"]):
        fine = result["fine_463m"]
        note = (f"Passes every criterion inside a {result['safe_area_km2'] / 1000:.0f} thousand km2 safe area, "
                f"{result['interior_km']} km from its edge, and more than 500 km from any past landing. "
                f"Second look at 463 m: 95 % of slopes below {fine['slope_p95_deg']} deg, relief {fine['relief_m']} m "
                f"over 25 km (landings for comparison: {FINE_REFERENCE}).")
        sites.append(candidate_site(ctx, result, "mars", "Safe landing zone", note))

    for site_id, name in [("curiosity", "Curiosity"), ("perseverance", "Perseverance")]:
        check = next(v for v in mars["validation"] if v["name"] == name)
        site = past_site(old_sites[site_id], "mars", name, "Safe landing zone", check["criteria"], check["own_rules"])
        site["lat"], site["lon"] = check["lat"], check["lon"]
        sites.append(site)

    sites_file = {"version": 3, "mock": False, "sites": sites}
    SitesFile.model_validate(sites_file)
    (DATA / "sites.json").write_text(json.dumps(sites_file, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    import mars_screening
    import moon_screening
    landings = [{"name": name, "body": "mars", "agency": PAST["mars"][name]["agency"], "year": PAST["mars"][name]["year"],
                 "lat": lat, "lon": lon} for name, lat, lon, _ in mars_screening.LANDINGS]
    landings += [{"name": name, "body": "moon", "agency": PAST["moon"][name]["agency"], "year": PAST["moon"][name]["year"],
                  "lat": lat, "lon": lon}
                 for name, lat, lon in [("Chandrayaan-3", -69.373, 32.319)] + moon_screening.POLAR_LANDINGS]
    landings_file = {"version": 1, "landings": landings}
    LandingsFile.model_validate(landings_file)
    (DATA / "landings.json").write_text(json.dumps(landings_file, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Training areas belong to a place, not to an id. Keep the ones whose site is still where it was
    # (within 10 km), under the site's new id; drop the rest. A candidate left without training areas
    # needs earth_ranking.py and build_analogs.py to be run again.
    analogs = json.loads((DATA / "analogs.json").read_text(encoding="utf-8"))
    radius_km = {"mars": 3389.5, "moon": 1737.4}
    new_id_of = {}
    for old in old_sites.values():
        for site in sites:
            if site["body"] == old["body"] and site["status"] == old["status"] and great_circle_km(
                    old["lat"], old["lon"], site["lat"], site["lon"], radius_km[site["body"]]) <= 10.0:
                new_id_of[old["id"]] = site["id"]
    kept = []
    for a in analogs["analogs"]:
        if a["siteId"] in new_id_of:
            new_id = new_id_of[a["siteId"]]
            a = dict(a, id=a["id"].replace(a["siteId"], new_id, 1), siteId=new_id)
            kept.append(a)
    analogs["analogs"] = kept
    AnalogsFile.model_validate(analogs)
    (DATA / "analogs.json").write_text(json.dumps(analogs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    have = {a["siteId"] for a in kept}
    missing = [s["id"] for s in sites if s["status"] == "candidate" and s["id"] not in have]
    print(f"Wrote {len(sites)} sites, {len(landings)} landings; kept {len(kept)} training areas")
    if missing:
        print("NO TRAINING AREAS YET for: " + ", ".join(missing)
              + " -> run earth_ranking.py and build_analogs.py (they need data/interim/earth_pool.json and earth_grid.npz)")


def great_circle_km(lat1: float, lon1: float, lat2: float, lon2: float, radius_km: float) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    a = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(min(1.0, a)))


if __name__ == "__main__":
    main()

"""Write app/public/data/sites.json from the B2 screening results.

Reads data/interim/mars_screening.json and moon_screening.json (run mars_screening.py and
moon_screening.py first) and adds the hand-written context below. Analogs stay mock until
B5-B8, so this also re-keys the mock analogs to the new candidate ids to keep the app working.

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
from schema import AnalogsFile, SitesFile  # noqa: E402

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

# Context for each candidate, in screening order. Summaries are first drafts from the data;
# Kmar refines them in K2.
MARS_CONTEXT = [
    ("mars-candidate-a", "Southern Elysium Planitia", ["Volcanic plains", "Wind erosion"],
     "A wide, low, flat plain in southern Elysium Planitia, about 220 km from Avernus Colles. "
     "The most interior point of the largest safe area on Mars."),
    ("mars-candidate-b", "Chryse-Acidalia plains", ["Outflow-channel deposits", "Wind erosion"],
     "Low plains on the boundary between Chryse and Acidalia Planitia, on the same meridian as "
     "ESA's Oxia Planum landing site about 600 km to the south."),
    ("mars-candidate-c", "Margaritifer Terra lowland", ["Outflow channels", "Impact cratering"],
     "A low, smooth patch in Margaritifer Terra about 130 km from Arda Valles — the only large safe area "
     "in the southern hemisphere, and rougher than the other candidates at fine scale."),
    ("mars-candidate-d", "Western Amazonis Planitia", ["Volcanic plains", "Wind erosion"],
     "Smooth lowland plains in western Amazonis Planitia near Phlegra Dorsa, far from every past landing."),
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


def clean(criteria: list[dict]) -> list[dict]:
    """Make criteria valid JSON: infinite distances become null with pass false."""
    out = []
    for c in criteria:
        c = dict(c)
        if isinstance(c["value"], float) and not math.isfinite(c["value"]):
            c["value"], c["pass"] = None, False
            c["rule"] += " — no permanent shadow found within ~29 km"
        out.append(c)
    return out


def candidate_site(ctx, result: dict, body: str, goal: str, note: str) -> dict:
    site_id, name, processes, summary = ctx
    return {
        "id": site_id, "body": body, "name": name, "mission": f"Our candidate: {goal.lower()}",
        "agency": "3TE", "year": None, "status": "candidate", "lat": result["lat"], "lon": result["lon"],
        "summary": summary, "processes": processes, "limits": MARS_LIMITS if body == "mars" else MOON_LIMITS,
        "image": None,
        "selection": {"goal": goal, "role": "candidate", "criteria": clean(result["criteria"]), "note": note},
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

    ch3 = copy.deepcopy(old_sites["chandrayaan-3"])
    ch3["purpose"] = None
    ch3["summary"] = VALIDATION_SUMMARY["chandrayaan-3"]
    ch3["selection"] = {"goal": "Permanent base site", "role": "validation",
                        "criteria": clean(moon["chandrayaan3"]["criteria"]),
                        "note": "A good landing site — flat and always in view of Earth — but a normal day/night cycle "
                                "and no permanent shadow nearby: fine for a short mission, not for a permanent base."}
    sites.append(ch3)

    for ctx, result in zip(MARS_CONTEXT, mars["candidates"]):
        fine = result["fine_463m"]
        note = (f"Passes every criterion inside a {result['safe_area_km2'] / 1000:.0f} thousand km2 safe area, "
                f"{result['interior_km']} km from its edge, and more than 500 km from any past landing. "
                f"Second look at 463 m: 95 % of slopes below {fine['slope_p95_deg']} deg, relief {fine['relief_m']} m "
                f"over 25 km (landings for comparison: {FINE_REFERENCE}).")
        sites.append(candidate_site(ctx, result, "mars", "Safe landing zone", note))

    for site_id, name in [("curiosity", "Curiosity"), ("perseverance", "Perseverance")]:
        site = copy.deepcopy(old_sites[site_id])
        site["purpose"] = None
        site["summary"] = VALIDATION_SUMMARY[site_id]
        check = next(v for v in mars["validation"] if v["name"] == name)
        failed = [c["label"].lower() for c in check["criteria"] if c["pass"] is False]
        site["selection"] = {
            "goal": "Safe landing zone", "role": "validation", "criteria": check["criteria"],
            "note": ("Passes our criteria, as a past landing should." if not failed else
                     "Fails " + ", ".join(failed) + " at our ~4 km scale: the landing ellipse fit between Gale's "
                     "wall and Mount Sharp thanks to precision-guided entry, which km-scale maps can't see."),
        }
        sites.append(site)

    sites_file = {"version": 2, "mock": False, "sites": sites}
    SitesFile.model_validate(sites_file)
    (DATA / "sites.json").write_text(json.dumps(sites_file, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Keep the app working until real analogs land (B8): every candidate gets 3 mock analogs.
    analogs = json.loads((DATA / "analogs.json").read_text(encoding="utf-8"))
    site_ids = {s["id"] for s in sites}
    analogs["analogs"] = [a for a in analogs["analogs"] if a["siteId"] in site_ids]  # drop candidates that went away
    have = {a["siteId"] for a in analogs["analogs"]}
    for site in sites:
        new_id = site["id"]
        if new_id in have or site["status"] != "candidate":
            continue
        template = f"{site['body']}-candidate-a"
        for a in [a for a in analogs["analogs"] if a["siteId"] == template]:
            clone = copy.deepcopy(a)
            clone["siteId"] = new_id
            clone["id"] = a["id"].replace(template, new_id)
            analogs["analogs"].append(clone)
    AnalogsFile.model_validate(analogs)
    (DATA / "analogs.json").write_text(json.dumps(analogs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(sites)} sites and {len(analogs['analogs'])} mock analogs")


if __name__ == "__main__":
    main()

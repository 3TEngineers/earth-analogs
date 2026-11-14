# Data contract

The backend (`pipeline/`) writes these files; the frontend (`app/`) only reads them. Change the shape only by agreement, and update this file, `app/src/types/data.ts` and `pipeline/schema.py` in the same PR.

| File | Written by | Read by |
|---|---|---|
| `app/public/data/sites.json` | pipeline | app |
| `app/public/data/analogs.json` | pipeline | app |
| `app/public/data/landings.json` | pipeline (from sourced lists in `docs/`) | app |
| `app/public/images/sites/<siteId>.png` | pipeline | app |
| `app/public/images/analogs/<analogId>.png` | pipeline | app |

`sites.json` and `analogs.json` carry `"mock": true` until the real pipeline output replaces them (`sites.json` is real since B2; analogs are mock until B8).

## Additions on 2026-11-14 (team decision)

- **`site.purpose`** — *why a mission would go there*, for candidates: `{ "text": "...", "sources": ["https://..."] }`, or `null` until written. Kmar writes it in `pipeline/content/purposes.json` (keyed by site id, with sources); `build_sites.py` copies it into `sites.json`. Past landings have `null`.
- **`landings.json`** — every past landing as a **name-only marker** on the Moon and Mars globes: no card, no fly-to, no zoom, just the name (slightly larger than normal text). Shape:

  ```jsonc
  { "version": 1, "landings": [ { "name": "Viking 1", "body": "mars", "agency": "NASA", "year": 1976, "lat": 22.269, "lon": -47.951 } ] }
  ```

  Mars (all 11) comes from `docs/LANDING_CONSTRAINTS.md` §2. **Moon landings are still to be collected with sources.** The validation sites in `sites.json` (Chandrayaan-3, Curiosity, Perseverance) stay clickable as before; drawing them twice is the frontend's call.

## `sites.json`

```jsonc
{
  "version": 1,
  "mock": true,
  "sites": [
    {
      "id": "perseverance",              // kebab-case, unique
      "body": "mars",                    // "moon" | "mars"
      "name": "Perseverance (Jezero crater)",
      "mission": "Mars 2020",
      "agency": "NASA",
      "year": 2021,
      "status": "past",                  // "past" landing | "candidate" (future)
      "lat": 18.4447,                    // degrees, planetocentric, north positive
      "lon": 77.4508,                    // degrees, east positive, -180..180
      "summary": "Short paragraph about the mission and the site.",
      "processes": ["River delta sedimentation"],
      "limits": ["Gravity on Earth is about 2.6 times Mars gravity"],  // Earth can't reproduce these
      "image": "images/sites/perseverance.png",  // or null
      "selection": {
        "goal": "Safe landing zone",     // Mars: "Safe landing zone"; Moon: "Permanent base site"
        "role": "validation",            // "candidate" = a site we found; "validation" = a past landing checked against the same criteria
        "criteria": [
          {
            "id": "elevation",
            "label": "Elevation",
            "value": -2.6,               // or null when there is no data
            "unit": "km",
            "rule": "<= -1 km",          // human-readable threshold
            "pass": true,                // or null when there is no data
            "source": "MOLA DEM"
          }
        ],
        "note": "Why this site is on the list, in one or two sentences."
      }
    }
  ]
}
```

Criteria used (thresholds are set from published mission constraints during B2):

| Body | Goal | Criteria ids |
|---|---|---|
| Mars | Safe landing zone | `elevation`, `latitude`, `slope`, `thermal_inertia` |
| Moon | Permanent base site | `illumination`, `earth_visibility`, `slope`, `ice_distance` |

## `analogs.json`

```jsonc
{
  "version": 1,
  "mock": true,
  "dimensions": [
    { "id": "terrain", "label": "Terrain", "bodies": ["moon", "mars"], "description": "Slope and roughness distribution" }
  ],
  "analogs": [
    {
      "id": "perseverance-lake-salda",   // unique
      "siteId": "perseverance",          // must match a site id
      "rank": 1,                         // 1..3 within the site
      "name": "Lake Salda",
      "country": "Türkiye",
      "lat": 37.55,
      "lon": 29.68,
      "radiusKm": 10,                    // size of the analog spot
      "known": true,                     // true = already a known analog
      "knownRef": "https://...",         // source when known, else null
      "totalScore": 74,                  // 0..100, weighted
      "scores": {
        "terrain": { "score": 62, "confidence": "high", "note": "Copernicus DEM vs HRSC" }
        // one entry per dimension that applies to the site's body;
        // score is null when there is no data, confidence is "high" | "medium" | "low"
      },
      "similarities": ["Shares carbonate minerals with Jezero"],
      "differences": ["The lake still holds water"],
      "tests": [{ "title": "Sample selection rehearsal", "detail": "Why this site suits it." }],
      "processes": ["Delta sedimentation in an alkaline lake"],
      "image": "images/analogs/perseverance-lake-salda.png",   // or null
      "sources": ["https://..."]
    }
  ]
}
```

## Rules

- Coordinates are in degrees. Longitude is −180..180, east positive, on all three bodies.
- Every `candidate` site has exactly 3 analogs, ranks 1–3, from different regions, at least one with `"known": false`. A `past` site may have 0 or 3 analogs — the app hides "Show Earth analogs" when there are none.
- A `candidate` site passes all its criteria. A `past` site may fail some — that's the point of validation (e.g. a good short-mission site that's too far from the pole for a permanent base).
- `sites.json` version 2 added `selection`. Bump `version` whenever the shape changes.
- `similarities` come from scores ≥ 70, `differences` from scores ≤ 40 — the frontend shows them as given and does not recompute.
- Text is English and plain (no HTML or Markdown).

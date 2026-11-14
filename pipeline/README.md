# pipeline/

Python code that downloads and processes Earth, Moon and Mars data, screens candidate sites, scores Earth training areas and writes `app/public/data/*.json`. Owner: Sadık. Steps B0–B9: [`docs/PROJECT_PLAN.md`](../docs/PROJECT_PLAN.md).

## Setup (once)

Python 3.12.

```bash
python -m venv pipeline/.venv
pipeline/.venv/Scripts/python -m pip install -r pipeline/requirements.txt   # Windows
pipeline/.venv/bin/python -m pip install -r pipeline/requirements.txt       # macOS / Linux
```

## Files

| File | What it does |
|---|---|
| `schema.py` | Pydantic models for the output JSON — keep in sync with `docs/DATA_CONTRACT.md` |
| `check_access.py` | B1: reads a small window from every dataset and searches Earthdata; results recorded in `docs/DATA_SOURCES.md` |
| `requirements.txt` | Python dependencies |

Downloaded data goes to `data/raw/` (git-ignored).

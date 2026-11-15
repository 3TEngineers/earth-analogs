"""Download the Earth inputs of earth_pool.py into data/raw/earth/ (about 4 GB, skipped if already there).

  MOD11C3  MODIS/Terra land surface temperature, monthly, 0.05 deg   12 months of 2023
  MOD13C2  MODIS/Terra vegetation indices, monthly, 0.05 deg         12 months of 2023
  MCD12C1  MODIS land cover, yearly, 0.05 deg                        2023
  MCD43C3  MODIS albedo, daily (16-day window), 0.05 deg             15 Jan, 15 Apr, 15 Jul, 15 Oct 2023
  GPM_3IMERGM  GPM IMERG Final precipitation, monthly, 0.1 deg       12 months of 2023

Needs a NASA Earthdata Login in ~/_netrc (earthaccess.login(strategy="interactive", persist=True) once, in your
own terminal) and, for IMERG, the "NASA GESDISC DATA ARCHIVE" application authorised in the Earthdata profile.
GLiM and Natural Earth are small and fetched by hand (see docs/DATA_SOURCES.md).

    pipeline/.venv/Scripts/python pipeline/fetch_earth.py
"""

from pathlib import Path

import earthaccess

RAW = Path(__file__).resolve().parent.parent / "data" / "raw" / "earth"
YEAR = ("2023-01-01", "2023-12-31")
PRODUCTS = [
    ("MOD11C3", "061", 12),
    ("MOD13C2", "061", 12),
    ("MCD12C1", "061", 1),
    ("GPM_3IMERGM", "07", 12),
]


def main() -> None:
    earthaccess.login(strategy="netrc")
    folder = RAW / "MCD43C3"
    folder.mkdir(parents=True, exist_ok=True)
    for day, doy in (("2023-01-15", "015"), ("2023-04-15", "105"), ("2023-07-15", "196"), ("2023-10-15", "288")):
        if not list(folder.glob(f"MCD43C3.A2023{doy}.*.hdf")):
            granules = earthaccess.search_data(short_name="MCD43C3", version="061", temporal=(day, day))
            earthaccess.download([g for g in granules if f".A2023{doy}." in g.data_links()[0]][:1], str(folder))
    print(f"MCD43C3: {len(list(folder.glob('*.hdf')))} files")
    for short_name, version, expected in PRODUCTS:
        folder = RAW / short_name
        folder.mkdir(parents=True, exist_ok=True)
        granules = earthaccess.search_data(short_name=short_name, version=version, temporal=YEAR)
        have = {p.name for p in folder.iterdir()}
        todo = [g for g in granules if Path(g.data_links()[0]).name not in have]
        print(f"{short_name}: {len(granules)} granules found, {len(granules) - len(todo)} already here")
        if todo:
            earthaccess.download(todo, str(folder))
        count = len([p for p in folder.iterdir() if p.suffix.lower() in (".hdf", ".hdf5")])
        print(f"{short_name}: {count} files" + ("" if count >= expected else f"  (expected {expected}!)"))


if __name__ == "__main__":
    main()

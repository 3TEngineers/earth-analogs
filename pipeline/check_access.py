"""B1: confirm we can read every dataset the pipeline depends on.

Reads a small window around a known point from each remote raster (no full
downloads) and prints whether it worked, how long it took and whether the
value looks plausible. Run from the repo root:

    pipeline/.venv/Scripts/python pipeline/check_access.py

Earthdata product searches need no login; downloads do (see .env.example).
"""

import os
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
import requests
from pyproj import CRS, Transformer
from rasterio.windows import Window

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("GDAL_HTTP_MULTIRANGE", "YES")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.TIF,.img,.IMG,.lbl,.LBL")

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

PGDA = "https://pgda.gsfc.nasa.gov/data/MoonIllumination"
TES_SPECIAL = "https://pds-geosciences.wustl.edu/mgs/mgs-m-tes-special-v1"


@dataclass
class RasterCheck:
    name: str
    url: str
    lon: float
    lat: float
    expect: str
    half: int = 16
    download: bool = False


CHECKS = [
    RasterCheck(
        "Earth DEM: Copernicus GLO-30 at Lake Salda",
        "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N37_00_E029_00_DEM/"
        "Copernicus_DSM_COG_10_N37_00_E029_00_DEM.tif",
        29.68, 37.55, "about 1140 m (lake surface)",
    ),
    RasterCheck(
        "Mars DEM: MOLA 463 m at Jezero",
        "https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
        77.45, 18.44, "about -2600 m",
    ),
    RasterCheck(
        "Moon DEM: LOLA 118 m at Chandrayaan-3",
        "https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif",
        32.32, -69.37, "a few hundred to a few thousand m",
    ),
    RasterCheck(
        "Moon sunlit time: PGDA 75S 120 m near Mons Mouton",
        f"{PGDA}/AVGVISIB_75S_120M_201608.TIF",
        30.0, -84.5, "0-1 or 0-100 (fraction of time)", download=True,
    ),
    RasterCheck(
        "Moon Earth visibility: PGDA 75S 120 m near Mons Mouton",
        f"{PGDA}/AVGVISIB_75S_120M_201608_EARTH.TIF",
        30.0, -84.5, "0-1 or 0-100 (fraction of time)", download=True,
    ),
    RasterCheck(
        "Moon permanent shadow: PGDA LPSR 75S 120 m near Mons Mouton",
        f"{PGDA}/LPSR_75S_120M_201608.TIF",
        30.0, -84.5, "0/1 mask", download=True,
    ),
]


def local_copy(url: str) -> Path:
    """Download a file into data/raw once and return its path."""
    RAW.mkdir(parents=True, exist_ok=True)
    target = RAW / url.rsplit("/", 1)[-1]
    if not target.exists():
        with requests.get(url, stream=True, timeout=600) as response:
            response.raise_for_status()
            with open(target, "wb") as out:
                for chunk in response.iter_content(1 << 20):
                    out.write(chunk)
    return target


def to_pixel(ds, lon: float, lat: float) -> tuple[int, int]:
    """Row/col of a lon/lat point, using the raster's own body (Earth, Moon or Mars)."""
    geographic = CRS.from_wkt(ds.crs.to_wkt()).geodetic_crs
    x, y = Transformer.from_crs(geographic, CRS.from_wkt(ds.crs.to_wkt()), always_xy=True).transform(lon, lat)
    return ds.index(x, y)


def read_window(check: RasterCheck) -> str:
    source = local_copy(check.url) if check.download else check.url
    with rasterio.open(source) as ds:
        row, col = to_pixel(ds, check.lon, check.lat)
        window = Window(col - check.half, row - check.half, 2 * check.half, 2 * check.half)
        data = ds.read(1, window=window, masked=True).astype("float64")
        if ds.scales and ds.scales[0] not in (0, 1):
            data = data * ds.scales[0] + (ds.offsets[0] or 0)
        values = data.compressed()
        if values.size == 0:
            return f"read OK but all pixels are nodata (size {ds.width}x{ds.height})"
        res = abs(ds.res[0])
        return (
            f"mean {np.mean(values):.1f}, min {np.min(values):.1f}, max {np.max(values):.1f} "
            f"| raster {ds.width}x{ds.height}, pixel {res:.0f} {ds.crs.linear_units or 'deg'}, tiled={ds.is_tiled}"
        )


def check_tes() -> str:
    """TES thermal inertia: small PDS3 image, so download it once and read the label."""
    RAW.mkdir(parents=True, exist_ok=True)
    for name in ("global_ti_60n_50s_8ppd.lbl", "global_ti_60n_50s_8ppd.img"):
        target = RAW / name
        if not target.exists():
            response = requests.get(f"{TES_SPECIAL}/{name}", timeout=120)
            response.raise_for_status()
            target.write_bytes(response.content)
    with rasterio.open(RAW / "global_ti_60n_50s_8ppd.lbl") as ds:
        row, col = to_pixel(ds, 77.45, 18.44)
        sample = ds.read(1, window=Window(col - 2, row - 2, 5, 5), masked=True)
        return (
            f"downloaded {sum(p.stat().st_size for p in RAW.glob('global_ti_*')) / 1e6:.1f} MB, "
            f"raster {ds.width}x{ds.height}, crs={'yes' if ds.crs else 'none'}, "
            f"value near Jezero {float(sample.mean()):.0f}; Jezero is roughly 200-400"
        )


def search_earthdata() -> list[str]:
    """Search NASA's catalog for the Earth products around Lake Salda. No login needed."""
    import earthaccess

    bbox = (29.5, 37.4, 29.9, 37.7)
    products = [
        ("MODIS land surface temperature, 8-day 1 km", "MOD11A2", "061", ("2024-01-01", "2024-12-31")),
        ("MODIS vegetation index, 16-day 1 km", "MOD13A2", "061", ("2024-01-01", "2024-12-31")),
        ("GPM IMERG monthly precipitation", "GPM_3IMERGM", "07", ("2024-01-01", "2024-12-31")),
        ("EMIT L2B mineral identification, 60 m", "EMITL2BMIN", None, ("2022-08-01", "2026-11-01")),
    ]
    lines = []
    for label, short_name, version, temporal in products:
        start = time.perf_counter()
        try:
            kwargs = {"short_name": short_name, "bounding_box": bbox, "temporal": temporal, "count": 200}
            if version:
                kwargs["version"] = version
            granules = earthaccess.search_data(**kwargs)
            size = sum(float(g.size) if not callable(g.size) else g.size() for g in granules)
            lines.append(f"OK   {label} ({short_name}): {len(granules)} files, {size:.0f} MB total "
                         f"[{time.perf_counter() - start:.1f}s]")
        except Exception as error:
            lines.append(f"FAIL {label} ({short_name}): {error}")
    return lines


def main() -> None:
    print("Remote rasters (small window reads):")
    for check in CHECKS:
        start = time.perf_counter()
        try:
            result = read_window(check)
            print(f"OK   {check.name}: {result} [{time.perf_counter() - start:.1f}s] — expected {check.expect}")
        except Exception as error:
            print(f"FAIL {check.name}: {error} [{time.perf_counter() - start:.1f}s]")

    print("\nMars thermal inertia (TES):")
    start = time.perf_counter()
    try:
        print(f"OK   {check_tes()} [{time.perf_counter() - start:.1f}s]")
    except Exception as error:
        print(f"FAIL TES thermal inertia: {error}")

    print("\nNASA Earthdata searches around Lake Salda (no login):")
    for line in search_earthdata():
        print(line)


if __name__ == "__main__":
    main()

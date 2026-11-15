"""Download 8192 x 4096 planet textures from NASA / USGS and write them as JPEGs.

Usage: python -I pipeline/fetch_textures.py <download dir> app/public/textures app/public/textures/mars.jpg
The Mars and Moon mosaics are tone matched to the textures they replace (mars.jpg, moon.jpg).
"""
import sys
import urllib.request
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
DL, OUT, CURRENT_MARS = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
W, H, TILE = 8192, 4096, 2048

WMS = {
    "earth": ("https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?", "BlueMarble_ShadedRelief_Bathymetry"),
    "mars": ("https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&", "MDIM21_color"),
}
MOON_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif"


def get(url: str, path: Path) -> Path:
    if not path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "earth-analogs/1.0"})
        with urllib.request.urlopen(req, timeout=300) as r:
            path.write_bytes(r.read())
    return path


def wms_mosaic(body: str) -> Image.Image:
    base, layer = WMS[body]
    out = Image.new("RGB", (W, H))
    for row in range(2):
        for col in range(4):
            west, north = -180 + 90 * col, 90 - 90 * row
            url = (f"{base}SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS={layer}&STYLES=&SRS=EPSG:4326"
                   f"&BBOX={west},{north - 90},{west + 90},{north}&WIDTH={TILE}&HEIGHT={TILE}&FORMAT=image/jpeg")
            tile = Image.open(get(url, DL / f"{body}_{row}_{col}.jpg")).convert("RGB")
            assert tile.size == (TILE, TILE), (body, row, col, tile.size)
            out.paste(tile, (col * TILE, row * TILE))
    return out


def match_colour(img: Image.Image, reference: Path) -> Image.Image:
    """Scale each channel so the new mosaic keeps the tint of the texture it replaces (ours was slightly warmed)."""
    small = img.resize((512, 256))
    ref = Image.open(reference).convert("RGB").resize((512, 256))
    mean = lambda im, c: sum(im.getchannel(c).get_flattened_data()) / (512 * 256)  # noqa: E731
    gains = [mean(ref, c) / max(mean(small, c), 1) for c in range(3)]
    print("colour gains", [round(g, 3) for g in gains])
    return Image.merge("RGB", [img.getchannel(c).point(lambda v, g=g: min(255, round(v * g))) for c, g in enumerate(gains)])


def save(img: Image.Image, name: str) -> None:
    assert img.size == (W, H), (name, img.size)
    path = OUT / name
    img.save(path, "JPEG", quality=84, optimize=True, progressive=True)
    print(f"{name}: {path.stat().st_size / 1e6:.1f} MB")


DL.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
save(wms_mosaic("earth"), "earth-8k.jpg")
save(match_colour(wms_mosaic("mars"), CURRENT_MARS), "mars-8k.jpg")
moon = Image.open(get(MOON_URL, DL / "lroc_color_poles_8k.tif")).convert("RGB")
print("moon source", moon.size)
moon = moon.resize((W, H), Image.LANCZOS) if moon.size != (W, H) else moon
save(match_colour(moon, CURRENT_MARS.with_name("moon.jpg")), "moon-8k.jpg")

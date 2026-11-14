"""Draw the screening results as two maps (docs/images/), for the team and the slides.

Run after mars_screening.py, moon_screening.py and build_sites.py:
    pipeline/.venv/Scripts/python pipeline/make_maps.py
"""

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.colors import ListedColormap  # noqa: E402
from pyproj import CRS, Transformer  # noqa: E402
from scipy import ndimage  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import mars_screening as mars  # noqa: E402
import moon_screening as moon  # noqa: E402

IMAGES = ROOT / "docs" / "images"
SITES = json.loads((ROOT / "app" / "public" / "data" / "sites.json").read_text(encoding="utf-8"))["sites"]
CANDIDATE = "#FFD23F"
LANDING = "#FFFFFF"


def label_of(site_id: str) -> str:
    return site_id.rsplit("-", 1)[-1].upper()


def mars_map() -> Path:
    grids = mars.load_grids()
    safe = np.load(ROOT / "data" / "interim" / "mars_safe.npz")["safe"]
    fig, ax = plt.subplots(figsize=(16, 8.4), dpi=110)
    extent = (-180, 180, -90, 90)
    ax.imshow(grids.elevation, extent=extent, cmap="gist_earth", vmin=-8000, vmax=12000)
    ax.imshow(np.where(safe, 1.0, np.nan), extent=extent, cmap=ListedColormap(["#39FF88"]), alpha=0.55)
    for name, lat, lon, _ in mars.LANDINGS:
        ax.plot(lon, lat, marker="^", ms=8, color=LANDING, mec="black", mew=0.8)
        ax.annotate(name, (lon, lat), xytext=(5, -11), textcoords="offset points", color="white", fontsize=8)
    ax.plot(-24.666, 18.275, marker="D", ms=7, color="#7FDBFF", mec="black")
    ax.annotate("Oxia Planum (ESA, future)", (-24.666, 18.275), xytext=(6, -12), textcoords="offset points",
                color="#7FDBFF", fontsize=8)
    for s in SITES:
        if s["body"] == "mars" and s["status"] == "candidate":
            ax.plot(s["lon"], s["lat"], marker="*", ms=22, color=CANDIDATE, mec="black", mew=1)
            ax.annotate(f"{label_of(s['id'])}  {s['name']}", (s["lon"], s["lat"]), xytext=(10, 6),
                        textcoords="offset points", color=CANDIDATE, fontsize=11, weight="bold")
    ax.axhline(30, color="white", lw=0.6, ls="--", alpha=0.6)
    ax.axhline(-30, color="white", lw=0.6, ls="--", alpha=0.6)
    ax.set_xlabel("Longitude (deg E)")
    ax.set_ylabel("Latitude (deg)")
    ax.set_title("Mars — safe landing zones (green), our 4 candidates (stars), past landings (triangles)\n"
                 "Elevation <= -1 km, |lat| <= 30 deg, thermal inertia >= 100, slope <= 2 deg, relief <= 500 m "
                 "over a 25 km area. Data: MOLA, MGS TES.", fontsize=11)
    out = IMAGES / "mars_screening.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)
    return out


def moon_map() -> Path:
    crs, transform, size, layers = moon.load_layers()
    psr = np.nan_to_num(layers["psr"]) > 0.5
    psr_km = ndimage.distance_transform_edt(~psr) * moon.PIXEL_M / 1000.0
    ok = (np.isfinite(layers["sunlit"]) & (layers["sunlit"] >= moon.MIN_SUNLIT) & (layers["earth"] >= moon.MIN_EARTH)
          & (layers["slope"] <= moon.MAX_SLOPE_DEG) & (psr_km <= moon.MAX_PSR_KM))
    safe = ndimage.binary_erosion(ok, structure=np.ones((moon.PAD_PX, moon.PAD_PX), bool))
    half_km = moon.HALF_EXTENT_M / 1000
    extent = (-half_km, half_km, -half_km, half_km)
    to_xy = Transformer.from_crs(CRS.from_wkt(crs.to_wkt()).geodetic_crs, CRS.from_wkt(crs.to_wkt()), always_xy=True)

    def xy(lat, lon):
        x, y = to_xy.transform(lon, lat)
        return x / 1000, y / 1000

    fig, ax = plt.subplots(figsize=(11, 11), dpi=110)
    im = ax.imshow(100 * layers["sunlit"], extent=extent, cmap="magma", vmin=0, vmax=70)
    ax.imshow(np.where(psr, 1.0, np.nan), extent=extent, cmap=ListedColormap(["#1E90FF"]), alpha=0.35)
    # Polar lighting zone: only inside this circle is 50 % sunlight exceptional
    polar_r = abs(xy(moon.POLAR_LAT, 0)[1])
    ax.add_patch(plt.Circle((0, 0), polar_r, fill=False, ls="--", lw=1.2, ec="white", alpha=0.8))
    ax.annotate(f"{abs(moon.POLAR_LAT):.0f} S — polar lighting zone", (0, polar_r), xytext=(0, 6),
                textcoords="offset points", ha="center", color="white", fontsize=9)
    # Passing patches are tiny (a few hundred metres) — draw a ring around each so they show
    labels, n = ndimage.label(safe)
    for r, c in ndimage.center_of_mass(safe, labels, range(1, n + 1)):
        x, y = transform * (c + 0.5, r + 0.5)
        ax.plot(x / 1000, y / 1000, marker="o", ms=5, mfc="none", mec="#39FF88", mew=1)
    for name, lat, lon in moon.ARTEMIS:
        x, y = xy(lat, lon)
        ax.plot(x, y, marker="s", ms=9, mfc="none", mec="#7FDBFF", mew=1.5)
        ax.annotate(name, (x, y), xytext=(7, -12), textcoords="offset points", color="#7FDBFF", fontsize=8)
    for s in SITES:
        if s["body"] == "moon" and s["status"] == "candidate":
            x, y = xy(s["lat"], s["lon"])
            ax.plot(x, y, marker="*", ms=20, color=CANDIDATE, mec="black", mew=1)
            ax.annotate(f"{label_of(s['id'])}  {s['name']}", (x, y), xytext=(10, 6), textcoords="offset points",
                        color=CANDIDATE, fontsize=10, weight="bold")
    ax.set_xlabel("km from the south pole")
    ax.set_ylabel("km from the south pole")
    ax.set_title("Moon south pole — sunlit time (colour), permanent shadow (blue), passing spots (green rings),\n"
                 "NASA Artemis III features (squares) and our candidates (stars). Outside the dashed circle 50 % sunlight\n"
                 "is an ordinary day/night cycle, so candidates are only taken inside it. Data: LOLA via NASA PGDA.",
                 fontsize=10)
    fig.colorbar(im, ax=ax, fraction=0.04, pad=0.02, label="Sunlit time (%)")
    out = IMAGES / "moon_screening.png"
    fig.tight_layout()
    fig.savefig(out)
    plt.close(fig)

    # Zoom on the pole, where the near-NASA candidates sit
    ax_zoom = 60
    fig, ax = plt.subplots(figsize=(10, 10), dpi=110)
    ax.imshow(100 * layers["sunlit"], extent=extent, cmap="magma", vmin=0, vmax=70)
    ax.imshow(np.where(psr, 1.0, np.nan), extent=extent, cmap=ListedColormap(["#1E90FF"]), alpha=0.35)
    for r, c in ndimage.center_of_mass(safe, labels, range(1, n + 1)):
        x, y = transform * (c + 0.5, r + 0.5)
        ax.plot(x / 1000, y / 1000, marker="o", ms=7, mfc="none", mec="#39FF88", mew=1.2)
    for name, lat, lon in moon.ARTEMIS:
        x, y = xy(lat, lon)
        ax.plot(x, y, marker="s", ms=11, mfc="none", mec="#7FDBFF", mew=1.5)
        ax.annotate(name, (x, y), xytext=(7, -13), textcoords="offset points", color="#7FDBFF", fontsize=9)
    for s in SITES:
        if s["body"] == "moon" and s["status"] == "candidate":
            x, y = xy(s["lat"], s["lon"])
            ax.plot(x, y, marker="*", ms=22, color=CANDIDATE, mec="black", mew=1)
            ax.annotate(f"{label_of(s['id'])}  {s['name']}", (x, y), xytext=(10, 6), textcoords="offset points",
                        color=CANDIDATE, fontsize=11, weight="bold")
    ax.set_xlim(-ax_zoom, ax_zoom)
    ax.set_ylim(-ax_zoom, ax_zoom)
    ax.set_xlabel("km from the south pole")
    ax.set_ylabel("km from the south pole")
    ax.set_title("Moon south pole, central 120 km — same layers as the full map", fontsize=11)
    zoom = IMAGES / "moon_screening_pole_zoom.png"
    fig.tight_layout()
    fig.savefig(zoom)
    plt.close(fig)
    return out


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    print("Wrote", mars_map())
    print("Wrote", moon_map(), "and the pole zoom")


if __name__ == "__main__":
    main()

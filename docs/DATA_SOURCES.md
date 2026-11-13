# Data sources

One row per dataset we consider. **Checked** means someone actually downloaded or queried it and confirmed it works — until then treat the notes as unverified. Add size and format once known.

## Moon

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| LRO LOLA topography (polar DEMs) | Elevation, slope, roughness at the south pole | PDS Geosciences / NASA PGDA | No |
| LRO LOLA illumination products | Average illumination, Earth visibility at the poles | NASA PGDA (to confirm) | No |
| LRO Diviner | Surface temperature, polar products, rock abundance | https://pds-geosciences.wustl.edu/missions/lro/diviner.htm | No |
| LRO LEND / Mini-RF | Hydrogen / ice indicators, radar | PDS | No |
| Artemis III candidate regions | Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1 and 2, de Gerlache Rim 2, Slater Plain (2024 list) | NASA announcements | No |

## Mars

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| MOLA DEM 463 m | Global topography | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m | No |
| MOLA–HRSC blended DEM 200 m | Higher-res global topography (~11 GB GeoTIFF) | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m | No |
| HiRISE DTMs | Very high-res topography, small areas only | https://stac.astrogeology.usgs.gov/docs/data/mars/hirise_dtms/ | No |

## Earth

| Dataset | What it gives us | Access | Checked |
|---|---|---|---|
| SRTM / Copernicus DEM (30 m) | Elevation, slope, roughness | Earthdata / Copernicus Data Space | No |
| MODIS land surface temperature (MOD11) | Day/night temperature, diurnal range | AppEEARS (Earthdata Login) | No |
| MODIS NDVI | Vegetation cover | AppEEARS (Earthdata Login) | No |
| GPM IMERG | Precipitation / aridity | Earthdata | No |
| EMIT L2B mineral identification (60 m) | Surface minerals, arid regions only (±54° lat) | https://www.earthdata.nasa.gov/data/catalog/lpcloud-emitl2bmin-002 (Earthdata Login) | No |
| Permafrost extent | Frozen ground | To find | No |
| Global lithology map | Rock type (e.g. anorthosite vs basalt) | To find | No |

## Access notes

- **Earthdata Login** (free) is required for AppEEARS, EMIT and most LP DAAC products: https://urs.earthdata.nasa.gov/
- AppEEARS can subset areas and time ranges server-side instead of downloading whole granules: https://appeears.earthdatacloud.nasa.gov/

# population data preprocessing

## overview

this script generates an icosahedron-subdivided population density grid for the globe visualization.

uses geodesic sphere subdivision (no pole artifacts) with real NASA GPW data.

## structure

```
scripts/
  generate_population_grid.py   - main preprocessing script
data/
  raw/                          - place downloaded NASA GPW GeoTIFF here
  processed/                    - generated JSON output
```

## getting NASA GPW data (optional - for real data)

1. register (free): https://urs.earthdata.nasa.gov/users/new
2. download GPW v4.11 (2020, 30 arc-second):
   https://sedac.ciesin.columbia.edu/data/set/gpw-v4-population-density-rev11/data-download
3. extract and place `gpw_v4_population_density_rev11_2020_30_sec.tif` in `data/raw/`

## running the script

### with simulated data (default)
```bash
python3 scripts/generate_population_grid.py
```

### with real NASA data (recommended)
```bash
python3 scripts/generate_population_grid.py --use-gpw data/raw/gpw_v4_population_density_rev11_2020_30_sec.tif
```

### with custom subdivision level
```bash
# subdivision 5 = ~10k points, 6 = ~41k points, 7 = ~163k points
python3 scripts/generate_population_grid.py --subdivisions 6 --use-gpw data/raw/gpw_v4_population_density_rev11_2020_30_sec.tif
```

## output

creates `data/processed/population_grid.json` (~2-3 MB for 41k points)

icosahedron-subdivided geodesic sphere with uniform point distribution

## requirements

```bash
pip3 install numpy rasterio
```


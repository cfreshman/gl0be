#!/usr/bin/env python3
"""
Generate icosahedron-subdivided population density grid for globe visualization.

Supports both simulated data (default) and real NASA GPW GeoTIFF data.

Usage:
    python3 scripts/generate_population_grid.py
    python3 scripts/generate_population_grid.py --use-gpw data/raw/gpw_file.tif
    python3 scripts/generate_population_grid.py --subdivisions 6
"""

import argparse
import json
import math
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:
    print("Error: numpy not installed. Run: pip3 install numpy")
    sys.exit(1)

# Configuration
SUBDIVISIONS = 6  # Icosahedron subdivision level (6 = ~163k points)
OUTPUT_FILE = 'data/processed/population_grid.json'

def normalize(v):
    """Normalize a 3D vector to unit length."""
    length = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
    return (v[0]/length, v[1]/length, v[2]/length)

def midpoint(v1, v2):
    """Get midpoint between two 3D points and project to unit sphere."""
    mid = ((v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2)
    return normalize(mid)

def generate_icosahedron():
    """Generate the base icosahedron vertices."""
    phi = (1 + math.sqrt(5)) / 2  # Golden ratio
    
    vertices = [
        normalize((-1,  phi,  0)),
        normalize(( 1,  phi,  0)),
        normalize((-1, -phi,  0)),
        normalize(( 1, -phi,  0)),
        normalize(( 0, -1,  phi)),
        normalize(( 0,  1,  phi)),
        normalize(( 0, -1, -phi)),
        normalize(( 0,  1, -phi)),
        normalize(( phi,  0, -1)),
        normalize(( phi,  0,  1)),
        normalize((-phi,  0, -1)),
        normalize((-phi,  0,  1))
    ]
    
    # 20 triangular faces
    faces = [
        (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
        (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
        (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
        (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)
    ]
    
    return vertices, faces

def sphere_to_latlon(x, y, z):
    """Convert 3D sphere coordinates to lat/lon in degrees."""
    lat = math.degrees(math.asin(y))
    lon = math.degrees(math.atan2(z, x))
    return (lat, lon)

def sample_population_at_latlon(lat, lon, population_data, bounds, shape):
    """
    Sample population density from raster at given lat/lon.
    bounds: (min_lon, min_lat, max_lon, max_lat)
    shape: (height, width) of raster
    """
    min_lon, min_lat, max_lon, max_lat = bounds
    height, width = shape
    
    # Check if point is within bounds
    if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
        return 0.0
    
    # Convert lat/lon to raster indices
    x_ratio = (lon - min_lon) / (max_lon - min_lon)
    y_ratio = (max_lat - lat) / (max_lat - min_lat)  # Flip Y
    
    col = int(x_ratio * (width - 1))
    row = int(y_ratio * (height - 1))
    
    # Clamp to valid range
    col = max(0, min(width - 1, col))
    row = max(0, min(height - 1, row))
    
    value = population_data[row, col]
    
    # Handle no-data values (typically negative or very large)
    if value < 0 or value > 1e6:  # Max reasonable density: 1M per sq km
        return 0.0
    
    return float(value)

def subdivide_icosahedron(subdivisions):
    """Subdivide icosahedron to create a geodesic sphere."""
    vertices, faces = generate_icosahedron()
    
    for level in range(subdivisions):
        new_faces = []
        edge_cache = {}
        
        def get_middle_point(v1_idx, v2_idx):
            # Use edge cache to avoid duplicate midpoints
            key = tuple(sorted([v1_idx, v2_idx]))
            if key in edge_cache:
                return edge_cache[key]
            
            v1 = vertices[v1_idx]
            v2 = vertices[v2_idx]
            mid = midpoint(v1, v2)
            vertices.append(mid)
            edge_cache[key] = len(vertices) - 1
            return len(vertices) - 1
        
        for face in faces:
            v1, v2, v3 = face
            
            # Get midpoints of each edge
            a = get_middle_point(v1, v2)
            b = get_middle_point(v2, v3)
            c = get_middle_point(v3, v1)
            
            # Create 4 new triangles
            new_faces.append((v1, a, c))
            new_faces.append((v2, b, a))
            new_faces.append((v3, c, b))
            new_faces.append((a, b, c))
        
        faces = new_faces
        print(f"  Subdivision {level + 1}/{subdivisions}: {len(vertices)} vertices, {len(faces)} faces")
    
    return vertices

def generate_icosahedron_grid(subdivisions):
    """Generate icosahedron-subdivided grid points with lat/lon."""
    print(f"Generating icosahedron grid with {subdivisions} subdivisions...")
    vertices = subdivide_icosahedron(subdivisions)
    
    points = []
    for vertex in vertices:
        x, y, z = vertex
        lat, lon = sphere_to_latlon(x, y, z)
        points.append({'lat': lat, 'lon': lon})
    
    return points

def load_gpw_data(gpw_file):
    """Load NASA GPW GeoTIFF data."""
    try:
        import rasterio
    except ImportError:
        print("Error: rasterio not installed. Run: pip3 install rasterio")
        sys.exit(1)
    
    print(f"Loading GPW data from {gpw_file}...")
    with rasterio.open(gpw_file) as src:
        data = src.read(1)
        bounds = src.bounds  # (left, bottom, right, top)
        shape = data.shape
        print(f"  Raster shape: {shape}")
        print(f"  Bounds: {bounds}")
        return data, (bounds.left, bounds.bottom, bounds.right, bounds.top), shape

def main():
    parser = argparse.ArgumentParser(description='Generate population grid for globe')
    parser.add_argument('--use-gpw', type=str, help='Path to NASA GPW GeoTIFF file')
    parser.add_argument('--subdivisions', type=int, default=SUBDIVISIONS, 
                       help=f'Icosahedron subdivision level (default: {SUBDIVISIONS})')
    args = parser.parse_args()
    
    subdivisions = args.subdivisions
    
    points = generate_icosahedron_grid(subdivisions)
    print(f"Generated {len(points)} grid points")
    
    # Load population data
    gpw_data = None
    if args.use_gpw:
        gpw_path = Path(args.use_gpw)
        if not gpw_path.exists():
            print(f"Error: GPW file not found: {gpw_path}")
            sys.exit(1)
        population_data, bounds, shape = load_gpw_data(gpw_path)
        data_source = f"NASA GPW v4.11 ({gpw_path.name})"
    else:
        print("\nUsing simulated population data")
        print("For real data, download NASA GPW from:")
        print("  https://sedac.ciesin.columbia.edu/data/set/gpw-v4-population-density-rev11")
        population_data = None
        data_source = "simulated"
    
    # Sample population data for each point
    print("\nSampling population data...")
    for i, point in enumerate(points):
        lat = point['lat']
        lon = point['lon']
        
        if population_data is not None:
            # Sample from real GPW data
            pop = sample_population_at_latlon(lat, lon, population_data, bounds, shape)
        else:
            # Simulate population
            lat_factor = 1.0 - abs(lat) / 90.0
            temperate_boost = 2.0 if (20 <= abs(lat) <= 60) else 1.0
            
            pop = 0.0
            # Asia
            if (20 <= lat <= 40 and 70 <= lon <= 140):
                pop = 500 * temperate_boost
            # Europe
            elif (40 <= lat <= 60 and -10 <= lon <= 40):
                pop = 300 * temperate_boost
            # North America east
            elif (30 <= lat <= 50 and -100 <= lon <= -60):
                pop = 200 * temperate_boost
            # South America
            elif (-30 <= lat <= 10 and -80 <= lon <= -40):
                pop = 150 * lat_factor
            # Africa
            elif (-30 <= lat <= 30 and -20 <= lon <= 50):
                pop = 100 * lat_factor
            else:
                pop = 10 * lat_factor * temperate_boost
            
            pop *= (0.5 + np.random.random() * 1.5)
        
        point['population'] = round(pop, 2)
        
        if (i + 1) % 10000 == 0:
            print(f"  Processed {i + 1}/{len(points)} points...")
    
    # Create output
    output = {
        'version': 2,
        'type': 'icosahedron',
        'subdivisions': subdivisions,
        'total_points': len(points),
        'data_source': data_source,
        'points': points
    }
    
    # Write to JSON
    output_path = Path(OUTPUT_FILE)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(output, f, separators=(',', ':'))
    
    file_size = output_path.stat().st_size / 1024 / 1024
    print(f"\nSaved to {OUTPUT_FILE}")
    print(f"File size: {file_size:.2f} MB")
    print(f"Total points: {len(points)}")
    
    # Print some stats
    populations = [p['population'] for p in points]
    print(f"\nPopulation stats:")
    print(f"  Min: {min(populations):.2f}")
    print(f"  Max: {max(populations):.2f}")
    print(f"  Mean: {np.mean(populations):.2f}")

if __name__ == '__main__':
    main()


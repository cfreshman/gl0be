import { ShapeUtils, Vector2 } from 'three'

const DEG = Math.PI / 180
const POLAR_GEOMETRY_VERSION = 1

// A coastline that winds around longitude encloses a pole. Its interior cannot
// be represented by a polygon in the longitude/latitude plane.
export function getPolarHemisphere(ring) {
  let winding = 0
  for (let i = 0; i < ring.length; i++) {
    const next = ring[(i + 1) % ring.length]
    const delta = next[0] - ring[i][0]
    winding += ((delta + 540) % 360) - 180
  }
  if (Math.abs(winding) < 180) return 0
  if (ring.every(([, lat]) => lat < 0)) return -1
  if (ring.every(([, lat]) => lat > 0)) return 1
  return 0
}

export function triangulatePolarPolygon(ring, radius) {
  const hemisphere = getPolarHemisphere(ring)
  if (!hemisphere) throw new Error('Polygon does not enclose a pole')

  // Stereographic projection puts the pole at the origin and keeps the coast
  // continuous across the antimeridian. Earcut respects the concave coastline.
  const contour = ring.map(([lon, lat]) => {
    const distance = Math.tan((90 - hemisphere * lat) * DEG / 2)
    return new Vector2(distance * Math.cos(lon * DEG), -distance * Math.sin(lon * DEG))
  })
  // ShapeUtils removes an exactly duplicated closing point itself. GeoJSON
  // recovered from a 3D border may differ by floating-point rounding.
  if (contour[0].distanceToSquared(contour[contour.length - 1]) < 1e-20) contour.pop()
  const pending = ShapeUtils.triangulateShape(contour, [])
  const triangles = []
  const midpoints = new Map()
  // Refine before projecting back to the sphere so interior faces follow its
  // curvature instead of cutting through the ocean sphere.
  const maxEdgeSquared = 0.02 ** 2
  while (pending.length) {
    const [a, b, c] = pending.pop()
    const edges = [[a, b, c], [b, c, a], [c, a, b]]
    const [start, end, opposite] = edges.reduce((longest, edge) =>
      contour[edge[0]].distanceToSquared(contour[edge[1]]) >
      contour[longest[0]].distanceToSquared(contour[longest[1]]) ? edge : longest
    )
    if (contour[start].distanceToSquared(contour[end]) <= maxEdgeSquared) {
      triangles.push([a, b, c])
      continue
    }
    const key = start < end ? `${start}:${end}` : `${end}:${start}`
    let midpoint = midpoints.get(key)
    if (midpoint === undefined) {
      midpoint = contour.length
      contour.push(contour[start].clone().add(contour[end]).multiplyScalar(0.5))
      midpoints.set(key, midpoint)
    }
    pending.push([start, midpoint, opposite], [midpoint, end, opposite])
  }

  const points = contour.map(({ x, y }) => {
    const distanceSquared = x * x + y * y
    const scale = radius / (1 + distanceSquared)
    return [2 * x * scale, hemisphere * (1 - distanceSquared) * scale, 2 * y * scale]
  })
  return triangles.flatMap(triangle => triangle.flatMap(index => points[index]))
}

// Old downloads have no country IDs on their borders. Match a border's first
// coastal vertex to its land mesh rather than relying on array ordering or a
// special case for a country name. All other meshes and borders stay intact.
export function repairPolarGeometry(data, radius) {
  if (data.polarGeometryVersion === POLAR_GEOMETRY_VERSION) return data
  const countries = [...data.countries]
  for (const border of data.borders) {
    const ring = []
    for (let i = 0; i < border.length; i += 3) {
      const [x, y, z] = border.slice(i, i + 3)
      const length = Math.hypot(x, y, z)
      ring.push([Math.atan2(-z, x) / DEG, Math.asin(y / length) / DEG])
    }
    if (!getPolarHemisphere(ring)) continue

    const scale = radius / Math.hypot(...border.slice(0, 3))
    const anchor = border.slice(0, 3).map(value => value * scale)
    const countryIndex = countries.findIndex(({ vertices }) => {
      for (let i = 0; i < vertices.length; i += 3) {
        if ((vertices[i] - anchor[0]) ** 2 +
            (vertices[i + 1] - anchor[1]) ** 2 +
            (vertices[i + 2] - anchor[2]) ** 2 < 1e-8) return true
      }
      return false
    })
    if (countryIndex < 0) throw new Error('Cannot match polar coastline to a country mesh')
    countries[countryIndex] = {
      ...countries[countryIndex],
      vertices: triangulatePolarPolygon(ring, radius)
    }
  }
  return { ...data, countries, polarGeometryVersion: POLAR_GEOMETRY_VERSION }
}

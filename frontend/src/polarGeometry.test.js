import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh,
  MeshBasicMaterial, Raycaster, ShapeUtils, Vector2, Vector3
} from 'three'
import { getPolarHemisphere, repairPolarGeometry, triangulatePolarPolygon } from './polarGeometry.js'

const radius = 100.1
// Includes a deep coastal indentation next to the antimeridian.
const coast = [[-180, -80], [-135, -70], [-90, -75], [-45, -70], [0, -75],
  [45, -70], [90, -75], [135, -70], [160, -85], [180, -80]]
const project = ([lon, lat]) => {
  const distance = Math.tan((90 + lat) * Math.PI / 360)
  return new Vector2(distance * Math.cos(lon * Math.PI / 180),
    -distance * Math.sin(lon * Math.PI / 180))
}
const toSphere = ([lon, lat], r) => {
  const phi = lat * Math.PI / 180
  const theta = lon * Math.PI / 180
  return [r * Math.cos(phi) * Math.cos(theta), r * Math.sin(phi),
    -r * Math.cos(phi) * Math.sin(theta)]
}

test('detects both polar windings without treating dateline islands as polar', () => {
  assert.equal(getPolarHemisphere(coast), -1)
  assert.equal(getPolarHemisphere([...coast].reverse()), -1)
  assert.equal(getPolarHemisphere(coast.map(([lon, lat]) => [lon, -lat])), 1)
  assert.equal(getPolarHemisphere([[179, -20], [-179, -20], [-179, -18], [179, -18], [179, -20]]), 0)
})

test('fills exactly the concave polar coastline and stays above the ocean', () => {
  const vertices = triangulatePolarPolygon(coast, radius)
  let area = 0
  for (let i = 0; i < vertices.length; i += 9) {
    const triangle = [0, 3, 6].map(offset => new Vector2(
      vertices[i + offset] / (radius - vertices[i + offset + 1]),
      vertices[i + offset + 2] / (radius - vertices[i + offset + 1])
    ))
    area += Math.abs(ShapeUtils.area(triangle))
    const center = new Vector3()
    for (let offset = 0; offset < 9; offset += 3) {
      const point = new Vector3(...vertices.slice(i + offset, i + offset + 3))
      assert.ok(Math.abs(point.length() - radius) < 1e-10)
      center.add(point)
    }
    assert.ok(center.divideScalar(3).length() > 99)
  }
  assert.ok(Math.abs(area - Math.abs(ShapeUtils.area(coast.map(project)))) < 1e-10)

  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3))
  const material = new MeshBasicMaterial({ side: DoubleSide })
  const mesh = new Mesh(geometry, material)
  for (let lon = -180; lon < 180; lon += 10) {
    const direction = new Vector3(...toSphere([lon, -88], 1))
    const ray = new Raycaster(direction.clone().multiplyScalar(200), direction.clone().negate())
    const hit = ray.intersectObject(mesh)[0]
    assert.ok(hit, `Polar cap missing at longitude ${lon}`)
    assert.ok(hit.point.length() > 99)
  }
  // This point is inside the old circular cutoff but outside the concave coast.
  const oceanDirection = new Vector3(...toSphere([160, -82], 1))
  const oceanRay = new Raycaster(oceanDirection.clone().multiplyScalar(200), oceanDirection.clone().negate())
  assert.equal(oceanRay.intersectObject(mesh).length, 0)
  geometry.dispose()
  material.dispose()
})

test('repairs old downloads using the coastline without depending on country order', () => {
  const land = { name: 'polar continent', vertices: coast.flatMap(point => toSphere(point, radius)) }
  const island = { name: 'island', vertices: [1, 2, 3] }
  const borders = [coast.flatMap(point => toSphere(point, 101))]
  const original = { countries: [island, land], borders }
  const repaired = repairPolarGeometry(original, radius)
  assert.equal(repaired.countries[0], island)
  assert.equal(repaired.countries[1].name, land.name)
  assert.notEqual(repaired.countries[1].vertices, land.vertices)
  assert.equal(original.countries[1], land)
  assert.equal(repaired.borders, borders)
  assert.equal(repairPolarGeometry(repaired, radius), repaired)
})

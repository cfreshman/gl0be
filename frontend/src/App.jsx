import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Delaunator from 'delaunator'
import './App.css'

const GLOBE_VERSION = 3 // Increment when algorithm changes

// IndexedDB helpers for large data storage
const DB_NAME = 'globeDB'
const DB_VERSION = 1
const STORE_NAME = 'globeData'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

async function getCachedData() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get('data')
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  } catch (err) {
    console.error('Error reading from IndexedDB:', err)
    return null
  }
}

async function setCachedData(data) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({ version: GLOBE_VERSION, data }, 'data')
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (err) {
    console.error('Error writing to IndexedDB:', err)
  }
}

async function clearCache() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (err) {
    console.error('Error clearing IndexedDB:', err)
  }
}

// convert 3D to lat/lon
function sphereToLatLon(x, y, z) {
  const length = Math.sqrt(x * x + y * y + z * z)
  const lat = Math.asin(y / length) * (180 / Math.PI)
  const lon = Math.atan2(-z, x) * (180 / Math.PI)
  return { lat, lon }
}

// convert lat/lon to 3D sphere
function latLonToSphere(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  
  return { x, y, z }
}

// point in polygon test
function isPointInPolygon(testLon, testLat, polygon) {
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    
    const intersect = ((yi > testLat) !== (yj > testLat)) &&
      (testLon < (xj - xi) * (testLat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  
  return inside
}

// find country at point
function getCountryAtPoint(lat, lon, countries) {
  for (const country of countries) {
    const coordinates = country.geometry.type === 'Polygon'
      ? [country.geometry.coordinates]
      : country.geometry.coordinates
    
    for (const polygon of coordinates) {
      if (isPointInPolygon(lon, lat, polygon[0])) {
        return country.properties.name
      }
    }
  }
  return null
}

function App() {
  const containerRef = useRef(null)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [hoveredCountry, setHoveredCountry] = useState(null)
  
  useEffect(() => {
    // Debug controls available in console
    window.control = {
      downloadGeometry: async () => {
        try {
          const cached = await getCachedData()
          if (!cached || !cached.data) {
            console.error('No cached geometry data found')
            return
          }
          
          const dataStr = JSON.stringify(cached.data, null, 2)
          const blob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          
          const a = document.createElement('a')
          a.href = url
          a.download = `globe-geometry-v${GLOBE_VERSION}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          
          console.log(`Downloaded geometry (version ${GLOBE_VERSION})`)
        } catch (err) {
          console.error('Failed to download geometry:', err)
        }
      }
    }
    
    console.log('Debug controls available: control.downloadGeometry()')
  }, [])
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    
    // camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 300
    
    // renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    
    // get colors from CSS variables
    const styles = getComputedStyle(document.documentElement)
    const oceanColor = new THREE.Color(styles.getPropertyValue('--ocean-color').trim())
    const countryColor = new THREE.Color(styles.getPropertyValue('--country-color').trim())
    const countryHighlight = new THREE.Color(styles.getPropertyValue('--country-highlight').trim())
    const borderColor = new THREE.Color(styles.getPropertyValue('--country-border').trim())
    
    // globe settings
    const globeRadius = 100
    
    // ocean sphere
    const oceanSphere = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius * .99, 64, 64),
      new THREE.MeshBasicMaterial({ color: oceanColor })
    )
    scene.add(oceanSphere)
    
    const countryMeshes = []
    let countries = []
    
    // Helper function to render geometry data
    const renderGeometry = (data) => {
      // Recreate meshes from data
      data.countries.forEach(countryData => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(countryData.vertices, 3))
        geometry.computeVertexNormals()
        
        const material = new THREE.MeshBasicMaterial({
          color: countryColor,
          side: THREE.DoubleSide
        })
        
        const mesh = new THREE.Mesh(geometry, material)
        mesh.userData = { name: countryData.name }
        scene.add(mesh)
        countryMeshes.push(mesh)
      })
      
      // Recreate borders
      data.borders.forEach(borderData => {
        const points = []
        for (let i = 0; i < borderData.length; i += 3) {
          points.push(new THREE.Vector3(borderData[i], borderData[i + 1], borderData[i + 2]))
        }
        
        const borderGeometry = new THREE.BufferGeometry().setFromPoints(points)
        const borderMaterial = new THREE.LineBasicMaterial({
          color: borderColor,
          transparent: true,
          opacity: 0.5
        })
        const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial)
        scene.add(borderLine)
      })
      
      console.log(`Loaded ${countryMeshes.length} countries`)
    }
    
    // Try to load geometry: static file -> IndexedDB cache -> generate
    const loadGeometry = async () => {
      // Try static file first
      try {
        const response = await fetch(`/globe-geometry-v${GLOBE_VERSION}.json`)
        if (response.ok) {
          const data = await response.json()
          console.log('Loading globe from static file...')
          renderGeometry(data)
          
          // Cache it for future use
          await setCachedData(data)
          return
        }
      } catch (err) {
        console.log('No static geometry file found, checking cache...')
      }
      
      // Try IndexedDB cache
      const cached = await getCachedData()
      if (cached && cached.version === GLOBE_VERSION && cached.data) {
        console.log('Loading globe from cache...')
        try {
          renderGeometry(cached.data)
          return
        } catch (err) {
          console.error('Cache load failed:', err)
          await clearCache()
        }
      }
      
      // Generate if not loaded from static or cache
      // load world data
      fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
        .then(res => res.json())
        .then(geojson => {
          countries = geojson.features
          console.log(`Processing ${countries.length} countries...`)
          
          const generatedData = {
            countries: [],
            borders: []
          }
        
          // Step 1: Create cube grid points
          const tilesPerSide = 50
          const gridPoints = []
          const gridPointsFlat = []
        
        const faces = [
          { u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] },
          { u: [-1, 0, 0], v: [0, 1, 0], w: [0, 0, -1] },
          { u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0] },
          { u: [0, 0, 1], v: [0, 1, 0], w: [-1, 0, 0] },
          { u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] },
          { u: [1, 0, 0], v: [0, 0, -1], w: [0, -1, 0] }
        ]
        
          faces.forEach(face => {
            for (let i = 0; i <= tilesPerSide; i++) {
              for (let j = 0; j <= tilesPerSide; j++) {
              const s = -1 + (2 * i / tilesPerSide)
              const t = -1 + (2 * j / tilesPerSide)
              
              const x = face.w[0] + s * face.u[0] + t * face.v[0]
              const y = face.w[1] + s * face.u[1] + t * face.v[1]
              const z = face.w[2] + s * face.u[2] + t * face.v[2]
              
              // normalize to sphere
              const length = Math.sqrt(x * x + y * y + z * z)
              const point = {
                x: (x / length) * globeRadius,
                y: (y / length) * globeRadius,
                z: (z / length) * globeRadius
              }
              
                gridPoints.push(point)
                gridPointsFlat.push(point.x, point.y, point.z)
              }
            }
          })
          
          console.log(`Created ${gridPoints.length} grid points`)
          
          // Step 2: For each country, find grid points inside it and triangulate
          countries.forEach((country, countryIdx) => {
          const coordinates = country.geometry.type === 'Polygon'
            ? [country.geometry.coordinates]
            : country.geometry.coordinates
          
          coordinates.forEach(polygon => {
              const outerRing = polygon[0]
              
              // Sample border points
              const borderPoints = []
              for (let i = 0; i < outerRing.length - 1; i++) {
              const [lon1, lat1] = outerRing[i]
              const [lon2, lat2] = outerRing[i + 1]
              
              const dist = Math.sqrt((lon2 - lon1) ** 2 + (lat2 - lat1) ** 2)
              const numSamples = Math.max(2, Math.ceil(dist / 0.5))
              
              for (let s = 0; s < numSamples; s++) {
                const t = s / numSamples
                const lat = lat1 + (lat2 - lat1) * t
                const lon = lon1 + (lon2 - lon1) * t
                  borderPoints.push({ lat, lon })
                }
              }
              
              // Find grid points inside this country
              const interiorPoints = []
              gridPoints.forEach(p => {
                const { lat, lon } = sphereToLatLon(p.x, p.y, p.z)
                if (isPointInPolygon(lon, lat, outerRing)) {
                  interiorPoints.push({ lat, lon })
                }
              })
              
              // Combine border and interior points for this country
              const countryPoints = [...borderPoints, ...interiorPoints]
              
              if (countryPoints.length < 3) return
              
              // Triangulate in 2D
              const points2D = countryPoints.map(p => [p.lon, p.lat])
              const delaunay = Delaunator.from(points2D)
              
              // Create mesh, filtering out triangles outside the polygon
              const vertices = []
              for (let i = 0; i < delaunay.triangles.length; i += 3) {
              const p1 = countryPoints[delaunay.triangles[i]]
              const p2 = countryPoints[delaunay.triangles[i + 1]]
              const p3 = countryPoints[delaunay.triangles[i + 2]]
              
              // Calculate triangle centroid
              const centroidLon = (p1.lon + p2.lon + p3.lon) / 3
              const centroidLat = (p1.lat + p2.lat + p3.lat) / 3
              
              // Only include triangles whose centroid is inside the polygon
              if (!isPointInPolygon(centroidLon, centroidLat, outerRing)) continue
              
              const pt1 = latLonToSphere(p1.lat, p1.lon, globeRadius + 0.1)
              const pt2 = latLonToSphere(p2.lat, p2.lon, globeRadius + 0.1)
              const pt3 = latLonToSphere(p3.lat, p3.lon, globeRadius + 0.1)
              
                  vertices.push(
                  pt1.x, pt1.y, pt1.z,
                  pt2.x, pt2.y, pt2.z,
                  pt3.x, pt3.y, pt3.z
                )
              }
              
              if (vertices.length > 0) {
                const geometry = new THREE.BufferGeometry()
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
                geometry.computeVertexNormals()
                
                const material = new THREE.MeshBasicMaterial({
                  color: countryColor,
                  side: THREE.DoubleSide
                })
                
                const mesh = new THREE.Mesh(geometry, material)
                mesh.userData = { name: country.properties.name }
                scene.add(mesh)
                countryMeshes.push(mesh)
                
                // Store for caching
                generatedData.countries.push({
                  name: country.properties.name,
                  vertices: Array.from(vertices)
                })
              }
            })
            
            if ((countryIdx + 1) % 50 === 0) {
              console.log(`Processed ${countryIdx + 1}/${countries.length} countries`)
            }
          })
          
          console.log(`Created ${countryMeshes.length} country meshes`)
          
          // Add borders
          countries.forEach(country => {
            const coordinates = country.geometry.type === 'Polygon'
              ? [country.geometry.coordinates]
              : country.geometry.coordinates
            
            coordinates.forEach(polygon => {
              const outerRing = polygon[0]
              const borderPoints = []
              
              outerRing.forEach(([lon, lat]) => {
                const point = latLonToSphere(lat, lon, globeRadius * 1.01)
                borderPoints.push(new THREE.Vector3(point.x, point.y, point.z))
              })
              
              const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints)
              const borderMaterial = new THREE.LineBasicMaterial({
                color: borderColor,
                transparent: true,
                opacity: 0.5
              })
              const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial)
              scene.add(borderLine)
              
              // Store for caching
              const borderData = []
              borderPoints.forEach(p => {
                borderData.push(p.x, p.y, p.z)
              })
              generatedData.borders.push(borderData)
            })
          })
          
          // Save to cache
          setCachedData(generatedData).then(() => {
            console.log('Saved globe to cache')
          }).catch(err => {
            console.error('Cache save failed:', err)
          })
        })
        .catch(err => console.error('Error loading countries:', err))
    }
    
    // Start loading
    loadGeometry()
    
    // raycaster for click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    // interaction
    let isMouseDown = false
    let hasDragged = false
    let previousMousePosition = { x: 0, y: 0 }
    
    const onMouseDown = (e) => {
      isMouseDown = true
      hasDragged = false
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }
    
    const onMouseMove = (e) => {
      if (isMouseDown) {
        const deltaX = e.clientX - previousMousePosition.x
        const deltaY = e.clientY - previousMousePosition.y
        
        // if mouse moved more than a few pixels, it's a drag
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          hasDragged = true
          
          oceanSphere.rotation.y += deltaX * 0.005
          oceanSphere.rotation.x += deltaY * 0.005
          
          // rotate all meshes
          scene.children.forEach(child => {
            if (child !== oceanSphere) {
              child.rotation.y = oceanSphere.rotation.y
              child.rotation.x = oceanSphere.rotation.x
            }
          })
          
          previousMousePosition = { x: e.clientX, y: e.clientY }
        }
      } else {
        // check for hover
        mouse.x = (e.clientX / containerRef.current.clientWidth) * 2 - 1
        mouse.y = -(e.clientY / containerRef.current.clientHeight) * 2 + 1
        
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(countryMeshes)
        
        let foundCountry = null
        if (intersects.length > 0 && intersects[0].object.userData.name) {
          foundCountry = intersects[0].object.userData.name
        }
        
        setHoveredCountry(foundCountry)
        document.body.style.cursor = foundCountry ? 'pointer' : 'grab'
      }
    }
    
    const onMouseUp = (e) => {
      if (isMouseDown && !hasDragged) {
        // click detection (only if didn't drag)
        mouse.x = (e.clientX / containerRef.current.clientWidth) * 2 - 1
        mouse.y = -(e.clientY / containerRef.current.clientHeight) * 2 + 1
        
        raycaster.setFromCamera(mouse, camera)
        
        // Check ocean first to get the near intersection point
        const oceanIntersects = raycaster.intersectObject(oceanSphere)
        const countryIntersects = raycaster.intersectObjects(countryMeshes, true)
        
        // If we hit the ocean, get the distance to the near side
        let maxDistance = Infinity
        if (oceanIntersects.length > 0) {
          // Ocean is a sphere, first intersection is the near side
          maxDistance = oceanIntersects[0].distance
        }
        
        // Only consider countries closer than the ocean's near side
        const validCountryHits = countryIntersects.filter(hit => hit.distance < maxDistance)
        
        console.log('Click detected, meshes available:', countryMeshes.length, 'valid hits:', validCountryHits.length)
        
        if (validCountryHits.length > 0 && validCountryHits[0].object.userData.name) {
          const clickedCountry = validCountryHits[0].object.userData.name
          console.log('Clicked country:', clickedCountry)
          
          // update colors: reset all to default, highlight selected
          countryMeshes.forEach(mesh => {
            if (mesh.userData.name === clickedCountry) {
              mesh.material.color.copy(countryHighlight)
            } else {
              mesh.material.color.copy(countryColor)
            }
          })
          
          setSelectedCountry(clickedCountry)
        } else {
          // clicked on ocean, reset all colors
          console.log('Clicked ocean or no valid country found')
          countryMeshes.forEach(mesh => {
            mesh.material.color.copy(countryColor)
          })
          setSelectedCountry(null)
        }
      }
      isMouseDown = false
      hasDragged = false
    }
    
    containerRef.current.addEventListener('mousedown', onMouseDown)
    containerRef.current.addEventListener('mousemove', onMouseMove)
    containerRef.current.addEventListener('mouseup', onMouseUp)
    
    // handle resize
    const handleResize = () => {
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)
    
    // animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()
    
    // cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', onMouseDown)
        containerRef.current.removeEventListener('mousemove', onMouseMove)
        containerRef.current.removeEventListener('mouseup', onMouseUp)
      }
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])
  
  return (
    <div className="app">
      <div className="globe-container" ref={containerRef}>
        {selectedCountry && (
          <div className="info-panel">
            <div className="info-title">selected country</div>
            <div className="info-content">{selectedCountry}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

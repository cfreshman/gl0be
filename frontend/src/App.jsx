import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { feature } from 'topojson-client'
import './App.css'

function App() {
  const containerRef = useRef(null)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [hoveredCountry, setHoveredCountry] = useState(null)
  
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
    
    // globe
    const globeRadius = 100
    const globeGeometry = new THREE.SphereGeometry(globeRadius, 64, 64)
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.8
    })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)
    
    // store country meshes for interaction
    const countryMeshes = []
    let countries = []
    
    // load world data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(topology => {
        countries = feature(topology, topology.objects.countries).features
        
        countries.forEach(country => {
          const countryGroup = new THREE.Group()
          countryGroup.userData = {
            name: country.properties.name,
            id: country.id
          }
          
          const coordinates = country.geometry.type === 'Polygon' 
            ? [country.geometry.coordinates]
            : country.geometry.coordinates
          
          coordinates.forEach(polygon => {
            polygon.forEach(ring => {
              const points = []
              
              ring.forEach(([lon, lat]) => {
                const phi = (90 - lat) * (Math.PI / 180)
                const theta = (lon + 180) * (Math.PI / 180)
                
                const x = -(globeRadius + 0.1) * Math.sin(phi) * Math.cos(theta)
                const y = (globeRadius + 0.1) * Math.cos(phi)
                const z = (globeRadius + 0.1) * Math.sin(phi) * Math.sin(theta)
                
                points.push(new THREE.Vector3(x, y, z))
              })
              
              if (points.length > 2) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points)
                const material = new THREE.LineBasicMaterial({
                  color: 0x4a9eff,
                  transparent: true,
                  opacity: 0.6
                })
                const line = new THREE.Line(geometry, material)
                countryGroup.add(line)
              }
            })
          })
          
          scene.add(countryGroup)
          countryMeshes.push(countryGroup)
        })
      })
    
    // raycaster for click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    // interaction
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    
    const onMouseDown = (e) => {
      isDragging = true
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }
    
    const onMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x
        const deltaY = e.clientY - previousMousePosition.y
        
        globe.rotation.y += deltaX * 0.005
        globe.rotation.x += deltaY * 0.005
        
        // rotate all country meshes with globe
        countryMeshes.forEach(mesh => {
          mesh.rotation.y = globe.rotation.y
          mesh.rotation.x = globe.rotation.x
        })
        
        previousMousePosition = { x: e.clientX, y: e.clientY }
      } else {
        // check for hover
        mouse.x = (e.clientX / containerRef.current.clientWidth) * 2 - 1
        mouse.y = -(e.clientY / containerRef.current.clientHeight) * 2 + 1
        
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(scene.children, true)
        
        let foundCountry = null
        for (let intersect of intersects) {
          let obj = intersect.object
          while (obj.parent && !obj.userData.name) {
            obj = obj.parent
          }
          if (obj.userData.name) {
            foundCountry = obj.userData.name
            break
          }
        }
        
        setHoveredCountry(foundCountry)
        document.body.style.cursor = foundCountry ? 'pointer' : 'grab'
      }
    }
    
    const onMouseUp = (e) => {
      if (!isDragging) {
        // click detection
        mouse.x = (e.clientX / containerRef.current.clientWidth) * 2 - 1
        mouse.y = -(e.clientY / containerRef.current.clientHeight) * 2 + 1
        
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(scene.children, true)
        
        for (let intersect of intersects) {
          let obj = intersect.object
          while (obj.parent && !obj.userData.name) {
            obj = obj.parent
          }
          if (obj.userData.name) {
            setSelectedCountry(obj.userData.name)
            break
          }
        }
      }
      isDragging = false
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
            <div className="info-hint">click another country or drag to rotate</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App


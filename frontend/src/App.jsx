import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import Delaunator from 'delaunator'
import './App.css'

const GLOBE_VERSION = 3 // Increment when algorithm changes
const GLOBE_GEOMETRY_URL = 'https://p057.co/:1w4a3vqswy1i.json'

// Globe themes
const THEMES = {
  default: {
    ocean: '#2158a0',
    country: '#366b4a',
    highlight: '#55b080',
    border: '#4a9eff',
    background: '#0a0a0a',
    population: '#ffcc00'
  },
  vibrant: {
    ocean: '#81abe1',
    country: '#127437',
    highlight: '#1a9c57',
    border: '#a0ffeb',
    background: '#0a0a0a',
    population: '#ff00ff'
  },
  paper: {
    ocean: '#7ba8d1',
    country: '#8fbc8f',
    highlight: '#a8d5a8',
    border: '#5a8db8',
    background: '#f5f5dc',
    population: '#d2691e'
  },
  noir: {
    ocean: '#1a1a1a',
    country: '#2d2d2d',
    highlight: '#4a4a4a',
    border: '#666666',
    background: '#000000',
    population: '#cccccc'
  },
  matrix: {
    ocean: '#001100',
    country: '#003300',
    highlight: '#00ff00',
    border: '#00ff41',
    background: '#000000',
    population: '#00ff00'
  },
  midnight: {
    ocean: '#1e3a5f',
    country: '#2d2d44',
    highlight: '#4a4a6a',
    border: '#6b8cae',
    background: '#0d0d1a',
    population: '#87ceeb'
  },
  forest: {
    ocean: '#4a7c8e',
    country: '#2d5016',
    highlight: '#4a7c2d',
    border: '#7da87b',
    background: '#1a1f15',
    population: '#adff2f'
  },
  desert: {
    ocean: '#5b8fa3',
    country: '#c19a6b',
    highlight: '#d4af7a',
    border: '#8b7355',
    background: '#2d2416',
    population: '#ff8c00'
  },
  arctic: {
    ocean: '#4682b4',
    country: '#dcdcdc',
    highlight: '#ffffff',
    border: '#87ceeb',
    background: '#0a0a0a',
    population: '#00ffff'
  },
  ocean: {
    ocean: '#006994',
    country: '#004e71',
    highlight: '#0099cc',
    border: '#66d9ef',
    background: '#001a33',
    population: '#40e0d0'
  },
  sunset: {
    ocean: '#2d4a7c',
    country: '#8b4513',
    highlight: '#cd853f',
    border: '#ff6347',
    background: '#1a1520',
    population: '#ff69b4'
  },
  neon: {
    ocean: '#1a1a2e',
    country: '#16213e',
    highlight: '#0f3460',
    border: '#00ffff',
    background: '#0d0d0d',
    population: '#00ffff'
  },
  candy: {
    ocean: '#ff6b9d',
    country: '#c44569',
    highlight: '#f8b500',
    border: '#ffeaa7',
    background: '#1e1e2e',
    population: '#ffff00'
  },
  retro: {
    ocean: '#5f9ea0',
    country: '#cd853f',
    highlight: '#daa520',
    border: '#f4a460',
    background: '#2f2f1f',
    population: '#ff8c00'
  },
  cyberpunk: {
    ocean: '#0a0e27',
    country: '#1c1c3a',
    highlight: '#5d3fd3',
    border: '#ff00ff',
    background: '#050510',
    population: '#ff00ff'
  },
  volcano: {
    ocean: '#1a1a2e',
    country: '#8b2500',
    highlight: '#ff4500',
    border: '#ff6347',
    background: '#0a0a0a',
    population: '#ff4500'
  },
  tropical: {
    ocean: '#0077be',
    country: '#00a86b',
    highlight: '#7cfc00',
    border: '#ffd700',
    background: '#003049',
    population: '#ffd700'
  },
  autumn: {
    ocean: '#5b7c99',
    country: '#8b4513',
    highlight: '#d2691e',
    border: '#cd853f',
    background: '#1a1410',
    population: '#ff8c00'
  },
  rugged: {
    ocean: '#d6caa9',
    country: '#366b4a',
    highlight: '#55b080',
    border: '#b8ff4d',
    background: '#121113',
    population: '#55b080'
  },
  lavender: {
    ocean: '#9b88c4',
    country: '#b8a8d6',
    highlight: '#d4c5f0',
    border: '#e6d5ff',
    background: '#f5f0ff',
    population: '#ffffff'
  },
  red: {
    ocean: '#8b0000',
    country: '#b22222',
    highlight: '#ff4444',
    border: '#ff6b6b',
    background: '#1a0000',
    population: '#ff6b6b'
  },
  orange: {
    ocean: '#cc5500',
    country: '#ff8c00',
    highlight: '#ffa500',
    border: '#ffb347',
    background: '#1a0f00',
    population: '#ffd700'
  },
  green: {
    ocean: '#006400',
    country: '#228b22',
    highlight: '#32cd32',
    border: '#90ee90',
    background: '#001a00',
    population: '#adff2f'
  },
  blue: {
    ocean: '#00008b',
    country: '#0000cd',
    highlight: '#4169e1',
    border: '#87ceeb',
    background: '#00001a',
    population: '#87ceeb'
  },
  pink: {
    ocean: '#c71585',
    country: '#ff1493',
    highlight: '#ff69b4',
    border: '#ffb6c1',
    background: '#1a0010',
    population: '#ffb6c1'
  },
  black: {
    ocean: '#4a4a4a',
    country: '#6a6a6a',
    highlight: '#8a8a8a',
    border: '#aaaaaa',
    background: '#f0f0f0',
    population: '#ffffff'
  }
}

// Helper to convert HSL to hex
function hslToHex(h, s, l) {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = n => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Generate theme from hue (0-360)
function generateHueTheme(hue) {
  const sat = 60 // saturation percentage
  return {
    ocean: hslToHex(hue, sat, 25),
    country: hslToHex(hue, sat, 40),
    highlight: hslToHex(hue, sat, 55),
    border: hslToHex(hue, sat, 70),
    background: hslToHex(hue, 20, 8),
    population: hslToHex(hue, 80, 60)
  }
}

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
  const sceneRef = useRef(null)
  const bordersVisibleRef = useRef(true)
  const populationVisibleRef = useRef(true)
  const panelVisibleRef = useRef(true)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [hoveredCountry, setHoveredCountry] = useState(null)
  const [themePanelOpen, setThemePanelOpen] = useState(false)
  const [panelVisible, setPanelVisible] = useState(true)
  const [currentThemeName, setCurrentThemeName] = useState('default')
  const [bordersVisible, setBordersVisible] = useState(true)
  const [populationVisible, setPopulationVisible] = useState(true)
  const [displayColors, setDisplayColors] = useState({
    ocean: '#2158a0',
    country: '#366b4a',
    highlight: '#55b080',
    border: '#4a9eff',
    background: '#0a0a0a'
  })
  const [customColors, setCustomColors] = useState({
    ocean: '#2158a0',
    country: '#366b4a',
    highlight: '#55b080',
    border: '#4a9eff',
    background: '#0a0a0a'
  })
  
  useEffect(() => {
    // Store current theme
    let currentTheme = 'default'
    
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
      },
      setTheme: (themeName) => {
        if (!THEMES[themeName]) {
          console.error(`Theme "${themeName}" not found. Available themes:`, Object.keys(THEMES).join(', '))
          return
        }
        
        const theme = THEMES[themeName]
        const root = document.documentElement
        
        // Update CSS variables
        root.style.setProperty('--ocean-color', theme.ocean)
        root.style.setProperty('--country-color', theme.country)
        root.style.setProperty('--country-highlight', theme.highlight)
        root.style.setProperty('--country-border', theme.border)
        root.style.setProperty('--globe-background', theme.background)
        root.style.setProperty('--population-color', theme.population)
        
        currentTheme = themeName
        console.log(`Theme set to: ${themeName}`)
        
        // Update URL params
        const url = new URL(window.location)
        url.searchParams.delete('hue')
        url.searchParams.delete('ocean')
        url.searchParams.delete('country')
        url.searchParams.delete('highlight')
        url.searchParams.delete('border')
        url.searchParams.delete('bg')
        url.searchParams.set('theme', themeName)
        window.history.replaceState({}, '', url)
        
        // Trigger a re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }))
      },
      listThemes: () => {
        console.log('Available themes:')
        Object.keys(THEMES).forEach(name => {
          const marker = name === currentTheme ? '→' : ' '
          console.log(`${marker} ${name}`)
        })
      },
      currentTheme: () => currentTheme,
      nextTheme: () => {
        const themeNames = Object.keys(THEMES)
        const currentIndex = themeNames.indexOf(currentTheme)
        const nextIndex = (currentIndex + 1) % themeNames.length
        const nextTheme = themeNames[nextIndex]
        window.control.setTheme(nextTheme)
      },
      prevTheme: () => {
        const themeNames = Object.keys(THEMES)
        const currentIndex = themeNames.indexOf(currentTheme)
        const prevIndex = (currentIndex - 1 + themeNames.length) % themeNames.length
        const prevTheme = themeNames[prevIndex]
        window.control.setTheme(prevTheme)
      },
      setHue: (hue) => {
        if (typeof hue !== 'number' || hue < 0 || hue > 360) {
          console.error('Hue must be a number between 0 and 360')
          return
        }
        
        const theme = generateHueTheme(hue)
        const root = document.documentElement
        
        // Update CSS variables
        root.style.setProperty('--ocean-color', theme.ocean)
        root.style.setProperty('--country-color', theme.country)
        root.style.setProperty('--country-highlight', theme.highlight)
        root.style.setProperty('--country-border', theme.border)
        root.style.setProperty('--globe-background', theme.background)
        root.style.setProperty('--population-color', theme.population)
        
        currentTheme = `hue-${hue}`
        console.log(`Hue theme set to: ${hue}°`)
        
        // Update URL params
        const url = new URL(window.location)
        url.searchParams.delete('theme')
        url.searchParams.delete('ocean')
        url.searchParams.delete('country')
        url.searchParams.delete('highlight')
        url.searchParams.delete('border')
        url.searchParams.delete('bg')
        url.searchParams.set('hue', hue)
        window.history.replaceState({}, '', url)
        
        // Trigger a re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: currentTheme } }))
      },
      setBorders: (visible) => {
        bordersVisibleRef.current = visible
        setBordersVisible(visible)
        
        // Update URL params
        const url = new URL(window.location)
        if (visible) {
          url.searchParams.delete('borders')
        } else {
          url.searchParams.set('borders', 'off')
        }
        window.history.replaceState({}, '', url)
        
        // Update border visibility
        if (sceneRef.current) {
          sceneRef.current.children.forEach(child => {
            if (child.userData.type === 'border') {
              child.visible = visible
            }
          })
        }
        
        console.log(`Borders ${visible ? 'enabled' : 'disabled'}`)
      },
      toggleBorders: () => {
        window.control.setBorders(!bordersVisibleRef.current)
      },
      bordersVisible: () => bordersVisibleRef.current,
      setPopulation: (visible) => {
        populationVisibleRef.current = visible
        setPopulationVisible(visible)
        
        // Update URL params
        const url = new URL(window.location)
        if (visible) {
          url.searchParams.delete('population')
        } else {
          url.searchParams.set('population', 'off')
        }
        window.history.replaceState({}, '', url)
        
        // Update population visibility
        if (sceneRef.current) {
          sceneRef.current.children.forEach(child => {
            if (child.type === 'Points' && child.userData.type === 'population_points') {
              child.visible = visible
            }
          })
        }
        
        console.log(`Population ${visible ? 'enabled' : 'disabled'}`)
      },
      togglePopulation: () => {
        window.control.setPopulation(!populationVisibleRef.current)
      },
      populationVisible: () => populationVisibleRef.current,
      setPanel: (visible) => {
        panelVisibleRef.current = visible
        setPanelVisible(visible)
        
        // Update URL params
        const url = new URL(window.location)
        if (visible) {
          url.searchParams.delete('panel')
        } else {
          url.searchParams.set('panel', 'off')
        }
        window.history.replaceState({}, '', url)
        
        console.log(`Panel ${visible ? 'enabled' : 'disabled'}`)
      },
      togglePanel: () => {
        window.control.setPanel(!panelVisibleRef.current)
      },
      panelVisible: () => panelVisibleRef.current
    }
    
    console.log('Debug controls available:')
    console.log('  control.downloadGeometry() - download geometry file')
    console.log('  control.setTheme(name) - change globe theme')
    console.log('  control.setHue(0-360) - set custom hue theme')
    console.log('  control.listThemes() - list all themes')
    console.log('  control.currentTheme() - get current theme')
    console.log('  control.nextTheme() - cycle to next theme')
    console.log('  control.prevTheme() - cycle to previous theme')
    console.log('  control.setBorders(true/false) - show/hide borders')
    console.log('  control.toggleBorders() - toggle borders')
    console.log('  control.setPopulation(true/false) - show/hide population')
    console.log('  control.togglePopulation() - toggle population')
    console.log('  control.setPanel(true/false) - show/hide panel')
    console.log('  control.togglePanel() - toggle panel')
    console.log('  or use ?hue=0-360 in URL for custom hue theme')
    console.log('  or use ?borders=off in URL to hide borders')
    console.log('  or use ?population=off in URL to hide population')
    console.log('  or use ?panel=off in URL to hide panel')
    
    // Check for hue, theme, borders, or population in URL params and apply it
    const url = new URL(window.location)
    const hueParam = url.searchParams.get('hue')
    const urlTheme = url.searchParams.get('theme')
    const bordersParam = url.searchParams.get('borders')
    const populationParam = url.searchParams.get('population')
    const panelParam = url.searchParams.get('panel')
    
    if (hueParam !== null) {
      const hue = parseInt(hueParam)
      if (!isNaN(hue) && hue >= 0 && hue <= 360) {
        const theme = generateHueTheme(hue)
        const root = document.documentElement
        
        root.style.setProperty('--ocean-color', theme.ocean)
        root.style.setProperty('--country-color', theme.country)
        root.style.setProperty('--country-highlight', theme.highlight)
        root.style.setProperty('--country-border', theme.border)
        root.style.setProperty('--globe-background', theme.background)
        root.style.setProperty('--population-color', theme.population)
        
        currentTheme = `hue-${hue}`
        console.log(`Applied hue theme: ${hue}°`)
        
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: currentTheme } }))
      } else {
        console.error('Hue must be between 0 and 360')
      }
    } else if (urlTheme && THEMES[urlTheme]) {
      window.control.setTheme(urlTheme)
    } else if (url.searchParams.has('ocean')) {
      // Load custom theme from URL params
      const customTheme = {
        ocean: '#' + (url.searchParams.get('ocean') || '2158a0'),
        country: '#' + (url.searchParams.get('country') || '366b4a'),
        highlight: '#' + (url.searchParams.get('highlight') || '55b080'),
        border: '#' + (url.searchParams.get('border') || '4a9eff'),
        background: '#' + (url.searchParams.get('bg') || '0a0a0a')
      }
      
      const root = document.documentElement
      root.style.setProperty('--ocean-color', customTheme.ocean)
      root.style.setProperty('--country-color', customTheme.country)
      root.style.setProperty('--country-highlight', customTheme.highlight)
      root.style.setProperty('--country-border', customTheme.border)
      root.style.setProperty('--globe-background', customTheme.background)
      root.style.setProperty('--population-color', customTheme.highlight) // Population uses highlight color
      
      currentTheme = 'custom'
      console.log('Applied custom theme from URL')
      
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'custom' } }))
    }
    
    // Apply borders parameter from URL
    if (bordersParam === 'off' || bordersParam === 'false') {
      bordersVisibleRef.current = false
      setBordersVisible(false)
      console.log('Borders disabled from URL param')
    }
    
    // Apply population parameter from URL
    if (populationParam === 'off' || populationParam === 'false') {
      populationVisibleRef.current = false
      setPopulationVisible(false)
      console.log('Population disabled from URL param')
    }
    
    // Apply panel parameter from URL
    if (panelParam === 'off' || panelParam === 'false') {
      panelVisibleRef.current = false
      setPanelVisible(false)
      console.log('Panel disabled from URL param')
    }
  }, [])
  
  // Listen for theme changes and update state
  useEffect(() => {
    const updateThemeName = () => {
      const url = new URL(window.location)
      if (url.searchParams.has('hue')) {
        setCurrentThemeName(`hue-${url.searchParams.get('hue')}`)
      } else if (url.searchParams.has('ocean')) {
        setCurrentThemeName('custom')
      } else {
        setCurrentThemeName(url.searchParams.get('theme') || 'default')
      }
    }
    
    const handleThemeChange = () => {
      updateThemeName()
      // Update display colors
      const styles = getComputedStyle(document.documentElement)
      setDisplayColors({
        ocean: styles.getPropertyValue('--ocean-color').trim(),
        country: styles.getPropertyValue('--country-color').trim(),
        highlight: styles.getPropertyValue('--country-highlight').trim(),
        border: styles.getPropertyValue('--country-border').trim(),
        background: styles.getPropertyValue('--globe-background').trim()
      })
    }
    
    // Update on initial load
    handleThemeChange()
    
    // Listen for theme changes
    window.addEventListener('themechange', handleThemeChange)
    
    return () => {
      window.removeEventListener('themechange', handleThemeChange)
    }
  }, [])
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene
    const styles = getComputedStyle(document.documentElement)
    const bgColor = styles.getPropertyValue('--globe-background').trim() || '#0a0a0a'
    scene.background = new THREE.Color(bgColor)
    
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
    
    // Helper to get current colors from CSS variables
    const getCurrentColors = () => {
      const styles = getComputedStyle(document.documentElement)
      return {
        ocean: new THREE.Color(styles.getPropertyValue('--ocean-color').trim()),
        country: new THREE.Color(styles.getPropertyValue('--country-color').trim()),
        highlight: new THREE.Color(styles.getPropertyValue('--country-highlight').trim()),
        border: new THREE.Color(styles.getPropertyValue('--country-border').trim()),
        background: new THREE.Color(styles.getPropertyValue('--globe-background').trim() || '#0a0a0a'),
        population: new THREE.Color(styles.getPropertyValue('--population-color').trim() || '#ffcc00')
      }
    }
    
    // get initial colors from CSS variables
    const colors = getCurrentColors()
    
    // globe settings
    const globeRadius = 100
    
    // ocean sphere
    const oceanSphere = new THREE.Mesh(
      new THREE.SphereGeometry(globeRadius * .99, 64, 64),
      new THREE.MeshBasicMaterial({ color: colors.ocean })
    )
    scene.add(oceanSphere)
    
    // Load saved camera rotation from localStorage and apply to all elements later
    const savedRotation = localStorage.getItem('globeRotation')
    let initialRotation = { x: 0, y: 0 }
    if (savedRotation) {
      try {
        initialRotation = JSON.parse(savedRotation)
        oceanSphere.rotation.x = initialRotation.x
        oceanSphere.rotation.y = initialRotation.y
        console.log('Restored globe rotation:', initialRotation)
      } catch (e) {
        console.error('Failed to restore globe rotation:', e)
      }
    }
    
    const countryMeshes = []
    let countries = []
    
    // Helper function to render geometry data
    const renderGeometry = (data) => {
      const currentColors = getCurrentColors()
      
      // Recreate meshes from data
      data.countries.forEach(countryData => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(countryData.vertices, 3))
        geometry.computeVertexNormals()
        
        const material = new THREE.MeshBasicMaterial({
          color: currentColors.country,
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
          color: currentColors.border,
          transparent: true,
          opacity: 0.5
        })
        const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial)
        borderLine.userData.type = 'border'
        borderLine.visible = bordersVisibleRef.current
        scene.add(borderLine)
      })
      
      console.log(`Loaded ${countryMeshes.length} countries`)
      
      // Apply saved rotation to all loaded elements
      if (initialRotation.x !== 0 || initialRotation.y !== 0) {
        scene.children.forEach(child => {
          if (child !== oceanSphere) {
            child.rotation.x = initialRotation.x
            child.rotation.y = initialRotation.y
          }
        })
      }
    }
    
    // Try to load geometry: local file -> remote URL -> IndexedDB cache -> generate
    const loadGeometry = async () => {
      // Try local static file first
      try {
        const response = await fetch(`/globe-geometry-v${GLOBE_VERSION}.json`)
        if (response.ok) {
          const data = await response.json()
          console.log('Loading globe from local static file...')
          renderGeometry(data)
          return
        }
      } catch (err) {
        console.log('No local static file found, trying remote...')
      }
      
      // Try remote URL second
      try {
        const response = await fetch(GLOBE_GEOMETRY_URL)
        if (response.ok) {
          const data = await response.json()
          console.log('Loading globe from remote URL...')
          renderGeometry(data)
          return
        }
      } catch (err) {
        console.log('Remote URL failed, checking cache...')
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
      
      // Generate if not loaded from any source (and cache the result)
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
                
                const currentColors = getCurrentColors()
                const material = new THREE.MeshBasicMaterial({
                  color: currentColors.country,
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
              
              const currentColors = getCurrentColors()
              const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints)
              const borderMaterial = new THREE.LineBasicMaterial({
                color: currentColors.border,
                transparent: true,
                opacity: 0.5
              })
              const borderLine = new THREE.LineLoop(borderGeometry, borderMaterial)
              borderLine.userData.type = 'border'
              borderLine.visible = bordersVisibleRef.current
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
    
    // Population heightmap
    const loadPopulationHeightmap = async () => {
      console.log('Loading population grid data...')
      
      try {
        // Try loading from local file first, then remote URL
        let gridData
        try {
          const response = await fetch('/population_grid.json')
          if (!response.ok) throw new Error('Local file not found')
          gridData = await response.json()
          console.log('Loaded population grid from local file')
        } catch (err) {
          console.log('Local population grid not found, loading from remote...')
          const response = await fetch('https://p057.co/:7u15a05rz01u.json')
          if (!response.ok) throw new Error('Failed to load population grid from remote')
          gridData = await response.json()
          console.log('Loaded population grid from remote URL')
        }
        
        console.log(`Loaded ${gridData.total_points} population grid points`)
        console.log(`Data source: ${gridData.data_source}`)
        
        const points = gridData.points
        const heightData = []
        
        // Find max population for scaling
        let maxPop = 0
        points.forEach(point => {
          if (point.population > maxPop) maxPop = point.population
        })
        
        console.log(`Max population density: ${maxPop.toFixed(2)} people/sq km`)
        
        // Create height data with logarithmic scaling
        points.forEach(point => {
          // Logarithmic scale for height (population density varies by orders of magnitude)
          const height = point.population > 0 ? Math.log10(point.population + 1) : 0
          heightData.push(height)
        })
        
        console.log(`Generated heights for ${points.length} points`)
        
        // Find min and max height for opacity scaling (excluding zeros)
        const nonZeroHeights = heightData.filter(h => h > 0)
        const minHeight = Math.min(...nonZeroHeights)
        const maxHeight = Math.max(...nonZeroHeights)
        console.log(`Height range: ${minHeight.toFixed(2)} to ${maxHeight.toFixed(2)}`)
        
        // Get current border color
        const currentColors = getCurrentColors()
        
        // Create circular texture for points
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 64, 64)
        const circleTexture = new THREE.CanvasTexture(canvas)
        
        // Bucket points into 20 opacity groups
        const numGroups = 20
        const groups = Array.from({ length: numGroups }, () => [])
        
        points.forEach((point, i) => {
          const pop = point.population
          if (pop === 0) return // Skip ocean
          
          const height = heightData[i]
          const opacity = (height - minHeight) / (maxHeight - minHeight)
          
          // Determine which opacity bucket (0 to numGroups-1)
          const bucket = Math.min(Math.floor(opacity * numGroups), numGroups - 1)
          
          const baseRadius = globeRadius * 1.005
          const position = latLonToSphere(point.lat, point.lon, baseRadius)
          
          groups[bucket].push(position)
        })
        
        // Create a point cloud for each opacity group
        let totalRendered = 0
        groups.forEach((groupPositions, groupIdx) => {
          if (groupPositions.length === 0) return
          
          const positions = []
          groupPositions.forEach(pos => {
            positions.push(pos.x, pos.y, pos.z)
          })
          
          const geometry = new THREE.BufferGeometry()
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          
          // Calculate opacity for this group (0.05 to 1.0)
          const groupOpacity = (groupIdx + 1) / numGroups
          
          const material = new THREE.PointsMaterial({
            map: circleTexture,
            color: currentColors.highlight,
            size: 1.8,
            transparent: true,
            opacity: groupOpacity,
            sizeAttenuation: true,
            alphaTest: 0.1
          })
          
          const pointCloud = new THREE.Points(geometry, material)
          pointCloud.userData = { type: 'population_points' }
          pointCloud.visible = populationVisibleRef.current
          scene.add(pointCloud)
          
          totalRendered += groupPositions.length
        })
        
        console.log(`Rendered ${totalRendered} population points in ${numGroups} opacity groups (${points.length - totalRendered} ocean points skipped)`)
        
        // Apply saved rotation to population points
        if (initialRotation.x !== 0 || initialRotation.y !== 0) {
          scene.children.forEach(child => {
            if (child.type === 'Points' && child.userData.type === 'population_points') {
              child.rotation.x = initialRotation.x
              child.rotation.y = initialRotation.y
            }
          })
        }
      } catch (err) {
        console.error('Error loading population heightmap:', err)
      }
    }
    
    loadPopulationHeightmap()
    
    // Track current selection
    let currentSelectedCountry = null
    
    // Handle theme changes
    const onThemeChange = () => {
      const styles = getComputedStyle(document.documentElement)
      const newOceanColor = new THREE.Color(styles.getPropertyValue('--ocean-color').trim())
      const newCountryColor = new THREE.Color(styles.getPropertyValue('--country-color').trim())
      const newCountryHighlight = new THREE.Color(styles.getPropertyValue('--country-highlight').trim())
      const newBorderColor = new THREE.Color(styles.getPropertyValue('--country-border').trim())
      const newBackgroundColor = new THREE.Color(styles.getPropertyValue('--globe-background').trim() || '#0a0a0a')
      
      // Update scene background
      scene.background.copy(newBackgroundColor)
      
      // Update ocean sphere
      oceanSphere.material.color.copy(newOceanColor)
      
      // Update country meshes
      countryMeshes.forEach(mesh => {
        const isHighlighted = mesh.userData.name === currentSelectedCountry
        mesh.material.color.copy(isHighlighted ? newCountryHighlight : newCountryColor)
      })
      
      // Update borders
      scene.children.forEach(child => {
        if (child.type === 'LineLoop') {
          child.material.color.copy(newBorderColor)
        }
      })
      
      // Update population points
      scene.children.forEach(child => {
        if (child.type === 'Points' && child.userData.type === 'population_points') {
          child.material.color.copy(newCountryHighlight)
        }
      })
    }
    
    window.addEventListener('themechange', onThemeChange)
    
    // raycaster for click detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    
    // interaction
    let isPointerDown = false
    let hasDragged = false
    let previousPointerPosition = { x: 0, y: 0 }
    
    const onPointerDown = (e) => {
      // Ignore if clicking on theme panel or any UI elements
      if (e.target.closest('.theme-panel') || e.target.closest('.theme-toggle') || e.target.closest('.info-panel')) {
        return
      }
      isPointerDown = true
      hasDragged = false
      previousPointerPosition = { x: e.clientX, y: e.clientY }
    }
    
    const onPointerMove = (e) => {
      if (isPointerDown) {
        // Ignore if over theme panel
        if (e.target.closest('.theme-panel')) {
          return
        }
        const deltaX = e.clientX - previousPointerPosition.x
        const deltaY = e.clientY - previousPointerPosition.y
        
        // if pointer moved more than a few pixels, it's a drag
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
          
          // Save rotation to localStorage
          localStorage.setItem('globeRotation', JSON.stringify({
            x: oceanSphere.rotation.x,
            y: oceanSphere.rotation.y
          }))
          
          previousPointerPosition = { x: e.clientX, y: e.clientY }
        }
      } else if (!e.target.closest('.theme-panel') && !e.target.closest('.theme-toggle') && !e.target.closest('.info-panel')) {
        // check for hover (only if not over UI elements)
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
    
    const onPointerUp = (e) => {
      // Ignore if clicking on theme panel or any UI elements
      if (e.target.closest('.theme-panel') || e.target.closest('.theme-toggle') || e.target.closest('.info-panel')) {
        isPointerDown = false
        return
      }
      
      if (isPointerDown && !hasDragged) {
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
          
          // Get current theme colors
          const currentColors = getCurrentColors()
          
          // update colors: reset all to default, highlight selected
          countryMeshes.forEach(mesh => {
            if (mesh.userData.name === clickedCountry) {
              mesh.material.color.copy(currentColors.highlight)
            } else {
              mesh.material.color.copy(currentColors.country)
            }
          })
          
          currentSelectedCountry = clickedCountry
          setSelectedCountry(clickedCountry)
        } else {
          // clicked on ocean, reset all colors
          console.log('Clicked ocean or no valid country found')
          const currentColors = getCurrentColors()
          countryMeshes.forEach(mesh => {
            mesh.material.color.copy(currentColors.country)
          })
          currentSelectedCountry = null
          setSelectedCountry(null)
        }
      }
      isPointerDown = false
      hasDragged = false
    }
    
    containerRef.current.addEventListener('pointerdown', onPointerDown)
    containerRef.current.addEventListener('pointermove', onPointerMove)
    containerRef.current.addEventListener('pointerup', onPointerUp)
    
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
      window.removeEventListener('themechange', onThemeChange)
      if (containerRef.current) {
        containerRef.current.removeEventListener('pointerdown', onPointerDown)
        containerRef.current.removeEventListener('pointermove', onPointerMove)
        containerRef.current.removeEventListener('pointerup', onPointerUp)
      }
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      sceneRef.current = null
    }
  }, [])
  
  // Apply custom theme from color pickers
  const applyCustomTheme = () => {
    const root = document.documentElement
    root.style.setProperty('--ocean-color', customColors.ocean)
    root.style.setProperty('--country-color', customColors.country)
    root.style.setProperty('--country-highlight', customColors.highlight)
    root.style.setProperty('--country-border', customColors.border)
    root.style.setProperty('--globe-background', customColors.background)
    root.style.setProperty('--population-color', customColors.highlight) // Population uses highlight color
    
    // Update URL params with custom colors
    const url = new URL(window.location)
    url.searchParams.delete('theme')
    url.searchParams.delete('hue')
    url.searchParams.set('ocean', customColors.ocean.replace('#', ''))
    url.searchParams.set('country', customColors.country.replace('#', ''))
    url.searchParams.set('highlight', customColors.highlight.replace('#', ''))
    url.searchParams.set('border', customColors.border.replace('#', ''))
    url.searchParams.set('bg', customColors.background.replace('#', ''))
    window.history.replaceState({}, '', url)
    
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'custom' } }))
    console.log('Applied custom theme')
  }
  
  return (
    <div className="app">
      <div className="globe-container" ref={containerRef}>
        {selectedCountry && (
          <div className="info-panel">
            <div className="info-title">selected country</div>
            <div className="info-content">{selectedCountry}</div>
          </div>
        )}
        
        {panelVisible && (
          <>
            {!themePanelOpen ? (
              <button className="theme-toggle" onClick={() => setThemePanelOpen(true)}>
                open controls
              </button>
            ) : (
          <div 
            className="theme-panel"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="theme-panel-header">
              <div className="theme-panel-title">controls</div>
              <button className="theme-close" onClick={() => setThemePanelOpen(false)}>×</button>
            </div>
            
            <div>
              <div className="theme-section-title">visibility</div>
              <div className="visibility-controls">
                <label className="visibility-item">
                  <input
                    type="checkbox"
                    checked={bordersVisible}
                    onChange={(e) => window.control?.setBorders(e.target.checked)}
                  />
                  <span>borders</span>
                </label>
                <label className="visibility-item">
                  <input
                    type="checkbox"
                    checked={populationVisible}
                    onChange={(e) => window.control?.setPopulation(e.target.checked)}
                  />
                  <span>population</span>
                </label>
                <label className="visibility-item">
                  <input
                    type="checkbox"
                    checked={panelVisible}
                    onChange={(e) => window.control?.setPanel(e.target.checked)}
                  />
                  <span>controls</span>
                </label>
              </div>
            </div>
            
            <div>
              <div className="theme-section-title">theme</div>
              <select 
                className="theme-select"
                value={THEMES[currentThemeName] ? currentThemeName : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    window.control?.setTheme(e.target.value)
                  }
                }}
              >
                {!THEMES[currentThemeName] && (
                  <option value="">{currentThemeName}</option>
                )}
                {Object.keys(THEMES).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="theme-preview" style={{ marginTop: 'var(--gap-md)' }}>
                <div className="theme-swatch" style={{ background: displayColors.ocean }} />
                <div className="theme-swatch" style={{ background: displayColors.country }} />
                <div className="theme-swatch" style={{ background: displayColors.highlight }} />
                <div className="theme-swatch" style={{ background: displayColors.border }} />
              </div>
            </div>
            
            <div>
              <div className="theme-section-title">custom</div>
              <div className="custom-theme">
                <div className="color-input-group">
                  <div className="color-input-label">ocean</div>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-input"
                      value={customColors.ocean}
                      onChange={(e) => setCustomColors({ ...customColors, ocean: e.target.value })}
                    />
                    <input
                      type="text"
                      className="color-hex"
                      value={customColors.ocean}
                      onChange={(e) => setCustomColors({ ...customColors, ocean: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="color-input-group">
                  <div className="color-input-label">country</div>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-input"
                      value={customColors.country}
                      onChange={(e) => setCustomColors({ ...customColors, country: e.target.value })}
                    />
                    <input
                      type="text"
                      className="color-hex"
                      value={customColors.country}
                      onChange={(e) => setCustomColors({ ...customColors, country: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="color-input-group">
                  <div className="color-input-label">highlight</div>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-input"
                      value={customColors.highlight}
                      onChange={(e) => setCustomColors({ ...customColors, highlight: e.target.value })}
                    />
                    <input
                      type="text"
                      className="color-hex"
                      value={customColors.highlight}
                      onChange={(e) => setCustomColors({ ...customColors, highlight: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="color-input-group">
                  <div className="color-input-label">border</div>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-input"
                      value={customColors.border}
                      onChange={(e) => setCustomColors({ ...customColors, border: e.target.value })}
                    />
                    <input
                      type="text"
                      className="color-hex"
                      value={customColors.border}
                      onChange={(e) => setCustomColors({ ...customColors, border: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="color-input-group">
                  <div className="color-input-label">background</div>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      className="color-input"
                      value={customColors.background}
                      onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                    />
                    <input
                      type="text"
                      className="color-hex"
                      value={customColors.background}
                      onChange={(e) => setCustomColors({ ...customColors, background: e.target.value })}
                    />
                  </div>
                </div>
                
                <button className="apply-custom-btn" onClick={applyCustomTheme}>
                  apply custom theme
                </button>
              </div>
            </div>
          </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App

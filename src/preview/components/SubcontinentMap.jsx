/**
 * Interactive Global World Continents Map powered by MapLibre GL JS & MapTiler Cloud.
 *
 * Renders full-world continental climatology across all 7 continents:
 * (Asia, Africa, Europe, North America, South America, Oceania, Antarctica)
 * with genuine NASA POWER monthly observations, dynamic choropleth scaling,
 * interactive continent badges, and fluid camera navigation.
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { usePreview } from '../state/PreviewContext'
import { displayKey, divisionDisplayValues } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { CONTINENTS, CONTINENT_BY_ID, WORLD_BOUNDS } from '../data/world'
import { fmtValue } from '../lib/format'
import worldGeoJson from '../data/world-regions.json'
import worldCountriesGeoJson from '../data/world-countries.json'
import { findCountry, MICRO_STATES } from '../lib/countries'
import Timeline from './Timeline'
import MapAudioControls from './MapAudioControls'

// Register worker bundle explicitly for Vite bundler compatibility
if (typeof maplibregl.setWorkerUrl === 'function') {
  maplibregl.setWorkerUrl(workerUrl)
}

const MAPTILER_KEY = 'jQcfDpbcpnU83qU17Ihi'
const MAPTILER_STYLE = `https://api.maptiler.com/maps/basic-v2-dark/style.json?key=${MAPTILER_KEY}`

/* Water ocean colors: deep midnight oceanic navy for global world, dark stealth slate for isolated country view */
const WATER_COLOR_WORLD = '#152232'
const WATER_COLOR_ISOLATED = '#111822'

function makeIslandCircle(lon, lat, r, steps = 8) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const angle = (i * 2 * Math.PI) / steps
    coords.push([+(lon + r * Math.cos(angle)).toFixed(3), +(lat + r * Math.sin(angle)).toFixed(3)])
  }
  return coords
}

// Micro-state features: realistic island shapes instead of harsh bounding rectangles
const microStateFeatures = []
MICRO_STATES.forEach((m) => {
  if (m.name === 'Maldives') {
    // Generate natural atoll archipelago chain for Maldives
    const maldivesAtolls = [
      [73.0, 6.7, 0.16],
      [73.35, 5.3, 0.18],
      [73.5, 4.18, 0.22], // Male atoll
      [72.9, 3.6, 0.18],  // Ari atoll
      [73.4, 2.2, 0.16],
      [73.45, 0.5, 0.18], // Huvadhu
      [73.15, -0.6, 0.16], // Addu atoll
    ]
    maldivesAtolls.forEach((atoll) => {
      microStateFeatures.push({
        type: 'Feature',
        properties: {
          name: 'Maldives',
          formal_en: 'Republic of Maldives',
          continent: 'Asia',
          continentId: 'asia',
          iso_a2: 'MV',
          iso_a3: 'MDV',
          isMicro: true,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [makeIslandCircle(atoll[0], atoll[1], atoll[2])],
        },
      })
    })
    return
  }

  // Small natural circular island radius based on geographic extent
  const radius = m.name === 'Kiribati' || m.name === 'Micronesia' || m.name === 'Marshall Islands'
    ? 0.30
    : m.name === 'Cabo Verde' || m.name === 'Seychelles' || m.name === 'Mauritius'
      ? 0.25
      : 0.18

  microStateFeatures.push({
    type: 'Feature',
    properties: {
      name: m.name,
      formal_en: m.formal,
      continent: m.continent,
      continentId: m.continentId,
      iso_a2: m.iso2,
      iso_a3: m.iso3,
      isMicro: true,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [makeIslandCircle(m.center[0], m.center[1], radius)],
    },
  })
})

const enhancedCountriesGeoJson = {
  type: 'FeatureCollection',
  features: [
    ...worldCountriesGeoJson.features,
    ...microStateFeatures,
  ],
}

/* Fallback self-contained dark style with Carto raster tiles */
const FALLBACK_STYLE = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'bg',
      type: 'background',
      paint: { 'background-color': '#101212' },
    },
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      paint: { 'raster-opacity': 0.8 },
    },
  ],
}

/** Color interpolation: low (#1a2020) -> mid (#6e6550) -> high ember (#d4a55b) */
function getChoroplethColor(t) {
  if (t === null || isNaN(t)) return '#252929'
  const stops = [
    [0x1a, 0x20, 0x20],
    [0x5a, 0x52, 0x42],
    [0x98, 0x7c, 0x48],
    [0xd4, 0xa5, 0x5b],
  ]
  const clamped = Math.max(0, Math.min(1, t))
  const x = clamped * (stops.length - 1)
  const i = Math.min(Math.floor(x), stops.length - 2)
  const f = x - i
  const c = stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * f))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export default function SubcontinentMap() {
  const { state, dispatch, variable, steps } = usePreview()
  const mapContainer = useRef(null)
  const [mapInstance, setMapInstance] = useState(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const countryMarkerRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const key = displayKey(state, steps, state.position, state.playState)
  const values = divisionDisplayValues({ state, variable, displayKey: key })

  const extent = useMemo(() => {
    const vals = Object.values(values)
      .map((v) => v.value)
      .filter((v) => v !== null)
    if (!vals.length) return [0, 1]
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    return min === max ? [min, min + 1] : [min, max]
  }, [values])

  /* Initialize MapLibre GL instance with full-world planetary view */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    let map = null

    const mapOptions = {
      container: mapContainer.current,
      center: [15.0, 18.0],
      zoom: 1.55,
      minZoom: 1.1,
      maxZoom: 13.0,
      renderWorldCopies: false, // Disables infinite horizontal world repetition
      maxBounds: [
        [-179.9, -84.0],
        [180.0, 85.0],
      ],
      attributionControl: false,
    }

    try {
      map = new maplibregl.Map({
        ...mapOptions,
        style: MAPTILER_STYLE,
      })
    } catch (e) {
      console.warn('MapLibre init error, falling back:', e)
      map = new maplibregl.Map({
        ...mapOptions,
        style: FALLBACK_STYLE,
      })
    }

    /* Add World Continents GeoJSON and Choropleth Layers when style is ready */
    const initWorldLayers = () => {
      if (!map.isStyleLoaded()) return

      try {
        if (!map.getSource('world-geojson')) {
          map.addSource('world-geojson', {
            type: 'geojson',
            data: worldGeoJson,
          })

          map.addSource('countries-geojson', {
            type: 'geojson',
            data: enhancedCountriesGeoJson,
          })

          /* Match expression for immediate continent pastel fill (no delay on hard reload) */
          const initialColorMatch = ['match', ['get', 'id']]
          for (const r of CONTINENTS) {
            initialColorMatch.push(r.id, r.color)
          }
          initialColorMatch.push('#252929')

          /* Match expression for countries & micro-states by continent name */
          const countryContinentMatch = [
            'match',
            ['get', 'continent'],
            'Asia', CONTINENT_BY_ID.asia?.color || '#c97a8e',
            'Africa', CONTINENT_BY_ID.africa?.color || '#d4a259',
            'Europe', CONTINENT_BY_ID.europe?.color || '#7b8ec8',
            'North America', CONTINENT_BY_ID.north_america?.color || '#6aa382',
            'South America', CONTINENT_BY_ID.south_america?.color || '#d67c65',
            'Oceania', CONTINENT_BY_ID.oceania?.color || '#4fa89e',
            'Antarctica', CONTINENT_BY_ID.antarctica?.color || '#7baecc',
            '#252929',
          ]

          /* Match expression for each continent's distinct pastel border */
          const borderMatch = ['match', ['get', 'id']]
          for (const r of CONTINENTS) {
            borderMatch.push(r.id, r.border || '#f2ede3')
          }
          borderMatch.push('#f2ede3')

          // Find the first symbol layer so ALL fills, borders, and lines are rendered strictly BELOW text
          const styleLayers = map.getStyle().layers || []
          const firstSymbolLayer = styleLayers.find((l) => l.type === 'symbol')
          const labelBeforeId = firstSymbolLayer ? firstSymbolLayer.id : undefined

          // 1. Continental pastel choropleth base fill (rendered below labels)
          map.addLayer({
            id: 'world-fill',
            type: 'fill',
            source: 'world-geojson',
            paint: {
              'fill-color': initialColorMatch,
              'fill-opacity': 0.95,
            },
          }, labelBeforeId)

          // 1b. Fill all individual countries and island nations (Maldives, Caribbean, Pacific, etc.) with continent colors
          map.addLayer({
            id: 'countries-fill',
            type: 'fill',
            source: 'countries-geojson',
            paint: {
              'fill-color': countryContinentMatch,
              'fill-opacity': 0.95,
            },
          }, labelBeforeId)

          // Ensure MapTiler base background and water match world pastel blue
          if (map.getLayer('Water')) {
            map.setPaintProperty(
              'Water',
              'fill-color',
              stateRef.current?.isolatedCountry ? WATER_COLOR_ISOLATED : WATER_COLOR_WORLD
            )
          }
          if (map.getLayer('Background')) {
            map.setPaintProperty(
              'Background',
              'background-color',
              stateRef.current?.isolatedCountry ? '#101212' : WATER_COLOR_WORLD
            )
          }

          // 2. Clear national country borders (all 177 countries) - placed strictly BELOW text
          map.addLayer({
            id: 'country-borders-black',
            type: 'line',
            source: 'countries-geojson',
            paint: {
              'line-color': '#000000',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                1, 0.85,
                3, 1.45,
                5, 2.1,
                8, 2.9,
                11, 3.8
              ],
              'line-opacity': [
                'interpolate', ['linear'], ['zoom'],
                1, 0.70,
                3, 0.85,
                6, 0.95
              ],
            },
            filter: ['!=', ['get', 'isMicro'], true],
          }, labelBeforeId)

          // 3. Continent outer accent boundary lines - placed strictly BELOW text
          map.addLayer({
            id: 'world-borders',
            type: 'line',
            source: 'world-geojson',
            paint: {
              'line-color': borderMatch,
              'line-width': 2.2,
              'line-opacity': 0.95,
            },
          }, labelBeforeId)

          // 4. White active continent border on selection - placed strictly BELOW text
          map.addLayer({
            id: 'world-selected-border',
            type: 'line',
            source: 'world-geojson',
            paint: {
              'line-color': '#ffffff',
              'line-width': 3.6,
              'line-opacity': 1,
            },
            filter: ['==', ['get', 'id'], ''],
          }, labelBeforeId)

          // 4b. Focused country highlight layers (from search)
          map.addLayer({
            id: 'country-focused-fill',
            type: 'fill',
            source: 'countries-geojson',
            paint: {
              'fill-color': '#ffffff',
              'fill-opacity': 0.28,
            },
            filter: ['==', ['get', 'name'], ''],
          }, labelBeforeId)

          map.addLayer({
            id: 'country-focused-border',
            type: 'line',
            source: 'countries-geojson',
            paint: {
              'line-color': '#ffffff',
              'line-width': 3.4,
              'line-opacity': 1,
            },
            filter: ['==', ['get', 'name'], ''],
          }, labelBeforeId)

          // 4c. Isolated Country Mode layers (active when country is clicked/isolated)
          map.addLayer({
            id: 'country-isolated-glow',
            type: 'line',
            source: 'countries-geojson',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 16,
              'line-blur': 14,
              'line-opacity': 0.92,
            },
            filter: ['==', ['get', 'name'], ''],
          }, labelBeforeId)

          map.addLayer({
            id: 'country-isolated-fill',
            type: 'fill',
            source: 'countries-geojson',
            paint: {
              'fill-color': '#16575d',
              'fill-opacity': 0.95,
            },
            filter: ['==', ['get', 'name'], ''],
          }, labelBeforeId)

          map.addLayer({
            id: 'country-isolated-border',
            type: 'line',
            source: 'countries-geojson',
            paint: {
              'line-color': '#fde047',
              'line-width': 2.8,
              'line-opacity': 1,
            },
            filter: ['==', ['get', 'name'], ''],
          }, labelBeforeId)

          // 4d. Interactive click surface across all countries
          map.addLayer({
            id: 'countries-interactive-click',
            type: 'fill',
            source: 'countries-geojson',
            paint: {
              'fill-opacity': 0,
            },
          }, labelBeforeId)

          // 5. If map has no built-in vector labels (e.g. fallback raster), add fallback country names
          if (!map.getLayer('Country labels')) {
            map.addLayer({
              id: 'country-names-label',
              type: 'symbol',
              source: 'countries-geojson',
              minzoom: 1.8,
              layout: {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular', 'Open Sans Regular'],
                'text-size': [
                  'interpolate', ['linear'], ['zoom'],
                  2, 10,
                  3.5, 13,
                  6, 16,
                  9, 18
                ],
                'text-transform': 'none',
                'text-letter-spacing': 0.04,
                'text-allow-overlap': false,
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-width': 0,
              },
            })
          }

          // 6. Style all built-in text symbol layers with solid pure white (no border/halo)
          styleLayers.forEach((layer) => {
            if (layer.type === 'symbol') {
              // Hide redundant continent label to prevent watermark text across oceans/continents
              if (layer.id.toLowerCase().includes('continent')) {
                try {
                  map.setLayoutProperty(layer.id, 'visibility', 'none')
                } catch (_) { }
                return
              }

              // Apply solid pure white text with no border/halo
              if (layer.layout && layer.layout['text-field']) {
                try {
                  map.setPaintProperty(layer.id, 'text-color', '#ffffff')
                  map.setPaintProperty(layer.id, 'text-halo-width', 0)
                } catch (_) { }
              }
            }
          })

          // Click on country to isolate it directly
          map.on('click', 'countries-interactive-click', (e) => {
            if (!e.features || !e.features.length) return
            const featName = e.features[0].properties?.name
            const country = findCountry(featName)
            if (country) {
              dispatch({ type: 'ISOLATE_COUNTRY', country })
            }
          })

          map.on('mousemove', 'countries-interactive-click', () => {
            map.getCanvas().style.cursor = 'pointer'
          })

          map.on('mouseleave', 'countries-interactive-click', () => {
            map.getCanvas().style.cursor = ''
          })

          map.on('click', 'world-fill', (e) => {
            if (!e.features || !e.features.length) return
            const featId = e.features[0].properties?.id || e.features[0].id
            if (featId) {
              dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id: featId } })
            }
          })

          map.on('mousemove', 'world-fill', () => {
            map.getCanvas().style.cursor = 'pointer'
          })

          map.on('mouseleave', 'world-fill', () => {
            map.getCanvas().style.cursor = ''
          })
        }
        setMapLoaded(true)
      } catch (err) {
        console.warn('Error adding world layers:', err)
      }

      map.resize()
    }

    // MapLibre style lifecycle listeners
    map.on('styledata', initWorldLayers)
    map.on('load', initWorldLayers)

    if (map.isStyleLoaded()) {
      initWorldLayers()
    }

    // Fallback if MapTiler throws fatal error
    map.on('error', (err) => {
      console.warn('MapLibre error event:', err)
      const status = err?.error?.status
      if (status === 403 || status === 401 || status === 404) {
        try {
          map.setStyle(FALLBACK_STYLE)
        } catch (_) { }
      }
    })

    mapRef.current = map
    setMapInstance(map)

    /* Auto-resize observer */
    let ro = null
    if (typeof ResizeObserver !== 'undefined' && mapContainer.current) {
      ro = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize()
      })
      ro.observe(mapContainer.current)
    }

    requestAnimationFrame(() => {
      if (mapRef.current) mapRef.current.resize()
    })
    const t1 = setTimeout(() => {
      if (mapRef.current) mapRef.current.resize()
    }, 150)
    const t2 = setTimeout(() => {
      if (mapRef.current) mapRef.current.resize()
    }, 500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (ro) ro.disconnect()
      if (countryMarkerRef.current) {
        countryMarkerRef.current.remove()
        countryMarkerRef.current = null
      }
      map.remove()
      mapRef.current = null
      setMapInstance(null)
    }
  }, [dispatch])

  /* Update Choropleth Colors and Highlight on state changes */
  useEffect(() => {
    const map = mapRef.current || mapInstance
    if (!map) return

    const applyColors = () => {
      if (!map.getLayer('world-fill')) return

      /* Build match expression for continent fill colors using distinct pastel palette */
      const colorMatch = ['match', ['get', 'id']]
      for (const r of CONTINENTS) {
        colorMatch.push(r.id, r.color)
      }
      colorMatch.push('#252929') // fallback

      map.setPaintProperty('world-fill', 'fill-color', colorMatch)

      /* Update selected continent filter and border accent */
      const selectedId = state.scope.type === 'division' ? state.scope.id : ''
      const selectedContinent = CONTINENT_BY_ID[selectedId]
      if (map.getLayer('world-selected-border')) {
        map.setFilter('world-selected-border', ['==', ['get', 'id'], selectedId])
        if (selectedContinent) {
          map.setPaintProperty('world-selected-border', 'line-color', selectedContinent.border)
        }
      }

      /* Set pastel sky blue for water on world map, dark sea-green when isolated */
      if (map.getLayer('Water')) {
        map.setPaintProperty(
          'Water',
          'fill-color',
          state.isolatedCountry ? WATER_COLOR_ISOLATED : WATER_COLOR_WORLD
        )
      }
      if (map.getLayer('Background')) {
        map.setPaintProperty(
          'Background',
          'background-color',
          state.isolatedCountry ? '#101212' : WATER_COLOR_WORLD
        )
      }
      if (map.getLayer('countries-fill')) {
        map.setPaintProperty('countries-fill', 'fill-opacity', state.isolatedCountry ? 0 : 0.95)
      }

      /* Keep all continents consistently bright across all selection states */
      map.setPaintProperty('world-fill', 'fill-opacity', 0.95)
    }

    if (map.isStyleLoaded()) {
      applyColors()
    } else {
      map.once('styledata', applyColors)
    }
  }, [values, extent, state.scope, state.isolatedCountry, mapLoaded, mapInstance])

  /* Camera movement & Layer visibility when country or scope changes */
  useEffect(() => {
    const map = mapRef.current || mapInstance
    if (!map) return

    // 1. ISOLATED COUNTRY MODE
    if (state.isolatedCountry) {
      const country = state.isolatedCountry
      const countryName = country.geoName || country.name

      // Restore original sea-green water color for isolated mode
      if (map.getLayer('Water')) {
        map.setPaintProperty('Water', 'fill-color', WATER_COLOR_ISOLATED)
      }
      if (map.getLayer('River')) {
        map.setPaintProperty('River', 'line-color', WATER_COLOR_ISOLATED)
      }
      if (map.getLayer('Background')) {
        map.setPaintProperty('Background', 'background-color', '#101212')
      }

      // Dim/hide all other continents & country borders so ONLY the country is shown
      if (map.getLayer('world-fill')) map.setPaintProperty('world-fill', 'fill-opacity', 0)
      if (map.getLayer('countries-fill')) map.setPaintProperty('countries-fill', 'fill-opacity', 0)
      if (map.getLayer('world-borders')) map.setPaintProperty('world-borders', 'line-opacity', 0)
      if (map.getLayer('country-borders-black')) map.setPaintProperty('country-borders-black', 'line-opacity', 0)
      if (map.getLayer('world-selected-border')) map.setFilter('world-selected-border', ['==', ['get', 'id'], ''])

      // Hide continent floating markers
      markersRef.current.forEach((m) => {
        const el = m.getElement()
        if (el) el.style.display = 'none'
      })

      // Hide all style symbol layers during isolated mode so surrounding text does not clutter the void
      try {
        const styleLayers = map.getStyle().layers || []
        styleLayers.forEach((layer) => {
          if (layer.type === 'symbol') {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      } catch (_) { }

      // Turn on isolated country layers
      if (map.getLayer('country-isolated-glow')) {
        map.setFilter('country-isolated-glow', ['==', ['get', 'name'], countryName])
      }
      if (map.getLayer('country-isolated-fill')) {
        map.setFilter('country-isolated-fill', ['==', ['get', 'name'], countryName])
      }
      if (map.getLayer('country-isolated-border')) {
        map.setFilter('country-isolated-border', ['==', ['get', 'name'], countryName])
      }

      // Hide general focus borders
      if (map.getLayer('country-focused-border')) map.setFilter('country-focused-border', ['==', ['get', 'name'], ''])
      if (map.getLayer('country-focused-fill')) map.setFilter('country-focused-fill', ['==', ['get', 'name'], ''])

      // Camera zooms in tightly to the isolated country
      if (country.bounds) {
        map.fitBounds(country.bounds, {
          padding: { top: 90, bottom: 160, left: 100, right: 100 },
          maxZoom: 7.2,
          speed: 1.4,
          curve: 1.2,
          essential: true,
        })
      } else if (country.center) {
        map.flyTo({
          center: country.center,
          zoom: 6.2,
          speed: 1.4,
          essential: true,
        })
      }
      return
    }

    // 2. NORMAL / WORLD MODE
    // Set pastel sky blue water color for global world map
    if (map.getLayer('Water')) {
      map.setPaintProperty('Water', 'fill-color', WATER_COLOR_WORLD)
    }
    if (map.getLayer('River')) {
      map.setPaintProperty('River', 'line-color', WATER_COLOR_WORLD)
    }
    if (map.getLayer('Background')) {
      map.setPaintProperty('Background', 'background-color', WATER_COLOR_WORLD)
    }

    // Reset isolated country layers
    if (map.getLayer('country-isolated-glow')) map.setFilter('country-isolated-glow', ['==', ['get', 'name'], ''])
    if (map.getLayer('country-isolated-fill')) map.setFilter('country-isolated-fill', ['==', ['get', 'name'], ''])
    if (map.getLayer('country-isolated-border')) map.setFilter('country-isolated-border', ['==', ['get', 'name'], ''])

    // Restore standard continent fills and borders
    if (map.getLayer('world-fill')) map.setPaintProperty('world-fill', 'fill-opacity', 0.95)
    if (map.getLayer('countries-fill')) map.setPaintProperty('countries-fill', 'fill-opacity', 0.95)
    if (map.getLayer('world-borders')) map.setPaintProperty('world-borders', 'line-opacity', 0.95)
    if (map.getLayer('country-borders-black')) {
      map.setPaintProperty('country-borders-black', 'line-opacity', [
        'interpolate', ['linear'], ['zoom'],
        1, 0.70,
        3, 0.85,
        6, 0.95
      ])
    }

    // Restore text symbol labels
    try {
      const styleLayers = map.getStyle().layers || []
      styleLayers.forEach((layer) => {
        if (layer.type === 'symbol') {
          if (layer.id.toLowerCase().includes('continent')) return
          map.setLayoutProperty(layer.id, 'visibility', 'visible')
        }
      })
    } catch (_) { }

    // Restore continent markers
    markersRef.current.forEach((m) => {
      const el = m.getElement()
      if (el) el.style.display = ''
    })

    if (state.focusedCountry) {
      const { bounds, center } = state.focusedCountry
      if (bounds) {
        map.fitBounds(bounds, {
          padding: { top: 90, bottom: 180, left: 90, right: 90 },
          maxZoom: 5.5,
          speed: 1.2,
          curve: 1.2,
          essential: true,
        })
      } else if (center) {
        map.flyTo({
          center,
          zoom: 4.8,
          speed: 1.2,
          essential: true,
        })
      }
      return
    }

    if (state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]) {
      const c = CONTINENT_BY_ID[state.scope.id]
      map.flyTo({
        center: [c.lon, c.lat],
        zoom: c.zoom || 2.8,
        speed: 1.1,
        curve: 1.2,
        essential: true,
      })
    } else {
      map.flyTo({
        center: [15.0, 20.0],
        zoom: 1.6,
        speed: 1.2,
        essential: true,
      })
    }
  }, [state.isolatedCountry, state.focusedCountry, state.scope, mapLoaded, mapInstance])

  /* Sync country highlight border and pin marker */
  useEffect(() => {
    const map = mapRef.current || mapInstance
    if (!map) return

    if (countryMarkerRef.current) {
      countryMarkerRef.current.remove()
      countryMarkerRef.current = null
    }

    const targetCountry = state.isolatedCountry || state.focusedCountry
    if (!targetCountry || !targetCountry.center) return

    const countryName = targetCountry.geoName || targetCountry.name
    const isIsolated = Boolean(state.isolatedCountry)

    if (!isIsolated) {
      if (map.getLayer('country-focused-border')) {
        map.setFilter('country-focused-border', ['==', ['get', 'name'], countryName])
      }
      if (map.getLayer('country-focused-fill')) {
        map.setFilter('country-focused-fill', ['==', ['get', 'name'], countryName])
      }
    }

    const el = document.createElement('div')
    el.className = 'country-pin-marker'
    el.style.cursor = isIsolated ? 'default' : 'pointer'
    el.style.userSelect = 'none'
    el.style.pointerEvents = 'auto'

    if (isIsolated) {
      el.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 9999px;
          border: 1.5px solid #38bdf8;
          background: rgba(12, 16, 20, 0.95);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.55), 0 4px 18px rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(8px);
          transform: translateY(-8px);
        ">
          <span style="font-size: 14px;">📍</span>
          <span style="
            font-family: 'Titillium Web', sans-serif;
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.04em;
          ">${targetCountry.name}</span>
        </div>
      `
    } else {
      el.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1.5px solid #ffffff;
          background: rgba(12, 14, 15, 0.95);
          box-shadow: 0 0 18px rgba(255, 255, 255, 0.45), 0 4px 18px rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          transform: translateY(-8px);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        ">
          <span style="font-size: 13px;">📍</span>
          <span style="
            font-family: 'Titillium Web', sans-serif;
            font-size: 12.5px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.04em;
          ">${targetCountry.name}</span>
          <span style="
            font-family: 'Oxanium', monospace;
            font-size: 10px;
            color: #d4a55b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          ">${targetCountry.continent}</span>
          <span style="
            font-family: 'Titillium Web', sans-serif;
            font-size: 10.5px;
            font-weight: 600;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.16);
            border: 1px solid rgba(56, 189, 248, 0.4);
            padding: 1.5px 6px;
            border-radius: 3px;
            margin-left: 2px;
          ">
            Click to Isolate ↗
          </span>
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        dispatch({ type: 'ISOLATE_COUNTRY', country: targetCountry })
      })
    }

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(targetCountry.center)
      .addTo(map)

    countryMarkerRef.current = marker
  }, [state.isolatedCountry, state.focusedCountry, mapLoaded, mapInstance, dispatch])

  /* Sync interactive Map Markers for all 7 Continents */
  useEffect(() => {
    const map = mapRef.current || mapInstance
    if (!map) return

    // Clean up old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    CONTINENTS.forEach((r) => {
      const entry = values[r.id]
      const valStr = entry && entry.value !== null ? fmtValue(entry.value, variable) : '—'
      const isSelected = state.scope.type === 'division' && state.scope.id === r.id
      const markerColor = r.color || '#c19a5b'
      const markerBorder = r.border || '#f2ede3'
      const markerGlow = r.glow || 'rgba(193, 154, 91, 0.45)'

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.style.userSelect = 'none'
      el.style.pointerEvents = 'auto'
      el.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid ${isSelected ? markerBorder : 'rgba(242, 237, 227, 0.28)'};
          background: ${isSelected ? 'rgba(12, 14, 15, 0.98)' : 'rgba(18, 20, 22, 0.88)'};
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          ${isSelected ? `transform: scale(1.1); box-shadow: 0 0 16px ${markerGlow}; outline: 1px solid ${markerBorder};` : ''}
        ">
          <span style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${markerColor};
            box-shadow: 0 0 8px ${markerColor};
          "></span>
          <span style="
            font-family: 'Titillium Web', sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            color: #ffffff;
            letter-spacing: 0.05em;
          ">${r.name}</span>
          <span style="
            font-family: 'Oxanium', monospace;
            font-size: 11px;
            font-weight: 700;
            color: ${isSelected ? markerBorder : '#e4ddcf'};
          ">${valStr}</span>
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id: r.id } })
      })

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([r.lon, r.lat])
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [values, variable, state.scope, mapInstance, dispatch])

  /* Reset map camera to Global overview */
  const handleResetCamera = () => {
    if (!mapRef.current) return
    dispatch({ type: 'CLEAR_ISOLATED_COUNTRY' })
    dispatch({ type: 'CLEAR_FOCUSED_COUNTRY' })
    dispatch({ type: 'SET_SCOPE', scope: { type: 'national' } })
    mapRef.current.flyTo({
      center: [15.0, 20.0],
      zoom: 1.6,
      speed: 1.2,
      essential: true,
    })
  }

  const [lo, hi] = extent

  return (
    <div className="relative flex w-full flex-col border border-ivory/15 bg-[#101212] shadow-2xl">
      {/* Top Map HUD Bar */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 bg-coal/75 px-4 py-3 backdrop-blur-md md:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-stencil text-[11.5px] uppercase tracking-[0.26em] text-beige">
            {state.isolatedCountry
              ? `Isolated Country View · ${state.isolatedCountry.name}`
              : state.focusedCountry
                ? `Country Focus · ${state.focusedCountry.name}`
                : 'Global Planetary Overview'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-stencil text-[9.5px] uppercase tracking-[0.16em] text-cream/75">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden="true" />
            MapTiler Cloud · MapLibre GL JS
          </span>
        </div>
      </div>

      {/* Map Canvas Container with Explicit Large Dimensions */}
      <div className="relative w-full h-[620px] sm:h-[680px] md:h-[740px] lg:h-[780px] xl:h-[840px] overflow-hidden bg-[#101212]">
        <div ref={mapContainer} className="absolute inset-0 h-full w-full" />

        {/* Top-Left Back Button (Styled like the '+' zoom button on the top-right) */}
        {(state.isolatedCountry || state.focusedCountry || state.scope.type === 'division') && (
          <div className="absolute left-4 top-4 z-20">
            <button
              type="button"
              onClick={handleResetCamera}
              title="Return to World Map"
              className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-data text-lg font-light text-ivory backdrop-blur-md transition-colors hover:border-ivory/60 hover:bg-black cursor-pointer shadow-lg"
            >
              ←
            </button>
          </div>
        )}

        {/* Floating Controls Overlay (Top Right) */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomIn()}
            title="Zoom In"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-data text-base font-light text-ivory backdrop-blur-md transition-colors hover:border-ivory/60 hover:bg-black cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomOut()}
            title="Zoom Out"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-data text-base font-light text-ivory backdrop-blur-md transition-colors hover:border-ivory/60 hover:bg-black cursor-pointer"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset to Global World View"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-stencil text-[10px] uppercase tracking-wider text-parchment backdrop-blur-md transition-colors hover:border-ivory/60 hover:text-ivory cursor-pointer"
          >
            Fit
          </button>
        </div>

        {/* Selected Continent or Country Pill (Bottom Right) */}
        {(state.focusedCountry || state.isolatedCountry || (state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id])) && (
          <div
            className="absolute bottom-[114px] right-4 z-20 flex items-center gap-2 border bg-black/95 px-3.5 py-2 backdrop-blur-md shadow-xl"
            style={{
              borderColor: state.isolatedCountry ? '#fde047' : state.focusedCountry ? '#ffffff' : CONTINENT_BY_ID[state.scope.id]?.border,
            }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full animate-pulse"
              style={{
                backgroundColor: state.isolatedCountry ? '#fde047' : state.focusedCountry ? '#d4a55b' : CONTINENT_BY_ID[state.scope.id]?.color,
                boxShadow: state.isolatedCountry ? '0 0 10px #fde047' : state.focusedCountry ? '0 0 10px #d4a55b' : `0 0 10px ${CONTINENT_BY_ID[state.scope.id]?.color}`,
              }}
              aria-hidden="true"
            />
            {state.focusedCountry || state.isolatedCountry ? (
              <button
                type="button"
                onClick={() => {
                  const c = state.isolatedCountry || state.focusedCountry
                  if (c) dispatch({ type: 'ISOLATE_COUNTRY', country: c })
                }}
                className="font-stencil text-[10px] uppercase tracking-[0.2em] font-medium text-white hover:text-sky-300 transition-colors cursor-pointer text-left"
                title={state.isolatedCountry ? 'Isolated Country Mode' : 'Click to Isolate Country Map'}
              >
                {(state.isolatedCountry || state.focusedCountry).name} ({(state.isolatedCountry || state.focusedCountry).continent})
              </button>
            ) : (
              <span
                className="font-stencil text-[10px] uppercase tracking-[0.2em] font-medium"
                style={{ color: CONTINENT_BY_ID[state.scope.id]?.border }}
              >
                {CONTINENT_BY_ID[state.scope.id]?.name}
              </span>
            )}
            {state.focusedCountry && !state.isolatedCountry && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'ISOLATE_COUNTRY', country: state.focusedCountry })}
                className="ml-1.5 flex items-center gap-1 rounded bg-sky-500/20 border border-sky-400/50 px-2 py-0.5 font-data text-[10px] text-sky-300 hover:bg-sky-500/30 cursor-pointer"
                title="Isolate Country Map"
              >
                Isolate ↗
              </button>
            )}
            <button
              type="button"
              onClick={handleResetCamera}
              className="ml-1 text-[11px] text-parchment hover:text-ivory cursor-pointer"
              title="Return to Global View"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Compact Audio Transport Controls (Bottom Left of Map Screen) */}
        <MapAudioControls />

        {/* Timeline Controls Docked to the Bottom of Map Screen */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <Timeline />
        </div>
      </div>
    </div>
  )
}

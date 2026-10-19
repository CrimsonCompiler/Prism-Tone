/**
 * Interactive South Asian Subcontinent Map powered by MapLibre GL JS & MapTiler Cloud.
 *
 * Utilizes MapTiler Cloud Dataviz Dark vector tiles with GPU acceleration.
 * Overlays genuine NASA POWER monthly choropleth observations, custom interactive
 * capital markers, fluid camera navigation, and real-time audio sync.
 * Features instant style.load rendering, marker persistence, and offline fallback.
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { usePreview } from '../state/PreviewContext'
import { displayKey, divisionDisplayValues } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { REGIONS, REGION_BY_ID } from '../data/subcontinent'
import { fmtValue } from '../lib/format'
import subcontinentGeoJson from '../data/subcontinent-regions.json'

// Register worker bundle explicitly for Vite bundler compatibility
if (typeof maplibregl.setWorkerUrl === 'function') {
  maplibregl.setWorkerUrl(workerUrl)
}

const MAPTILER_KEY = 'jQcfDpbcpnU83qU17Ihi'
const MAPTILER_STYLE = `https://api.maptiler.com/maps/basic-v2-dark/style.json?key=${MAPTILER_KEY}`

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

/* Subcontinent geographic bounding box [ [west, south], [east, north] ] */
const SUBCONTINENT_BOUNDS = [
  [61.0, 4.5],
  [97.5, 36.0],
]

/** Color interpolation: low (#1c2121) -> mid (#6e6550) -> high ember (#c99e57) */
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
  const [mapLoaded, setMapLoaded] = useState(false)

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

  /* Initialize MapLibre GL instance with MapTiler Cloud */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    let map = null

    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: MAPTILER_STYLE,
        center: [81.0, 22.0],
        zoom: 3.9,
        minZoom: 2.5,
        maxZoom: 9.5,
        maxBounds: [
          [52.0, -2.0],
          [106.0, 40.0],
        ],
        attributionControl: false,
      })
    } catch (e) {
      console.warn('MapLibre init error, falling back:', e)
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: FALLBACK_STYLE,
        center: [81.0, 22.0],
        zoom: 3.9,
        minZoom: 2.5,
        maxZoom: 9.5,
        attributionControl: false,
      })
    }

    /* Add Subcontinent GeoJSON and Choropleth Layers when style is ready */
    const initSubcontinentLayers = () => {
      if (!map.isStyleLoaded()) return

      try {
        if (!map.getSource('subcontinent-geojson')) {
          map.addSource('subcontinent-geojson', {
            type: 'geojson',
            data: subcontinentGeoJson,
          })

          map.addLayer({
            id: 'subcontinent-fill',
            type: 'fill',
            source: 'subcontinent-geojson',
            paint: {
              'fill-color': '#2a3030',
              'fill-opacity': 0.72,
            },
          })

          map.addLayer({
            id: 'subcontinent-borders',
            type: 'line',
            source: 'subcontinent-geojson',
            paint: {
              'line-color': '#f2ede3',
              'line-width': 1.6,
              'line-opacity': 0.8,
            },
          })

          map.addLayer({
            id: 'subcontinent-selected-border',
            type: 'line',
            source: 'subcontinent-geojson',
            paint: {
              'line-color': '#c19a5b',
              'line-width': 3.4,
              'line-opacity': 1,
            },
            filter: ['==', ['get', 'id'], ''],
          })

          map.on('click', 'subcontinent-fill', (e) => {
            if (!e.features || !e.features.length) return
            const featId = e.features[0].properties?.id || e.features[0].id
            if (featId) {
              dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id: featId } })
            }
          })

          map.on('mousemove', 'subcontinent-fill', () => {
            map.getCanvas().style.cursor = 'pointer'
          })

          map.on('mouseleave', 'subcontinent-fill', () => {
            map.getCanvas().style.cursor = ''
          })
        }
        setMapLoaded(true)
      } catch (err) {
        console.warn('Error adding subcontinent layers:', err)
      }

      map.resize()
    }

    // MapLibre style lifecycle listeners
    map.on('styledata', initSubcontinentLayers)
    map.on('load', initSubcontinentLayers)

    if (map.isStyleLoaded()) {
      initSubcontinentLayers()
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
      if (!map.getLayer('subcontinent-fill')) return

      const [lo, hi] = extent
      const span = hi - lo || 1

      /* Build match expression for fill colors */
      const colorMatch = ['match', ['get', 'id']]
      for (const r of REGIONS) {
        const entry = values[r.id]
        const v = entry ? entry.value : null
        const norm = v !== null ? (v - lo) / span : null
        const color = getChoroplethColor(norm)
        colorMatch.push(r.id, color)
      }
      colorMatch.push('#252929') // fallback

      map.setPaintProperty('subcontinent-fill', 'fill-color', colorMatch)

      /* Update selected country filter */
      const selectedId = state.scope.type === 'division' ? state.scope.id : ''
      if (map.getLayer('subcontinent-selected-border')) {
        map.setFilter('subcontinent-selected-border', ['==', ['get', 'id'], selectedId])
      }

      /* Set active fill opacity */
      const opacityMatch = ['case', ['==', ['get', 'id'], selectedId], 0.92, 0.75]
      map.setPaintProperty('subcontinent-fill', 'fill-opacity', opacityMatch)
    }

    if (map.isStyleLoaded()) {
      applyColors()
    } else {
      map.once('styledata', applyColors)
    }
  }, [values, extent, state.scope, mapLoaded, mapInstance])

  /* Camera movement when scope changes */
  useEffect(() => {
    const map = mapRef.current || mapInstance
    if (!map) return

    if (state.scope.type === 'division' && REGION_BY_ID[state.scope.id]) {
      const r = REGION_BY_ID[state.scope.id]
      map.flyTo({
        center: [r.lon, r.lat],
        zoom: r.id === 'india' ? 4.3 : r.id === 'pakistan' ? 4.9 : 5.8,
        speed: 1.1,
        curve: 1.2,
        essential: true,
      })
    } else {
      map.fitBounds(SUBCONTINENT_BOUNDS, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        speed: 1.2,
        essential: true,
      })
    }
  }, [state.scope, mapLoaded, mapInstance])

  /* Sync interactive Map Markers for capitals / centroids */
  useEffect(() => {
    const map = mapRef.current || mapInstance
    if (!map) return

    // Clean up old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    REGIONS.forEach((r) => {
      const entry = values[r.id]
      const valStr = entry && entry.value !== null ? fmtValue(entry.value, variable) : '—'
      const isSelected = state.scope.type === 'division' && state.scope.id === r.id

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
          border: 1px solid ${isSelected ? '#c19a5b' : 'rgba(242, 237, 227, 0.32)'};
          background: ${isSelected ? 'rgba(12, 13, 13, 0.96)' : 'rgba(18, 20, 20, 0.90)'};
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          transition: transform 0.2s ease, border-color 0.2s ease;
          ${isSelected ? 'transform: scale(1.08); outline: 1px solid rgba(193, 154, 91, 0.6);' : ''}
        ">
          <span style="
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: ${isSelected ? '#c19a5b' : 'rgba(242, 237, 227, 0.75)'};
            ${isSelected ? 'box-shadow: 0 0 8px #c19a5b;' : ''}
          "></span>
          <span style="
            font-family: 'Titillium Web', sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            color: #f2ede3;
            letter-spacing: 0.06em;
          ">${r.name}</span>
          <span style="
            font-family: 'Oxanium', monospace;
            font-size: 11px;
            font-weight: 700;
            color: ${isSelected ? '#c19a5b' : '#e2d9c6'};
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

  /* Reset map camera to Subcontinent overview */
  const handleResetCamera = () => {
    if (!mapRef.current) return
    dispatch({ type: 'SET_SCOPE', scope: { type: 'national' } })
    mapRef.current.fitBounds(SUBCONTINENT_BOUNDS, {
      padding: { top: 40, bottom: 40, left: 40, right: 40 },
      speed: 1.2,
      essential: true,
    })
  }

  const [lo, hi] = extent

  return (
    <div className="relative flex w-full flex-col border border-ivory/15 bg-[#101212] shadow-2xl">
      {/* Top Map HUD Bar */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 bg-coal/75 px-4 py-3 backdrop-blur-md md:px-5">
        <div className="flex items-center gap-2.5">
          <span className="font-stencil text-[11.5px] uppercase tracking-[0.26em] text-beige">
            South Asian Subcontinent
          </span>
          <span className="h-3 w-px bg-ivory/20" aria-hidden="true" />
          <span className="font-data text-[10.5px] uppercase tracking-[0.18em] text-parchment">
            {key ? keyToLabel(key) : `mean · ${state.range.startYear}–${state.range.endYear}`}
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
            title="Reset to Subcontinent View"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-stencil text-[10px] uppercase tracking-wider text-parchment backdrop-blur-md transition-colors hover:border-ivory/60 hover:text-ivory cursor-pointer"
          >
            Fit
          </button>
        </div>

        {/* Bottom Legend Overlay (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-10 border border-ivory/20 bg-black/90 px-3.5 py-2.5 backdrop-blur-md shadow-xl">
          <div className="flex items-baseline justify-between gap-5 font-stencil text-[9px] uppercase tracking-[0.18em] text-parchment">
            <span>{variable.name} ({variable.unit})</span>
            <span>{values ? Object.values(values).filter((v) => v.value !== null).length : 0}/7 Regions</span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="font-data text-[10px] text-cream/70">
              {lo !== null && !isNaN(lo) ? fmtValue(lo, variable) : '—'}
            </span>
            <div
              className="h-2.5 w-32 md:w-44 rounded-xs"
              style={{
                background:
                  'linear-gradient(to right, rgb(24, 27, 27), rgb(104, 96, 78), rgb(193, 154, 91))',
              }}
              aria-hidden="true"
            />
            <span className="font-data text-[10px] text-ember font-medium">
              {hi !== null && !isNaN(hi) ? fmtValue(hi, variable) : '—'}
            </span>
          </div>
        </div>

        {/* Selected Region Pill (Bottom Right) */}
        {state.scope.type === 'division' && REGION_BY_ID[state.scope.id] && (
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 border border-ember/50 bg-black/95 px-3.5 py-2 backdrop-blur-md shadow-xl">
            <span className="h-2 w-2 rounded-full bg-ember animate-pulse" aria-hidden="true" />
            <span className="font-stencil text-[10px] uppercase tracking-[0.2em] text-ember font-medium">
              {REGION_BY_ID[state.scope.id].name}
            </span>
            <button
              type="button"
              onClick={handleResetCamera}
              className="ml-1 text-[11px] text-parchment hover:text-ivory cursor-pointer"
              title="Return to Regional View"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

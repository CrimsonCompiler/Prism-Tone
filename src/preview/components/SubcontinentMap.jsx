/**
 * Interactive South Asian Subcontinent Map powered by MapLibre GL JS.
 *
 * Fully GPU-accelerated WebGL vector/raster mapping.
 * Embedded GeoJSON guarantees instant initial paint with zero network lag.
 * Realtime choropleth color fills, live capital markers, fluid camera navigation,
 * and automatic resize tracking.
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { usePreview } from '../state/PreviewContext'
import { displayKey, divisionDisplayValues } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { REGIONS, REGION_BY_ID } from '../data/subcontinent'
import { fmtValue } from '../lib/format'
import subcontinentGeoJson from '../data/subcontinent-regions.json'

/* Subcontinent geographic bounding box [ [west, south], [east, north] ] */
const SUBCONTINENT_BOUNDS = [
  [60.0, 3.0],
  [98.5, 37.0],
]

/** Color interpolation: low (#181b1b) -> mid (#68604e) -> high ember (#c19a5b) */
function getChoroplethColor(t) {
  if (t === null || isNaN(t)) return '#1f2222'
  const stops = [
    [0x18, 0x1b, 0x1b],
    [0x68, 0x60, 0x4e],
    [0xc1, 0x9a, 0x5b],
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

  /* Initialize MapLibre GL instance with embedded sources and layers */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const initialGeoData = state.geo.json || subcontinentGeoJson

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'subcontinent-geojson': {
            type: 'geojson',
            data: initialGeoData,
          },
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#101212' },
          },
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            paint: {
              'raster-opacity': 0.65,
              'raster-contrast': 0.08,
            },
          },
          {
            id: 'subcontinent-fill',
            type: 'fill',
            source: 'subcontinent-geojson',
            paint: {
              'fill-color': '#222626',
              'fill-opacity': 0.72,
            },
          },
          {
            id: 'subcontinent-borders',
            type: 'line',
            source: 'subcontinent-geojson',
            paint: {
              'line-color': '#f2ede3',
              'line-width': 1.1,
              'line-opacity': 0.5,
            },
          },
          {
            id: 'subcontinent-selected-border',
            type: 'line',
            source: 'subcontinent-geojson',
            paint: {
              'line-color': '#c19a5b',
              'line-width': 2.8,
              'line-opacity': 0.95,
            },
            filter: ['==', 'id', ''],
          },
        ],
      },
      center: [80.5, 21.5],
      zoom: 3.8,
      minZoom: 2.5,
      maxZoom: 9.5,
      maxBounds: [
        [50.0, -3.0],
        [108.0, 42.0],
      ],
      attributionControl: false,
    })

    const handleReady = () => {
      setMapLoaded(true)
      map.resize()
    }

    map.on('load', handleReady)
    map.on('style.load', handleReady)

    /* Click interaction to select country */
    map.on('click', 'subcontinent-fill', (e) => {
      if (!e.features || !e.features.length) return
      const featId = e.features[0].properties.id || e.features[0].id
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

    mapRef.current = map

    /* ResizeObserver to ensure map canvas automatically expands */
    let ro = null
    if (typeof ResizeObserver !== 'undefined' && mapContainer.current) {
      ro = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize()
      })
      ro.observe(mapContainer.current)
    }

    // Force resize after mount
    requestAnimationFrame(() => {
      if (mapRef.current) mapRef.current.resize()
    })
    const t = setTimeout(() => {
      if (mapRef.current) mapRef.current.resize()
    }, 200)

    return () => {
      clearTimeout(t)
      if (ro) ro.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [dispatch])

  /* Update Choropleth Colors and Highlight on state changes */
  useEffect(() => {
    const map = mapRef.current
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
      colorMatch.push('#202424') // fallback

      map.setPaintProperty('subcontinent-fill', 'fill-color', colorMatch)

      /* Update selected country filter */
      const selectedId = state.scope.type === 'division' ? state.scope.id : ''
      if (map.getLayer('subcontinent-selected-border')) {
        map.setFilter('subcontinent-selected-border', ['==', 'id', selectedId])
      }

      /* Set active fill opacity */
      const opacityMatch = ['case', ['==', ['get', 'id'], selectedId], 0.88, 0.65]
      map.setPaintProperty('subcontinent-fill', 'fill-opacity', opacityMatch)
    }

    if (mapLoaded || map.isStyleLoaded()) {
      applyColors()
    } else {
      map.once('style.load', applyColors)
    }
  }, [values, extent, state.scope, mapLoaded])

  /* Camera movement when scope changes */
  useEffect(() => {
    const map = mapRef.current
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
      /* Reset to full Subcontinent overview */
      map.fitBounds(SUBCONTINENT_BOUNDS, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        speed: 1.2,
        essential: true,
      })
    }
  }, [state.scope, mapLoaded])

  /* Sync interactive Map Markers for capitals / centroids */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clean up old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    REGIONS.forEach((r) => {
      const entry = values[r.id]
      const valStr = entry && entry.value !== null ? fmtValue(entry.value, variable) : '—'
      const isSelected = state.scope.type === 'division' && state.scope.id === r.id

      const el = document.createElement('div')
      el.className = 'group cursor-pointer select-none pointer-events-auto'
      el.innerHTML = `
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border transition-all duration-200 backdrop-blur-md shadow-lg ${isSelected
          ? 'border-ember bg-black/95 shadow-ember/30 scale-105 ring-1 ring-ember/40'
          : 'border-ivory/25 bg-black/80 hover:border-ivory/70 hover:bg-black/95 hover:scale-105'
        }">
          <span class="h-2 w-2 rounded-full ${isSelected ? 'bg-ember animate-pulse' : 'bg-ivory/70'}" aria-hidden="true"></span>
          <span class="font-ui text-[12px] font-semibold tracking-wider text-ivory">${r.name}</span>
          <span class="font-data text-[11.5px] ${isSelected ? 'text-ember font-bold' : 'text-cream/90 font-medium'}">${valStr}</span>
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
  }, [values, variable, state.scope, dispatch])

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
            MapLibre GL JS · GPU Accelerated
          </span>
        </div>
      </div>

      {/* Map Canvas Container with Explicit Large Dimensions */}
      <div className="relative w-full h-[600px] sm:h-[680px] md:h-[740px] lg:h-[780px] xl:h-[840px] overflow-hidden">
        <div ref={mapContainer} className="absolute inset-0 h-full w-full" />

        {/* Floating Controls Overlay (Top Right) */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomIn()}
            title="Zoom In"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-data text-base font-light text-ivory backdrop-blur-md transition-colors hover:border-ivory/60 hover:bg-black"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.zoomOut()}
            title="Zoom Out"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-data text-base font-light text-ivory backdrop-blur-md transition-colors hover:border-ivory/60 hover:bg-black"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset to Subcontinent View"
            className="flex h-9 w-9 items-center justify-center border border-ivory/25 bg-black/85 font-stencil text-[10px] uppercase tracking-wider text-parchment backdrop-blur-md transition-colors hover:border-ivory/60 hover:text-ivory"
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
              className="ml-1 text-[11px] text-parchment hover:text-ivory"
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

/**
 * Interactive Bangladesh map — SVG choropleth of the 8 divisions.
 *
 * Division fills come from real NASA POWER point samples at division
 * centroids for the displayed month (or the derived mean over a selected
 * range). A missing value renders as a hatched "no data" cell, never an
 * invented one. The map is fully keyboard operable: each division is a
 * focusable shape with an accessible name, and the region list next to it
 * provides an equivalent non-visual path.
 */

import { useMemo } from 'react'
import { usePreview } from '../state/PreviewContext'
import { displayKey, divisionDisplayValues } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { DIVISIONS, DIVISION_BY_ID, BOUNDS } from '../data/bangladesh'
import { fmtValue } from '../lib/format'

const VW = 460
const VH = 560

function project(lon, lat) {
  const pad = 26
  const lonR = BOUNDS.maxLon - BOUNDS.minLon
  const latR = BOUNDS.maxLat - BOUNDS.minLat
  const s = Math.min((VW - pad * 2) / lonR, (VH - pad * 2) / latR)
  const ox = (VW - lonR * s) / 2
  const oy = (VH - latR * s) / 2
  return [ox + (lon - BOUNDS.minLon) * s, VH - (oy + (lat - BOUNDS.minLat) * s)]
}

function ringPath(ring) {
  return ring
    .map((pt, i) => {
      const [x, y] = project(pt[0], pt[1])
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ') + ' Z'
}

function featurePath(geom) {
  return geom.coordinates.map((poly) => poly.map(ringPath).join(' ')).join(' ')
}

/** ink → parchment → ember, site palette only */
function choropleth(t) {
  const stops = [
    [0x22, 0x24, 0x24],
    [0x7c, 0x73, 0x60],
    [0xc1, 0x9a, 0x5b],
  ]
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const i = Math.min(Math.floor(x), stops.length - 2)
  const f = x - i
  const c = stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * f))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

const LABEL_POS = {
  dhaka: [0.52, 0.52],
  chattogram: [0.78, 0.62],
  rajshahi: [0.2, 0.3],
  khulna: [0.3, 0.62],
  barishal: [0.5, 0.66],
  sylhet: [0.82, 0.2],
  rangpur: [0.42, 0.12],
  mymensingh: [0.66, 0.33],
}

export default function BangladeshMap() {
  const { state, dispatch, variable, steps } = usePreview()
  const { geo } = state

  const key = displayKey(state, steps, state.position, state.playState)
  const values = divisionDisplayValues({ state, variable, displayKey: key })

  const extent = useMemo(() => {
    const vals = Object.values(values)
      .map((v) => v.value)
      .filter((v) => v !== null)
    if (!vals.length) return [null, null]
    return [Math.min(...vals), Math.max(...vals)]
  }, [values])

  const lo = extent[0]
  const hi = extent[1]

  const byGadm = useMemo(() => {
    const m = {}
    if (geo.status === 'ready' && geo.json) {
      for (const f of geo.json.features) m[f.properties.name] = f
    }
    return m
  }, [geo])

  const select = (id) => dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id } })

  const modeNote =
    state.timeMode === 'range' && key === null
      ? `derived mean · ${state.range.startYear}–${state.range.endYear}`
      : key
        ? keyToLabel(key)
        : '—'

  return (
    <div className="relative border border-ivory/10 bg-coal/40">
      <div className="flex items-baseline justify-between border-b border-ivory/10 px-4 py-3 md:px-5">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">
          Bangladesh · 8 divisions
        </p>
        <span className="font-data text-[10px] md:text-[11px] uppercase tracking-[0.16em] text-parchment">
          {modeNote}
        </span>
      </div>

      <div className="relative p-3 md:p-5">
        {geo.status !== 'ready' && (
          <div className="flex aspect-[460/560] w-full items-center justify-center" role="status">
            <p className="font-stencil text-[11px] uppercase tracking-[0.24em] text-parchment">
              {geo.status === 'error' ? 'Division boundaries failed to load' : 'Loading division boundaries…'}
            </p>
          </div>
        )}

        {geo.status === 'ready' && (
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="block h-auto w-full"
            role="group"
            aria-label="Map of Bangladesh showing the selected variable by division"
          >
            <defs>
              <pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill="#1c1d1d" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="#3a3c3c" strokeWidth="1.4" />
              </pattern>
            </defs>

            {DIVISIONS.map((d) => {
              const f = byGadm[d.gadm]
              if (!f) return null
              const v = values[d.id]
              const selected = state.scope.type === 'division' && state.scope.id === d.id
              const national = state.scope.type === 'national'
              const hasValue = v.status === 'ok' || v.status === 'derived'
              const t = hasValue && lo !== null && hi !== null && hi !== lo ? (v.value - lo) / (hi - lo) : 0
              const fill = hasValue ? choropleth(t) : 'url(#hatch)'
              const dimmed = state.scope.type === 'division' && !selected

              const ariaVal =
                v.status === 'error'
                  ? 'data failed to load'
                  : !hasValue
                    ? 'no data for this period'
                    : `${fmtValue(v.value, variable.decimals)} ${variable.unit}${v.status === 'derived' ? ', derived mean over selected range' : ''}`

              return (
                <g key={d.id}>
                  <path
                    d={featurePath(f.geometry)}
                    fill={fill}
                    stroke={selected ? '#f2ede3' : 'rgba(242,237,227,0.28)'}
                    strokeWidth={selected ? 2 : 0.8}
                    opacity={dimmed ? 0.45 : 1}
                    className="cursor-pointer transition-opacity duration-300 focus:outline-none map-focus"
                    tabIndex={0}
                    role="button"
                    aria-label={`${d.name}: ${ariaVal}. Activate to explore this division.`}
                    aria-pressed={selected}
                    onClick={() => select(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        select(d.id)
                      }
                    }}
                  />
                  {LABEL_POS[d.id] && (
                    <text
                      x={LABEL_POS[d.id][0] * VW}
                      y={LABEL_POS[d.id][1] * VH}
                      textAnchor="middle"
                      className="pointer-events-none select-none font-stencil uppercase"
                      fontSize="10"
                      letterSpacing="0.14em"
                      fill={hasValue ? 'rgba(242,237,227,0.92)' : 'rgba(177,166,140,0.7)'}
                    >
                      {d.name}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}

        {/* legend */}
        <div className="mt-4 border-t border-ivory/10 pt-3">
          <div className="flex items-center gap-3">
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-parchment">
              {lo !== null ? fmtValue(lo, variable.decimals) : '—'} {variable.unit}
            </span>
            <div
              className="h-2 flex-1"
              style={{ background: 'linear-gradient(to right, rgb(34,36,36), rgb(124,115,96), rgb(193,154,91))' }}
              role="img"
              aria-label={`Colour scale from ${lo !== null ? fmtValue(lo, variable.decimals) : 'low'} to ${hi !== null ? fmtValue(hi, variable.decimals) : 'high'} ${variable.unit}`}
            />
            <span className="font-data text-[10px] uppercase tracking-[0.14em] text-parchment">
              {hi !== null ? fmtValue(hi, variable.decimals) : '—'} {variable.unit}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-stencil text-[9px] uppercase tracking-[0.18em] text-parchment/80">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 border border-ivory/25"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, #1c1d1d 0 3px, #3a3c3c 3px 4px)',
                }}
                aria-hidden="true"
              />
              no data
            </span>
            <span>point samples at division centroids — not areal averages</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Sparkline — a compact, accessible SVG trend for the selected window.
 *
 * Pure and dependency-free. The canvas alternative from the companion
 * apps was not reused here because SVG needs no DPR handling, no rAF loop
 * and no resize observer: it redraws only when the data changes.
 */

import { fmtValue } from '../lib/format'

export default function Sparkline({ points, current = -1, normal = null, decimals = 1, unit = '', label }) {
  const valid = points ? points.filter((p) => p.value !== null && p.value !== undefined) : []
  if (!points || points.length === 0 || valid.length === 0) {
    return (
      <div className="flex h-16 items-center border border-dashed border-ivory/20 px-3 font-ui text-[13px] text-beige">
        No values in this window.
      </div>
    )
  }

  let lo = Math.min(...valid.map((p) => p.value))
  let hi = Math.max(...valid.map((p) => p.value))
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const span = hi - lo
  lo -= span * 0.1
  hi += span * 0.1

  const W = 100
  const H = 34
  const x = (i) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W)
  const y = (v) => H - ((v - lo) / (hi - lo)) * H

  let d = ''
  let pen = false
  points.forEach((p, i) => {
    if (p.value === null || p.value === undefined) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(2)} ${y(p.value).toFixed(2)} `
    pen = true
  })

  const area = d
    ? `${d}L${x(points.length - 1).toFixed(2)} ${H} L${x(0).toFixed(2)} ${H} Z`
    : ''

  const currentPoint = current >= 0 && points[current] ? points[current] : null
  const normY = normal !== null && normal !== undefined && normal >= lo && normal <= hi ? y(normal) : null

  const aria = label || `Trend of ${points.length} values. ${valid.length} valid. Range ${fmtValue(Math.min(...valid.map((p) => p.value)), decimals)} to ${fmtValue(Math.max(...valid.map((p) => p.value)), decimals)} ${unit}.${normal !== null ? ` Climate normal ${fmtValue(normal, decimals)} ${unit}.` : ''}`

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-16 w-full"
        role="img"
        aria-label={aria}
      >
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(242,237,227,0.12)" strokeWidth="0.5" />
        {normY !== null && (
          <line
            x1="0"
            y1={normY}
            x2={W}
            y2={normY}
            stroke="rgba(177,166,140,0.8)"
            strokeWidth="0.6"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {area && <path d={area} fill="rgba(226,217,198,0.10)" stroke="none" />}
        {d && (
          <path
            d={d}
            fill="none"
            stroke="rgba(242,237,227,0.9)"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {currentPoint && currentPoint.value !== null && (
          <circle
            cx={x(current)}
            cy={y(currentPoint.value)}
            r="1.8"
            fill="#c19a5b"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between gap-3 font-ui text-[12px] text-beige">
        <span>{points[0] && points[0].key ? points[0].key.slice(0, 4) : 'start'}</span>
        <span>{normal !== null && normal !== undefined ? `dashed: 1991–2020 normal` : ''}</span>
        <span>{points[points.length - 1] && points[points.length - 1].key ? points[points.length - 1].key.slice(0, 4) : 'end'}</span>
      </div>
    </div>
  )
}

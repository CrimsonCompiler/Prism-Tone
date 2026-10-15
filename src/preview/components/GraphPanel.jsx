/**
 * Graph panel — two honest views:
 *
 *  Series    the actual environmental record at the current scope
 *            (monthly 1981–2025 or source annual means), with the current
 *            selection shaded, the playback position drawn as a playhead,
 *            and hover / keyboard inspection of exact values.
 *  Waveform  the live audio signal from the engine's AnalyserNode — a real
 *            tap of the generated sound, flat when silent.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePreview } from '../state/PreviewContext'
import { monthlyArray, annualArray, keyToLabel } from '../lib/processing'
import { fmtValue } from '../lib/format'
import { engine } from '../lib/sonify'
import { YEAR_MIN, YEAR_MAX } from '../data/datasets'

const IVORY = 'rgba(242,237,227,'
const EMBER = 'rgba(193,154,91,'

export default function GraphPanel() {
  const { state, dispatch, variable, seriesMap, steps } = usePreview()
  const { view } = state

  return (
    <div className="flex h-full flex-col border border-ivory/10 bg-coal/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory/10 px-4 py-3 md:px-5">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">Graphs</p>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Graph view">
          {[
            ['series', 'Series'],
            ['waveform', 'Waveform'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => dispatch({ type: 'SET_VIEW', view: id })}
              className={`border px-3 py-1 font-stencil text-[9.5px] uppercase tracking-[0.2em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${view === id ? 'border-ivory/50 bg-ivory/10 text-ivory' : 'border-ivory/12 text-parchment hover:border-ivory/30 hover:text-cream'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-5">
        {view === 'series' ? <SeriesGraph variable={variable} seriesMap={seriesMap} /> : <WaveformGraph />}
      </div>
    </div>
  )
}

/* ---------------- series ---------------- */

function SeriesGraph({ variable, seriesMap }) {
  const { state, dispatch, steps } = usePreview()
  const { granularity } = state
  const canvasRef = useRef(null)
  const [cursor, setCursor] = useState(null) // inspected index in points[]

  const points = useMemo(() => {
    if (!seriesMap) return []
    return granularity === 'monthly'
      ? monthlyArray(seriesMap, YEAR_MIN, YEAR_MAX)
      : annualArray(seriesMap, YEAR_MIN, YEAR_MAX)
  }, [seriesMap, granularity])

  const labelFor = (i) =>
    granularity === 'monthly' ? keyToLabel(points[i].key) : String(points[i].year)

  const valueFor = (i) => points[i].value

  /* selection band [i0, i1] inclusive, null when not applicable */
  const band = useMemo(() => {
    if (!points.length) return null
    const idx = (key) => points.findIndex((p) => p.key === key)
    if (state.timeMode === 'month') {
      const i = idx(`${state.year}${String(state.month).padStart(2, '0')}`)
      return i >= 0 ? [i, i] : null
    }
    if (state.timeMode === 'year') {
      const a = idx(`${state.year}01`)
      const b = idx(`${state.year}12`)
      return a >= 0 && b >= 0 ? [a, b] : null
    }
    const a = idx(`${state.range.startYear}01`)
    const b = idx(`${state.range.endYear}12`)
    return a >= 0 && b >= 0 ? [a, b] : null
  }, [points, state.timeMode, state.year, state.month, state.range.startYear, state.range.endYear])

  /* playhead index within points */
  const playhead = useMemo(() => {
    if (state.playState === 'idle') return null
    const step = steps[state.position]
    if (!step) return null
    const i = points.findIndex((p) => p.key === step.key)
    return i >= 0 ? i : null
  }, [state.playState, state.position, steps, points])

  /* ---------- drawing ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      /* frame */
      ctx.strokeStyle = IVORY + '0.14)'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

      if (!points.length) {
        ctx.fillStyle = IVORY + '0.5)'
        ctx.font = '10px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NO DATA LOADED', w / 2, h / 2)
        return
      }

      const padL = 6
      const padR = 6
      const padT = 10
      const padB = 18
      const iw = w - padL - padR
      const ih = h - padT - padB

      const vals = points.filter((p) => p.value !== null).map((p) => p.value)
      if (!vals.length) {
        ctx.fillStyle = IVORY + '0.5)'
        ctx.font = '10px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NO VALID VALUES IN RECORD', w / 2, h / 2)
        return
      }
      let lo = Math.min(...vals)
      let hi = Math.max(...vals)
      if (lo === hi) {
        lo -= 1
        hi += 1
      }
      const span = hi - lo
      lo -= span * 0.06
      hi += span * 0.06

      const x = (i) => padL + (i / Math.max(points.length - 1, 1)) * iw
      const y = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih

      /* selection band */
      if (band) {
        const bx0 = x(band[0])
        const bx1 = x(band[1])
        ctx.fillStyle = IVORY + '0.07)'
        ctx.fillRect(bx0, padT, Math.max(bx1 - bx0, 2), ih)
      }

      /* gridlines: 4 y ticks */
      ctx.font = '9px Oxanium, monospace'
      ctx.textAlign = 'left'
      for (let g = 0; g <= 3; g++) {
        const gv = lo + ((hi - lo) * g) / 3
        const gy = y(gv)
        ctx.strokeStyle = IVORY + '0.07)'
        ctx.beginPath()
        ctx.moveTo(padL, gy)
        ctx.lineTo(padL + iw, gy)
        ctx.stroke()
        ctx.fillStyle = IVORY + '0.4)'
        ctx.fillText(fmtValue(gv, variable.decimals), padL + 3, gy - 2)
      }

      /* x ticks: decades (monthly) or every 10 years (annual) */
      ctx.textAlign = 'center'
      for (let i = 0; i < points.length; i++) {
        const yr = granularity === 'monthly' ? Number(points[i].key.slice(0, 4)) : points[i].year
        const show = granularity === 'monthly' ? yr % 10 === 0 && points[i].key.endsWith('01') : yr % 10 === 0
        if (show) {
          ctx.fillStyle = IVORY + '0.4)'
          ctx.fillText(String(yr), x(i), h - 5)
        }
      }

      /* the series itself */
      ctx.strokeStyle = IVORY + '0.85)'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      let pen = false
      for (let i = 0; i < points.length; i++) {
        const v = points[i].value
        if (v === null) {
          pen = false
          continue
        }
        if (!pen) {
          ctx.moveTo(x(i), y(v))
          pen = true
        } else {
          ctx.lineTo(x(i), y(v))
        }
      }
      ctx.stroke()

      /* inspected cursor */
      if (cursor !== null && points[cursor]) {
        const cx = x(cursor)
        ctx.strokeStyle = EMBER + '0.85)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cx, padT)
        ctx.lineTo(cx, padT + ih)
        ctx.stroke()
        ctx.setLineDash([])
        if (points[cursor].value !== null) {
          ctx.fillStyle = EMBER + '1)'
          ctx.beginPath()
          ctx.arc(cx, y(points[cursor].value), 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      /* playhead */
      if (playhead !== null && points[playhead]) {
        const px = x(playhead)
        ctx.strokeStyle = EMBER + '1)'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(px, padT)
        ctx.lineTo(px, padT + ih)
        ctx.stroke()
        if (points[playhead].value !== null) {
          ctx.fillStyle = EMBER + '1)'
          ctx.beginPath()
          ctx.arc(px, y(points[playhead].value), 3.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [points, band, playhead, cursor, granularity, variable.decimals])

  /* mouse inspection */
  const onMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !points.length) return
    const rect = canvas.getBoundingClientRect()
    const fx = (e.clientX - rect.left - 6) / Math.max(rect.width - 12, 1)
    const i = Math.round(fx * (points.length - 1))
    setCursor(Math.max(0, Math.min(i, points.length - 1)))
  }

  const cursorValid = cursor !== null && points[cursor]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Series granularity">
          {[
            ['monthly', 'Monthly'],
            ['annual', 'Annual'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={granularity === id}
              onClick={() => dispatch({ type: 'SET_GRANULARITY', granularity: id })}
              className={`border px-2.5 py-1 font-stencil text-[9px] uppercase tracking-[0.18em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${granularity === id ? 'border-ivory/50 bg-ivory/10 text-ivory' : 'border-ivory/12 text-parchment hover:border-ivory/30 hover:text-cream'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="font-data text-[10px] uppercase tracking-[0.12em] text-parchment">
          {granularity === 'monthly' ? `${YEAR_MIN}–${YEAR_MAX}, monthly` : `${YEAR_MIN}–${YEAR_MAX}, source annual means`} · {variable.unit}
        </p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block h-52 w-full cursor-crosshair md:h-60"
          onMouseMove={onMove}
          onMouseLeave={() => setCursor(null)}
          tabIndex={0}
          role="img"
          aria-label={`Time series graph of ${variable.name.toLowerCase()} at the selected scope. Use the inspection slider below for exact values.`}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            setCursor((c) => {
              const next = c === null ? 0 : c + (e.key === 'ArrowRight' ? 1 : -1)
              return Math.max(0, Math.min(next, Math.max(points.length - 1, 0)))
            })
          }}
        />
        {cursorValid && (
          <div
            className="pointer-events-none absolute top-1.5 border border-ivory/20 bg-ink/90 px-2 py-1 font-data text-[10.5px] tracking-[0.06em] text-cream"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            {labelFor(cursor)} — {valueFor(cursor) !== null ? `${fmtValue(valueFor(cursor), variable.decimals)} ${variable.unit}` : 'no data'}
          </div>
        )}
      </div>

      {/* keyboard / touch inspection */}
      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="pt-inspect" className="shrink-0 font-stencil text-[9px] uppercase tracking-[0.2em] text-parchment">
          inspect
        </label>
        <input
          id="pt-inspect"
          type="range"
          className="pt-range flex-1"
          min={0}
          max={Math.max(points.length - 1, 0)}
          value={cursor ?? 0}
          onChange={(e) => setCursor(Number(e.target.value))}
        />
        <span className="w-36 shrink-0 text-right font-data text-[10.5px] tracking-[0.06em] text-cream/85">
          {cursorValid ? `${labelFor(cursor)} · ${valueFor(cursor) !== null ? fmtValue(valueFor(cursor), variable.decimals) : '—'}` : 'hover or focus graph'}
        </span>
      </div>
    </div>
  )
}

/* ---------------- waveform ---------------- */

function WaveformGraph() {
  const canvasRef = useRef(null)
  const { state } = usePreview()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let raf
    let lastDraw = 0
    const buf = new Float32Array(2048)

    const draw = (now = performance.now()) => {
      const analyser = engine.analyser
      const live = analyser && state.playState === 'playing'

      // Throttle playback drawing to ~60fps
      if (live && now - lastDraw < 16) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastDraw = now

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) {
        if (live) raf = requestAnimationFrame(draw)
        return
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetW = Math.round(w * dpr)
      const targetH = Math.round(h * dpr)
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }

      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = IVORY + '0.14)'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

      const mid = h / 2
      ctx.strokeStyle = IVORY + '0.12)'
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()

      if (live) {
        analyser.getFloatTimeDomainData(buf)
        ctx.strokeStyle = EMBER + '0.95)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        const step = Math.floor(buf.length / w) || 1
        for (let x = 0; x < w; x++) {
          const v = buf[x * step] || 0
          const y = mid + v * mid * 0.92
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        if (!document.hidden) {
          raf = requestAnimationFrame(draw)
        }
      } else {
        ctx.strokeStyle = IVORY + '0.45)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, mid)
        ctx.lineTo(w, mid)
        ctx.stroke()
        ctx.fillStyle = IVORY + '0.4)'
        ctx.font = '9px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          state.playState === 'paused' ? 'PAUSED — RESUME TO HEAR THE SIGNAL' : 'PRESS PLAY — THE GENERATED SIGNAL DRAWS HERE IN REAL TIME',
          w / 2,
          mid - 8,
        )
      }
    }

    draw()

    const onVis = () => {
      if (!document.hidden && state.playState === 'playing') {
        raf = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [state.playState])

  return (
    <div>
      <p className="mb-3 font-data text-[10px] uppercase tracking-[0.12em] text-parchment">
        live tap of the generated audio — not a decorative animation
      </p>
      <canvas ref={canvasRef} className="block h-52 w-full md:h-60" role="img" aria-label="Real-time waveform of the generated sonification audio" />
    </div>
  )
}

/**
 * Graph panel — three honest views:
 *
 *  Series    the actual environmental record at the current scope, with the
 *            selection shaded, the sounding month drawn as a playhead, and
 *            hover / keyboard inspection of exact values.
 *  Waveform  a live tap of the generated audio. Flat and labelled when silent.
 *  Notes     the audible layers, their note, mode and activity — the same
 *            plan the engine is playing (lib/music.js).
 *
 * Canvas performance: DPR capped at 1.5, the waveform runs at 30 fps and
 * pauses when the tab is hidden or the panel is offscreen. The series view
 * has no animation loop at all — it redraws only when the selection or
 * playhead changes. An annual-means table is available for assistive tech.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePreview } from '../state/PreviewContext'
import { monthlyArray, annualArray, keyToLabel, parseMonthKey, getMonthly } from '../lib/processing'
import { fmtValue } from '../lib/format'
import { engine } from '../lib/sonify'
import { planForStep, layerPlan, describeSound, midiToName } from '../lib/music'
import { displayKey } from '../lib/selectors'
import { YEAR_MIN, YEAR_MAX, VARIABLE_BY_ID } from '../data/datasets'

const IVORY = 'rgba(242,237,227,'
const EMBER = 'rgba(193,154,91,'

export default function GraphPanel() {
  const { state, dispatch } = usePreview()
  const { view } = state
  const tabs = [
    ['series', 'Series'],
    ['waveform', 'Waveform'],
    ['notes', 'Notes'],
  ]

  return (
    <section className="flex h-full flex-col border border-ivory/15 bg-coal/50" aria-label="Graphs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 px-4 py-3 md:px-5">
        <div>
          <h2 className="font-stencil text-[13px] uppercase tracking-[0.24em] text-beige">Graphs</h2>
          <p className="mt-0.5 font-ui text-[13px] text-cream">{YEAR_MIN}–{YEAR_MAX} · NASA POWER</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Graph view">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => dispatch({ type: 'SET_VIEW', view: id })}
              className={`border px-3 py-1.5 font-stencil text-[12px] uppercase tracking-[0.16em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${
                view === id
                  ? 'border-ivory/60 bg-ivory/12 text-ivory'
                  : 'border-ivory/15 text-beige hover:border-ivory/40 hover:text-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-5" role="tabpanel">
        {view === 'series' && <SeriesGraph />}
        {view === 'waveform' && <WaveformGraph />}
        {view === 'notes' && <NotesGraph />}
      </div>
    </section>
  )
}

/* ---------------- series ---------------- */

function SeriesGraph() {
  const { state, dispatch, seriesMap, variable, mappingRange, normalByMonth } = usePreview()
  const { granularity } = state
  const canvasRef = useRef(null)
  const [cursor, setCursor] = useState(null)
  const { steps } = usePreview()

  const points = useMemo(() => {
    if (!seriesMap) return []
    return granularity === 'monthly'
      ? monthlyArray(seriesMap, YEAR_MIN, YEAR_MAX)
      : annualArray(seriesMap, YEAR_MIN, YEAR_MAX)
  }, [seriesMap, granularity])

  const labelFor = (i) => (granularity === 'monthly' ? keyToLabel(points[i].key) : String(points[i].year))
  const valueFor = (i) => points[i].value

  const band = useMemo(() => {
    if (!points.length) return null
    if (granularity === 'annual') {
      const yearIdx = (year) => points.findIndex((p) => p.year === year)
      let a
      let b
      if (state.timeMode === 'range') {
        a = yearIdx(state.range.startYear)
        b = yearIdx(state.range.endYear)
      } else {
        a = yearIdx(state.year)
        b = a
      }
      return a >= 0 && b >= 0 ? [a, b] : null
    }
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
  }, [points, granularity, state.timeMode, state.year, state.month, state.range.startYear, state.range.endYear])

  const playhead = useMemo(() => {
    if (state.playState === 'idle') return null
    const step = steps[state.position]
    if (!step) return null
    if (granularity === 'annual') {
      const year = Number(String(step.key).slice(0, 4))
      const i = points.findIndex((p) => p.year === year)
      return i >= 0 ? i : null
    }
    const i = points.findIndex((p) => p.key === step.key)
    return i >= 0 ? i : null
  }, [state.playState, state.position, steps, points, granularity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      ctx.strokeStyle = IVORY + '0.16)'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

      if (!points.length) {
        ctx.fillStyle = IVORY + '0.75)'
        ctx.font = '12px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NO DATA LOADED', w / 2, h / 2)
        return
      }

      const padL = 8
      const padR = 10
      const padT = 12
      const padB = 24
      const iw = w - padL - padR
      const ih = h - padT - padB

      const vals = points.filter((p) => p.value !== null).map((p) => p.value)
      if (!vals.length) {
        ctx.fillStyle = IVORY + '0.75)'
        ctx.font = '12px Oxanium, monospace'
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

      if (band) {
        const bx0 = x(band[0])
        const bx1 = x(band[1])
        ctx.fillStyle = IVORY + '0.08)'
        ctx.fillRect(bx0, padT, Math.max(bx1 - bx0, 2), ih)
      }

      ctx.font = '12px Oxanium, monospace'
      ctx.textAlign = 'left'
      for (let g = 0; g <= 3; g++) {
        const gv = lo + ((hi - lo) * g) / 3
        const gy = y(gv)
        ctx.strokeStyle = IVORY + '0.08)'
        ctx.beginPath()
        ctx.moveTo(padL, gy)
        ctx.lineTo(padL + iw, gy)
        ctx.stroke()
        ctx.fillStyle = IVORY + '0.7)'
        ctx.fillText(fmtValue(gv, variable.decimals), padL + 3, gy - 3)
      }

      ctx.textAlign = 'center'
      for (let i = 0; i < points.length; i++) {
        const yr = granularity === 'monthly' ? Number(points[i].key.slice(0, 4)) : points[i].year
        const show = granularity === 'monthly' ? yr % 10 === 0 && points[i].key.endsWith('01') : yr % 10 === 0
        if (show) {
          ctx.fillStyle = IVORY + '0.7)'
          ctx.fillText(String(yr), x(i), h - 7)
        }
      }

      ctx.strokeStyle = IVORY + '0.9)'
      ctx.lineWidth = 1.2
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

      if (cursor !== null && points[cursor]) {
        const cx = x(cursor)
        ctx.strokeStyle = EMBER + '0.9)'
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
          ctx.arc(cx, y(points[cursor].value), 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (playhead !== null && points[playhead]) {
        const px = x(playhead)
        ctx.strokeStyle = EMBER + '1)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(px, padT)
        ctx.lineTo(px, padT + ih)
        ctx.stroke()
        if (points[playhead].value !== null) {
          ctx.fillStyle = EMBER + '1)'
          ctx.beginPath()
          ctx.arc(px, y(points[playhead].value), 3.6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        draw()
      })
    }

    draw()
    const ro = new ResizeObserver(schedule)
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [points, band, playhead, cursor, granularity, variable.decimals])

  const previewCursor = (index) => {
    if (!state.settings.hoverSonify || state.playState !== 'idle') return
    const point = points[index]
    if (!point || point.value === null) return
    const { month } = point.key ? parseMonthKey(point.key) : { month: null }
    const plan = planForStep({
      variable,
      step: point,
      normal: month && normalByMonth ? normalByMonth[month] : null,
      range: mappingRange,
      prevValue: index > 0 ? points[index - 1].value : null,
    })
    engine.previewPoint(plan)
  }

  const onMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !points.length) return
    const rect = canvas.getBoundingClientRect()
    const fx = (e.clientX - rect.left - 8) / Math.max(rect.width - 18, 1)
    const i = Math.round(fx * (points.length - 1))
    const next = Math.max(0, Math.min(i, points.length - 1))
    setCursor(next)
    previewCursor(next)
  }

  const cursorValid = cursor !== null && points[cursor]

  const annualTable = useMemo(() => {
    if (!seriesMap) return []
    return annualArray(seriesMap, YEAR_MIN, YEAR_MAX)
  }, [seriesMap])

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
              className={`border px-2.5 py-1.5 font-stencil text-[12px] uppercase tracking-[0.14em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${
                granularity === id
                  ? 'border-ivory/60 bg-ivory/12 text-ivory'
                  : 'border-ivory/15 text-beige hover:border-ivory/40 hover:text-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="font-ui text-[13px] text-cream">
          {granularity === 'monthly' ? 'monthly values' : 'annual means'} · {variable.unit}
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
          aria-label={`Time series of ${variable.name.toLowerCase()} at the selected scope, ${YEAR_MIN} to ${YEAR_MAX}. Use the inspection slider or arrow keys for exact values. An annual-means table follows below.`}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            setCursor((c) => {
              const next = c === null ? 0 : c + (e.key === 'ArrowRight' ? 1 : -1)
              const clamped = Math.max(0, Math.min(next, Math.max(points.length - 1, 0)))
              previewCursor(clamped)
              return clamped
            })
          }}
        />
        {cursorValid && (
          <div
            className="pointer-events-none absolute top-1.5 border border-ivory/25 bg-ink/95 px-2 py-1 font-data text-[12.5px] text-cream"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            {labelFor(cursor)} — {valueFor(cursor) !== null ? `${fmtValue(valueFor(cursor), variable.decimals)} ${variable.unit}` : 'no data'}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-[12px] text-beige">
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-ivory/90 align-middle" />monthly value</span>
        <span><span className="mr-1 inline-block h-2 w-3 bg-ivory/20 align-middle" />selected period</span>
        <span><span className="mr-1 inline-block h-2 w-0.5 bg-ember align-middle" />sounding month</span>
        {state.settings.hoverSonify && <span>hover to hear a preview</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap">
        <label htmlFor="pt-inspect" className="shrink-0 font-stencil text-[12px] uppercase tracking-[0.16em] text-beige">
          Inspect
        </label>
        <input
          id="pt-inspect"
          type="range"
          className="pt-range min-w-0 flex-1"
          min={0}
          max={Math.max(points.length - 1, 0)}
          value={cursor ?? 0}
          onChange={(e) => {
            const next = Number(e.target.value)
            setCursor(next)
          }}
          aria-label="Inspect a point in the series"
        />
        <span className="w-full shrink-0 text-left font-data text-[13px] text-cream sm:w-44 sm:text-right">
          {cursorValid ? `${labelFor(cursor)} · ${valueFor(cursor) !== null ? fmtValue(valueFor(cursor), variable.decimals) : '—'}` : 'hover or focus the graph'}
        </span>
      </div>

      <details className="mt-3 border border-ivory/15">
        <summary className="cursor-pointer px-3 py-2 font-ui text-[14px] text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory">
          Data table — annual means ({annualTable.filter((p) => p.value !== null).length} years)
        </summary>
        <div className="max-h-64 overflow-auto border-t border-ivory/10">
          <table className="w-full border-collapse font-ui text-[14px]">
            <caption className="px-3 py-2 text-left text-[13px] text-beige">
              Annual means. The source's own year value is used when present; otherwise the mean of that year's
              monthly values is computed. Years with fewer than 10 valid months are left blank.
            </caption>
            <thead>
              <tr className="border-b border-ivory/15 text-left">
                <th scope="col" className="px-3 py-2 font-stencil text-[12px] uppercase tracking-[0.14em] text-beige">Year</th>
                <th scope="col" className="px-3 py-2 text-right font-stencil text-[12px] uppercase tracking-[0.14em] text-beige">{variable.name} ({variable.unit})</th>
              </tr>
            </thead>
            <tbody>
              {annualTable.map((p) => (
                <tr key={p.year} className="border-b border-ivory/8">
                  <th scope="row" className="px-3 py-1.5 text-left font-data text-[13px] text-cream">{p.year}</th>
                  <td className="px-3 py-1.5 text-right font-data text-[13px] text-ivory">
                    {p.value !== null ? fmtValue(p.value, variable.decimals) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

/* ---------------- waveform ---------------- */

function WaveformGraph() {
  const canvasRef = useRef(null)
  const { state } = usePreview()
  const playing = state.playState === 'playing'
  const reduceMotion = state.settings.reduceMotion

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let raf = 0
    let lastDraw = 0
    let visible = true
    const buf = new Float32Array(2048)

    const draw = (now = performance.now()) => {
      const analyser = engine.analyser
      const live = analyser && playing && !document.hidden && visible

      if (live && now - lastDraw < (reduceMotion ? 66 : 33)) {
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const targetW = Math.round(w * dpr)
      const targetH = Math.round(h * dpr)
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }

      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = IVORY + '0.16)'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

      const mid = h / 2
      ctx.strokeStyle = IVORY + '0.14)'
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()

      if (live) {
        try {
          if (typeof analyser.getFloatTimeDomainData === 'function') analyser.getFloatTimeDomainData(buf)
          else if (typeof analyser.getValue === 'function') buf.set(analyser.getValue())
        } catch { /* analyser not ready */ }
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
        if (!document.hidden && visible) raf = requestAnimationFrame(draw)
      } else {
        ctx.strokeStyle = IVORY + '0.55)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, mid)
        ctx.lineTo(w, mid)
        ctx.stroke()
        ctx.fillStyle = IVORY + '0.75)'
        ctx.font = '12px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          state.playState === 'paused'
            ? 'PAUSED — RESUME TO HEAR THE SIGNAL'
            : 'PRESS PLAY — THE GENERATED SIGNAL DRAWS HERE',
          w / 2,
          mid - 10,
        )
      }
    }

    draw()

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && playing) {
          if (raf) cancelAnimationFrame(raf)
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.05 },
    )
    io.observe(canvas)

    const onVis = () => {
      if (!document.hidden && playing && visible) {
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [playing, reduceMotion, state.playState])

  return (
    <div>
      <p className="mb-3 font-ui text-[13px] leading-relaxed text-cream">
        A live tap of the audio after the limiter and volume stage — not a decorative animation. Silence draws a flat line.
      </p>
      <canvas
        ref={canvasRef}
        className="block h-52 w-full md:h-60"
        role="img"
        aria-label="Real-time waveform of the generated sonification audio. When playback is stopped or paused, the line is flat."
      />
    </div>
  )
}

/* ---------------- notes ---------------- */

function NotesGraph() {
  const { state, variable, mappingRange, steps, seriesMap, normalByMonth } = usePreview()
  /* While suspended the engine's current plan is authoritative; when idle,
     derive the plan for the month the map is showing, with its real normal,
     so the notes cannot describe a different scale from the sound. */
  const key = displayKey(state, steps, state.position, state.playState)
  const point = key ? parseMonthKey(key) : null
  const value = point ? getMonthly(seriesMap, point.year, point.month) : null
  const normal = point && normalByMonth ? normalByMonth[point.month] ?? null : null
  const plan = state.soundPlan || planForStep({
    variable,
    step: { key, value },
    normal,
    range: mappingRange,
    prevValue: null,
  })
  const layers = layerPlan(plan, variable)
  const scaleNotes = plan.scaleMidi || []
  const active = plan.note
  const selectedLayers = (state.selectedVariableIds || [state.variableId])
    .map((id) => VARIABLE_BY_ID[id])
    .filter((v) => v && v.status === 'live')

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-stencil text-[12px] uppercase tracking-[0.18em] text-beige">Sounding now</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-data text-[34px] leading-none text-ivory font-semibold">{active || 'rest'}</span>
            <span className="font-ui text-[14px] text-cream">{plan.mode}</span>
          </p>
          <p className="mt-1 font-ui text-[14px] leading-relaxed text-cream">{describeSound(plan, variable)}</p>
        </div>
        <div className="flex flex-wrap gap-1" role="img" aria-label={`${plan.mode} scale; sounding note ${active || 'none'}`}>
          {scaleNotes.map((midi) => (
            <span
              key={midi}
              className={`inline-flex min-w-[36px] justify-center border px-1.5 py-1 font-data text-[12px] ${
                midi === plan.midi ? 'border-ember bg-ember/20 text-ivory' : 'border-ivory/15 text-beige'
              }`}
            >
              {midiToName(midi)}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {layers.map((layer) => (
          <li key={layer.id} className="border border-ivory/15 bg-white/[0.02] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-ui text-[14px] text-ivory">{layer.label}</span>
              <span className="font-data text-[12px] text-beige">{layer.detail}</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-white/[0.07]" aria-hidden="true">
              <div className="h-1.5 bg-ember/80" style={{ width: `${Math.round(layer.level * 100)}%` }} />
            </div>
            <p className="mt-1.5 font-ui text-[12px] text-beige">{layer.meta}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 font-ui text-[13px] leading-relaxed text-beige">
        {steps.length} months in this selection. One month is two beats, two months make a bar; the
        pad holds its chord while the bass restates on each bar line.
        {selectedLayers.length > 1
          ? ` ${selectedLayers.map((v) => v.name).join(' + ')} are layered; ${variable.name} leads the tempo and the captions.`
          : ''}
        {' '}The plan updates with every sounding month.
        {plan.missing ? ' This month has no valid value, so this layer adds no new note.' : ''}
      </p>
    </div>
  )
}

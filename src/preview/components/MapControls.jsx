import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePreview } from '../state/PreviewContext'
import { YEAR_MIN, YEAR_MAX } from '../data/datasets'
import { MONTHS_SHORT } from '../lib/processing'

/* =========================================================================
   1. MapAudioControls — Floating audio controls on the map
   ========================================================================= */
const RATES = [
  [0.5, '0.5×'],
  [1, '1×'],
  [2, '2×'],
]

export function MapAudioControls() {
  const { state, dispatch, actions } = usePreview()
  const { playState, volume, rate } = state

  const [isOpen, setIsOpen] = useState(false)
  const [dockOffset, setDockOffset] = useState(null)
  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)
  const isDraggingRef = useRef(false)

  const playing = playState === 'playing'
  const paused = playState === 'paused'
  const idle = playState === 'idle'

  useEffect(() => {
    const dock = document.querySelector('[data-preview-dock]')
    if (!dock) return
    const mq = window.matchMedia('(max-width: 767px)')
    const measure = () => {
      setDockOffset(mq.matches ? Math.round(dock.getBoundingClientRect().height) + 14 : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(dock)
    mq.addEventListener('change', measure)
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', measure)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    if (!isOpen && !openTimerRef.current) {
      openTimerRef.current = setTimeout(() => {
        setIsOpen(true)
        openTimerRef.current = null
      }, 250)
    }
  }

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (!isDraggingRef.current) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false)
        closeTimerRef.current = null
      }, 250)
    }
  }

  return (
    <div
      className="absolute bottom-[148px] left-4 md:left-5 z-20 select-none pointer-events-auto"
      style={dockOffset !== null ? { bottom: dockOffset } : undefined}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="collapsed-play-btn"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (idle) actions.play()
              else if (paused) actions.resume()
              else actions.pause()
            }}
            aria-label={playing ? 'Pause' : 'Play'}
            title={playing ? 'Pause' : 'Play (Hover for audio controls)'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/40 bg-black/85 backdrop-blur-md text-ivory transition-all duration-200 hover:border-white hover:scale-105 active:scale-95 cursor-pointer shadow-xl shadow-black/90"
          >
            {playing ? (
              <svg width="12" height="13" viewBox="0 0 10 12" aria-hidden="true">
                <rect x="1" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
                <rect x="6" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
              </svg>
            ) : (
              <svg width="13" height="14" viewBox="0 0 10 12" aria-hidden="true" className="translate-x-[0.5px]">
                <path d="M1 1 L9 6 L1 11 Z" fill="currentColor" />
              </svg>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="expanded-audio-controls"
            initial={{ opacity: 0, scale: 0.94, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 4 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-2 origin-bottom-left w-[228px]"
          >
            <div className="flex h-8 items-center px-2.5 rounded border border-white/25 bg-black/85 backdrop-blur-md shadow-md shadow-black/80 w-full">
              <label
                htmlFor="map-volume"
                className="font-stencil text-[11px] uppercase tracking-[0.2em] text-white font-bold cursor-pointer shrink-0"
              >
                Vol
              </label>
              <input
                id="map-volume"
                type="range"
                className="pt-range flex-1 mx-2.5 cursor-pointer h-1.5 accent-[#ffffff] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onMouseDown={() => { isDraggingRef.current = true }}
                onMouseUp={() => { isDraggingRef.current = false }}
                onChange={(e) => dispatch({ type: 'SET_VOLUME', volume: Number(e.target.value) })}
              />
              <span className="font-data text-[11.5px] tracking-[0.06em] text-white font-bold min-w-[34px] text-right shrink-0">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <div className="flex items-center w-full">
              <button
                type="button"
                onClick={idle ? actions.play : paused ? actions.resume : actions.pause}
                aria-label={playing ? 'Pause' : 'Play'}
                title={idle ? 'Play' : paused ? 'Resume' : 'Pause'}
                className="flex h-8 w-8 items-center justify-center rounded border border-white/80 bg-black/85 backdrop-blur-md text-white transition-all duration-150 hover:bg-white/25 hover:border-white hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-black/80 shrink-0"
              >
                {idle || paused ? (
                  <svg width="11" height="12" viewBox="0 0 10 12" aria-hidden="true" className="translate-x-[0.5px]">
                    <path d="M1 1 L9 6 L1 11 Z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="11" height="12" viewBox="0 0 10 12" aria-hidden="true">
                    <rect x="1" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
                    <rect x="6" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
                  </svg>
                )}
              </button>

              <div className="w-1.5 shrink-0" />

              <button
                type="button"
                onClick={actions.stop}
                disabled={idle}
                aria-label="Stop playback"
                title="Stop playback"
                className="flex h-8 w-8 items-center justify-center rounded border border-white/25 bg-black/85 backdrop-blur-md text-white/90 transition-all duration-150 hover:border-white/60 hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer shadow-md shadow-black/80 shrink-0"
              >
                <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                  <rect width="10" height="10" rx="0.5" fill="currentColor" />
                </svg>
              </button>

              <div className="flex-1 flex items-center gap-3 ml-3" role="group" aria-label="Playback speed">
                {RATES.map(([r, label]) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={rate === r}
                    onClick={() => dispatch({ type: 'SET_RATE', rate: r })}
                    className={`flex-1 flex h-8 items-center justify-center font-data text-[11.5px] tracking-[0.06em] transition-all duration-150 cursor-pointer rounded backdrop-blur-md shadow-md shadow-black/80 ${rate === r
                      ? 'border border-white bg-white/25 text-white font-bold'
                      : 'border border-white/25 bg-black/85 text-white/80 hover:border-white/60 hover:text-white'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* =========================================================================
   2. Timeline — Time selector and playback progress scrubber
   ========================================================================= */
const MODES = [
  ['year', 'Year'],
  ['range', 'Range'],
]

const YEARS = []
for (let y = YEAR_MIN; y <= YEAR_MAX; y++) YEARS.push(y)

function YearSelect({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5">
      <span className="font-stencil text-[12px] uppercase tracking-[0.2em] text-ivory font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-white/20 bg-[#252830] px-3.5 py-1.5 font-data text-[14px] tracking-[0.06em] text-ivory font-medium focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer rounded-sm"
      >
        {YEARS.map((y) => (
          <option key={y} value={y} className="bg-[#252830] text-ivory">
            {y}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Timeline() {
  const { state, dispatch, actions, steps } = usePreview()
  const { timeMode, year, month, range, playState, position } = state

  const playing = playState === 'playing' || playState === 'paused'

  const stepIndexFor = (y, m) => steps.findIndex((s) => s.key === `${y}${String(m).padStart(2, '0')}`)

  return (
    <div
      className="border-t border-white/20 bg-[#1e2126]/95 backdrop-blur-xl p-3.5 md:p-4 shadow-[0_-10px_35px_rgba(0,0,0,0.5)]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Time selection mode">
            {MODES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={timeMode === id}
                onClick={() => dispatch({ type: 'SET_TIME_MODE', mode: id })}
                className={`border px-4 py-1.5 font-stencil text-[12.5px] md:text-[13px] uppercase tracking-[0.22em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer rounded-sm ${timeMode === id
                  ? 'border-[#e2d9c6] bg-[#e2d9c6]/20 text-ivory font-semibold shadow-[0_0_12px_rgba(226,217,198,0.14)]'
                  : 'border-white/20 bg-white/[0.04] text-ivory/80 hover:border-ivory/40 hover:text-ivory hover:bg-white/[0.08] font-medium'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {timeMode !== 'range' && (
              <YearSelect
                label="Year"
                value={year}
                onChange={(y) => dispatch({ type: 'SET_YEAR', year: y })}
              />
            )}

            {timeMode === 'range' && (
              <>
                <YearSelect
                  label="From"
                  value={range.startYear}
                  onChange={(y) =>
                    dispatch({ type: 'SET_RANGE', range: { ...range, startYear: Math.min(y, range.endYear) } })
                  }
                />
                <YearSelect
                  label="To"
                  value={range.endYear}
                  onChange={(y) =>
                    dispatch({ type: 'SET_RANGE', range: { ...range, endYear: Math.max(y, range.startYear) } })
                  }
                />
                <span className="font-data text-[13px] uppercase tracking-[0.14em] text-ivory font-medium">
                  {steps.length} months selected
                </span>
              </>
            )}
          </div>
        </div>

        <span className="font-ui text-[12px] md:text-[12.5px] uppercase tracking-[0.16em] text-ivory/70 font-medium">
          monthly record · {YEAR_MIN}–{YEAR_MAX}
        </span>
      </div>

      {timeMode === 'year' && (
        <div className="mt-3.5 grid grid-cols-6 gap-1.5 sm:grid-cols-12" role="group" aria-label="Months of the selected year">
          {MONTHS_SHORT.map((m, i) => {
            const idx = stepIndexFor(year, i + 1)
            const active = playing ? position === idx : month === i + 1
            const isCurrent = playing && position === idx
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                aria-label={`${m} ${year}${isCurrent ? ' — currently playing' : ''}`}
                onClick={() => {
                  if (!playing) dispatch({ type: 'SET_MONTH', month: i + 1 })
                  else if (idx >= 0) actions.seek(idx)
                }}
                className={`border px-1 sm:px-2 py-2 font-data text-[13px] md:text-[13.5px] uppercase tracking-[0.1em] sm:tracking-[0.14em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer rounded-sm ${active
                  ? isCurrent
                    ? 'border-[#e2d9c6] bg-[#e2d9c6]/30 text-ivory font-semibold shadow-[0_0_14px_rgba(226,217,198,0.22)]'
                    : 'border-[#e2d9c6] bg-[#e2d9c6]/20 text-ivory font-semibold shadow-[0_0_10px_rgba(226,217,198,0.14)]'
                  : 'border-white/15 bg-white/[0.05] text-ivory/80 hover:border-ivory/40 hover:bg-white/[0.12] hover:text-ivory font-medium'
                  }`}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default { MapAudioControls, Timeline }


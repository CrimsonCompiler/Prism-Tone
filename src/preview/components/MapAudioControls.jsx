/**
 * Compact Map Audio Transport Controls.
 * Floating directly on the map screen (bottom-left, above the timeline dock).
 *
 * Behavior:
 * - Collapsed state: ONLY the sound icon button is visible.
 * - Hover behavior: 1-second intentional delay followed by a soft, luxurious
 *   motion animation revealing the full audio controls (Vol slider, Play, Stop, Speed).
 * - Mouse leave: Smooth, soft transition collapsing back to the sound icon button.
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePreview } from '../state/PreviewContext'

const RATES = [
  [0.5, '0.5×'],
  [1, '1×'],
  [2, '2×'],
]

export default function MapAudioControls() {
  const { state, dispatch, actions } = usePreview()
  const { playState, volume, rate } = state

  const [isOpen, setIsOpen] = useState(false)
  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)
  const isDraggingRef = useRef(false)

  const playing = playState === 'playing'
  const paused = playState === 'paused'
  const idle = playState === 'idle'

  // Clean up timers on unmount
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
      // 0.25-second fast & smooth delay before revealing
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
      // Soft 250ms buffer before fading out so it doesn't vanish abruptly
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false)
        closeTimerRef.current = null
      }, 250)
    }
  }

  const handleImmediateOpen = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    setIsOpen(true)
  }

  return (
    <div
      className="absolute bottom-[148px] left-4 md:left-5 z-20 select-none pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Collapsed State: Play / Pause Icon Button */
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
              /* Pause Icon */
              <svg width="12" height="13" viewBox="0 0 10 12" aria-hidden="true">
                <rect x="1" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
                <rect x="6" y="1" width="3" height="10" rx="0.5" fill="currentColor" />
              </svg>
            ) : (
              /* Play Icon */
              <svg width="13" height="14" viewBox="0 0 10 12" aria-hidden="true" className="translate-x-[0.5px]">
                <path d="M1 1 L9 6 L1 11 Z" fill="currentColor" />
              </svg>
            )}
          </motion.button>
        ) : (
          /* Expanded State: Soft animation floating in full audio controls */
          <motion.div
            key="expanded-audio-controls"
            initial={{ opacity: 0, scale: 0.94, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 4 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-2 origin-bottom-left w-[228px]"
          >
            {/* Row 1: Single unified Volume box containing Vol label, slider, and percentage */}
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

            {/* Row 2: Play/Pause, Stop, Speed — Equal height (h-8) and aligned */}
            <div className="flex items-center w-full">
              {/* Play / Pause Icon Button */}
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

              {/* Stop Icon Button */}
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

              {/* Speed Buttons — widened gaps (ml-3 & gap-3) to align with Vol/80% row */}
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

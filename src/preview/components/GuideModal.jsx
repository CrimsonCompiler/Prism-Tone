/**
 * First-time guide — a dismissible dialog covering the nine steps from the
 * product brief. It opens automatically on first visit (per session), can
 * be told not to return, and is re-openable any time from the header button.
 */

import { useEffect, useRef } from 'react'
import { usePreview } from '../state/PreviewContext'

const GUIDE_KEY = 'pt-preview-guide-dismissed'

const STEPS = [
  ['Choose a variable', 'Six categories are listed. Temperature, rainfall and wind are live NASA POWER datasets — the other three are honestly marked unavailable rather than faked.'],
  ['Explore the map', 'The GPU-accelerated MapLibre choropleth displays the selected variable across the globe and all 7 continents (Asia, Africa, Europe, North America, South America, Oceania, Antarctica). Activate any continent — on the map or in the navigation list — to fly into it.'],
  ['Select a time', 'Pick a year, a single month, or a custom range. The record runs 1981–2025; yearly playback walks all twelve months.'],
  ['Play the audio', 'One month becomes one sound event. Play, pause, resume and stop from the control bar; progress shows exactly which month is sounding.'],
  ['Read the captions', 'The caption panel narrates each step: the value, how it compares to the 1991–2020 normal, and what the sound is doing. It keeps working when audio is off.'],
  ['Read the summary', 'Current value, minimum, maximum, mean and the baseline comparison — every figure computed from the loaded record, with coverage stated.'],
  ['Open the graphs', 'The series view shows the full 1981–2025 record with the selection shaded and a playhead following playback. Hover, or use the inspect slider, for exact values.'],
  ['Understand the mapping', 'The mapping panel documents exactly how the selected variable is normalised and which audio parameter it drives.'],
  ['Tune the sound', 'Volume, playback speed and the time-pulse layer are under your control. Changing variable, region or time stops playback so the audio never drifts out of sync.'],
]

export default function GuideModal() {
  const { state, dispatch } = usePreview()
  const closeRef = useRef(null)

  useEffect(() => {
    if (!state.guideOpen) return
    const prev = document.activeElement
    closeRef.current && closeRef.current.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') dispatch({ type: 'GUIDE', open: false })
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (prev && prev.focus) prev.focus()
    }
  }, [state.guideOpen, dispatch])

  const close = (remember) => {
    if (remember) {
      try {
        sessionStorage.setItem(GUIDE_KEY, '1')
      } catch { /* storage unavailable — guide simply reopens next visit */ }
    }
    dispatch({ type: 'GUIDE', open: false })
  }

  return (
    <>
      {/* Fixed bottom-right '?' guide trigger button */}
      <button
        type="button"
        onClick={() => dispatch({ type: 'GUIDE', open: true })}
        aria-label="Open guide"
        title="Open guide"
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-ivory/25 bg-[#161818]/90 text-ivory shadow-lg shadow-black/60 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-ivory/70 hover:bg-ivory/15 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 active:scale-95 cursor-pointer group"
      >
        <span
          className="font-meno text-xl font-light leading-none select-none transition-transform duration-200 group-hover:scale-110"
          style={{ fontFamily: '"Meno Banner", "Source Serif 4", Georgia, serif' }}
        >
          ?
        </span>
      </button>

      {/* Guide dialog */}
      {state.guideOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pt-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close(false)
          }}
        >
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto border border-ivory/20 bg-[#161818] p-6 md:p-8" data-lenis-prevent>
            <div className="flex items-baseline justify-between">
              <p className="font-stencil text-[10px] uppercase tracking-[0.28em] text-beige">How to use this page</p>
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-parchment">9 steps · ~2 min</span>
            </div>
            <h2 id="pt-guide-title" className="mt-2 font-meno text-[26px] font-light leading-tight text-ivory md:text-[30px]" style={{ fontFamily: 'Meno Banner' }}>
              Listen to the Subcontinent, honestly
            </h2>
            <ol className="mt-5 flex flex-col gap-4">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-3.5">
                  <span className="mt-0.5 shrink-0 font-data text-[11px] tracking-[0.1em] text-ember">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="font-ui text-[13.5px] font-semibold tracking-[0.04em] text-ivory">{title}</p>
                    <p className="mt-1 font-ui text-[12.5px] leading-relaxed text-cream/75">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-5 border-t border-ivory/10 pt-4 font-ui text-[12px] leading-relaxed text-cream/60">
              Everything on this page is computed from the NASA POWER record as it arrives from the API — gaps
              stay silent, derived values are labelled, and nothing is invented to fill the interface.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                ref={closeRef}
                type="button"
                onClick={() => close(false)}
                className="border border-ivory/40 bg-ivory/10 px-5 py-2.5 font-stencil text-[10.5px] uppercase tracking-[0.24em] text-ivory transition-colors duration-200 hover:bg-ivory hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory"
              >
                Start exploring
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="border border-ivory/20 px-4 py-2.5 font-stencil text-[10px] uppercase tracking-[0.2em] text-parchment transition-colors duration-200 hover:border-ivory/40 hover:text-cream focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70"
              >
                Don't show again this session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

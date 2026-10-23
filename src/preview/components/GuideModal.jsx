/**
 * First-time guide — a dismissible dialog covering the nine steps from the
 * product brief. It opens automatically on first visit (per session), can
 * be told not to return, and is re-openable any time from the header button.
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '../state/PreviewContext'

const GUIDE_KEY = 'pt-preview-guide-dismissed'

const STEPS = [
  ['Choose a variable', 'Six categories are listed. Temperature, rainfall and wind are live NASA POWER datasets — the other three are honestly marked unavailable rather than faked.'],
  ['Explore the map', 'The GPU-accelerated MapLibre choropleth displays the selected variable across the globe and all 7 continents (Asia, Africa, Europe, North America, South America, Oceania, Antarctica). Activate any continent — on the map or in the navigation list — to fly into it.'],
  ['Select a time', 'Pick a year, a single month, or a custom range. The record runs 1981–2025; yearly playback walks all twelve months.'],
  ['Play the audio', 'One month becomes one sound event. Play, pause, resume and stop from the control bar; progress shows exactly which month is sounding.'],
  ['Read the captions', 'The caption panel narrates each step in real time: the value, how it compares to the 1991–2020 normal, and what the sound is doing. Captions synchronize with active audio playback.'],
  ['Read the summary', 'Current value, minimum, maximum, mean and the baseline comparison — every figure computed from the loaded record, with coverage stated.'],
  ['Open the graphs', 'The series view shows the full 1981–2025 record with the selection shaded and a playhead following playback. Hover, or use the inspect slider, for exact values.'],
  ['Understand the mapping', 'The mapping panel documents exactly how the selected variable is normalised and which audio parameter it drives.'],
  ['Tune the sound', 'Volume, playback speed and the time-pulse layer are under your control. Changing variable, region or time stops playback so the audio never drifts out of sync.'],
]

export default function GuideModal() {
  const { state, dispatch } = usePreview()
  const closeRef = useRef(null)
  const modalContainerRef = useRef(null)

  useEffect(() => {
    if (!state.guideOpen) return

    // 1. Lock background page scroll completely (Lenis smooth scroll + native overflow)
    window.__lenis?.stop()
    const origBodyOverflow = document.body.style.overflow
    const origHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // 2. Ensure modal content starts from the very beginning (top)
    if (modalContainerRef.current) {
      modalContainerRef.current.scrollTop = 0
    }

    // 3. Hide navbar while guide popup is active so it never overlaps or shows
    const nav = document.querySelector('header')
    let prevOpacity = ''
    let prevVisibility = ''
    let prevPointerEvents = ''
    if (nav) {
      prevOpacity = nav.style.opacity
      prevVisibility = nav.style.visibility
      prevPointerEvents = nav.style.pointerEvents
      nav.style.opacity = '0'
      nav.style.visibility = 'hidden'
      nav.style.pointerEvents = 'none'
    }

    // 4. Focus top close button safely without scrolling container down
    const prev = document.activeElement
    if (closeRef.current) {
      closeRef.current.focus({ preventScroll: true })
    }

    const onKey = (e) => {
      if (e.key === 'Escape') dispatch({ type: 'GUIDE', open: false })
    }
    document.addEventListener('keydown', onKey)
    return () => {
      // Re-enable background scrolling on modal dismiss
      window.__lenis?.start()
      document.body.style.overflow = origBodyOverflow
      document.documentElement.style.overflow = origHtmlOverflow
      document.removeEventListener('keydown', onKey)
      if (nav) {
        nav.style.opacity = prevOpacity
        nav.style.visibility = prevVisibility
        nav.style.pointerEvents = prevPointerEvents
      }
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

  const modalContent = state.guideOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 sm:p-6 md:p-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pt-guide-title"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false)
      }}
    >
      <div
        ref={modalContainerRef}
        className="relative max-h-[86vh] w-full max-w-3xl lg:max-w-[820px] overflow-y-auto rounded-xl border border-ivory/15 bg-[#141617]/98 p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/95 backdrop-blur-2xl"
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory/10 pb-4 sm:pb-5">
          <div>
            <h2 id="pt-guide-title" className="font-stencil text-[14px] sm:text-[15px] uppercase tracking-[0.26em] text-ivory font-medium">
              How to use this page
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline font-data text-[12px] uppercase tracking-[0.16em] text-ivory/50">9 steps · ~2 min</span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => close(false)}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-ivory/25 text-ivory/70 hover:border-ivory/60 hover:text-ivory hover:bg-white/10 transition-colors text-base cursor-pointer"
              title="Close guide"
              aria-label="Close guide"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 1-Column Sequential Steps List */}
        <ol className="mt-5 flex flex-col divide-y divide-white/8">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex items-start gap-4 sm:gap-5 py-4 sm:py-4.5 first:pt-2 last:pb-2">
              <span className="font-data text-[16px] sm:text-[17px] font-semibold text-ivory/50 tracking-wider shrink-0 w-8 pt-0.5 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <h3 className="font-ui text-[18px] sm:text-[19px] font-semibold tracking-wide text-ivory">{title}</h3>
                <p className="mt-1.5 font-ui text-[15.5px] sm:text-[16px] leading-relaxed text-ivory/80 font-normal">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Footer note */}
        <p className="mt-7 border-t border-ivory/10 pt-5 font-ui text-[15px] leading-relaxed text-ivory/70 font-normal">
          Everything on this page is computed from the NASA POWER record as it arrives from the API — gaps
          stay silent, derived values are labelled, and nothing is invented to fill the interface.
        </p>

        {/* Action buttons */}
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => close(false)}
            className="border border-ivory/40 bg-ivory/15 px-7 py-3 font-stencil text-[12px] uppercase tracking-[0.22em] text-ivory font-semibold hover:bg-ivory hover:text-[#121313] transition-colors duration-200 rounded-sm cursor-pointer shadow-sm"
          >
            Start exploring
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className="border border-white/15 px-6 py-3 font-stencil text-[11.5px] uppercase tracking-[0.18em] text-ivory/60 hover:border-ivory/40 hover:text-ivory hover:bg-white/5 transition-colors duration-200 rounded-sm cursor-pointer"
          >
            Don't show again this session
          </button>
        </div>
      </div>
    </div>
  ) : null

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

      {/* Render modal directly in document.body via Portal to prevent z-index clipping */}
      {typeof document !== 'undefined' && modalContent ? createPortal(modalContent, document.body) : modalContent}
    </>
  )
}

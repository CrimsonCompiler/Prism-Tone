import { useEffect, useRef, useState } from 'react'
import { MotionConfig, motion, useScroll } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'

import Nav from './components/Nav'
import { PreviewProvider, usePreview } from './preview/state/PreviewContext'
import { PreviewHero, StatusBanner, SourceBar } from './preview/components/Chrome'
import VariableSelector from './preview/components/VariableSelector'
import SubcontinentMap from './preview/components/SubcontinentMap'
import { SummaryPanel } from './preview/components/Panels'
import GraphPanel, { scrollToTranscriptPanel } from './preview/components/GraphPanel'
import MappingPanel from './preview/components/MappingDiagram'
import ImagePanel from './preview/components/ImagePanel'
import NowSounding from './preview/components/NowSounding'
import SettingsDrawer from './preview/components/SettingsDrawer'
import { GuideModal, ContinentModal } from './preview/components/Modals'
import { LiveRegion, usePreviewKeys } from './preview/components/Accessibility'
import { displayKey } from './preview/lib/selectors'
import { keyToLabel } from './preview/lib/processing'

function ProgressLine() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      style={{ scaleY: scrollYProgress }}
      className="fixed left-0 top-0 z-40 h-full w-px origin-top bg-ivory/30"
      aria-hidden="true"
    />
  )
}

/** One slim row of session actions under the data-track card. */
function SessionToolbar() {
  const { state, dispatch } = usePreview()
  const count = (state.transcript || []).length
  const button =
    'flex min-h-[44px] items-center justify-center gap-1.5 border border-ivory/20 bg-coal/40 px-2 font-ui text-[13px] text-ivory transition-colors hover:border-ivory/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory'

  return (
    <div role="group" aria-label="Session tools" className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', open: true })}
        className={button}
      >
        Display
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'SET_VIEW', view: 'transcript' })
          scrollToTranscriptPanel()
        }}
        className={button}
      >
        Transcript
        <span className="font-data text-[12px] text-cream">{count}</span>
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'GUIDE', open: true })}
        className={button}
      >
        Guide
      </button>
    </div>
  )
}

/**
 * A slim transport that appears only while the map block is offscreen. It sits
 * bottom-left, clear of the floating Display and Guide buttons, and reads from
 * the same state and actions as the map controls.
 */
function MapMiniPlayer({ visible }) {
  const { state, actions, steps } = usePreview()
  if (!visible || state.guideOpen || state.settingsOpen || state.continentModalOpen) return null

  const key = displayKey(state, steps, state.position, state.playState)
  const label = state.timeMode === 'range' && !key
    ? `${state.range.startYear}–${state.range.endYear}`
    : key
      ? keyToLabel(key)
      : 'Selected period'
  const caption = state.caption || {}
  const line = caption.shortText || caption.text || 'No caption yet.'
  const playing = state.playState === 'playing'
  const idle = state.playState === 'idle'

  return (
    <div
      className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:left-6 sm:bottom-6 z-40 flex max-w-lg sm:w-[420px] items-center gap-3 border border-ivory/25 bg-[#141617]/95 px-3 py-2.5 shadow-xl shadow-black/80 backdrop-blur-md"
      role="region"
      aria-label="Compact playback controls"
    >
      <button
        type="button"
        onClick={playing ? actions.pause : idle ? actions.play : actions.resume}
        aria-label={playing ? 'Pause playback' : idle ? 'Play playback' : 'Resume playback'}
        className="flex h-10 w-10 shrink-0 items-center justify-center border border-ivory/30 text-ivory transition-colors hover:border-ivory/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
      >
        {playing ? (
          <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
            <rect x="1" y="1" width="3" height="10" fill="currentColor" />
            <rect x="6" y="1" width="3" height="10" fill="currentColor" />
          </svg>
        ) : (
          <svg width="11" height="12" viewBox="0 0 10 12" aria-hidden="true">
            <path d="M1 1 L9 6 L1 11 Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={actions.stop}
        disabled={idle}
        aria-label="Stop playback"
        className="flex h-10 w-10 shrink-0 items-center justify-center border border-ivory/25 text-ivory transition-colors hover:border-ivory/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
      >
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
          <rect width="10" height="10" fill="currentColor" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-data text-[13px] text-ivory">{label}</p>
        <p className="truncate font-ui text-[13px] text-cream">{line}</p>
      </div>
    </div>
  )
}

function PreviewStudio() {
  usePreviewKeys()
  const mapBlockRef = useRef(null)
  const [mapInView, setMapInView] = useState(true)

  useEffect(() => {
    const node = mapBlockRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setMapInView(entry.isIntersecting),
      { threshold: 0.04, rootMargin: '-72px 0px 0px 0px' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1780px] 2xl:max-w-[1840px] px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-24">
      <PreviewHero />

      <StatusBanner />

      <div className="mt-6 flex flex-col gap-6 md:mt-8 md:gap-8">
        {/* Map block — captions dock to its bottom edge */}
        <section ref={mapBlockRef} aria-label="Map and captions">
          <div className="grid items-start gap-x-6 gap-y-0 lg:grid-cols-12 xl:gap-x-8">
            <div className="lg:col-span-8 lg:col-start-1 lg:row-start-1 xl:col-span-9">
              <SubcontinentMap />
            </div>

            {/* Caption bar: directly under the map on small screens, a
                full-width dock below both columns on large screens. */}
            <div className="lg:col-span-12 lg:col-start-1 lg:row-start-2">
              <NowSounding />
            </div>

            <div className="mt-6 flex flex-col gap-3 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:mt-0 xl:col-span-3 xl:col-start-10">
              <div className="relative z-30 border border-ivory/10 bg-coal/40 p-4 md:p-5">
                <VariableSelector />
              </div>
              <SessionToolbar />
            </div>
          </div>
        </section>

        {/* Insight deck — summary and graphs read from the same loaded record */}
        <section aria-label="Insight deck" className="grid gap-4 md:gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SummaryPanel />
          </div>
          <div className="lg:col-span-8">
            <GraphPanel />
          </div>
        </section>

        {/* Image score — the same player, fed by one still image */}
        <ImagePanel />

        {/* How the current variable becomes sound */}
        <MappingPanel />

        {/* Attribution & sources */}
        <SourceBar />
      </div>

      <LiveRegion />
      <SettingsDrawer />
      <GuideModal />
      <ContinentModal />
      <MapMiniPlayer visible={!mapInView} />
    </div>
  )
}

export default function PreviewApp() {
  useLenisScroll()

  return (
    <MotionConfig reducedMotion="user">
      <ProgressLine />
      <Nav page="preview" />

      <main className="relative z-10 bg-transparent text-[#f5f2eb]">
        <div className="h-20 sm:h-22 md:h-24" aria-hidden="true" />
        <PreviewProvider>
          <PreviewStudio />
        </PreviewProvider>
      </main>
    </MotionConfig>
  )
}

import { MotionConfig, motion, useScroll } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'

import Nav from './components/Nav'
import { PreviewProvider, usePreview } from './preview/state/PreviewContext'
import { PreviewHero, StatusBanner, SourceBar } from './preview/components/Chrome'
import VariableSelector from './preview/components/VariableSelector'
import SubcontinentMap from './preview/components/SubcontinentMap'
import { SummaryPanel } from './preview/components/Panels'
import GraphPanel from './preview/components/GraphPanel'
import MappingPanel from './preview/components/MappingDiagram'
import NowSounding from './preview/components/NowSounding'
import Transcript from './preview/components/Transcript'
import SettingsDrawer, { SettingsTrigger } from './preview/components/SettingsDrawer'
import { GuideModal, ContinentModal } from './preview/components/Modals'
import { LiveRegion, usePreviewKeys } from './preview/components/Accessibility'

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

/** Small persistent utilities that sit beside the variable selector. */
function StudioTools() {
  const { state, dispatch } = usePreview()
  const count = state.transcript.length

  return (
    <section aria-label="Session tools" className="border border-ivory/10 bg-coal/40 p-4 md:p-5">
      <h2 className="font-stencil text-[12px] uppercase tracking-[0.24em] text-beige">Session tools</h2>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', open: true })}
          className="flex items-center justify-between gap-3 border border-ivory/20 px-3 py-2.5 text-left font-ui text-[14px] text-ivory transition-colors hover:border-ivory/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
        >
          <span>Display &amp; access</span>
          <span aria-hidden="true" className="font-data text-[13px] text-beige">
            Aa
          </span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'TOGGLE_TRANSCRIPT' })}
          aria-expanded={state.transcriptOpen}
          aria-controls="pt-transcript-body"
          className="flex items-center justify-between gap-3 border border-ivory/20 px-3 py-2.5 text-left font-ui text-[14px] text-ivory transition-colors hover:border-ivory/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
        >
          <span>Transcript</span>
          <span aria-hidden="true" className="font-data text-[13px] text-beige">
            {count}
          </span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'GUIDE', open: true })}
          className="flex items-center justify-between gap-3 border border-ivory/20 px-3 py-2.5 text-left font-ui text-[14px] text-ivory transition-colors hover:border-ivory/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
        >
          <span>How to use this page</span>
          <span aria-hidden="true" className="font-data text-[13px] text-beige">
            ?
          </span>
        </button>
      </div>

      <p className="mt-4 border-t border-ivory/10 pt-3 font-ui text-[13px] leading-relaxed text-beige">
        Captions stay readable with the sound muted. Press{' '}
        <kbd className="rounded border border-ivory/30 px-1 font-data text-[12px] text-ivory">C</kbd> to show or
        hide them, <kbd className="rounded border border-ivory/30 px-1 font-data text-[12px] text-ivory">T</kbd>{' '}
        for the transcript.
      </p>
    </section>
  )
}

function PreviewStudio() {
  usePreviewKeys()

  return (
    <div className="mx-auto w-full max-w-[1780px] 2xl:max-w-[1840px] px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-24">
      <PreviewHero />

      <StatusBanner />

      {/* Map section — captions dock to its bottom edge */}
      <div className="mt-6 md:mt-8">
        <div className="grid items-start gap-x-6 gap-y-0 lg:grid-cols-12 xl:gap-x-8">
          <div className="lg:col-span-8 lg:col-start-1 lg:row-start-1 xl:col-span-9">
            <SubcontinentMap />
          </div>

          {/* Caption bar: directly under the map on small screens, a
              full-width dock below both columns on large screens. */}
          <div className="lg:col-span-12 lg:col-start-1 lg:row-start-2">
            <NowSounding />
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:mt-0 xl:col-span-3 xl:col-start-10">
            <div className="relative z-30 border border-ivory/10 bg-coal/40 p-4 md:p-5">
              <VariableSelector />
            </div>
            <StudioTools />
          </div>
        </div>
      </div>

      {/* Insight deck — summary and graphs read from the same loaded record */}
      <div className="mt-6 grid gap-4 md:gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SummaryPanel />
        </div>
        <div className="lg:col-span-8">
          <GraphPanel />
        </div>
      </div>

      {/* How the current variable becomes sound */}
      <div className="mt-10 md:mt-12">
        <MappingPanel />
      </div>

      {/* Full session transcript */}
      <div className="mt-8 md:mt-10">
        <Transcript />
      </div>

      {/* Attribution & sources */}
      <div className="mt-10 md:mt-14">
        <SourceBar />
      </div>

      <LiveRegion />
      <SettingsTrigger />
      <SettingsDrawer />
      <GuideModal />
      <ContinentModal />
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

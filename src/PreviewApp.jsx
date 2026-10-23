import { MotionConfig, motion, useScroll } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'

import Nav from './components/Nav'
import { PreviewProvider } from './preview/state/PreviewContext'
import { PreviewHero, StatusBanner, SourceBar } from './preview/components/Chrome'
import VariableSelector from './preview/components/VariableSelector'
import SubcontinentMap from './preview/components/SubcontinentMap'
import { CaptionsPanel, SummaryPanel, MappingPanel } from './preview/components/Panels'
import GraphPanel from './preview/components/GraphPanel'
import GuideModal from './preview/components/GuideModal'
import ContinentModal from './preview/components/ContinentModal'

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

export default function PreviewApp() {
  useLenisScroll()

  return (
    <MotionConfig reducedMotion="user">
      <ProgressLine />
      <Nav page="preview" />

      <main className="relative z-10 bg-transparent text-[#f5f2eb]">
        <div className="h-20 sm:h-22 md:h-24" aria-hidden="true" />
        <PreviewProvider>
          <div className="mx-auto w-full max-w-[1780px] 2xl:max-w-[1840px] px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-24">
            <PreviewHero />

            <StatusBanner />

            {/* Main Interactive Studio Grid: Map on the Left, Navigation on the Right */}
            <div className="mt-8 grid gap-6 lg:grid-cols-12 xl:gap-8 items-start">
              {/* Left Column: Interactive MapLibre Global World Map */}
              <div className="flex flex-col gap-6 lg:col-span-8 xl:col-span-9">
                <SubcontinentMap />
              </div>

              {/* Right Column: Navigation Sidebar (Variables, Audio Player, Summary, Captions) */}
              <div className="flex flex-col gap-6 lg:col-span-4 xl:col-span-3">
                {/* 01 Environmental Variable Selector */}
                <div className="relative z-30 border border-ivory/10 bg-coal/40 p-4 md:p-5">
                  <VariableSelector />
                </div>

                {/* 02 Selected Scope Climatological Summary */}
                <SummaryPanel />

                {/* 03 Realtime Acoustic & Environmental Narration */}
                <CaptionsPanel />
              </div>
            </div>

            {/* Long-term Climatological Record & Graph Analysis */}
            <div className="mt-12 md:mt-16">
              <GraphPanel />
            </div>

            {/* Scientific Mapping Panel */}
            <div className="mt-10 md:mt-14">
              <MappingPanel />
            </div>

            {/* Attribution & Sources */}
            <div className="mt-10 md:mt-14">
              <SourceBar />
            </div>

            <GuideModal />
            <ContinentModal />
          </div>
        </PreviewProvider>
      </main>
    </MotionConfig>
  )
}

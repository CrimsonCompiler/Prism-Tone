import { MotionConfig, motion, useScroll } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'

import Nav from './components/Nav'
import { PreviewProvider } from './preview/state/PreviewContext'
import { PreviewHero, StatusBanner, SourceBar } from './preview/components/Chrome'
import VariableSelector from './preview/components/VariableSelector'
import BangladeshMap from './preview/components/BangladeshMap'
import ScopePanel from './preview/components/ScopePanel'
import Timeline from './preview/components/Timeline'
import PlayerBar from './preview/components/PlayerBar'
import { CaptionsPanel, SummaryPanel, MappingPanel } from './preview/components/Panels'
import GraphPanel from './preview/components/GraphPanel'
import GuideModal from './preview/components/GuideModal'

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
      {/* intro mask — the exhibition door */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: '-100%' }}
        transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1], delay: 0.15 }}
        className="pointer-events-none fixed inset-0 z-[70] bg-[#161818]"
        aria-hidden="true"
      />

      <ProgressLine />
      <Nav page="preview" />

      <main className="relative z-10 bg-transparent text-[#f5f2eb]">
        <div className="h-20 sm:h-22 md:h-24" aria-hidden="true" />
        <PreviewProvider>
          <div className="mx-auto w-full max-w-[1780px] 2xl:max-w-[1840px] px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-24">
            <PreviewHero />

            <StatusBanner />

            <div className="mt-8 md:mt-10">
              <VariableSelector />
            </div>

            <div className="mt-10 grid gap-6 md:mt-12 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <BangladeshMap />
              </div>
              <div className="lg:col-span-5">
                <ScopePanel />
              </div>
            </div>

            <div className="mt-6 md:mt-8">
              <Timeline />
            </div>

            <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <PlayerBar />
              </div>
              <div className="lg:col-span-5">
                <CaptionsPanel />
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <SummaryPanel />
              </div>
              <div className="lg:col-span-7">
                <GraphPanel />
              </div>
            </div>

            <div className="mt-10 md:mt-14">
              <MappingPanel />
            </div>

            <div className="mt-10 md:mt-14">
              <SourceBar />
            </div>

            <GuideModal />
          </div>
        </PreviewProvider>
      </main>
    </MotionConfig>
  )
}

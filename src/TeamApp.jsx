import { MotionConfig, motion } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'

import Nav from './components/Nav'
import TeamIntro from './components/TeamIntro'

function Grain() {
  return <div className="grain" aria-hidden="true" />
}

export default function TeamApp() {
  useLenisScroll()

  return (
    <MotionConfig reducedMotion="user">
      {/* intro mask — the exhibition door */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: '-100%' }}
        transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1], delay: 0.15 }}
        className="pointer-events-none fixed inset-0 z-[70] bg-ink"
        aria-hidden="true"
      />

      <Grain />
      <Nav page="team" />

      <main className="relative z-10 bg-transparent text-ivory">
        <TeamIntro />
      </main>
    </MotionConfig>
  )
}

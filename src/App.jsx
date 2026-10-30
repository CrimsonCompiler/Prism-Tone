import { MotionConfig, motion, useScroll } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'

import Nav from './components/Nav'
import Hero from './components/Hero'
import {
  PhenomenologicalConversion,
  Translation,
  ExperiencePreview,
  Accessibility,
} from './components/LandingSections'

function Grain() {
  return <div className="grain" aria-hidden="true" />
}

function ProgressLine() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      style={{ scaleY: scrollYProgress }}
      className="fixed left-0 top-0 z-[85] h-full w-px origin-top bg-ivory/30"
      aria-hidden="true"
    />
  )
}

export default function App() {
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
      <ProgressLine />
      <Nav />

      <main className="relative z-10 bg-transparent text-ivory">
        <Hero />
        <PhenomenologicalConversion />
        <Translation />
        <ExperiencePreview />
        <Accessibility />
      </main>
    </MotionConfig>
  )
}

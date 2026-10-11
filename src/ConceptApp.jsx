import { MotionConfig, motion } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'
import Nav from './components/Nav'
import ConceptBackground from './components/ConceptBackground'
import ConceptHero from './components/ConceptHero'
import ConceptPrinciples from './components/ConceptPrinciples'

export default function ConceptApp() {
  useLenisScroll()

  return (
    <MotionConfig reducedMotion="user">
      {/* Cinematic entrance curtain transition */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: '-100%' }}
        transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1], delay: 0.15 }}
        className="pointer-events-none fixed inset-0 z-[70] bg-[#13191c]"
        aria-hidden="true"
      />

      {/* Fixed Navigation matching the layout */}
      <Nav page="concept" />

      {/* Fixed Scientific Instrument Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ConceptBackground />
      </div>

      {/* Main Concept Page Content with wider spread across both sides */}
      <main className="relative z-10 min-h-screen text-ivory pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-20 md:pb-32 px-6 sm:px-10 md:px-14 lg:px-20 xl:px-24 2xl:px-28 max-w-[1680px] mx-auto w-full">
        {/* Section 1: What if the measurements could be sung? */}
        <ConceptHero />

        {/* Section 2: The things we keep close. */}
        <ConceptPrinciples />
      </main>
    </MotionConfig>
  )
}

import { MotionConfig, motion } from 'motion/react'
import { useLenisScroll } from './hooks/useLenisScroll'
import Nav from './components/Nav'
import ConceptBackground from './components/ConceptBackground'
import { ConceptObservation, ConceptProblem, ConceptIdea, ConceptPrinciples } from './components/ConceptSections'

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

      {/* Main Wrapper: Contains full-document background + content */}
      <div className="relative min-h-screen w-full bg-[#111417] text-ivory overflow-hidden">
        {/* Full-Document Background that spans the entire page continuously as you scroll */}
        <ConceptBackground />

        {/* Main Concept Page Content */}
        <main className="relative z-10 pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-20 md:pb-32 px-6 sm:px-10 md:px-14 lg:px-20 xl:px-24 2xl:px-28 max-w-[1680px] mx-auto w-full">
          {/* Section 1: The Observation — The planet in digits & data */}
          <ConceptObservation />

          {/* Section 2: The Crisis of Perception — The Problem */}
          <ConceptProblem />

          {/* Section 3: A New Transport for Data — The Idea (Chapter III) */}
          <ConceptIdea />

          {/* Section 4: The things we keep close (Principles) */}
          <ConceptPrinciples />
        </main>
      </div>
    </MotionConfig>
  )
}

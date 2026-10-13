import { motion } from 'motion/react'
import { Fade } from './ui'

/* =========================================================================
   SECTION 1: OBSERVATION / THE PLANET IN DIGITS & DATA
   ========================================================================= */
export function ConceptObservation() {
  const observationColumns = [
    {
      roman: 'I.',
      title: 'Translation',
      desc: 'A consistent, reversible bridge between a NASA variable and a sonic parameter - never arbitrary, always declared.',
    },
    {
      roman: 'II.',
      title: 'Resonance',
      desc: "The chosen sounds carry emotional weight - pitch, density, and grain reflect the data's behaviour, not just its value.",
    },
    {
      roman: 'III.',
      title: 'Accessibility',
      desc: 'Science should have more than one way in. Sound is the second door - a path for ears, not only eyes.',
    },
  ]

  return (
    <section className="relative w-full pb-24 md:pb-32 lg:pb-40">
      {/* Top Header Bar: OBSERVATION & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em]">
            OBSERVATION
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            EARTH OBSERVATORY - CHAPTER I
          </span>
        </div>
      </Fade>

      {/* Main Headline (2 lines) + Right-aligned Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
        {/* Left Headline (2 lines) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Fade delay={0.2}>
            <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              The planet
              <br />
              <span className="italic font-normal">in digits & data.</span>
            </h1>
          </Fade>
        </div>

        {/* Right Explanatory Paragraph */}
        <div className="lg:col-span-5 xl:col-span-4 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.35}>
            <p className="max-w-lg lg:max-w-md font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              Planetary data is the planet's hidden language. Our vision is to decode their metrics into acoustic art - letting raw data dissolve into the universal language of sound.
            </p>
          </Fade>
        </div>
      </div>

      {/* Three Bottom Columns (I. Translation, II. Resonance, III. Accessibility) */}
      <Fade delay={0.5}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 lg:gap-20 xl:gap-28 pt-12 md:pt-16 mt-12 md:mt-16">
          {observationColumns.map((col) => (
            <div key={col.roman} className="flex flex-col">
              <span className="font-data text-[11px] md:text-xs tracking-[0.28em] text-[#cad7ce] uppercase font-light">
                {col.roman}
              </span>
              <h3 className="mt-3.5 font-display text-xl sm:text-2xl lg:text-[1.75rem] font-light text-ivory leading-snug">
                {col.title}
              </h3>
              <p className="mt-4 font-elegant text-sm md:text-[15px] leading-relaxed text-ivory/70 font-light">
                {col.desc}
              </p>
            </div>
          ))}
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 2: THE CRISIS OF PERCEPTION / THE PROBLEM
   ========================================================================= */
export function ConceptProblem() {
  const problemCards = [
    {
      n: '01',
      title: 'Emotional Distance',
      desc: 'Planetary change is often presented as numbers on a screen. A rising temperature curve may be scientifically precise, yet difficult to emotionally connect with the scale and urgency of a changing planet.',
      impact: 'IMPACT: DISCONNECTED PERCEPTION',
    },
    {
      n: '02',
      title: 'Visual Dependency',
      desc: 'Maps, charts, and satellite imagery make Earth science heavily dependent on sight. Without meaningful alternatives, many of these visual data patterns remain difficult to access for people who are blind or have visual impairments.',
      impact: 'IMPACT: LIMITED ACCESSIBILITY',
    },
    {
      n: '03',
      title: 'Hidden Patterns',
      desc: 'Earth’s systems are interconnected, but their signals are often examined through separate graphs and datasets. Subtle fluctuations, long-term trends, and relationships between variables can be difficult to recognise across multiple visual representations.',
      impact: 'IMPACT: OVERLOOKED CONNECTIONS',
    },
    {
      n: '04',
      title: 'Data Without Experience',
      desc: 'Scientific datasets contain continuous records of planetary change, yet static charts and spreadsheets offer limited ways to experience those changes dynamically. The information is available, but its movement through time can be difficult.',
      impact: 'IMPACT: PASSIVE UNDERSTANDING',
    },
  ]

  return (
    <section className="relative w-full py-20 md:py-28 lg:py-36 border-t border-white/10">
      {/* Top Header Bar: THE CRISIS OF PERCEPTION & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em] uppercase">
            THE CRISIS OF PERCEPTION
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            WHAT THE NUMBERS HIDE - CHAPTER II
          </span>
        </div>
      </Fade>

      {/* Main Headline (Left) + Right Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
        {/* Left Headline + Sub-text */}
        <div className="lg:col-span-5 xl:col-span-5">
          <Fade delay={0.15}>
            <h2 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              The Problem
            </h2>
            <p className="mt-4 font-display italic text-sm md:text-[15px] lg:text-base text-ivory/70 font-light">
              Charts and maps reduce the planet to pixels. They are precise, but quiet.
            </p>
          </Fade>
        </div>

        {/* Right Explanatory Paragraph */}
        <div className="lg:col-span-7 xl:col-span-7 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.25}>
            <p className="max-w-lg lg:max-w-[540px] xl:max-w-[570px] 2xl:max-w-[590px] font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              For over fifty years, humanity has recorded Earth’s vital signs via satellites—tracking thermal anomalies, gravity shifts, and laser altimetry. Yet, this vast scientific intelligence remains locked inside 2D graphs, static spreadsheets, and isolated academic journals.
            </p>
          </Fade>
        </div>
      </div>

      {/* Four Bottom Cards aligned across a single baseline */}
      <Fade delay={0.4}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 xl:gap-8 pt-12 md:pt-16 mt-12 md:mt-16">
          {problemCards.map((card) => (
            <div
              key={card.n}
              className="border border-white/10 bg-white/[0.02] backdrop-blur-[2px] p-6 sm:p-7 lg:p-6 xl:p-8 flex flex-col justify-between h-full"
            >
              <div>
                <span className="font-stencil text-[10px] md:text-[11px] tracking-[0.28em] text-[#cad7ce]">
                  {card.n}
                </span>
                <h3 className="mt-4 font-display text-xl sm:text-2xl lg:text-[1.4rem] xl:text-[1.6rem] font-light text-ivory leading-snug">
                  {card.title}
                </h3>
                <p className="mt-4 font-elegant text-[14.5px] sm:text-[15px] xl:text-[15.5px] leading-relaxed text-ivory/75 font-light">
                  {card.desc}
                </p>
              </div>

              <div className="pt-6 mt-8 border-t border-white/10">
                <span className="font-data text-[9.5px] md:text-[10px] tracking-[0.22em] text-[#cad7ce]/70 uppercase">
                  {card.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 3: A NEW TRANSPORT FOR DATA / THE IDEA (CHAPTER III)
   ========================================================================= */
export function ConceptIdea() {
  const ideaColumns = [
    {
      letter: 'A.',
      title: 'Sound as Another Dimension',
      desc: 'Visuals reveal where Earth is changing; sound reveals how those changes unfold through time. By translating shifts in environmental data into rhythms, we tried another way to perceive patterns.',
    },
    {
      letter: 'B.',
      title: 'Mapping, Not Metaphor',
      desc: 'Every sound has a defined relationship with the data behind it. The mapping remains interpretable, connecting what users hear to what the data actually represents.',
    },
    {
      letter: 'C.',
      title: 'From Data to Experience',
      desc: 'Earth science becomes more than something to examine on a screen. As data-driven sounds evolve with visualizations, users can explore planetary changes through both sight & hearing.',
    },
  ]

  return (
    <section className="relative w-full py-20 md:py-28 lg:py-36 border-t border-white/10">
      {/* Top Header Bar: A NEW TRANSPORT FOR DATA & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em] uppercase">
            A NEW TRANSPORT FOR DATA
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            THE IDEA - CHAPTER III
          </span>
        </div>
      </Fade>

      {/* Editorial Quote Block (Styled identically to SystemQuotes) */}
      <Fade delay={0.2}>
        <div className="pt-2 pb-16 md:pb-24 max-w-5xl">
          {/* Kicker Tag */}
          <div className="mb-6 flex items-center gap-3 md:mb-8">
            <span className="font-stencil text-[10px] uppercase tracking-[0.32em] text-[#8ea792] sm:text-[11px]">
              A · NOTE ON FREQUENCY
            </span>
            <span className="inline-block h-px w-12 bg-ivory/20 md:w-16" aria-hidden="true" />
          </div>

          {/* Main Italic Quote */}
          <blockquote
            style={{ fontFamily: '"Adrianna", "EB Garamond", Georgia, serif' }}
            className="max-w-4xl text-[clamp(1.4rem,2.6vw,2.35rem)] font-normal italic leading-[1.38] tracking-[-0.01em] text-ivory/95"
          >
            “our entire biological system – the brain and the earth itself – work on the same frequencies.”
          </blockquote>

          {/* Author Attribution */}
          <p className="mt-6 font-stencil text-[9.5px] uppercase tracking-[0.26em] text-[#cad7ce]/80 sm:text-[10.5px] md:mt-8">
            ~ Nicola Tesla
          </p>
        </div>
      </Fade>

      {/* Three Columns (A, B, C) */}
      <Fade delay={0.35}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 lg:gap-20 xl:gap-24 2xl:gap-28 pt-12 md:pt-16 lg:pt-20">
          {ideaColumns.map((col) => (
            <div key={col.letter} className="flex flex-col">
              <div>
                <span className="font-stencil text-[11px] md:text-[12px] tracking-[0.28em] text-[#cad7ce]">
                  {col.letter}
                </span>
                <h3 className="mt-4 font-display text-2xl sm:text-[1.75rem] lg:text-[1.95rem] font-light text-ivory leading-snug">
                  {col.title}
                </h3>
              </div>

              {/* Horizontal line across the column under the title */}
              <div className="w-full h-px bg-white/10 my-6 sm:my-7" />

              <p className="font-elegant text-sm md:text-[14.5px] lg:text-[15px] leading-[1.7] text-ivory/75 font-light">
                {col.desc}
              </p>
            </div>
          ))}
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 4: THE THINGS WE KEEP CLOSE (6 PRINCIPLES)
   ========================================================================= */
const PRINCIPLES = [
  {
    n: '01',
    tag: 'KEEP',
    title: 'Honest mapping',
    desc: 'Each variable is paired with one declared sonic parameter. The rule is visible; the sound is the proof.',
  },
  {
    n: '02',
    tag: 'KEEP',
    title: 'Slow listening',
    desc: 'Prism Tone is for the long listen — for ambient rooms, classrooms, and curious evenings — not for the short scroll.',
  },
  {
    n: '03',
    tag: 'KEEP',
    title: 'Two doors, one room',
    desc: 'A sighted user and a blind user should describe the same planet. Sound and image must agree, never contradict.',
  },
  {
    n: '04',
    tag: 'KEEP',
    title: 'Graceful failure',
    desc: 'If a layer fails, the rest still plays. The composition is a stack of fallbacks, not a single fragile chain.',
  },
  {
    n: '05',
    tag: 'KEEP',
    title: 'Open by default',
    desc: 'Mappings, data sources, and code are inspectable. The instrument is public; the science is shared.',
  },
  {
    n: '06',
    tag: 'KEEP',
    title: 'Quiet wonder',
    desc: 'We resist spectacle. The data is already extraordinary; our job is to keep the frame still.',
  },
]

export function ConceptPrinciples() {
  return (
    <section className="relative w-full pt-16 md:pt-24 lg:pt-32 pb-20 md:pb-28 border-t border-white/10">
      {/* Top Header: 2-line Heading + Right Description spread wide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between mb-16 md:mb-20 lg:mb-24">
        {/* Left Headline (2 lines as requested) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Fade>
            <h2 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              The things
              <br />
              <span className="italic font-normal">we keep</span> close.
            </h2>
          </Fade>
        </div>

        {/* Right Subtext anchored right */}
        <div className="lg:col-span-5 xl:col-span-4 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.15}>
            <p className="max-w-lg lg:max-w-md font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              A short list of principles — small enough to memorise, sturdy enough to design against.
            </p>
          </Fade>
        </div>
      </div>

      {/* 2-Column Grid for the 6 Principles with generous horizontal spread */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 lg:gap-x-24 xl:gap-x-32 2xl:gap-x-40 gap-y-12 md:gap-y-16">
        {PRINCIPLES.map((item, idx) => (
          <Fade key={item.n} delay={0.08 * idx}>
            <div className="border-t border-white/15 pt-5 pb-2 flex flex-col justify-between">
              {/* Top metadata row: index + tag */}
              <div className="flex items-center justify-between font-data text-[10px] md:text-[11px] tracking-[0.24em] text-[#cad7ce]">
                <span>{item.n}</span>
                <span className="font-stencil tracking-[0.32em] text-ivory/50 uppercase text-[9px] md:text-[10px]">
                  {item.tag}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-4 font-display text-2xl sm:text-[1.75rem] lg:text-[1.9rem] font-light text-ivory leading-snug">
                {item.title}
              </h3>

              {/* Italic descriptive body */}
              <p className="mt-3.5 font-display italic text-sm md:text-[15.5px] leading-relaxed text-ivory/75 font-normal">
                {item.desc}
              </p>
            </div>
          </Fade>
        ))}
      </div>
    </section>
  )
}

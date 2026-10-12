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
    <section className="relative w-full pb-28 md:pb-36 lg:pb-44">
      {/* Top Header Bar: 01 — observation & Chapter Meta */}
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
        {/* Left Headline (2 lines as requested) */}
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
   SECTION 2: WHAT IF THE MEASUREMENTS COULD BE SUNG?
   ========================================================================= */
export function ConceptHero() {
  return (
    <section className="relative w-full flex flex-col justify-between gap-16 md:gap-20 lg:gap-28 py-20 md:py-28 lg:py-36">
      {/* Upper Area: 2-line Headline + Right Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
        {/* Left Headline */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Fade delay={0.15}>
            <h2 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              What if the <span className="italic font-normal">measurements</span>
              <br />
              could be sung?
            </h2>
          </Fade>
        </div>

        {/* Right Explanatory Paragraph */}
        <div className="lg:col-span-5 xl:col-span-4 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.25}>
            <p className="max-w-lg lg:max-w-md font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              The idea is simple: take a NASA variable, normalise it gently, and map it to a parameter that the ear already understands — pitch, rhythm, density, decay.
            </p>
          </Fade>
        </div>
      </div>

      {/* Lower Area: Three Columns (A, B, C) */}
      <Fade delay={0.35}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 lg:gap-20 xl:gap-28 pt-10 md:pt-14 border-t border-white/10">
          {/* Column A */}
          <div className="flex flex-col">
            <span className="font-data text-[11px] md:text-xs tracking-[0.28em] text-[#cad7ce] uppercase font-light">
              A.
            </span>
            <h3 className="mt-3.5 font-display text-xl sm:text-2xl lg:text-[1.75rem] font-light text-ivory leading-snug">
              Sound as a second language
            </h3>
            <p className="mt-4 font-elegant text-sm md:text-[15px] leading-relaxed text-ivory/70 font-light">
              Ears can resolve change in time in a way that eyes cannot. A 0.2° drift over a century is invisible on a chart, but unmistakable as a slow rising tone.
            </p>
          </div>

          {/* Column B */}
          <div className="flex flex-col">
            <span className="font-data text-[11px] md:text-xs tracking-[0.28em] text-[#cad7ce] uppercase font-light">
              B.
            </span>
            <h3 className="mt-3.5 font-display text-xl sm:text-2xl lg:text-[1.75rem] font-light text-ivory leading-snug">
              Mapping, not metaphor
            </h3>
            <p className="mt-4 font-elegant text-sm md:text-[15px] leading-relaxed text-ivory/70 font-light">
              Each link from variable to parameter is declared and inspectable. The composition is honest — the rule is the instrument.
            </p>
          </div>

          {/* Column C */}
          <div className="flex flex-col">
            <span className="font-data text-[11px] md:text-xs tracking-[0.28em] text-[#cad7ce] uppercase font-light">
              C.
            </span>
            <h3 className="mt-3.5 font-display text-xl sm:text-2xl lg:text-[1.75rem] font-light text-ivory leading-snug">
              The room as a lab
            </h3>
            <p className="mt-4 font-elegant text-sm md:text-[15px] leading-relaxed text-ivory/70 font-light">
              When a chart of sea surface temperature is sung back to climate scientists, the room goes quiet. Sound gives the data a body.
            </p>
          </div>
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 3: THE THINGS WE KEEP CLOSE (6 PRINCIPLES)
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
    <section className="relative w-full pt-16 md:pt-24 lg:pt-32 pb-20 md:pb-28">
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

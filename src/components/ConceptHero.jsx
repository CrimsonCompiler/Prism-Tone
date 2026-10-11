import { motion } from 'motion/react'
import { Fade, EASE } from './ui'

export default function ConceptHero() {
  return (
    <section className="relative w-full flex flex-col justify-between gap-16 md:gap-20 lg:gap-28 my-auto">
      {/* Upper Area: 2-line Headline + Right Description (stretched across both edges) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
        {/* Left Headline (2 lines as requested) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Fade delay={0.2}>
            <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              What if the <span className="italic font-normal">measurements</span>
              <br />
              could be sung?
            </h1>
          </Fade>
        </div>

        {/* Right Explanatory Paragraph (anchored to the right) */}
        <div className="lg:col-span-5 xl:col-span-4 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.35}>
            <p className="max-w-lg lg:max-w-md font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              The idea is simple: take a NASA variable, normalise it gently, and map it to a parameter that the ear already understands — pitch, rhythm, density, decay.
            </p>
          </Fade>
        </div>
      </div>

      {/* Lower Area: Three Columns (A, B, C) spread wide across the layout */}
      <Fade delay={0.5}>
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

import { motion } from 'motion/react'
import { Fade } from './ui'

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

export default function ConceptPrinciples() {
  return (
    <section className="relative w-full pt-28 md:pt-36 lg:pt-44 pb-20 md:pb-28">
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

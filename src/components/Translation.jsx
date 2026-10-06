import { motion } from 'motion/react'
import { MappingViz } from './Canvases'
import { Fade, Reveal, Rule } from './ui'

const MAPS = [
  {
    from: 'TEMPERATURE',
    sub: 'GISS · temp anomaly',
    to: 'PITCH',
    viz: 'rise',
    note: 'frequency — 110 → 440 hz',
  },
  {
    from: 'WIND',
    sub: 'MERRA-2 · 850 hpa',
    to: 'TEMPO',
    viz: 'gust',
    note: 'tempo — 40 → 180 bpm',
  },
  {
    from: 'RAINFALL',
    sub: 'GPM · IMERG',
    to: 'RHYTHM',
    viz: 'drops',
    note: 'density — events / bar',
  },
  {
    from: 'ICE',
    sub: 'NSIDC · sea ice index',
    to: 'TIMBRE',
    viz: 'timbre',
    note: 'texture — glass → granular',
  },
]

function StackWord({ children, delay, className = '' }) {
  return (
    <Reveal delay={delay} className={className}>
      <span className="block">{children}</span>
    </Reveal>
  )
}

function FlowArrow() {
  return (
    <span className="my-2 block h-10 w-px overflow-hidden bg-ivory/10" aria-hidden="true">
      <motion.span
        className="block h-1/2 w-px bg-ivory/60"
        animate={{ y: ['-110%', '220%'] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.7 }}
      />
    </span>
  )
}

export default function Translation() {
  return (
    <section id="translation" className="relative border-t border-ivory/10 px-6 py-32 md:px-12 md:py-44 lg:px-20">
      <Fade>
        <Rule index="02" label="The Translation" meta="signal → score" />
      </Fade>

      <div className="mt-16 grid gap-16 md:mt-24 lg:grid-cols-12 lg:gap-10">
        {/* EARTH DATA → MAPPING → SOUND */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <h2 className="font-display font-light leading-[1.02] text-ivory text-[clamp(2.4rem,4.6vw,4.2rem)]">
              <StackWord delay={0.05}>EARTH DATA</StackWord>
              <FlowArrow />
              <StackWord delay={0.15}>
                <span className="text-cream">MAPPING</span>
              </StackWord>
              <FlowArrow />
              <StackWord delay={0.25}>
                <em className="italic text-cream">SOUND</em>
              </StackWord>
            </h2>
            <Fade delay={0.35}>
              <p className="mt-10 max-w-xs font-elegant text-[15px] leading-relaxed text-cream/80">
                Nothing is invented. Each sonic property is bound to a physical quantity — when the
                planet moves, the music moves with it.
              </p>
            </Fade>
          </div>
        </div>

        {/* mapping rows */}
        <div className="lg:col-span-8">
          {MAPS.map((m, i) => (
            <Fade key={m.from} delay={0.06 * i}>
              <div className="grid grid-cols-12 items-center gap-x-6 gap-y-6 border-t border-ivory/10 py-10 md:py-12">
                <div className="col-span-6 md:col-span-3">
                  <p className="font-stencil text-[13px] uppercase tracking-[0.32em] text-ivory md:text-sm">
                    {m.from}
                  </p>
                  <p className="mt-2 font-data text-[9px] uppercase tracking-[0.2em] text-parchment">
                    {m.sub}
                  </p>
                </div>

                <div className="col-span-12 h-24 md:col-span-5 md:h-28">
                  <MappingViz type={m.viz} className="h-full w-full" />
                </div>

                <div className="col-span-6 flex justify-end md:col-span-1 md:justify-center">
                  <svg width="46" height="12" viewBox="0 0 46 12" className="text-ivory/60" aria-hidden="true">
                    <line x1="0" y1="6" x2="40" y2="6" stroke="currentColor" strokeWidth="1" />
                    <path d="M36 2 L44 6 L36 10" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>

                <div className="col-span-12 md:col-span-3">
                  <p className="font-display text-3xl font-light italic leading-none text-ivory md:text-[2.6rem]">
                    {m.to.charAt(0) + m.to.slice(1).toLowerCase()}
                    <span className="ml-2 not-italic text-beige">↑</span>
                  </p>
                  <p className="mt-3 font-data text-[9px] uppercase tracking-[0.2em] text-parchment">
                    {m.note}
                  </p>
                </div>
              </div>
            </Fade>
          ))}
          <div className="border-t border-ivory/10" />
        </div>
      </div>
    </section>
  )
}

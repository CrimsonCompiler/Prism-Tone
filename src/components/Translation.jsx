import { motion } from 'motion/react'
import { MappingViz } from './Canvases'
import { Fade } from './ui'

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

export default function Translation() {
  return (
    <section id="translation" className="stack-card z-20 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40">
      {/* Left-aligned caption heading matching section 01 without line break */}
      <div className="flex items-center justify-between gap-6 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <span
            className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige font-normal"
            style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
          >
            02 / THE TRANSLATION
          </span>
          <span className="h-px w-14 md:w-20 bg-ivory/25 inline-block" aria-hidden="true" />
        </div>
        <span className="font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.26em] text-parchment/80">
          SIGNAL → SCORE
        </span>
      </div>

      <div className="mt-12 grid gap-14 md:mt-16 lg:grid-cols-12 lg:gap-10 items-center">
        {/* Left column: normal body text centered vertically in the middle of the mapping rows */}
        <div className="flex flex-col justify-center lg:col-span-4 lg:self-center">
          <Fade delay={0.15}>
            <p className="max-w-[310px] font-elegant text-[16px] md:text-[16.5px] leading-[1.7] text-cream/75">
              Nothing is invented. Each sonic property is bound to a physical quantity — when the
              planet moves, the music moves with it.
            </p>
          </Fade>
        </div>

        {/* mapping rows */}
        <div className="lg:col-span-8">
          {MAPS.map((m, i) => (
            <Fade key={m.from} delay={0.06 * i}>
              <div className="grid grid-cols-12 items-center gap-x-6 gap-y-6 border-t border-ivory/10 py-9 md:py-11">
                <div className="col-span-6 md:col-span-3">
                  <p className="font-stencil text-[12px] uppercase tracking-[0.28em] text-beige font-medium md:text-[13px]">
                    {m.from}
                  </p>
                  <p className="mt-2 font-data text-[11px] uppercase tracking-[0.18em] text-parchment md:text-[11.5px]">
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
                  <p
                    className="font-display text-[1.9rem] font-light italic leading-none text-ivory md:text-[2.4rem]"
                    style={{ fontFamily: 'Meno Banner' }}
                  >
                    {m.to.charAt(0) + m.to.slice(1).toLowerCase()}
                    <span className="ml-2 not-italic text-beige text-xl">↑</span>
                  </p>
                  <p className="mt-2.5 font-data text-[11px] uppercase tracking-[0.18em] text-parchment md:text-[11.5px]">
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

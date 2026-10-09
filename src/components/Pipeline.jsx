import { Fragment } from 'react'
import { Fade } from './ui'

const STAGES = [
  ['01', 'RAW SIGNAL', 'Satellite telemetry'],
  ['02', 'NORMALIZE', '0 → 1 range'],
  ['03', 'MAP', 'Domain transform'],
  ['04', 'SYNTHESIZE', 'Tone generator'],
  ['05', 'OUTPUT', 'Stereo audio'],
]

export default function Pipeline() {
  return (
    <section id="pipeline" className="relative z-30 px-6 pt-14 pb-28 md:px-12 md:pt-18 md:pb-36 lg:px-20 lg:pt-20 lg:pb-40">
      <Fade>
        <div className="border border-white/10 p-6 md:p-10 lg:p-12">
          <div className="flex items-baseline justify-between gap-6">
            <span className="font-stencil uppercase text-[10px] md:text-[11px] tracking-[0.38em] text-[#f2ede3]">
              PIPELINE
            </span>
            <span className="font-data text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-[#cad7ce]">
              SIGNAL FLOW · LEFT TO RIGHT
            </span>
          </div>

          <div className="mt-10 flex flex-col gap-4 md:mt-12 lg:flex-row lg:items-stretch lg:gap-0">
            {STAGES.map(([n, name, sub], i) => (
              <Fragment key={n}>
                <Fade delay={0.06 * i} className="lg:flex-1">
                  <div className="h-full border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 md:p-6">
                    <p className="font-data text-[10px] tracking-[0.3em] text-[#86ab8e]">{n}</p>
                    <p className="mt-4 font-display font-light uppercase leading-none text-[#f7f4ed] text-[1.25rem] md:text-[1.35rem] xl:text-[1.5rem] whitespace-nowrap">
                      {name}
                    </p>
                    <p className="mt-4 font-data text-[9.5px] uppercase tracking-[0.18em] text-[#cad7ce] whitespace-nowrap">
                      {sub}
                    </p>
                  </div>
                </Fade>

                {i < STAGES.length - 1 && (
                  <div className="hidden items-center px-3 lg:flex text-white/40" aria-hidden="true">
                    <svg width="46" height="12" viewBox="0 0 46 12">
                      <line x1="0" y1="6" x2="40" y2="6" stroke="currentColor" strokeWidth="1" />
                      <path d="M36 2 L44 6 L36 10" fill="none" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </Fade>
    </section>
  )
}

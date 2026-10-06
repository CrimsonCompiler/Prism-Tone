import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { SignalField } from './Canvases'
import { Annot, Fade, Reveal, Rule } from './ui'

const CHANNELS = ['[ TEMPERATURE ]', '[ WIND ]', '[ RAINFALL ]', '[ ICE ]']

export default function DataAsSound() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const drift = useTransform(scrollYProgress, [0, 1], [70, -70])

  return (
    <section ref={ref} id="data" className="relative overflow-hidden border-t border-ivory/10 py-32 md:py-48">
      {/* live signal field, bleeding off the right edge */}
      <motion.div style={{ y: drift }} className="fade-x absolute inset-y-0 right-0 w-full opacity-35 lg:w-[58%] lg:opacity-100">
        <SignalField className="h-full w-full" />
      </motion.div>

      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <Fade>
          <Rule index="01" label="Data as Sound" meta="NASA open data — MODIS · GPM · VIIRS" />
        </Fade>

        <h2 className="mt-16 font-display font-light leading-[0.94] text-ivory text-[clamp(3rem,8.6vw,8.2rem)] md:mt-24">
          <Reveal delay={0.05}>WHAT IF</Reveal>
          <Reveal delay={0.16}>EARTH DATA</Reveal>
          <Reveal delay={0.27}>
            COULD BE <em className="italic text-cream">HEARD?</em>
          </Reveal>
        </h2>

        <div className="mt-14 grid gap-10 md:mt-20 lg:grid-cols-12">
          <Fade delay={0.3} className="lg:col-span-5">
            <p className="max-w-md font-elegant text-[15px] leading-relaxed text-cream/85 md:text-base">
              Every satellite pass is a recording. Every measurement is a note. For six decades,
              instruments in orbit have been writing a score that no one could play — until now.
            </p>
            <p className="mt-5 max-w-md font-ui text-[12px] leading-relaxed tracking-[0.04em] text-parchment">
              PRISM TONE MAPS NASA EARTH OBSERVATIONS — TEMPERATURE, WIND, RAINFALL, ICE, WILDFIRE —
              ONTO PITCH, TEMPO, RHYTHM AND TEXTURE. THE PLANET BECOMES A SCORE.
            </p>
          </Fade>

          <Fade delay={0.45} className="hidden lg:col-span-4 lg:col-start-9 lg:block">
            <div className="space-y-3 text-right">
              {CHANNELS.map((c) => (
                <Annot key={c} className="text-right">
                  {c}
                </Annot>
              ))}
              <p className="pt-3 font-data text-[9px] uppercase tracking-[0.24em] text-parchment/70">
                4 channels — live
              </p>
            </div>
          </Fade>
        </div>
      </div>
    </section>
  )
}

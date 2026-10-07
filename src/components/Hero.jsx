import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import EarthCanvas from './EarthCanvas'
import { Annot, EASE, Kicker, Reveal } from './ui'

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yText = useTransform(scrollYProgress, [0, 1], [0, -90])
  const fade = useTransform(scrollYProgress, [0, 0.72], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.07])

  return (
    <section ref={ref} id="top" className="sticky top-[-45vh] z-0 h-[100svh] min-h-[640px] overflow-hidden">
      {/* Earth */}
      <motion.div style={{ scale }} className="absolute inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <EarthCanvas variant="hero" />
        </motion.div>
        <div className="vignette pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ink/80 to-transparent" />
      </motion.div>

      {/* Titles */}
      <motion.div
        style={{ y: yText, opacity: fade }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.0, ease: EASE }}
        >
          <Kicker className="mb-8 md:mb-12">
            THE EARTH INFORMATION JUKEBOX
          </Kicker>
        </motion.div>

        <h1 className="font-display font-light leading-[0.84] tracking-[-0.01em] text-ivory text-[clamp(4.2rem,16.5vw,15rem)]">
          <Reveal delay={0.6} className="pr-[5vw] md:pr-[9vw]">
            PRISM
          </Reveal>
          <Reveal delay={0.75}>
            <span className="italic text-cream">TONE</span>
          </Reveal>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.35, ease: EASE }}
          className="mt-9 font-elegant text-[13px] uppercase tracking-[0.44em] text-cream/90 md:mt-12 md:text-[15px]"
        >
          Making the Invisible - Audible
        </motion.p>
      </motion.div>

      {/* Scientific annotations + scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 1.9 }}
        className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-6 pb-6 md:px-12"
      >
        <div className="space-y-1.5 text-left">
          <Annot>Fig. 01 - Earth, night side</Annot>
          <Annot>Src · NASA Visible Earth - VIIRS</Annot>
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
          <span className="font-stencil text-[9px] uppercase tracking-[0.4em] text-beige">
            Scroll to explore
          </span>
          <span className="relative block h-12 w-px overflow-hidden bg-ivory/15">
            <motion.span
              animate={{ y: ['-110%', '110%'] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
              className="absolute inset-x-0 h-1/2 bg-ivory/70"
            />
          </span>
        </div>

        <div className="space-y-1.5 text-right">
          <Annot>Alt 766 km - LEO</Annot>
          <Annot>Signal · 48 kHz, stereo</Annot>
        </div>
      </motion.div>
    </section>
  )
}

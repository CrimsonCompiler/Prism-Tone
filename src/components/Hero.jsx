import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import EarthCanvas from './EarthCanvas'
import { Annot, EASE, Kicker } from './ui'

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yText = useTransform(scrollYProgress, [0, 1], [0, -90])
  const fade = useTransform(scrollYProgress, [0, 0.72], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.07])

  return (
    <section ref={ref} id="top" className="sticky top-[-45vh] z-0 h-[100svh] min-h-[500px] md:min-h-[560px] lg:min-h-[620px] overflow-hidden">
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
        className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-between px-6 text-center"
      >
        <h1 className="sr-only">Prism Tone — The Earth Information Jukebox</h1>

        {/* Top Kicker — in the open sky, comfortably below header on all devices */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.0, ease: EASE }}
          className="pt-36 md:pt-56 lg:pt-64 xl:pt-72 pointer-events-auto"
        >
          <Kicker>
            THE EARTH INFORMATION JUKEBOX
          </Kicker>
        </motion.div>

        {/* Bottom narrative over the lower Earth arc, safely spaced above scroll cue */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.35, ease: EASE }}
          className="pb-24 md:pb-28 lg:pb-32 font-elegant text-[12px] md:text-[13px] lg:text-[14.5px] uppercase tracking-[0.36em] md:tracking-[0.44em] text-cream/90 pointer-events-auto"
        >
          Making the Invisible - Audible
        </motion.p>
      </motion.div>

      {/* Scientific annotations + scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 1.9 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-4 md:px-10 md:pb-6"
      >
        <div className="space-y-1 text-left">
          <Annot>Fig. 01 - Earth, night side</Annot>
          <Annot>Src · NASA Visible Earth - VIIRS</Annot>
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6 md:gap-3">
          <span className="font-stencil text-[8.5px] uppercase tracking-[0.38em] text-beige md:text-[9px]">
            Scroll to explore
          </span>
          <span className="relative block h-8 w-px overflow-hidden bg-ivory/15 md:h-11">
            <motion.span
              animate={{ y: ['-110%', '110%'] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
              className="absolute inset-x-0 h-1/2 bg-ivory/70"
            />
          </span>
        </div>

        <div className="space-y-1 text-right">
          <Annot>Alt 766 km - LEO</Annot>
          <Annot>Signal · 48 kHz, stereo</Annot>
        </div>
      </motion.div>
    </section>
  )
}

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import EarthCanvas from './EarthCanvas'
import BackgroundEffects from './BackgroundEffects'
import { Annot, EASE, Kicker } from './ui'

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yText = useTransform(scrollYProgress, [0, 1], [0, -90])
  const fade = useTransform(scrollYProgress, [0, 0.72], [1, 0])

  return (
    <section ref={ref} id="top" className="sticky top-[-45vh] z-0 h-[100svh] min-h-[500px] md:min-h-[560px] lg:min-h-[620px] overflow-hidden">
      {/* Background Effects: Dust & Connected Dots (strictly in hero section) */}
      <BackgroundEffects />

      {/* Earth */}
      <div className="absolute inset-0">
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
      </div>

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
          className="pt-[20vh] md:pt-[25vh] lg:pt-[28vh] pointer-events-auto"
        >
          <Kicker>
            NASA SPACE APPS 2026 | THE EARTH INFORMATION JUKEBOX
          </Kicker>
        </motion.div>

        {/* Bottom narrative and CTA over the Earth arc */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.35, ease: EASE }}
          className="pb-[9vh] sm:pb-[10.5vh] md:pb-[11.5vh] lg:pb-[12.5vh] flex flex-col items-center gap-6 sm:gap-7 md:gap-7.5 pointer-events-auto"
        >
          <p className="font-elegant text-[12.5px] md:text-[13.5px] lg:text-[15px] uppercase tracking-[0.36em] md:tracking-[0.44em] text-cream/90">
            Making the Invisible - Audible
          </p>

          <a
            href="preview.html"
            className="border border-ivory/35 bg-ink/75 px-7 py-2.5 sm:px-9 sm:py-3 font-stencil text-[10.5px] sm:text-[11.5px] md:text-[12px] uppercase tracking-[0.34em] text-ivory backdrop-blur-md transition-all duration-300 hover:border-ivory hover:bg-ivory hover:text-ink hover:shadow-[0_0_24px_rgba(242,237,227,0.25)] cursor-pointer"
          >
            Get Started
          </a>
        </motion.div>
      </motion.div>

      {/* Scientific annotations */}
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

        <div className="space-y-1 text-right">
          <Annot>Alt 766 km - LEO</Annot>
          <Annot>Signal · 48 kHz, stereo</Annot>
        </div>
      </motion.div>
    </section>
  )
}

import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const ASSETS = {
  bg: '/images/cosmic-cloud-bg.jpg',
  sparkle: '/images/sparkle-galaxy.png',
  cloud: '/images/cosmic-cloud.png',
  earth: '/images/earth.png',
  notes: '/images/notes.png',
  text: '/images/text.png',
}

export default function TeamIntro() {
  const reduce = useReducedMotion()
  const [replayKey, setReplayKey] = useState(0)

  // Spring / cubic entrance curve with subtle scrapbook bounce
  const springEase = [0.16, 1, 0.3, 1]

  const pieces = [
    {
      id: 'text',
      name: 'Cosmic Cloud Title',
      src: ASSETS.text,
      zIndex: 5,
      // Drops into center with scale & slight tilt
      entrance: {
        x: 0,
        y: '-18vh',
        rotate: 8,
        scale: 0.35,
        opacity: 0,
      },
      delay: 0.2,
      duration: 1.25,
      wiggle: {
        y: [-2, 2.5, -1.8, 2, -2],
        rotate: [-0.6, 0.6, -0.4, 0.4, -0.6],
      },
      wiggleDuration: 6.2,
      hoverRotate: 1,
      hoverScale: 1.03,
    },
    {
      id: 'sparkle',
      name: 'Stars & Moon Doodles',
      src: ASSETS.sparkle,
      zIndex: 4,
      // Flies in from top-left corner
      entrance: {
        x: '-65vw',
        y: '-55vh',
        rotate: -45,
        scale: 0.5,
        opacity: 0,
      },
      delay: 0.38,
      duration: 1.35,
      wiggle: {
        rotate: [-2.5, 3, -1.5, 2.5, -2.5],
        y: [-4, 4, -3, 3, -4],
        x: [-3, 2, -1, 3, -3],
      },
      wiggleDuration: 5.4,
      hoverRotate: -6,
      hoverScale: 1.08,
    },
    {
      id: 'cloud',
      name: 'Hand-drawn Cloud',
      src: ASSETS.cloud,
      zIndex: 3,
      // Flies in from top-right corner
      entrance: {
        x: '65vw',
        y: '-50vh',
        rotate: 35,
        scale: 0.5,
        opacity: 0,
      },
      delay: 0.5,
      duration: 1.35,
      wiggle: {
        y: [-6, 6, -3, 5, -6],
        rotate: [1.8, -2.2, 1.2, -1.6, 1.8],
        x: [-3, 3, -1, 2, -3],
      },
      wiggleDuration: 6.5,
      hoverRotate: 4,
      hoverScale: 1.06,
    },
    {
      id: 'earth',
      name: 'Earth Horizon',
      src: ASSETS.earth,
      zIndex: 2,
      // Rises from bottom
      entrance: {
        x: 0,
        y: '60vh',
        rotate: -12,
        scale: 0.7,
        opacity: 0,
      },
      delay: 0.62,
      duration: 1.4,
      wiggle: {
        y: [-3, 3, -2, 2, -3],
        rotate: [-0.7, 0.7, -0.4, 0.4, -0.7],
      },
      wiggleDuration: 7.8,
      hoverRotate: -1,
      hoverScale: 1.03,
    },
    {
      id: 'notes',
      name: 'Musical Notes Wave',
      src: ASSETS.notes,
      zIndex: 4,
      // Swoops in from bottom-right corner
      entrance: {
        x: '65vw',
        y: '55vh',
        rotate: 40,
        scale: 0.4,
        opacity: 0,
      },
      delay: 0.75,
      duration: 1.4,
      wiggle: {
        y: [-7, 6, -5, 4, -7],
        x: [4, -4, 2, -3, 4],
        rotate: [2.5, -2.5, 1.8, -1.8, 2.5],
        scale: [1, 1.025, 0.99, 1.015, 1],
      },
      wiggleDuration: 4.8,
      hoverRotate: 5,
      hoverScale: 1.08,
    },
  ]

  return (
    <section
      key={replayKey}
      className="relative flex min-h-[75vh] sm:min-h-[83vh] md:min-h-[90vh] w-full items-center justify-center overflow-hidden px-4 pt-16 pb-12 sm:px-6 md:px-12"
      aria-label="Cosmic Cloud Logo"
    >
      {/* 1. Deep Space Nebula Background — scrolls naturally with the logo section */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-ink select-none">
        <motion.img
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          src={ASSETS.bg}
          alt="Cosmic Cloud Galaxy Background"
          className="h-full w-full object-cover object-center [filter:brightness(0.92)_contrast(1.05)]"
          draggable="false"
        />
        {/* Soft vignette and smooth bottom blend into the next planetary section */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-ink/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink" />
      </div>

      {/* 2. Central Scrapbook Stage — fixed aspect ratio matching the 625x375 artwork */}
      <div className="relative z-10 w-full max-w-[760px] md:max-w-[820px] aspect-[625/375]">
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            style={{ zIndex: p.zIndex }}
            className="absolute inset-0 pointer-events-none"
            initial={reduce ? { opacity: 0 } : p.entrance}
            animate={{
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1,
              opacity: 1,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: springEase,
            }}
          >
            {/* Inner motion container: Handles subtle idle wiggle & hover reactions */}
            <motion.div
              className="relative h-full w-full"
              animate={reduce ? undefined : p.wiggle}
              transition={{
                duration: p.wiggleDuration,
                delay: p.delay + p.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={
                reduce
                  ? undefined
                  : {
                    scale: p.hoverScale,
                    rotate: p.hoverRotate,
                    transition: { duration: 0.35, ease: 'easeOut' },
                  }
              }
            >
              <img
                src={p.src}
                alt={p.name}
                className="h-full w-full object-contain pointer-events-auto cursor-pointer drop-shadow-[0_2px_18px_rgba(255,255,255,0.06)]"
                draggable="false"
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* 3. Scroll cue to seamlessly invite exploration into the 5 member sections */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.9 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer pointer-events-auto group"
        onClick={() => {
          const el = document.getElementById('members-start')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }}
      >
        <span className="font-data text-[9.5px] uppercase tracking-[0.28em] text-ivory/50 transition-colors group-hover:text-ivory">
          Scroll to explore team
        </span>
        <motion.svg
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="h-3.5 w-3.5 text-ivory/40 transition-colors group-hover:text-ivory/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </motion.svg>
      </motion.div>
    </section>
  )
}

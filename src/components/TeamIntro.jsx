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
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 pt-20 pb-12 sm:px-6 md:px-12"
      aria-label="Cosmic Cloud Logo"
    >
      {/* 1. Deep Space Nebula Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-ink select-none">
        <motion.img
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          src={ASSETS.bg}
          alt="Cosmic Cloud Galaxy Background"
          className="h-full w-full object-cover object-center [filter:brightness(0.92)_contrast(1.05)]"
          draggable="false"
        />
        {/* Soft vignette to blend smoothly into deep space */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-ink/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink/60" />
      </div>

      {/* 2. Central Scrapbook Stage — fixed aspect ratio matching the 625x375 artwork */}
      <div className="relative z-10 w-full max-w-[880px] aspect-[625/375]">
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

      {/* 3. Subtle replay button at bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="fixed bottom-6 right-6 z-30"
      >
        <button
          onClick={() => setReplayKey((k) => k + 1)}
          className="group flex items-center gap-2 rounded-full border border-ivory/20 bg-ink/70 px-4 py-1.5 font-data text-[10px] uppercase tracking-[0.22em] text-ivory/70 backdrop-blur-md transition-all hover:border-ivory/60 hover:text-ivory hover:bg-ink/90 active:scale-95"
          title="Replay scrapbook entrance"
        >
          <svg
            className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180 text-parchment"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          <span>Replay Entrance</span>
        </button>
      </motion.div>
    </section>
  )
}

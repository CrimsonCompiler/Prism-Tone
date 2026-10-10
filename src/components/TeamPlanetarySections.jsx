import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const HUES = {
  aurora: {
    name: 'Aurora',
    a: '#0e2a3a',
    b: '#0a1424',
    c: '#5fb89c',
    glow: 'rgba(95, 184, 156, 0.55)',
    planet: '#0f3a3a',
    accent: '#7ce4c4',
    light: '#a8f5dc',
  },
  ocean: {
    name: 'Ocean',
    a: '#0d2845',
    b: '#06121f',
    c: '#2a8fa8',
    glow: 'rgba(42, 143, 168, 0.55)',
    planet: '#0c2238',
    accent: '#5ad3f0',
    light: '#b0eeff',
  },
  river: {
    name: 'River / Biosphere',
    a: '#0a1f3a',
    b: '#040a18',
    c: '#739a69',
    glow: 'rgba(115, 154, 105, 0.5)',
    planet: '#1a2a44',
    accent: '#9be090',
    light: '#d0f8c8',
  },
  blue: {
    name: 'Solar Sapphire',
    a: '#1a2756',
    b: '#0a1230',
    c: '#3f75bb',
    glow: 'rgba(63, 117, 187, 0.55)',
    planet: '#1d3a6b',
    accent: '#7bb3ff',
    light: '#cbe0ff',
  },
  ice: {
    name: 'Glacial Prism',
    a: '#1a2540',
    b: '#0a0f1f',
    c: '#9bb7d6',
    glow: 'rgba(155, 183, 214, 0.5)',
    planet: '#3c5773',
    accent: '#cde3f8',
    light: '#eef6ff',
  },
}

const MEMBERS = [
  {
    n: '01',
    code: '01 / UI·UX & FRONTEND',
    lines: ['Anika Binta', 'Azad Shifa'],
    name: 'Anika Binta Azad Shifa',
    role: 'Project Lead, UI/UX Design & Frontend Engineering',
    tagline: 'Leading the vision — translating complex planetary telemetry and climate datasets into intuitive, human-centered sensory interfaces.',
    stat: 'ORBIT · LEADERSHIP & CODE',
    coord: '23.8103° N / 90.4125° E',
    hue: 'aurora',
    seed: 1,
    planetSide: 'left', // Planet curves from left, text on right
  },
  {
    n: '02',
    code: '02 / BACKEND & MACHINE LEARNING',
    lines: ['Sejuti', 'Humyra'],
    name: 'Sejuti Humyra',
    role: 'Backend & ML Engineer',
    tagline: 'Architecting resilient server infrastructure, high-throughput satellite pipelines, and intelligent machine learning classifiers.',
    stat: 'NEURAL TELEMETRY CORE',
    coord: '40.7128° N / 74.0060° W',
    hue: 'ocean',
    seed: 2,
    planetSide: 'right', // Planet curves from right, text on left
  },
  {
    n: '03',
    code: '03 / DATA SCIENCE & ACOUSTICS',
    lines: ['Samiha Tasnim', 'Mim'],
    name: 'Samiha Tasnim Mim',
    role: 'Data Scientist & Sonification Specialist',
    tagline: 'Sonifying environmental flux — transforming global temperature, wind anomalies, and ice sheets into deeply evocative acoustic frequencies.',
    stat: 'HARMONIC SONIFICATION',
    coord: '51.5074° N / 0.1278° W',
    hue: 'river',
    seed: 3,
    planetSide: 'left',
  },
  {
    n: '04',
    code: '04 / ARCHITECTURE & NEURAL AI',
    lines: ['Tousif', 'Tasrik'],
    name: 'Tousif Tasrik',
    role: 'System Architect & AI Engineer',
    tagline: 'Designing end-to-end distributed systems, model training workflows, and neural synthesis pipelines that power the Prism Tone ecosystem.',
    stat: 'DISTRIBUTED ARCHITECTURE',
    coord: '37.7749° N / 122.4194° W',
    hue: 'blue',
    seed: 4,
    planetSide: 'right',
  },
  {
    n: '05',
    code: '05 / MOTION & VISUAL DIRECTION',
    lines: ['Abu Saleh', 'Md Nahian'],
    name: 'Abu Saleh Md Nahian',
    role: 'Visual Experience & Motion Design Engineer',
    tagline: 'Crafting spatial animations, atmospheric micro-interactions, and visual storytelling that make planetary data feel tactile and alive.',
    stat: 'KINETIC CHOREOGRAPHY',
    coord: '35.6762° N / 139.6503° E',
    hue: 'ice',
    seed: 5,
    planetSide: 'left',
  },
]

// Pure deterministic pseudo-random generator for lightweight static stars & lines
function getStars(seed, count = 55) {
  return Array.from({ length: count }).map((_, i) => {
    const x = ((seed * 9301 + 49297 + i * 131) % 233280) / 233280
    const y = ((seed * 9301 + 49297 + i * 311) % 233280) / 233280
    return {
      x: x * 100,
      y: y * 100,
      size: 0.35 + y * 0.75,
      opacity: 0.2 + x * 0.65,
    }
  })
}

function getOrbits(seed) {
  return Array.from({ length: 4 }).map((_, i) => {
    const r = ((seed * 7919 + i * 521) % 233280) / 233280
    return {
      y: 15 + r * 70,
      len: 30 + r * 50,
      opacity: 0.12 + r * 0.12,
    }
  })
}

/* 
 * Planetary Stage SVG
 * Inspired by the Netlify 'opening' aesthetic:
 * Deep gradient aura, stars, glowing planetary arc with atmospheric rim & continental doodle curves
 */
function PlanetaryStage({ hueKey, seed, side = 'left' }) {
  const theme = HUES[hueKey] || HUES.aurora
  const stars = getStars(seed, 60)
  const orbits = getOrbits(seed)

  // Position the planet circle based on side
  // When side === 'left': circle sits on lower left (cx=22, cy=82, r=46)
  // When side === 'right': circle sits on lower right (cx=78, cy=82, r=46)
  const cx = side === 'left' ? 24 : 76
  const cy = 84
  const r = 44

  const idSuffix = `${hueKey}-${seed}`

  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        {/* Background celestial nebula gradient */}
        <radialGradient id={`bg-${idSuffix}`} cx={side === 'left' ? '30%' : '70%'} cy="40%" r="85%">
          <stop offset="0%" stopColor={theme.a} stopOpacity="0.85" />
          <stop offset="55%" stopColor={theme.b} stopOpacity="0.7" />
          <stop offset="100%" stopColor="#04050f" stopOpacity="0.95" />
        </radialGradient>

        {/* Atmospheric nebula aura */}
        <radialGradient id={`glow-${idSuffix}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.glow} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        {/* Planet body gradient */}
        <radialGradient id={`planet-${idSuffix}`} cx="40%" cy="25%" r="75%">
          <stop offset="0%" stopColor={theme.planet} stopOpacity="0.95" />
          <stop offset="65%" stopColor="#0b1726" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#03060f" stopOpacity="1" />
        </radialGradient>

        {/* Gaussian blur for atmospheric corona glow */}
        <filter id={`blur-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>

        {/* Clip path for the planet surface so continental graphics stay inside the sphere */}
        <clipPath id={`planet-clip-${idSuffix}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* 1. Celestial background fill */}
      <rect width="100" height="100" fill={`url(#bg-${idSuffix})`} />

      {/* 2. Soft nebula cloud */}
      <ellipse
        cx={side === 'left' ? 30 : 70}
        cy={35}
        rx="45"
        ry="30"
        fill={`url(#glow-${idSuffix})`}
        filter={`url(#blur-${idSuffix})`}
        opacity="0.75"
      />

      {/* 3. Twinkling cosmic stars */}
      {stars.map((s, idx) => (
        <circle
          key={idx}
          cx={s.x}
          cy={s.y}
          r={s.size * 0.08}
          fill="#f9eed8"
          opacity={s.opacity}
        />
      ))}

      {/* 4. Fine horizontal orbital lines */}
      {orbits.map((l, idx) => (
        <line
          key={idx}
          x1="-10"
          y1={l.y}
          x2="110"
          y2={l.y + 0.3}
          stroke={theme.c}
          strokeOpacity={l.opacity}
          strokeWidth="0.06"
        />
      ))}

      {/* 5. Planet atmospheric outer glow rim (corona) */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 2.5}
        fill="none"
        stroke={theme.glow}
        strokeOpacity="0.45"
        strokeWidth="1.2"
        filter={`url(#blur-${idSuffix})`}
      />

      {/* 6. Planet main sphere */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#planet-${idSuffix})`} />

      {/* 7. Earth continental contour curves inside the planet clip */}
      <g clipPath={`url(#planet-clip-${idSuffix})`} opacity="0.4">
        {/* Organic latitude / continent doodle curves echoing the Cosmic Cloud Earth graphic */}
        <path
          d={`M ${cx - 40} ${cy - 10} Q ${cx - 15} ${cy - 25} ${cx} ${cy - 8} T ${cx + 35} ${cy - 18} T ${cx + 45} ${cy + 10}`}
          fill="none"
          stroke={theme.light}
          strokeWidth="0.18"
          strokeDasharray="1.2 0.8"
        />
        <path
          d={`M ${cx - 38} ${cy + 5} Q ${cx - 10} ${cy + 18} ${cx + 8} ${cy + 2} T ${cx + 42} ${cy + 14}`}
          fill="none"
          stroke={theme.accent}
          strokeWidth="0.22"
        />
        <path
          d={`M ${cx - 35} ${cy - 22} C ${cx - 18} ${cy - 30}, ${cx + 15} ${cy - 28}, ${cx + 38} ${cy - 12}`}
          fill="none"
          stroke={theme.c}
          strokeWidth="0.14"
          strokeOpacity="0.7"
        />
        <path
          d={`M ${cx - 42} ${cy + 20} Q ${cx - 5} ${cy + 28} ${cx + 25} ${cy + 22}`}
          fill="none"
          stroke={theme.light}
          strokeWidth="0.16"
          strokeOpacity="0.6"
        />
        {/* Planetary meridian arc */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={r * 0.45}
          ry={r}
          fill="none"
          stroke={theme.c}
          strokeWidth="0.1"
          strokeOpacity="0.3"
        />
      </g>

      {/* 8. Crisp atmospheric edge stroke */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={theme.accent}
        strokeOpacity="0.35"
        strokeWidth="0.15"
      />
    </svg>
  )
}

/* Individual Member Section */
function MemberSection({ member, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: '-20% 0px -20% 0px' })
  const isLeftPlanet = member.planetSide === 'left'

  return (
    <section
      ref={ref}
      id={`member-${member.n}`}
      className="relative min-h-screen w-full flex items-center overflow-hidden py-24 md:py-32"
      aria-label={`${member.name} — ${member.role}`}
    >
      {/* 1. Celestial Planet Stage Background */}
      <PlanetaryStage
        hueKey={member.hue}
        seed={member.seed}
        side={member.planetSide}
      />

      {/* 2. Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-10 md:px-16 lg:px-20">
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16 ${isLeftPlanet ? 'lg:justify-items-end' : 'lg:justify-items-start'
            }`}
        >
          {/* Text block: placed on the opposite side of the planet curve */}
          <div
            className={`w-full max-w-2xl ${isLeftPlanet
                ? 'lg:col-span-7 lg:col-start-6 lg:text-right'
                : 'lg:col-span-7 lg:col-start-1 lg:text-left'
              }`}
          >
            {/* Index & Domain Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-3 font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.32em] text-ivory/60 mb-4 ${isLeftPlanet ? 'lg:justify-end' : 'lg:justify-start'
                }`}
            >
              <span>{member.code}</span>
              <span className="text-ivory/30">/</span>
              <span className="text-amber-200/80 font-data text-[10px] tracking-[0.2em]">{member.coord}</span>
            </motion.div>

            {/* Role Subtitle / Banner */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-elegant italic text-base md:text-xl text-ivory/85 leading-tight mb-4"
            >
              {member.role}
            </motion.p>

            {/* Large Display Typography Name */}
            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
              transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-light text-ivory text-4xl sm:text-6xl md:text-7xl lg:text-[5.4rem] leading-[0.94] tracking-tight text-balance mb-6"
            >
              {member.lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </motion.h2>

            {/* Narrative / Domain Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.9, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={`font-elegant text-sm sm:text-base md:text-lg leading-relaxed text-ivory/70 max-w-xl ${isLeftPlanet ? 'lg:ml-auto' : 'lg:mr-auto'
                }`}
            >
              {member.tagline}
            </motion.p>

            {/* Metadata Footer pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className={`mt-8 pt-6 border-t border-ivory/15 flex items-center gap-6 text-[10px] uppercase font-data tracking-[0.25em] text-ivory/50 ${isLeftPlanet ? 'lg:justify-end' : 'lg:justify-start'
                }`}
            >
              <span>{member.stat}</span>
              <span className="h-1 w-1 rounded-full bg-amber-300/60" />
              <span>NASA SPACE APPS 2026</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Master Planetary Sections Component */
export default function TeamPlanetarySections() {
  return (
    <div id="members-start" className="relative z-20 w-full bg-ink">
      {/* 1. Ambient transition border connecting from the Cosmic Cloud logo above */}
      <div className="relative h-28 w-full bg-gradient-to-b from-transparent via-ink/80 to-ink pointer-events-none" />

      {/* 2. Global Section Ticker / Sticky header strip */}
      <div className="sticky top-16 z-30 w-full border-y border-ivory/10 bg-ink/75 px-6 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[9.5px] uppercase font-stencil tracking-[0.28em] text-ivory/60">
          <span className="text-ivory">02 / MISSION CREW</span>
          <div className="hidden sm:flex items-center gap-6 text-ivory/45">
            {MEMBERS.map((m) => (
              <a
                key={m.n}
                href={`#member-${m.n}`}
                className="transition-colors hover:text-ivory"
              >
                {m.n} {m.lines[0]}
              </a>
            ))}
          </div>
          <span className="font-data text-amber-200/70">5 MINDS · 1 PLANET</span>
        </div>
      </div>

      {/* 3. The 5 Member Sections */}
      {MEMBERS.map((member, index) => (
        <MemberSection key={member.n} member={member} index={index} />
      ))}

      {/* 4. Elegant closing sign-off footer */}
      <footer className="relative border-t border-ivory/15 px-6 py-20 text-center md:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="font-stencil text-[10px] uppercase tracking-[0.34em] text-ivory/50 mb-4">
            PRISM · TONE — TEAM COSMIC CLOUD
          </div>
          <h3 className="font-display font-light text-ivory text-3xl md:text-5xl leading-tight text-balance">
            Five minds, listening together to the pulse of a living world.
          </h3>
          <p className="mt-6 font-elegant text-sm text-ivory/60 leading-relaxed">
            Built with science, data, sound, and design for the NASA Space Apps Challenge 2026.
          </p>
          <div className="mt-10 flex items-center justify-center gap-6">
            <a
              href="index.html"
              className="rounded-full border border-ivory/25 px-5 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-ivory/80 transition-all hover:border-ivory hover:text-ivory hover:bg-ivory/10"
            >
              ← Back to Concept
            </a>
            <a
              href="stories.html"
              className="rounded-full border border-ivory/25 px-5 py-2 font-data text-[10px] uppercase tracking-[0.22em] text-ivory/80 transition-all hover:border-ivory hover:text-ivory hover:bg-ivory/10"
            >
              Explore Earth Stories →
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

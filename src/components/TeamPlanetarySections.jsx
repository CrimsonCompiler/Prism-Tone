import { useState, useEffect, useRef } from 'react'
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

// Sequence: 01 Shifa -> 02 Senjuti -> 03 Tousif -> 04 Samiha -> 05 Nahian
const MEMBERS = [
  {
    n: '01',
    code: '01 / UI·UX & FRONTEND',
    lines: ['Anika Binta', 'Azad Shifa'],
    name: 'Anika Binta Azad Shifa',
    role: 'Project Lead, UI/UX Design & Frontend Engineering',
    tagline: 'Translating complex planetary data into intuitive interfaces. Bridging UI design with frontend engineering to make Earth’s changing patterns easier to explore, understand, and hear.',
    stat: 'EARTH · DATA · HUMAN PERCEPTION',
    coord: '23.8738° N / 90.3965° E',
    photo: '/images/shifa-glow.png',
    hue: 'aurora',
    seed: 1,
    planetSide: 'left',
  },
  {
    n: '02',
    code: '02 / BACKEND & ML',
    lines: ['Senjuti', 'Humyra'],
    name: 'Senjuti Humyra',
    role: 'Backend Architecture • API Engineering • ML Integration',
    tagline: 'Engineering the intelligence behind Earth’s symphony to transform Earth’s scientific signals into a responsive, meaningful sonic experience.',
    stat: 'PLANETARY DATA · SOUND',
    coord: '25.7785° N / 88.8974° E',
    photo: '/images/sejuti-glow.png',
    hue: 'ocean',
    seed: 2,
    planetSide: 'right',
  },
  {
    n: '03',
    code: '03 / SYSTEM & AI',
    lines: ['Tousif', 'Tasrik'],
    name: 'Tousif Tasrik',
    role: 'System Architecture • Backend Engineering • AI Integration',
    tagline: 'Architecting the systems & technical foundations for a reliable, integrated experience where Earth observations can become dynamic & interactive.',
    stat: 'DATA PROCESSING · AI COMPONENTS',
    coord: '23.7656° N / 90.3603° E',
    photo: '/images/tousif-glow.png',
    hue: 'blue',
    seed: 4,
    planetSide: 'left',
    photoScale: 'scale-[1.14] sm:scale-[1.16] md:scale-[1.17] lg:scale-[1.18]',
  },
  {
    n: '04',
    code: '04 / ANALYSIS & HARMONIZATION',
    lines: ['Samiha Tasnim', 'Mim'],
    name: 'Samiha Tasnim Mim',
    role: 'Data Scientist & Sonification Specialist',
    tagline: 'Finding the rhythm within environmental datasets & transforming Earth’s changing climate signals into evocative acoustic experiences.',
    stat: 'SIGNAL MAPPING • SCIENTIFIC PATTERNS',
    coord: '23.76171° N / 90.43128° E',
    photo: '/images/samiha-glow.png',
    hue: 'river',
    seed: 3,
    planetSide: 'right',
  },
  {
    n: '05',
    code: '05 / MOTION GRAPHICS & VFX',
    lines: ['Abu Saleh', 'Md Nahian'],
    name: 'Abu Saleh Md Nahian',
    role: 'Visual Experience & Storytelling',
    tagline: 'Giving Earth’s invisible patterns a language. Crafting that connect scientific data with human perception to make more tangible & engaging.',
    stat: 'VISUAL IDENTITY · ANIMATION',
    coord: '23.7465° N / 90.3760° E',
    photo: '/images/nahian-glow.png',
    hue: 'ice',
    seed: 5,
    planetSide: 'left',
  },
]

function getStars(seed, count = 65) {
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

/* 
 * Planetary Horizon Stage SVG:
 * Matches the Netlify reference:
 * - A massive sweeping planetary curve across the screen whose bottom extends far below the viewport.
 * - ZERO bottom rims cutting across the member's body.
 * - Ethereal atmospheric corona glow along the rim.
 * - Delicate continental contour curves & geodesic orbital arcs inside the sphere.
 * - Twinkling cosmic stars in the sky above.
 */
function PlanetaryHorizonStage({ hueKey, seed, side = 'left' }) {
  const theme = HUES[hueKey] || HUES.aurora
  const stars = getStars(seed, 65)
  const idSuffix = `${hueKey}-${seed}`

  // Center the planetary sphere low so its horizon arc peaks around waist/stomach level (matching sketch)
  const cx = side === 'left' ? 24 : 76
  const cy = 97
  const r = 36

  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        {/* Deep sky celestial background */}
        <radialGradient id={`bg-${idSuffix}`} cx={side === 'left' ? '30%' : '70%'} cy="40%" r="85%">
          <stop offset="0%" stopColor={theme.a} stopOpacity="0.8" />
          <stop offset="55%" stopColor={theme.b} stopOpacity="0.65" />
          <stop offset="100%" stopColor="#04050f" stopOpacity="0.95" />
        </radialGradient>

        {/* Soft atmospheric cloud glow */}
        <radialGradient id={`glow-${idSuffix}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={theme.glow} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        {/* Planet body interior gradient */}
        <radialGradient id={`planet-${idSuffix}`} cx={side === 'left' ? '35%' : '65%'} cy="30%" r="75%">
          <stop offset="0%" stopColor={theme.planet} stopOpacity="0.95" />
          <stop offset="55%" stopColor="#08121f" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#02040b" stopOpacity="1" />
        </radialGradient>

        {/* Corona blur filter */}
        <filter id={`blur-corona-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>

        <filter id={`blur-bg-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>

        {/* Clip path inside the sweeping planet horizon */}
        <clipPath id={`clip-horizon-${idSuffix}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* 1. Deep celestial space fill */}
      <rect width="100" height="100" fill={`url(#bg-${idSuffix})`} />

      {/* 2. Soft atmospheric aurora glow in sky */}
      <ellipse
        cx={side === 'left' ? 30 : 70}
        cy={38}
        rx="48"
        ry="30"
        fill={`url(#glow-${idSuffix})`}
        filter={`url(#blur-bg-${idSuffix})`}
        opacity="0.65"
      />

      {/* 3. Cosmic twinkling stars above the horizon */}
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

      {/* 4. Planetary Outer Corona Glow along the horizon rim */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 1.8}
        fill="none"
        stroke={theme.glow}
        strokeOpacity="0.65"
        strokeWidth="1.6"
        filter={`url(#blur-corona-${idSuffix})`}
      />

      {/* 5. Main Planetary Sphere — curves upward to form the horizon */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#planet-${idSuffix})`} />

      {/* 6. Hand-drawn continental curves & geodesic arcs inside the horizon */}
      <g clipPath={`url(#clip-horizon-${idSuffix})`} opacity="0.45">
        {/* Organic continental doodle curves scaled to new planetary radius */}
        <path
          d={`M ${cx - 32} ${cy - 6} Q ${cx - 12} ${cy - 18} ${cx + 3} ${cy - 8} T ${cx + 30} ${cy - 14}`}
          fill="none"
          stroke={theme.light}
          strokeWidth="0.22"
          strokeDasharray="1.4 0.9"
        />
        <path
          d={`M ${cx - 30} ${cy + 6} Q ${cx - 8} ${cy + 17} ${cx + 8} ${cy + 5} T ${cx + 32} ${cy + 12}`}
          fill="none"
          stroke={theme.accent}
          strokeWidth="0.26"
        />
        <path
          d={`M ${cx - 28} ${cy - 17} C ${cx - 14} ${cy - 26}, ${cx + 12} ${cy - 23}, ${cx + 30} ${cy - 9}`}
          fill="none"
          stroke={theme.c}
          strokeWidth="0.18"
          strokeOpacity="0.85"
        />
        {/* Geodesic meridian arc */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={r * 0.45}
          ry={r}
          fill="none"
          stroke={theme.c}
          strokeWidth="0.14"
          strokeOpacity="0.35"
        />
      </g>

      {/* 7. Fine glowing horizon rim line */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={theme.accent}
        strokeOpacity="0.4"
        strokeWidth="0.18"
      />
    </svg>
  )
}

/* Individual Member Section */
function MemberSection({ member }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: '-15% 0px -15% 0px' })
  const isLeftPlanet = member.planetSide === 'left'

  return (
    <section
      ref={ref}
      id={`member-${member.n}`}
      className="relative min-h-[75vh] lg:min-h-[82vh] w-full flex items-center overflow-hidden py-8 sm:py-10 md:py-12 lg:py-14 scroll-mt-24 sm:scroll-mt-28 md:scroll-mt-32"
      aria-label={`${member.name} — ${member.role}`}
    >
      {/* 1. Deep Sweeping Planetary Horizon Stage */}
      <PlanetaryHorizonStage
        hueKey={member.hue}
        seed={member.seed}
        side={member.planetSide}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-10 md:px-16 lg:px-20">
        {/* Generous gap and items-end baseline alignment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-end gap-12 lg:gap-16 xl:gap-24">

          {/* 2. Visual Stage: Portrait standing on top of the sweeping planetary horizon */}
          <div
            className={`flex items-end justify-center lg:col-span-5 ${isLeftPlanet ? 'lg:order-1' : 'lg:order-2'
              }`}
          >
            <div className="relative flex items-end justify-center w-full max-w-[500px] lg:max-w-[580px] xl:max-w-[640px]">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.94 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.94 }}
                transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex items-end justify-center w-full"
              >
                {/* 
                  Clean solid portrait without premature bottom fading.
                  Enlarged and highlighted with grounded bottom alignment.
                */}
                <motion.img
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  src={member.photo}
                  alt={member.name}
                  className={`max-h-[500px] sm:max-h-[560px] md:max-h-[640px] lg:max-h-[700px] xl:max-h-[740px] w-auto object-contain select-none drop-shadow-[0_16px_50px_rgba(0,0,0,0.75)] [mask-image:linear-gradient(to_bottom,black_95%,transparent)] origin-bottom ${member.photoScale || 'scale-105 lg:scale-110'
                    }`}
                  draggable="false"
                  loading="lazy"
                />
              </motion.div>
            </div>
          </div>

          {/* 3. Typography & Information Column with generous breathing distance */}
          <div
            className={`w-full max-w-2xl lg:col-span-7 flex flex-col justify-end pb-2 ${isLeftPlanet
              ? 'lg:order-2 lg:text-left lg:pl-6 xl:pl-12'
              : 'lg:order-1 lg:text-right lg:pr-6 xl:pr-12'
              }`}
          >
            {/* Index & Domain Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-3 font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.32em] text-ivory/60 mb-3 ${isLeftPlanet ? 'lg:justify-start' : 'lg:justify-end'
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
              className="font-elegant italic text-base md:text-xl text-ivory/85 leading-tight mb-3"
            >
              {member.role}
            </motion.p>

            {/* Large Display Typography Name */}
            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
              transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-light text-ivory text-4xl sm:text-6xl md:text-7xl lg:text-[5.2rem] leading-[0.94] tracking-tight text-balance mb-5"
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
              className={`font-elegant text-sm sm:text-base md:text-lg leading-relaxed text-ivory/70 max-w-xl ${isLeftPlanet ? 'lg:mr-auto' : 'lg:ml-auto'
                }`}
            >
              {member.tagline}
            </motion.p>

            {/* Metadata Footer baseline — aligned horizontally with the bottom of the portrait */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className={`mt-6 pt-5 border-t border-ivory/15 flex items-center gap-6 text-[10px] uppercase font-data tracking-[0.25em] text-ivory/50 ${isLeftPlanet ? 'lg:justify-start' : 'lg:justify-end'
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
  const [activeMember, setActiveMember] = useState('01')

  useEffect(() => {
    const handleScroll = () => {
      const offsets = MEMBERS.map((m) => {
        const el = document.getElementById(`member-${m.n}`)
        if (!el) return { n: m.n, top: Infinity }
        const rect = el.getBoundingClientRect()
        return { n: m.n, top: Math.abs(rect.top - 140) }
      })
      offsets.sort((a, b) => a.top - b.top)
      if (offsets[0] && offsets[0].top < window.innerHeight * 0.8) {
        setActiveMember(offsets[0].n)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToMember = (n) => {
    const el = document.getElementById(`member-${n}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div id="members-start" className="relative z-20 w-full bg-ink">
      {/* 1. Ambient transition connecting from the Cosmic Cloud logo above — reduced height */}
      <div className="relative h-12 sm:h-14 w-full bg-gradient-to-b from-transparent via-ink/80 to-ink pointer-events-none" />

      {/* 2. Sticky Sub-Nav Header: Zero scrollbars, sits right below the main navbar with full names */}
      <div className="sticky top-18 sm:top-20 md:top-22 lg:top-24 z-40 w-full border-y border-ivory/15 bg-ink/90 backdrop-blur-md py-2.5 sm:py-3 px-4 sm:px-6 shadow-lg shadow-black/30">
        <div
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="mx-auto flex max-w-6xl items-center justify-center gap-5 sm:gap-7 md:gap-9 lg:gap-12 overflow-x-auto no-scrollbar scroll-smooth [&::-webkit-scrollbar]:hidden"
        >
          {MEMBERS.map((m) => {
            const isActive = activeMember === m.n
            return (
              <button
                key={m.n}
                onClick={() => scrollToMember(m.n)}
                className={`group relative flex items-center gap-2 whitespace-nowrap font-ui text-[10.5px] sm:text-[11.5px] md:text-[12px] uppercase tracking-[0.16em] sm:tracking-[0.2em] transition-all duration-300 py-1 ${isActive
                  ? 'text-ivory font-semibold'
                  : 'text-ivory/55 hover:text-ivory'
                  }`}
              >
                <span
                  className={`font-stencil text-[9px] transition-colors ${isActive ? 'text-amber-300' : 'text-amber-200/50 group-hover:text-amber-200'
                    }`}
                >
                  {m.n}
                </span>
                <span>{m.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeSubNavTab"
                    className="absolute -bottom-1 inset-x-0 h-0.5 bg-amber-300/80 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. The 5 Member Sections */}
      {MEMBERS.map((member) => (
        <MemberSection key={member.n} member={member} />
      ))}

      {/* 4. Elegant closing sign-off footer — tightened spacing */}
      <footer className="relative border-t border-ivory/15 px-6 py-14 text-center md:py-18">
        <div className="mx-auto max-w-2xl">
          <div className="font-stencil text-[10px] uppercase tracking-[0.34em] text-ivory/50 mb-3">
            PRISM · TONE - TEAM · COSMIC CLOUD
          </div>
          <h3 className="font-display font-light text-ivory text-3xl md:text-5xl leading-tight text-balance">
            Five minds, listening together to the pulse of a living world.
          </h3>
          <p className="mt-5 font-elegant text-sm text-ivory/60 leading-relaxed">
            Built with science, data, sound, and design for the NASA Space Apps Challenge 2026.
          </p>
        </div>
      </footer>
    </div>
  )
}

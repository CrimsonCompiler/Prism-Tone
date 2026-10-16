import { memo, useMemo } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

/* ---------- Horizon haze + base earthy slate gradient ---------- */
function HorizonHaze() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'linear-gradient(to bottom, rgba(16, 22, 25, 0.5) 0%, transparent 20%, transparent 80%, rgba(10, 13, 15, 0.7) 100%)',
      }}
    />
  )
}

/* ---------- Soft ambient atmospheric glow washes (#3f75bb and #739a69) ---------- */
function AtmosphericGlows() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Oceanic atmosphere blue wash - top right */}
      <div
        className="absolute -top-[5%] -right-[5%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] rounded-full opacity-[0.14]"
        style={{
          background:
            'radial-gradient(circle, #3f75bb 0%, rgba(63, 117, 187, 0.35) 30%, rgba(63, 117, 187, 0.12) 55%, transparent 75%)',
        }}
      />
      {/* Terrestrial moss sage green wash - bottom left */}
      <div
        className="absolute bottom-[10%] -left-[5%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] rounded-full opacity-[0.14]"
        style={{
          background:
            'radial-gradient(circle, #739a69 0%, rgba(115, 154, 105, 0.35) 30%, rgba(115, 154, 105, 0.12) 55%, transparent 75%)',
        }}
      />
      {/* Mid-page atmospheric blend */}
      <div
        className="absolute top-[45%] right-[15%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full opacity-[0.09]"
        style={{
          background:
            'radial-gradient(circle, #3f75bb 0%, rgba(63, 117, 187, 0.4) 30%, rgba(115, 154, 105, 0.35) 55%, transparent 75%)',
        }}
      />
    </div>
  )
}

/* ---------- Tactile film-grain noise texture ---------- */
function SubtleGrain() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.035]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.96 0 0 0 0 0.93 0 0 0 0 0.88 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  )
}

/* ---------- Minimal Scientific Graticule (Faint Center Crosshair) ---------- */
function Graticule() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <linearGradient id="gratFadeV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(242,237,227,0.03)" />
          <stop offset="50%" stopColor="rgba(242,237,227,0.10)" />
          <stop offset="100%" stopColor="rgba(242,237,227,0.03)" />
        </linearGradient>
        <linearGradient id="gratFadeH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(242,237,227,0.03)" />
          <stop offset="50%" stopColor="rgba(242,237,227,0.10)" />
          <stop offset="100%" stopColor="rgba(242,237,227,0.03)" />
        </linearGradient>
      </defs>

      {/* Center Prime Meridian (x=50%) */}
      <line x1="50" y1="0" x2="50" y2="100" stroke="url(#gratFadeV)" strokeWidth="0.05" />

      {/* Center Equator (y=50%) */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="url(#gratFadeH)" strokeWidth="0.05" />
    </svg>
  )
}

/* ---------- Sine & Cosine Contour Generator ---------- */
function buildContourPath({
  width = 100,
  y,
  amplitude,
  frequency,
  phase,
  segments = 50,
}) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width
    const yy =
      y +
      Math.sin((i / segments) * Math.PI * 2 * frequency + phase) * amplitude +
      Math.cos((i / segments) * Math.PI * 2 * frequency * 0.55 + phase * 1.3) *
      amplitude *
      0.45
    pts.push([x, yy])
  }
  return pts
    .map((p, i) =>
      i === 0
        ? `M${p[0].toFixed(2)} ${p[1].toFixed(2)}`
        : `L${p[0].toFixed(2)} ${p[1].toFixed(2)}`
    )
    .join(' ')
}

/* ---------- TopoLayer: Spanned continuously across the full page height ---------- */
const TopoLayer = memo(function TopoLayer({
  scrollYProgress,
  direction,
  opacity,
  count,
  baseY,
  spread,
  amplitude,
  frequency,
  phase,
  color,
  strokeWidth = '0.22',
}) {
  const driftMultiplier = direction === 'left' ? -1 : 1
  const xScroll = useTransform(scrollYProgress, [0, 1], [0, 45 * driftMultiplier])
  const yScroll = useTransform(scrollYProgress, [0, 1], [0, 18 * driftMultiplier])

  const lines = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const y = baseY + i * spread
      const localAmp = amplitude * (0.8 + ((i * 13) % 7) * 0.06)
      const localPhase = phase + i * 0.65
      const localFreq = frequency * (0.88 + ((i * 7) % 5) * 0.05)
      return {
        d: buildContourPath({
          width: 100,
          y,
          amplitude: localAmp,
          frequency: localFreq,
          phase: localPhase,
        }),
      }
    })
  }, [count, baseY, spread, amplitude, frequency, phase])

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ x: xScroll, y: yScroll, opacity, willChange: 'transform' }}
    >
      <svg
        className="w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {lines.map((l, i) => (
          <path
            key={i}
            d={l.d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </motion.div>
  )
})

/* ---------- Full-Document Concept Background Export ---------- */
export default function ConceptBackground() {
  const { scrollYProgress } = useScroll()

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 w-full pointer-events-none select-none"
      style={{
        zIndex: 0,
        minHeight: '100%',
        height: '100%',
        backgroundColor: '#111417',
        backgroundImage:
          'radial-gradient(ellipse at 50% 20%, #1a2529 0%, #12191c 45%, #0d1012 100%)',
      }}
    >
      {/* 1. Base Horizon Haze */}
      <HorizonHaze />

      {/* 2. Soft Ambient Atmospheric Washes */}
      <AtmosphericGlows />

      {/* 3. Oceanic Blue (#3f75bb) Topo Wave Lines - widely spaced (3-4 lines max per screen) */}
      <TopoLayer
        scrollYProgress={scrollYProgress}
        direction="right"
        opacity={0.42}
        count={5}
        baseY={6}
        spread={22}
        amplitude={4.2}
        frequency={1.05}
        phase={0}
        color="rgba(63, 117, 187, 0.44)"
        strokeWidth="0.26"
      />

      {/* 4. Terrestrial Sage Green (#739a69) Topo Wave Lines - widely spaced */}
      <TopoLayer
        scrollYProgress={scrollYProgress}
        direction="left"
        opacity={0.38}
        count={4}
        baseY={15}
        spread={24}
        amplitude={4.5}
        frequency={0.92}
        phase={1.6}
        color="rgba(115, 154, 105, 0.40)"
        strokeWidth="0.22"
      />

      {/* 5. Subtle Ivory Echo Wave Lines - sparse and faint */}
      <TopoLayer
        scrollYProgress={scrollYProgress}
        direction="right"
        opacity={0.22}
        count={3}
        baseY={22}
        spread={35}
        amplitude={3.2}
        frequency={1.2}
        phase={0.8}
        color="rgba(242, 237, 227, 0.18)"
        strokeWidth="0.16"
      />

      {/* 6. Tactile Film Grain Texture */}
      <SubtleGrain />

      {/* 7. Viewport Fixed Overlays (Faint Center Crosshair) */}
      <div className="fixed inset-0 w-full h-full pointer-events-none">
        <Graticule />
      </div>
    </div>
  )
}

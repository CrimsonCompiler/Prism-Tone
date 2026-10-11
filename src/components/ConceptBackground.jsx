import { motion } from 'motion/react'
import { useMemo } from 'react'

/* ---------- Horizon haze + base earthy slate gradient ---------- */
function HorizonHaze() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'linear-gradient(to bottom, rgba(16, 22, 25, 0.6) 0%, transparent 25%, transparent 75%, rgba(10, 13, 15, 0.8) 100%)',
      }}
    />
  )
}

/* ---------- Soft ambient atmospheric glow washes (matching whole site theme) ---------- */
function AtmosphericGlows() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Oceanic atmosphere blue wash - top right */}
      <div
        className="absolute -top-[10%] -right-[5%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full blur-[110px] opacity-[0.14]"
        style={{
          background: 'radial-gradient(circle, #3f75bb 0%, rgba(63, 117, 187, 0.35) 45%, transparent 70%)',
        }}
      />
      {/* Terrestrial moss sage green wash - bottom left */}
      <div
        className="absolute -bottom-[10%] -left-[5%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full blur-[110px] opacity-[0.14]"
        style={{
          background: 'radial-gradient(circle, #739a69 0%, rgba(115, 154, 105, 0.35) 45%, transparent 70%)',
        }}
      />
      {/* Subtle center-left atmospheric blend */}
      <div
        className="absolute top-[40%] left-[25%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full blur-[120px] opacity-[0.08]"
        style={{
          background: 'radial-gradient(circle, #3f75bb 0%, #739a69 60%, transparent 75%)',
        }}
      />
    </div>
  )
}

/* ---------- Subtle film-grain noise ---------- */
function SubtleGrain() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.025] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.96 0 0 0 0 0.93 0 0 0 0 0.88 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
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
          <stop offset="0%" stopColor="rgba(242,237,227,0.04)" />
          <stop offset="50%" stopColor="rgba(242,237,227,0.12)" />
          <stop offset="100%" stopColor="rgba(242,237,227,0.04)" />
        </linearGradient>
        <linearGradient id="gratFadeH" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(242,237,227,0.04)" />
          <stop offset="50%" stopColor="rgba(242,237,227,0.12)" />
          <stop offset="100%" stopColor="rgba(242,237,227,0.04)" />
        </linearGradient>
      </defs>

      {/* Center Prime Meridian (x=50%) */}
      <line x1="50" y1="0" x2="50" y2="100" stroke="url(#gratFadeV)" strokeWidth="0.06" />

      {/* Center Equator (y=52.5%) */}
      <line x1="0" y1="52.5" x2="100" y2="52.5" stroke="url(#gratFadeH)" strokeWidth="0.06" />
    </svg>
  )
}

/* ---------- Wave Generator for Flowing Curves ---------- */
function generateWavePath({
  width = 1920,
  baseY,
  slope = 0,
  amplitude,
  frequency,
  phase = 0,
  secondaryAmp = 0,
  steps = 80,
}) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = t * width
    const y =
      baseY +
      t * slope +
      Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude +
      Math.cos(t * Math.PI * 2 * frequency * 0.5 + phase * 1.3) * secondaryAmp
    pts.push([x, y])
  }
  return pts.map((p, idx) => (idx === 0 ? `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(' ')
}

/* ---------- Thick & Dim Topographic Wave Stripes ---------- */
function FlowingWaves() {
  const waves = useMemo(() => {
    return [
      /* ===== UPPER BAND (Mota & Dim) ===== */
      // 1. Companion upper contour
      {
        id: 'top-thin-1',
        d: generateWavePath({
          baseY: 150,
          slope: -20,
          amplitude: 55,
          frequency: 0.9,
          phase: 0.2,
          secondaryAmp: 25,
        }),
        stroke: 'rgba(32, 54, 82, 0.28)',
        strokeWidth: 6,
        duration: 18,
      },
      // 2. MAIN BOLD UPPER STRIPE (Mota, dark & dim so text is highlighted)
      {
        id: 'top-bold-blue',
        d: generateWavePath({
          baseY: 220,
          slope: -45,
          amplitude: 75,
          frequency: 0.95,
          phase: 0.1,
          secondaryAmp: 35,
        }),
        stroke: 'rgba(35, 62, 95, 0.44)',
        strokeWidth: 14, // Mota stripe
        duration: 15,
      },
      // 3. Companion dim sage/moss wave
      {
        id: 'top-sage',
        d: generateWavePath({
          baseY: 270,
          slope: -30,
          amplitude: 65,
          frequency: 0.88,
          phase: 0.35,
          secondaryAmp: 28,
        }),
        stroke: 'rgba(28, 52, 44, 0.30)',
        strokeWidth: 7,
        duration: 20,
      },
      // 4. Very faint trace line
      {
        id: 'top-ivory',
        d: generateWavePath({
          baseY: 330,
          slope: -15,
          amplitude: 50,
          frequency: 1.05,
          phase: 0.6,
          secondaryAmp: 20,
        }),
        stroke: 'rgba(242, 237, 227, 0.08)',
        strokeWidth: 3,
        duration: 24,
      },

      /* ===== LOWER BAND (Mota & Dim) ===== */
      // 5. Sweeping counter-wave passing through center right
      {
        id: 'mid-lower-counter',
        d: generateWavePath({
          baseY: 660,
          slope: 120,
          amplitude: 65,
          frequency: 0.75,
          phase: 1.2,
          secondaryAmp: 30,
        }),
        stroke: 'rgba(26, 48, 72, 0.30)',
        strokeWidth: 8,
        duration: 20,
      },
      // 6. MAIN THICK LOWER STRIPE (Mota sweeping ribbon, dim and non-distracting)
      {
        id: 'bottom-bold-ribbon',
        d: generateWavePath({
          baseY: 880,
          slope: -320,
          amplitude: 110,
          frequency: 0.82,
          phase: 0.4,
          secondaryAmp: 45,
        }),
        stroke: 'rgba(36, 68, 105, 0.46)',
        strokeWidth: 18, // Mota broad ribbon
        duration: 16,
      },
      // 7. Companion lower oceanic/sage wave
      {
        id: 'bottom-companion',
        d: generateWavePath({
          baseY: 960,
          slope: -260,
          amplitude: 85,
          frequency: 0.85,
          phase: 0.55,
          secondaryAmp: 35,
        }),
        stroke: 'rgba(28, 52, 48, 0.32)',
        strokeWidth: 9,
        duration: 18,
      },
      // 8. Faint trace near bottom
      {
        id: 'bottom-ivory',
        d: generateWavePath({
          baseY: 1020,
          slope: -180,
          amplitude: 60,
          frequency: 0.9,
          phase: 0.8,
          secondaryAmp: 25,
        }),
        stroke: 'rgba(242, 237, 227, 0.07)',
        strokeWidth: 3,
        duration: 22,
      },
    ]
  }, [])

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
      <svg
        className="w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 1920 1080"
      >
        {waves.map((w, idx) => (
          <motion.path
            key={w.id}
            d={w.d}
            fill="none"
            stroke={w.stroke}
            strokeWidth={w.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0.94, 1, 0.94] }}
            transition={{
              duration: w.duration,
              delay: idx * 0.25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

/* ---------- Main Component Export ---------- */
export default function ConceptBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none"
      style={{
        zIndex: 0,
        minHeight: '100%',
        height: '100%',
        backgroundColor: '#111417',
        backgroundImage:
          'radial-gradient(ellipse at 50% 30%, #1a2529 0%, #12191c 50%, #0d1012 100%)',
      }}
    >
      {/* 1. Base Horizon Haze */}
      <HorizonHaze />

      {/* 2. Soft Ambient Atmospheric Washes */}
      <AtmosphericGlows />

      {/* 3. Topographic Wavy Spectral Stripes (Mota & Dim) */}
      <FlowingWaves />

      {/* 4. Subtle Film Grain */}
      <SubtleGrain />

      {/* 5. Clean Faint Crosshair (Without moving scanline or glowing dot) */}
      <Graticule />
    </div>
  )
}

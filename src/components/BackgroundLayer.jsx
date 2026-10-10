// Reference-style cosmic background — 8 stacked layers over a deep ink base.
// Mirrors the landing page system (CosmicBackground) but rebuilt with the
// existing ink/ivory palette only.
//
// Layer order (bottom → top):
//   1. NebulaClouds       — 5 soft blurred ivory "blobs" + center darken
//   2. HorizonHaze        — vertical linear gradient top/bottom darken
//   3. StarField (faint)  — 120 small distant stars, twinkle loop
//   4. Constellations     — 32-node sparse web of connecting SVG lines
//   5. OrbitalArcs        — three slowly rotating SVG ellipses
//   6. DriftingParticles  — 28 ivory particles drifting upward
//   7. StarField (bright) — 18 larger brighter twinkling stars on top
//   8. DataTrails         — four slow horizontal light streaks
//   9. SubtleGrain        — fine SVG noise overlay (mix-blend-overlay)
//
// No page UI / structure is touched. Palette: only existing ink/ivory tokens.

// ---------- seeded random (deterministic between renders) ----------
function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ---------- faint star field (120 stars) ----------
function makeStars(count, opts) {
  const rng = seededRandom(opts.seed)
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * 100,
      y: rng() * 100,
      size: opts.minSize + rng() * (opts.maxSize - opts.minSize),
      opacity: opts.opacityRange[0] + rng() * (opts.opacityRange[1] - opts.opacityRange[0]),
      duration: 3 + rng() * 6,
      delay: rng() * 5,
    })
  }
  return stars
}

const FAINT_STARS = makeStars(120, {
  seed: 17,
  minSize: 0.5,
  maxSize: 1.1,
  opacityRange: [0.25, 0.55],
})
const BRIGHT_STARS = makeStars(18, {
  seed: 91,
  minSize: 1.2,
  maxSize: 2.2,
  opacityRange: [0.6, 0.95],
})

// ---------- constellation (32 nodes, nearest-neighbor lines) ----------
function makeConstellation() {
  const rng = seededRandom(43)
  const nodes = []
  for (let i = 0; i < 32; i++) {
    nodes.push({ x: rng() * 100, y: rng() * 100 })
  }
  const lines = []
  nodes.forEach((n, i) => {
    let best = -1
    let bestD = 18
    nodes.forEach((m, j) => {
      if (i === j) return
      const dx = n.x - m.x
      const dy = n.y - m.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < bestD) {
        bestD = d
        best = j
      }
    })
    if (best >= 0 && !lines.some((l) => (l[0] === best && l[1] === i))) {
      lines.push([i, best])
    }
  })
  return { nodes, lines }
}
const CONSTELLATION = makeConstellation()

// ---------- drifting particles (28) ----------
function makeParticles() {
  const rng = seededRandom(7)
  const list = []
  for (let i = 0; i < 28; i++) {
    list.push({
      x: rng() * 100,
      size: 0.6 + rng() * 1.6,
      duration: 18 + rng() * 22,
      delay: -rng() * 20,
      driftX: (rng() - 0.5) * 30,
      opacity: 0.25 + rng() * 0.5,
    })
  }
  return list
}
const PARTICLES = makeParticles()

// ---------- data trails (4) ----------
const TRAILS = [
  { top: '18%', width: '28%', duration: 38, delay: 0, glow: 8 },
  { top: '38%', width: '34%', duration: 32, delay: 6, glow: 6 },
  { top: '62%', width: '24%', duration: 44, delay: 14, glow: 7 },
  { top: '82%', width: '36%', duration: 36, delay: 22, glow: 8 },
]

// ---------- nebula blobs (5) — ivory low-alpha versions of the reference nebulae ----------
const NEBULAE = [
  { top: '-8%', left: '-6%', size: '60vw', alpha: 0.07, blur: 80 },
  { top: '-4%', right: '-8%', size: '52vw', alpha: 0.06, blur: 80 },
  { top: '40%', right: '-4%', size: '46vw', alpha: 0.05, blur: 70 },
  { bottom: '-12%', left: '-2%', size: '54vw', alpha: 0.045, blur: 70 },
  { bottom: '-6%', right: '4%', size: '38vw', alpha: 0.035, blur: 70 },
]

// ---------- orbital arcs (3 SVG ellipses) ----------
const ARCS = [
  { cx: -20, cy: 15, rx: 60, ry: 55, dur: 240, dash: '0.6 0.8', spin: 360, sw: 0.15 },
  { cx: 120, cy: 95, rx: 70, ry: 60, dur: 300, dash: '0.5 0.7', spin: -360, sw: 0.12 },
  { cx: 50, cy: 55, rx: 80, ry: 14, dur: 360, dash: '4 8', spin: 360, sw: 0.08 },
]

function Stars({ items, keyPrefix, twinkleMin = 0.4 }) {
  return (
    <>
      {items.map((s, i) => (
        <span
          key={`${keyPrefix}-${i}`}
          className="bg-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            '--d': `${s.duration}s`,
            '--del': `${s.delay}s`,
            '--tmin': twinkleMin,
          }}
        />
      ))}
    </>
  )
}

export default function BackgroundLayer() {
  return (
    <div
      className="bg-cosmic pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 1. Nebula clouds — soft ivory radial blobs */}
      <div className="bg-nebula-wrap" aria-hidden="true">
        {NEBULAE.map((n, i) => (
          <span
            key={i}
            className="bg-nebula"
            style={{
              top: n.top,
              left: n.left,
              right: n.right,
              bottom: n.bottom,
              width: n.size,
              height: n.size,
              '--a': n.alpha,
              filter: `blur(${n.blur}px)`,
            }}
          />
        ))}
        {/* center darkening to keep middle readable */}
        <span
          className="bg-center-darken"
          style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(18,19,19,0.85) 0%, rgba(18,19,19,0.4) 40%, transparent 75%)' }}
        />
      </div>

      {/* 2. Horizon haze — top/bottom darken */}
      <div
        className="bg-horizon"
        style={{
          background:
            'linear-gradient(to bottom, rgba(20,22,40,0.4) 0%, transparent 25%, transparent 70%, rgba(15,18,35,0.5) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 3. Faint star field (120 stars) */}
      <div className="bg-stars" aria-hidden="true">
        <Stars items={FAINT_STARS} keyPrefix="faint" twinkleMin={0.4} />
      </div>

      {/* 4. Constellations — sparse SVG web of 32 nodes */}
      <svg
        className="bg-constellations"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {CONSTELLATION.lines.map(([a, b], i) => (
          <line
            key={`l-${i}`}
            x1={CONSTELLATION.nodes[a].x}
            y1={CONSTELLATION.nodes[a].y}
            x2={CONSTELLATION.nodes[b].x}
            y2={CONSTELLATION.nodes[b].y}
            stroke="rgba(242,237,227,0.18)"
            strokeWidth="0.05"
            className="bg-const-line"
            style={{
              '--d': `${12 + (i % 5)}s`,
              '--del': `${(i % 7) * 0.4}s`,
            }}
          />
        ))}
        {CONSTELLATION.nodes.map((n, i) => (
          <circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r="0.12"
            fill="rgba(242,237,227,0.7)"
          />
        ))}
      </svg>

      {/* 5. Orbital arcs — three rotating SVG ellipses */}
      <svg
        className="bg-arcs"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="orbitStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(242,237,227,0)" />
            <stop offset="50%" stopColor="rgba(242,237,227,0.45)" />
            <stop offset="100%" stopColor="rgba(242,237,227,0)" />
          </linearGradient>
          <linearGradient id="orbitStroke2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(242,237,227,0)" />
            <stop offset="50%" stopColor="rgba(242,237,227,0.32)" />
            <stop offset="100%" stopColor="rgba(242,237,227,0)" />
          </linearGradient>
        </defs>
        {ARCS.map((a, i) => (
          <ellipse
            key={i}
            cx={a.cx}
            cy={a.cy}
            rx={a.rx}
            ry={a.ry}
            fill="none"
            stroke={
              i === 2
                ? 'rgba(242,237,227,0.18)'
                : i === 0
                  ? 'url(#orbitStroke)'
                  : 'url(#orbitStroke2)'
            }
            strokeWidth={a.sw}
            strokeDasharray={a.dash}
            className="bg-arc"
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              '--d': `${a.dur}s`,
              '--spin': `${a.spin}deg`,
            }}
          />
        ))}
      </svg>

      {/* 6. Drifting particles (28) — drifting upward */}
      <div className="bg-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="bg-particle"
            style={{
              left: `${p.x}%`,
              bottom: '-10vh',
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              '--d': `${p.duration}s`,
              '--del': `${p.delay}s`,
              '--dx': `${p.driftX}px`,
              filter: 'blur(0.4px)',
              boxShadow: '0 0 6px rgba(242,237,227,0.6)',
            }}
          />
        ))}
      </div>

      {/* 7. Bright star field (18) */}
      <div className="bg-stars" aria-hidden="true">
        <Stars items={BRIGHT_STARS} keyPrefix="bright" twinkleMin={0.5} />
      </div>



      {/* 9. Subtle grain (fractalNoise SVG, mix-blend-overlay, 5% opacity) */}
      <div
        className="bg-grain-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.96 0 0 0 0 0.93 0 0 0 0 0.88 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />
    </div>
  )
}

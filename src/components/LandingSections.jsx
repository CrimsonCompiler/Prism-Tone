import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Fade, Reveal, Rule } from './ui'
import { OrbitCanvas, Waveform, MappingViz } from './Canvases'

/* =========================================================================
   01 / PHENOMENOLOGICAL CONVERSION
   ========================================================================= */
const SENSORS = [
  {
    index: '01',
    sensorTag: 'MODIS / AIRS / TERRA',
    title: 'THERMAL ANOMALY CURVE',
    stat: '+1.48°C Global Mean Deviation',
    desc: 'Satellite thermal radiometry captures the thermal pulse of ocean basins and land surfaces. As caloric energy accumulates, the baseline acoustic fundamental shifts upward.',
    viz: 'thermal',
  },
  {
    index: '02',
    sensorTag: 'CYGNSS / NASA GAFS',
    title: 'POLAR JET STREAM VECTORS',
    stat: '142 km/h Peak Tropospheric Velocity',
    desc: 'Atmospheric circulation creates meandering planetary waves. Cyclonic friction is translated into resonant bandpassed noise sweeps and tempo fluctuations.',
    viz: 'jetstream',
  },
  {
    index: '03',
    sensorTag: 'GPM DPR',
    title: 'GPM PRECIPITATION CELL DENSITY',
    stat: '68 mm/hr Deep Convective Influx',
    desc: 'Dual-frequency satellite precipitation radars slice atmospheric moisture profiles. Droplet density maps directly into rhythmic frequency and percussion density.',
    viz: 'precipitation',
  },
  {
    index: '04',
    sensorTag: 'ICESat-2 ATLAS',
    title: 'CRYO-MASS LOSS GRADIENTS',
    stat: '-420 Gt/yr Glacial Mass Deficit',
    desc: 'Photon-counting laser altimetry detects micro-meter elevation changes on ice shelves. Massive displacement is mapped to infrasonic pressure waves.',
    viz: 'cryo',
  },
]

function SensorVisual({ type }) {
  if (type === 'thermal') {
    return (
      <svg viewBox="0 0 280 110" className="h-full w-full">
        <line x1="20" y1="20" x2="260" y2="20" stroke="rgba(242,237,227,0.06)" strokeDasharray="3 3" />
        <line x1="20" y1="55" x2="260" y2="55" stroke="rgba(242,237,227,0.06)" strokeDasharray="3 3" />
        <line x1="20" y1="90" x2="260" y2="90" stroke="rgba(242,237,227,0.06)" strokeDasharray="3 3" />
        <line x1="80" y1="10" x2="80" y2="100" stroke="rgba(242,237,227,0.04)" />
        <line x1="160" y1="10" x2="160" y2="100" stroke="rgba(242,237,227,0.04)" />
        <line x1="240" y1="10" x2="240" y2="100" stroke="rgba(242,237,227,0.04)" />

        <defs>
          <linearGradient id="thermalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c19a5b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c19a5b" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M 25 88 Q 80 85, 120 72 T 200 40 T 255 24 L 255 96 L 25 96 Z"
          fill="url(#thermalGrad)"
        />
        <path
          d="M 25 88 Q 80 85, 120 72 T 200 40 T 255 24"
          fill="none"
          stroke="#f2ede3"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="255" cy="24" r="3.5" fill="#c19a5b" />
      </svg>
    )
  }

  if (type === 'jetstream') {
    return (
      <svg viewBox="0 0 280 110" className="h-full w-full overflow-hidden">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f2ede3" opacity="0.8" />
          </marker>
          <marker id="arrowEmber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c19a5b" />
          </marker>
        </defs>
        <path
          d="M 20 32 Q 85 24, 145 38 T 250 28"
          fill="none"
          stroke="rgba(242,237,227,0.45)"
          strokeWidth="1.4"
          markerEnd="url(#arrow)"
          strokeDasharray="4 2"
        />
        <path
          d="M 20 54 Q 90 42, 150 62 T 252 50"
          fill="none"
          stroke="#f2ede3"
          strokeWidth="1.8"
          markerEnd="url(#arrowEmber)"
        />
        <path
          d="M 20 76 Q 80 68, 140 82 T 248 72"
          fill="none"
          stroke="rgba(242,237,227,0.55)"
          strokeWidth="1.4"
          markerEnd="url(#arrow)"
          strokeDasharray="6 3"
        />
      </svg>
    )
  }

  if (type === 'precipitation') {
    const dots = [
      [35, 78, 2, 0.4], [55, 62, 2.5, 0.6], [75, 48, 3, 0.8], [95, 38, 3.2, 0.9],
      [115, 32, 3.5, 1.0], [135, 42, 3.2, 0.9], [155, 55, 3, 0.85], [175, 65, 2.6, 0.7],
      [195, 74, 2.2, 0.5], [215, 80, 2, 0.4], [235, 84, 1.8, 0.3], [250, 86, 1.6, 0.25],
      [65, 72, 1.8, 0.5], [105, 52, 2.4, 0.75], [125, 46, 2.8, 0.85], [145, 68, 2, 0.6],
      [85, 60, 2.2, 0.7], [165, 72, 1.9, 0.55], [185, 45, 2.6, 0.7], [205, 58, 2.1, 0.6],
      [110, 20, 2.2, 0.6], [130, 22, 2.8, 0.8], [150, 28, 2.4, 0.7]
    ]
    return (
      <svg viewBox="0 0 280 110" className="h-full w-full">
        <line x1="20" y1="88" x2="260" y2="88" stroke="rgba(242,237,227,0.12)" strokeDasharray="2 4" />
        <line x1="125" y1="12" x2="125" y2="94" stroke="#c19a5b" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 2" />
        {dots.map(([cx, cy, r, op], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={i % 4 === 0 ? '#c19a5b' : '#f2ede3'}
            opacity={op}
          />
        ))}
      </svg>
    )
  }

  // cryo
  const points = [[25, 38], [75, 54], [115, 48], [155, 76], [195, 68], [250, 86]]
  return (
    <svg viewBox="0 0 280 110" className="h-full w-full">
      <line x1="20" y1="92" x2="260" y2="92" stroke="rgba(242,237,227,0.15)" />
      <polyline
        points="25,38 75,54 115,48 155,76 195,68 250,86"
        fill="none"
        stroke="#f2ede3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line x1="75" y1="54" x2="75" y2="92" stroke="rgba(242,237,227,0.25)" strokeDasharray="3 3" />
      <line x1="155" y1="76" x2="155" y2="92" stroke="#c19a5b" strokeDasharray="3 3" opacity="0.6" />
      <line x1="195" y1="68" x2="195" y2="92" stroke="rgba(242,237,227,0.25)" strokeDasharray="3 3" />
      <rect x="155" y="76" width="40" height="16" fill="rgba(193,154,91,0.08)" stroke="#c19a5b" strokeWidth="0.8" strokeDasharray="2 2" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" fill={i === 3 ? '#c19a5b' : '#f2ede3'} />
      ))}
    </svg>
  )
}

function playAudition(index) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    if (index === 0) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(140, now)
      osc.frequency.exponentialRampToValueAtTime(320, now + 1.6)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 1.8)
    } else if (index === 1) {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(80, now)
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(300, now)
      filter.frequency.exponentialRampToValueAtTime(900, now + 0.9)
      filter.frequency.exponentialRampToValueAtTime(250, now + 1.8)
      filter.Q.value = 4.5
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 0.3)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 1.8)
    } else if (index === 2) {
      ;[0, 0.22, 0.42, 0.68, 0.95, 1.18, 1.42].forEach((t, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        const freqs = [520, 680, 580, 740, 620, 820, 710]
        osc.frequency.setValueAtTime(freqs[i % freqs.length], now + t)
        gain.gain.setValueAtTime(0.16, now + t)
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + t)
        osc.stop(now + t + 0.2)
      })
    } else if (index === 3) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(55, now)
      osc.frequency.linearRampToValueAtTime(42, now + 1.8)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.24, now + 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 1.8)
    }
  } catch (err) {
    console.error('Audio error', err)
  }
}

export function PhenomenologicalConversion() {
  const [playingIdx, setPlayingIdx] = useState(null)

  const handleAudition = (idx) => {
    setPlayingIdx(idx)
    playAudition(idx)
    setTimeout(() => {
      setPlayingIdx((curr) => (curr === idx ? null : curr))
    }, 1800)
  }

  return (
    <section id="concept" className="stack-card z-10 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <span
          className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige font-normal"
          style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
        >
          01 / PHENOMENOLOGICAL CONVERSION
        </span>
        <span className="h-px w-14 md:w-20 bg-ivory/25 inline-block" aria-hidden="true" />
      </div>

      <br /> <br /> <br /> <br />

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-end">
        <div className="lg:col-span-7">
          <h2
            className="font-meno font-light leading-[0.92] text-ivory text-[clamp(2.2rem,4.6vw,4.8rem)] tracking-[-0.015em]"
            style={{ fontFamily: 'Meno Banner' }}
          >
            <span className="block whitespace-nowrap">WHAT IF</span>
            <span className="block whitespace-nowrap">EARTH DATA</span>
            <span className="block whitespace-normal sm:whitespace-nowrap">
              COULD BE <em className="italic text-cream font-light">HEARD?</em>
            </span>
          </h2>
        </div>

        <div className="flex flex-col justify-end lg:col-span-5 lg:pl-8 xl:pl-14 pb-1.5">
          <p className="max-w-md font-elegant text-[17px] leading-relaxed text-cream/85 md:text-[18px]">
            For decades, planetary observations have been trapped in visual charts: color
            ramps, isotherms & 2D graphs. We translate those measurements into sonic language.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ivory/10 pt-4 sm:flex-nowrap">
            <span className="font-data text-[11px] uppercase tracking-[0.2em] text-parchment md:text-[11.5px]">
              Resolution: 0.1° Lat / Lon
            </span>
            <span className="text-parchment/40">|</span>
            <span className="font-data text-[11px] uppercase tracking-[0.2em] text-parchment md:text-[11.5px]">
              Spectral Domain: 24-Bit / 96kHz
            </span>
          </div>
        </div>
      </div>

      <div className="mt-24 md:mt-28 lg:mt-32 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {SENSORS.map((s, idx) => (
          <Fade key={s.index} delay={0.12 * idx}>
            <div
              onClick={() => handleAudition(idx)}
              className="group flex h-full flex-col border border-ivory/10 bg-coal/45 p-5 xl:p-6 backdrop-blur-sm transition-all duration-300 hover:border-ivory/30 hover:bg-coal/70 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between border-b border-ivory/10 pb-3">
                  <span className="font-stencil text-[11.5px] uppercase tracking-[0.22em] text-beige md:text-[12px]">
                    {s.index}
                  </span>
                  <span className="truncate font-data text-[11px] uppercase tracking-[0.16em] text-parchment md:text-[11.5px]">
                    {s.sensorTag}
                  </span>
                </div>

                <div className="relative my-5 h-28 w-full border border-ivory/10 bg-ink/70 p-2">
                  <SensorVisual type={s.viz} />
                </div>

                <h3 className="font-display text-[15.5px] sm:text-[16px] lg:text-[15.5px] xl:text-[17px] font-normal uppercase tracking-normal text-ivory whitespace-normal sm:whitespace-nowrap overflow-hidden text-ellipsis">
                  {s.title}
                </h3>
                <p className="mt-1.5 font-data text-[11px] sm:text-[11.5px] xl:text-[12px] uppercase tracking-[0.06em] text-ember whitespace-normal sm:whitespace-nowrap overflow-hidden text-ellipsis">
                  {s.stat}
                </p>

                <p className="mt-4 font-elegant text-[16.5px] leading-relaxed text-cream/80 md:text-[17.5px]">
                  {s.desc}
                </p>
              </div>
            </div>
          </Fade>
        ))}
      </div>

      <div className="mt-12 md:mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-parchment">
          <span className="h-1.5 w-1.5 rounded-full bg-ember inline-block animate-pulse" />
          <span>SONIFICATION PROTOCOL: ISO/IEC 14496 ACOUSTIC METRICS MAPPING</span>
        </div>

        <div className="border border-ivory/20 px-4 py-2 font-stencil text-[9.5px] md:text-[10.5px] uppercase tracking-[0.26em] text-cream/90 bg-coal/40">
          CLICK ANY TELEMETRY INSTRUMENT TO AUDITION SONIC TRANSLATION
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
   02 / THE TRANSLATION
   ========================================================================= */
const MAPS = [
  {
    from: 'TEMPERATURE',
    sub: 'GISS · temp anomaly',
    to: 'PITCH',
    viz: 'rise',
    note: 'frequency — 110 → 440 hz',
  },
  {
    from: 'WIND',
    sub: 'MERRA-2 · 850 hpa',
    to: 'TEMPO',
    viz: 'gust',
    note: 'tempo — 40 → 180 bpm',
  },
  {
    from: 'RAINFALL',
    sub: 'GPM · IMERG',
    to: 'RHYTHM',
    viz: 'drops',
    note: 'density — events / bar',
  },
  {
    from: 'ICE',
    sub: 'NSIDC · sea ice index',
    to: 'TIMBRE',
    viz: 'timbre',
    note: 'texture — glass → granular',
  },
]

export function Translation() {
  return (
    <section id="translation" className="stack-card z-20 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40">
      <div className="flex items-center justify-between gap-6 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <span
            className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige font-normal"
            style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
          >
            02 / THE TRANSLATION
          </span>
          <span className="h-px w-14 md:w-20 bg-ivory/25 inline-block" aria-hidden="true" />
        </div>
        <span className="font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.26em] text-parchment/80">
          SIGNAL → SCORE
        </span>
      </div>

      <div className="mt-12 grid gap-14 md:mt-16 lg:grid-cols-12 lg:gap-10 items-center">
        <div className="flex flex-col justify-center lg:col-span-4 lg:self-center">
          <Fade delay={0.15}>
            <p className="max-w-[310px] font-elegant text-[16px] md:text-[16.5px] leading-[1.7] text-cream/75">
              Nothing is invented. Each sonic property is bound to a physical quantity — when the
              planet moves, the music moves with it.
            </p>
          </Fade>
        </div>

        <div className="lg:col-span-8">
          {MAPS.map((m, i) => (
            <Fade key={m.from} delay={0.06 * i}>
              <div className="grid grid-cols-12 items-center gap-x-6 gap-y-6 border-t border-ivory/10 py-9 md:py-11">
                <div className="col-span-6 md:col-span-3">
                  <p className="font-stencil text-[12px] uppercase tracking-[0.28em] text-beige font-medium md:text-[13px]">
                    {m.from}
                  </p>
                  <p className="mt-2 font-data text-[11px] uppercase tracking-[0.18em] text-parchment md:text-[11.5px]">
                    {m.sub}
                  </p>
                </div>

                <div className="col-span-12 h-24 md:col-span-5 md:h-28">
                  <MappingViz type={m.viz} className="h-full w-full" />
                </div>

                <div className="col-span-6 flex justify-end md:col-span-1 md:justify-center">
                  <svg width="46" height="12" viewBox="0 0 46 12" className="text-ivory/60" aria-hidden="true">
                    <line x1="0" y1="6" x2="40" y2="6" stroke="currentColor" strokeWidth="1" />
                    <path d="M36 2 L44 6 L36 10" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>

                <div className="col-span-12 md:col-span-3">
                  <p
                    className="font-display text-[1.9rem] font-light italic leading-none text-ivory md:text-[2.4rem]"
                    style={{ fontFamily: 'Meno Banner' }}
                  >
                    {m.to.charAt(0) + m.to.slice(1).toLowerCase()}
                    <span className="ml-2 not-italic text-beige text-xl">↑</span>
                  </p>
                  <p className="mt-2.5 font-data text-[11px] uppercase tracking-[0.18em] text-parchment md:text-[11.5px]">
                    {m.note}
                  </p>
                </div>
              </div>
            </Fade>
          ))}
          <div className="border-t border-ivory/10" />
        </div>
      </div>
    </section>
  )
}

/* =========================================================================
   03 / EXPERIENCE PREVIEW
   ========================================================================= */
function useDrift(base, amp, period = 8) {
  const [v, setV] = useState(base)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let id = null
    const tick = () => {
      const t = Date.now() / 1000
      const n =
        Math.sin((t * Math.PI * 2) / period) * 0.6 +
        Math.sin((t * Math.PI * 2) / (period * 2.63) + 1.3) * 0.4
      setV(base + amp * n)
    }
    const start = () => {
      if (!id && !document.hidden) id = setInterval(tick, 240)
    }
    const stop = () => {
      if (id) {
        clearInterval(id)
        id = null
      }
    }
    start()
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [base, amp, period])
  return v
}

const DATASETS = {
  TEMPERATURE: 'GISS · GISTEMP v4',
  WIND: 'MERRA-2 · 10 m',
  RAINFALL: 'GPM · IMERG',
  ICE: 'NSIDC · sea ice index',
}

function Param({ label, base, amp, unit, decimals = 1, period = 8, index = 0 }) {
  const v = useDrift(base, amp, period)
  return (
    <div className="border-b border-ivory/10 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-stencil text-[12px] md:text-[13px] uppercase tracking-[0.28em] text-beige font-medium">
            {label}
          </p>
          <p className="mt-1.5 font-data text-[11px] md:text-[11.5px] uppercase tracking-[0.18em] text-parchment">
            {DATASETS[label]}
          </p>
        </div>
        <div className="text-right">
          <span className="font-data font-light tabular-nums text-ivory text-3xl md:text-4xl">
            {v.toFixed(decimals)}
          </span>
          <span className="ml-2 font-data text-[11px] md:text-[11.5px] tracking-[0.14em] text-parchment">
            {unit}
          </span>
        </div>
      </div>
      <div className="mt-4 h-px bg-ivory/10">
        <motion.div
          className="h-px origin-left bg-ivory/50"
          animate={{ scaleX: [0.35, 0.8, 0.5, 0.9, 0.35] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: index * 1.7 }}
        />
      </div>
    </div>
  )
}

function Timecode() {
  const [ms, setMs] = useState(2520 * 1000 + 4170)
  useEffect(() => {
    let id = null
    const start = () => {
      if (!id && !document.hidden) id = setInterval(() => setMs((m) => m + 100), 100)
    }
    const stop = () => {
      if (id) {
        clearInterval(id)
        id = null
      }
    }
    start()
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  const pad = (n) => String(n).padStart(2, '0')
  const cs = Math.floor(ms / 100) % 10
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  return (
    <span className="font-data text-[11px] md:text-[12px] tabular-nums tracking-[0.18em] text-cream/80">
      {pad(m)}:{pad(s)}:{cs}
    </span>
  )
}

export function ExperiencePreview() {
  return (
    <section id="preview" className="stack-card z-30 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40">
      <span id="experience" className="sr-only" aria-hidden="true" />
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <span
          className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige font-normal"
          style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
        >
          03 / The Interface
        </span>
        <span className="h-px w-14 md:w-20 bg-ivory/25 inline-block" aria-hidden="true" />
      </div>

      <br /> <br />

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-end mt-8 md:mt-10">
        <div className="lg:col-span-7">
          <h2
            className="font-meno font-light leading-[0.92] text-ivory text-[clamp(2.4rem,5vw,5rem)] tracking-[-0.015em]"
            style={{ fontFamily: 'Meno Banner' }}
          >
            <span className="block whitespace-nowrap">EXPERIENCE</span>
            <span className="block whitespace-nowrap">PREVIEW</span>
          </h2>
        </div>

        <div className="flex flex-col justify-end lg:col-span-5 lg:pl-8 xl:pl-14 pb-1.5">
          <p className="max-w-md font-elegant text-[17px] leading-relaxed text-cream/85 md:text-[18px]">
            Not a corporate dashboard. A living scientific listening post. Explore real-time planetary telemetry translated into pure acoustic vibration.
          </p>
        </div>
      </div>

      <Fade delay={0.25}>
        <div className="mt-16 grid border border-ivory/10 md:mt-20 lg:mt-24 lg:grid-cols-12">
          <div className="flex flex-col border-b border-ivory/10 p-8 max-[359px]:p-5 lg:col-span-3 lg:border-b-0 lg:border-r">
            <div className="flex items-baseline justify-between">
              <p className="font-stencil text-[12px] md:text-[13px] uppercase tracking-[0.28em] text-beige font-medium">
                Orbital sweep
              </p>
              <span className="font-data text-[11px] md:text-[11.5px] uppercase tracking-[0.18em] text-parchment">
                LEO 766 km
              </span>
            </div>
            <div className="mt-6 aspect-square w-full">
              <OrbitCanvas className="h-full w-full" />
            </div>
            <p className="mt-6 font-elegant text-[15.5px] md:text-[16px] leading-relaxed tracking-[0.04em] text-cream/75">
              3 satellites in view
              <br />
              swath — 2330 km
            </p>
          </div>

          <div className="border-b border-ivory/10 p-8 max-[359px]:p-5 lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="flex items-baseline justify-between">
              <p className="font-stencil text-[12px] md:text-[13px] uppercase tracking-[0.28em] text-beige font-medium">
                Live telemetry
              </p>
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="block h-1.5 w-1.5 rounded-full bg-ember"
                />
                <Timecode />
              </span>
            </div>

            <div className="mt-8">
              <Param label="TEMPERATURE" base={14.2} amp={0.9} unit="°C" period={9} index={0} />
              <Param label="WIND" base={8.4} amp={2.6} unit="m/s" period={6} index={1} />
              <Param label="RAINFALL" base={2.1} amp={1.1} unit="mm/h" decimals={2} period={4.5} index={2} />
              <Param label="ICE" base={9.6} amp={0.4} unit="m km²" period={14} index={3} />
            </div>
          </div>

          <div className="flex flex-col p-8 max-[359px]:p-5 lg:col-span-4">
            <div className="flex items-baseline justify-between">
              <p className="font-stencil text-[12px] md:text-[13px] uppercase tracking-[0.28em] text-beige font-medium">
                Signal out
              </p>
              <span className="font-data text-[11px] md:text-[11.5px] uppercase tracking-[0.18em] text-parchment">
                master · 48 kHz
              </span>
            </div>

            <div className="min-h-28 flex-1 py-8">
              <Waveform className="h-28 w-full" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-y-3 border-t border-ivory/10 pt-6 lg:flex-nowrap">
              <a
                href="preview.html"
                className="group flex items-center gap-3 border border-ivory/25 px-5 py-2.5 font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.34em] text-ivory transition-colors duration-300 hover:bg-ivory hover:text-ink cursor-pointer"
              >
                <span className="block h-2 w-2 bg-current" aria-hidden="true" />
                Open preview
              </a>
              <p className="font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-parchment/80">
                headphones recommended
              </p>
            </div>
          </div>
        </div>
      </Fade>

      <Fade delay={0.2}>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-parchment/80">
          <div className="flex items-center gap-2">
            <span className="text-ivory/40">+</span>
            <span>Concept — the full instrument ships with the app</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ivory/40">+</span>
            <span>Every value binds to a live NASA dataset</span>
          </div>
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   04 / ACCESSIBILITY
   ========================================================================= */
function ListenerIllustration() {
  return (
    <svg
      viewBox="0 0 200 280"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <radialGradient id="figGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(244,236,225,0.12)" />
          <stop offset="100%" stopColor="rgba(244,236,225,0)" />
        </radialGradient>
      </defs>

      <ellipse cx={100} cy={80} rx={60} ry={70} fill="url(#figGlow)" />

      <ellipse
        cx={100}
        cy={80}
        rx={34}
        ry={40}
        fill="none"
        stroke="rgba(244,236,225,0.7)"
        strokeWidth={1.5}
      />

      <path
        d="M 85 80 Q 88 83, 91 80"
        fill="none"
        stroke="rgba(244,236,225,0.6)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      <path
        d="M 109 80 Q 112 83, 115 80"
        fill="none"
        stroke="rgba(244,236,225,0.6)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      <path
        d="M 66 70 Q 100 36, 134 70"
        fill="none"
        stroke="rgba(244,236,225,0.8)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />

      <ellipse
        cx={62}
        cy={85}
        rx={10}
        ry={14}
        fill="rgba(244,236,225,0.1)"
        stroke="rgba(244,236,225,0.7)"
        strokeWidth={1.5}
      />

      <ellipse
        cx={138}
        cy={85}
        rx={10}
        ry={14}
        fill="rgba(244,236,225,0.1)"
        stroke="rgba(244,236,225,0.7)"
        strokeWidth={1.5}
      />

      <line x1={58} y1={85} x2={66} y2={85} stroke="rgba(244,236,225,0.5)" strokeWidth={0.8} />
      <line x1={134} y1={85} x2={142} y2={85} stroke="rgba(244,236,225,0.5)" strokeWidth={0.8} />

      <line x1={100} y1={120} x2={100} y2={135} stroke="rgba(244,236,225,0.5)" strokeWidth={1.5} />

      <path
        d="M 60 175 Q 60 145, 100 135 Q 140 145, 140 175 L 140 200 L 60 200 Z"
        fill="rgba(244,236,225,0.04)"
        stroke="rgba(244,236,225,0.6)"
        strokeWidth={1.5}
      />

      {[1, 2, 3, 4, 5].map((i) => (
        <motion.path
          key={`l-${i}`}
          d={`M ${42 - i * 6} ${85 - i * 3} Q ${42 - i * 8} 85, ${42 - i * 6} ${85 + i * 3}`}
          fill="none"
          stroke="rgba(244,236,225,0.4)"
          strokeWidth={0.8}
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: [0, 0.5, 0], pathLength: [0, 1, 1] }}
          transition={{ duration: 2.4, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {[1, 2, 3, 4, 5].map((i) => (
        <motion.path
          key={`r-${i}`}
          d={`M ${158 + i * 6} ${85 - i * 3} Q ${158 + i * 8} 85, ${158 + i * 6} ${85 + i * 3}`}
          fill="none"
          stroke="rgba(244,236,225,0.4)"
          strokeWidth={0.8}
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: [0, 0.5, 0], pathLength: [0, 1, 1] }}
          transition={{ duration: 2.4, delay: i * 0.3 + 0.4, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </svg>
  )
}

export function Accessibility() {
  return (
    <section
      id="access"
      className="stack-card z-40 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40"
    >
      <div className="flex items-center justify-between gap-6 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <span
            className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige font-normal"
            style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
          >
            04 / ACCESSIBILITY
          </span>
          <span className="h-px w-14 md:w-20 bg-ivory/25 inline-block" aria-hidden="true" />
        </div>
        <span className="font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.26em] text-parchment/80">
          A SECOND DOOR
        </span>
      </div>

      <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-12 lg:gap-14 items-center">
        <div className="lg:col-span-7">
          <Fade delay={0.2}>
            <p className="mt-8 max-w-xl font-elegant text-[17px] leading-relaxed text-cream/85 md:text-[18px]">
              Charts privilege those who see.
              <br />
              Prism Tone opens the same data to those who can listen.
              <br /><br />
              Gigabytes of satellite data are traditionally flattened into colored heatmaps, isolines, and visual dashboards-rendering them inaccessible to many people worldwide. A student in a rural classroom or an astrophysicist with visual impairment can perceive the health of the biosphere with the same-or greater-fidelity than a visual analyst.
            </p>
          </Fade>

          <Fade delay={0.3}>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7 border-t border-ivory/10 pt-8">
              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  BLIND / LOW VISION
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  Full sonic narrative
                </p>
              </div>

              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  DEAF / HARD OF HEARING
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  Visual waveform + captions
                </p>
              </div>

              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  DYSLEXIA
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  No reliance on dense text
                </p>
              </div>

              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  NEURODIVERGENT
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  Adjustable intensity
                </p>
              </div>
            </div>
          </Fade>
        </div>

        <div className="flex items-center justify-center lg:col-span-5">
          <Fade delay={0.25}>
            <div className="w-full max-w-[420px] md:w-[480px] md:max-w-none lg:w-[520px] lg:max-w-[calc(100vw-552px)] aspect-[200/280]">
              <ListenerIllustration />
            </div>
          </Fade>
        </div>
      </div>

      <div className="mt-14 md:mt-20 text-center flex flex-col items-center w-full">
        <div className="mt-8 md:mt-10 w-full">
          <Waveform className="h-14 w-full opacity-75" />
          <div className="mt-8 md:mt-10 flex flex-col items-start justify-between gap-6 border-t border-ivory/10 pt-9 md:pt-12 font-data text-[10px] md:text-[10.5px] uppercase tracking-[0.16em] text-[#f9eed8] md:flex-row md:items-center">
            <div className="flex items-start gap-2.5 text-left">
              <span
                className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-current shrink-0"
                aria-hidden="true"
              />
              <div className="leading-tight">
                <p>DEVELOPED FOR NASA SPACE APPS</p>
                <p className="mt-0.5">CHALLENGE 2026</p>
              </div>
            </div>

            <div className="text-left md:text-center leading-tight">
              <p>DATA SOURCES: NASA EOSDIS • MODIS • CYGNSS • GPM • ICESAT-2</p>
              <p className="mt-2.5">AUDIO ENGINE: WEB AUDIO API SYNTHESIS</p>
            </div>

            <div className="text-left md:text-right leading-tight">
              <p className="flex items-center md:justify-end gap-1.5">
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" aria-label="Copyright">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <text x="8" y="10.8" textAnchor="middle" fontSize="8.5" fill="currentColor" fontFamily="system-ui, sans-serif" fontWeight="600">C</text>
                </svg>
                <span>PRISM TONE • COSMIC CLOUD</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default {
  PhenomenologicalConversion,
  Translation,
  ExperiencePreview,
  Accessibility,
}


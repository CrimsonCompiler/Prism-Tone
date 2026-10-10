import { useState } from 'react'
import { motion } from 'motion/react'
import { Fade, Reveal, Rule } from './ui'

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
      // Thermal Anomaly: rising fundamental sine drone
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
      // Polar Jet Stream: filtered wind sweep
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
      // Precipitation: rhythmic marimba / droplet ticks
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
      // Cryo-Mass: deep tectonic sub-bass drone
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

export default function PhenomenologicalConversion() {
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
      {/* Left-aligned caption heading with Meno Banner */}
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

      {/* Main heading and intro narrative */}
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-end">
        <div className="lg:col-span-7">
          <h2
            className="font-meno font-light leading-[0.92] text-ivory text-[clamp(2.2rem,4.6vw,4.8rem)] tracking-[-0.015em]"
            style={{ fontFamily: 'Meno Banner' }}
          >
            <span className="block whitespace-nowrap">WHAT IF</span>
            <span className="block whitespace-nowrap">EARTH DATA</span>
            <span className="block whitespace-nowrap">
              COULD BE <em className="italic text-cream font-light">HEARD?</em>
            </span>
          </h2>
        </div>

        <div className="flex flex-col justify-end lg:col-span-5 lg:pl-8 xl:pl-14 pb-1.5">
          <p className="max-w-md font-elegant text-[15.5px] leading-relaxed text-cream/85 md:text-[16.5px]">
            For decades, planetary observations have been trapped in visual charts: color
            ramps, isotherms, and 2D graphs. Prism Tone translates those measurements into sonic language.
          </p>
          <div className="mt-8 flex items-center gap-4 border-t border-ivory/10 pt-4">
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

      {/* 4 Sensor Cards Grid */}
      <div className="mt-24 md:mt-28 lg:mt-32 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {SENSORS.map((s, idx) => (
          <Fade key={s.index} delay={0.12 * idx}>
            <div
              onClick={() => handleAudition(idx)}
              className="group flex h-full flex-col border border-ivory/10 bg-coal/45 p-5 xl:p-6 backdrop-blur-sm transition-all duration-300 hover:border-ivory/30 hover:bg-coal/70 cursor-pointer"
            >
              {/* Card top bar */}
              <div>
                <div className="flex items-center justify-between border-b border-ivory/10 pb-3">
                  <span className="font-stencil text-[11.5px] uppercase tracking-[0.22em] text-beige md:text-[12px]">
                    {s.index}
                  </span>
                  <span className="truncate font-data text-[11px] uppercase tracking-[0.16em] text-parchment md:text-[11.5px]">
                    {s.sensorTag}
                  </span>
                </div>

                {/* Visualizer window */}
                <div className="relative my-5 h-28 w-full border border-ivory/10 bg-ink/70 p-2">
                  <SensorVisual type={s.viz} />
                </div>

                {/* Card Title & Stat */}
                <h3 className="font-display text-[15.5px] sm:text-[16px] lg:text-[15.5px] xl:text-[17px] font-normal uppercase tracking-normal text-ivory whitespace-nowrap overflow-hidden text-ellipsis">
                  {s.title}
                </h3>
                <p className="mt-1.5 font-data text-[11px] sm:text-[11.5px] xl:text-[12px] uppercase tracking-[0.06em] text-ember whitespace-nowrap overflow-hidden text-ellipsis">
                  {s.stat}
                </p>

                {/* Card Narrative */}
                <p className="mt-4 font-elegant text-[15.5px] leading-relaxed text-cream/80 md:text-[16.5px]">
                  {s.desc}
                </p>
              </div>
            </div>
          </Fade>
        ))}
      </div>

      {/* Telemetry Audition Status bar */}
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

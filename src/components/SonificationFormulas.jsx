import { useEffect, useRef, useState } from 'react'
import { Fade } from './ui'

const FORMULA_CARDS = [
  {
    id: 'sea_level',
    name: 'SEA LEVEL RISE',
    target: 'PITCH',
    formula: 'FORMULA: ΔSL ∝ f_0',
    sensor: 'GRACE / GRACE-FO',
    desc: 'Rising ocean levels and melting ice shift acoustic frequencies, mapping thermal expansion into rising pitch registers.',
    sliderLabel: 'MODULATE SEA LEVEL',
    min: 0,
    max: 200,
    step: 0.5,
    defaultVal: 101.2,
    unit: 'mm',
    minLabel: 'BASELINE (0.0 mm)',
    maxLabel: '2100 PROJ. (+1000 mm)',
    calcMetricLeft: (v) => `FREQ: ${(180 + v * 1.8).toFixed(1)} Hz`,
    calcMetricRight: (v) => `ΔSL: +${v.toFixed(1)} mm`,
    auditionLabel: 'AUDITION PITCH SHIFT',
    vizType: 'curve',
  },
  {
    id: 'storm',
    name: 'WIND',
    target: 'TEMPO',
    formula: 'FORMULA: v_atm ∝ BPM',
    sensor: 'NASA Power Data',
    desc: 'Tropospheric airspeed controls the musical tempo. Gentle breezes drift slowly; heavy squalls accelerate the rhythm.',
    sliderLabel: 'MODULATE AIRSPEED',
    min: 20,
    max: 200,
    step: 1,
    defaultVal: 142,
    unit: 'km/h',
    minLabel: 'CALM (20 KM/H)',
    maxLabel: 'CAT-5 GUST (180 KM/H)',
    calcMetricLeft: (v) => `TEMPO: ${Math.round(60 + (v - 20) * 0.72)} BPM`,
    calcMetricRight: (v) => `${Math.round(v)} km/h`,
    auditionLabel: 'AUDITION TEMPO ACCELERATION',
    vizType: 'zigzag',
  },
  {
    id: 'precipitation',
    name: 'PRECIPITATION',
    target: 'RHYTHM',
    formula: 'FORMULA: P_rate ∝ f_dens',
    sensor: 'NASA Power Data',
    desc: 'Rainfall rates dictate density. Drizzles produce sparse droplet pings; storms create dense percussive cascades.',
    sliderLabel: 'MODULATE PRECIPITATION',
    min: 5,
    max: 100,
    step: 1,
    defaultVal: 68,
    unit: 'mm/hr',
    minLabel: 'LIGHT DRIZZLE (5 MM/H)',
    maxLabel: 'MONSOON DOWNPOUR (100 MM/H)',
    calcMetricLeft: (v) => `DENSITY: ${(2 + v * 0.16).toFixed(1)} Drops/sec`,
    calcMetricRight: (v) => `${Math.round(v)} mm/hr`,
    auditionLabel: 'AUDITION RHYTHMIC CADENCE',
    vizType: 'bars',
  },
  {
    id: 'ice_sheets',
    name: 'ICE SHEETS',
    target: 'SUB-BASS',
    formula: 'FORMULA: -ΔM_ice ∝ 1 / f_res',
    sensor: 'ICESAT-2 ATLAS',
    desc: 'Mass ice loss translates into deep, seismic sub-bass frequencies. As glaciers retreat, the acoustic score becomes sparser and haunting.',
    sliderLabel: 'MODULATE MASS LOSS',
    min: 50,
    max: 800,
    step: 5,
    defaultVal: 420,
    unit: 'Gt/yr',
    minLabel: 'EQUILIBRIUM (0 Gt/yr)',
    maxLabel: 'COLLAPSE SURGE (-800 Gt/yr)',
    calcMetricLeft: (v) => `RESONANCE: ${(55 - v * 0.03).toFixed(1)} Hz`,
    calcMetricRight: (v) => `- ${Math.round(v)} Gt/yr`,
    auditionLabel: 'AUDITION SUB-BASS RESONANCE',
    vizType: 'subbass',
  },
  {
    id: 'temperature',
    name: 'TEMPERATURE',
    target: 'CRACKLE',
    formula: 'FORMULA: FRP ∝ GRAN_DENS',
    sensor: 'NASA Power Data',
    desc: 'Rising thermal anomalies turn landscapes into tinderboxes. Radiative heat translates into crackling, granular static that intensifies with flames.',
    sliderLabel: 'MODULATE ANOMALY',
    min: 0.0,
    max: 4.0,
    step: 0.05,
    defaultVal: 1.48,
    unit: '°C',
    minLabel: 'PRE-INDUSTRIAL (0.0°C)',
    maxLabel: 'RUNAWAY HEAT (+4.0°C)',
    calcMetricLeft: (v) => `GRANULES: ${Math.round(20 + v * 60)} / sec`,
    calcMetricRight: (v) => `+${v.toFixed(2)} °C`,
    auditionLabel: 'AUDITION GRANULAR STATIC',
    vizType: 'crackle',
  },
  {
    id: 'deforestation',
    name: 'DEFORESTATION',
    target: 'EROSION',
    formula: 'FORMULA: -A_forest ∝ f_cutoff',
    sensor: 'VIIRS NDVI',
    desc: 'Canopy loss acts as an eroding score. As forests are cleared, the polyrhythmic texture sheds layers until it becomes sparse and exposed.',
    sliderLabel: 'MODULATE FOREST LOSS',
    min: 0.5,
    max: 7.0,
    step: 0.1,
    defaultVal: 3.7,
    unit: 'Mha',
    minLabel: 'INTACT CANOPY (100%)',
    maxLabel: 'CRITICAL EDGE (70%)',
    calcMetricLeft: (v) => `FILTER CUTOFF: ${Math.round(650 - v * 65)} Hz`,
    calcMetricRight: (v) => `${v.toFixed(1)} Mha/yr`,
    auditionLabel: 'AUDITION TEXTURAL EROSION',
    vizType: 'erosion',
  },
]

/* --- SVG Visualization Renderers --- */
function CardWaveform({ type, val, min, max }) {
  const norm = Math.max(0, Math.min(1, (val - min) / (max - min)))

  if (type === 'curve') {
    // Rising thermal/sea level anomaly curve
    const endY = 70 - norm * 45
    return (
      <svg viewBox="0 0 280 75" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c19a5b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c19a5b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M 20 68 Q 140 ${68 - norm * 20}, 260 ${endY} L 260 70 L 20 70 Z`}
          fill="url(#curveFill)"
        />
        <path
          d={`M 20 68 Q 140 ${68 - norm * 20}, 260 ${endY}`}
          fill="none"
          stroke="#f2ede3"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="260" cy={endY} r="3.5" fill="#c19a5b" className="animate-pulse" />
      </svg>
    )
  }

  if (type === 'zigzag') {
    // Storm vector zigzag wave
    const cycles = 5 + Math.round(norm * 6)
    const points = []
    const width = 240
    const startX = 20
    const midY = 40
    const amp = 14 + norm * 16

    for (let i = 0; i <= cycles * 2; i++) {
      const x = startX + (i / (cycles * 2)) * width
      const y = midY + (i % 2 === 0 ? amp : -amp)
      points.push(`${x},${y}`)
    }

    return (
      <svg viewBox="0 0 280 75" preserveAspectRatio="none" className="h-full w-full">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#f2ede3"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (type === 'bars') {
    // Precipitation rhythm bars
    const count = 19
    return (
      <svg viewBox="0 0 280 75" preserveAspectRatio="none" className="h-full w-full">
        {Array.from({ length: count }).map((_, i) => {
          const x = 20 + (i / (count - 1)) * 240
          const distFromCenter = 1 - Math.abs(i - (count - 1) / 2) / ((count - 1) / 2)
          const baseH = 8 + distFromCenter * 28
          const height = Math.min(60, baseH * (0.4 + norm * 0.9))
          const opacity = 0.35 + (distFromCenter * 0.45 + norm * 0.2)
          return (
            <rect
              key={i}
              x={x - 1.5}
              y={38 - height / 2}
              width="3"
              height={height}
              rx="1.5"
              fill={i % 3 === 0 ? '#c19a5b' : '#f2ede3'}
              opacity={opacity}
            />
          )
        })}
      </svg>
    )
  }

  if (type === 'subbass') {
    // Tectonic sub-bass sine wave and fracture line
    const freq = 1.5 + norm * 2
    const points = []
    for (let x = 20; x <= 260; x += 4) {
      const y = 38 + Math.sin(((x - 20) / 240) * Math.PI * 2 * freq) * (12 + norm * 16)
      points.push(`${x},${y.toFixed(1)}`)
    }
    return (
      <svg viewBox="0 0 280 75" preserveAspectRatio="none" className="h-full w-full">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#9aa7ad"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <line x1="20" y1="58" x2="260" y2="58" stroke="rgba(242,237,227,0.15)" strokeDasharray="3 3" />
      </svg>
    )
  }

  if (type === 'crackle') {
    // Thermal granular crackle sparks & spikes
    const sparkCount = 14 + Math.round(norm * 18)
    return (
      <svg viewBox="0 0 280 75" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="fireGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#c19a5b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#c19a5b" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <path
          d={`M 20 68 Q 80 ${55 - norm * 20}, 140 ${45 - norm * 30} T 260 ${30 - norm * 20} L 260 70 L 20 70 Z`}
          fill="url(#fireGrad)"
        />
        {Array.from({ length: sparkCount }).map((_, i) => {
          const cx = 25 + (i * 233) % 230
          const cy = 20 + (i * 137) % 45
          const r = 0.8 + ((i * 7) % 3) * 0.7
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill={i % 2 === 0 ? '#c19a5b' : '#f2ede3'}
              opacity={0.4 + norm * 0.6}
            />
          )
        })}
      </svg>
    )
  }

  if (type === 'erosion') {
    // Forest canopy dots with fishbone road erosion
    const cols = 20
    const rows = 4
    return (
      <svg viewBox="0 0 280 75" preserveAspectRatio="none" className="h-full w-full">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const cx = 20 + (c / (cols - 1)) * 240
            const cy = 16 + (r / (rows - 1)) * 44
            const isRoad = Math.abs(cy - (20 + (cx / 280) * 35)) < 12
            const isCleared = isRoad && norm > 0.25
            return (
              <circle
                key={`${r}-${c}`}
                cx={cx}
                cy={cy}
                r="1.6"
                fill={isCleared ? '#c19a5b' : '#f2ede3'}
                opacity={isCleared ? 0.15 : 0.65 - norm * 0.3}
              />
            )
          })
        )}
        <line
          x1="20"
          y1="22"
          x2="260"
          y2="55"
          stroke="#f2ede3"
          strokeWidth="1.2"
          strokeDasharray="4 2"
          opacity={0.4 + norm * 0.5}
        />
      </svg>
    )
  }

  return null
}

/* --- Formula Modulation Matrix Component --- */
export default function SonificationFormulas() {
  const [values, setValues] = useState(() => {
    const init = {}
    FORMULA_CARDS.forEach((c) => {
      init[c.id] = c.defaultVal
    })
    return init
  })

  const [activeAudition, setActiveAudition] = useState(null)
  const audioCtxRef = useRef(null)
  const soundStopRef = useRef(null)

  const getAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) audioCtxRef.current = new AudioCtx()
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  const stopCurrentAudition = () => {
    if (soundStopRef.current) {
      try {
        soundStopRef.current()
      } catch { }
      soundStopRef.current = null
    }
    setActiveAudition(null)
  }

  const playCardAudition = (cardId, val) => {
    stopCurrentAudition()
    const ctx = getAudioContext()
    if (!ctx) return

    setActiveAudition(cardId)
    const now = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.001, now)
    master.gain.exponentialRampToValueAtTime(0.28, now + 0.12)
    master.connect(ctx.destination)

    const cleanups = []

    if (cardId === 'sea_level') {
      // Ascending pitch glissando
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      const freq = 180 + val * 1.8
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.linearRampToValueAtTime(freq * 1.25, now + 1.8)

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(freq * 2.2, now)

      osc.connect(filter)
      filter.connect(master)
      osc.start(now)

      cleanups.push(() => {
        try {
          osc.stop()
        } catch { }
      })
    } else if (cardId === 'storm') {
      // Accelerating pulse clock
      const bpm = 60 + (val - 20) * 0.72
      const intervalMs = Math.max(80, (60 / bpm) * 1000)
      const timer = setInterval(() => {
        if (!ctx || ctx.state === 'closed') return
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(320, t)
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.1)
        g.gain.setValueAtTime(0.3, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
        osc.connect(g)
        g.connect(master)
        osc.start(t)
        osc.stop(t + 0.14)
      }, intervalMs)

      cleanups.push(() => clearInterval(timer))
    } else if (cardId === 'precipitation') {
      // Droplet pings density
      const drops = [520, 680, 580, 740, 620, 820, 710]
      const timer = setInterval(() => {
        if (!ctx || ctx.state === 'closed') return
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        const f = drops[Math.floor(Math.random() * drops.length)]
        osc.frequency.setValueAtTime(f, t)
        g.gain.setValueAtTime(0.18, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
        osc.connect(g)
        g.connect(master)
        osc.start(t)
        osc.stop(t + 0.16)
      }, Math.max(50, 400 - val * 3))

      cleanups.push(() => clearInterval(timer))
    } else if (cardId === 'ice_sheets') {
      // Sub-bass tectonic drone
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      const f = Math.max(30, 55 - val * 0.03)
      osc.frequency.setValueAtTime(f, now)

      const sub = ctx.createOscillator()
      sub.type = 'triangle'
      sub.frequency.setValueAtTime(f * 2, now)

      const subG = ctx.createGain()
      subG.gain.value = 0.12

      osc.connect(master)
      sub.connect(subG)
      subG.connect(master)

      osc.start(now)
      sub.start(now)

      cleanups.push(() => {
        try {
          osc.stop()
          sub.stop()
        } catch { }
      })
    } else if (cardId === 'temperature') {
      // Granular crackle static
      const timer = setInterval(() => {
        if (!ctx || ctx.state === 'closed') return
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(1200 + Math.random() * 2400, t)
        g.gain.setValueAtTime(0.12, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
        osc.connect(g)
        g.connect(master)
        osc.start(t)
        osc.stop(t + 0.05)
      }, Math.max(30, 160 - val * 32))

      cleanups.push(() => clearInterval(timer))
    } else if (cardId === 'deforestation') {
      // Filter erosion on sawtooth drone
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(96, now)

      filter.type = 'lowpass'
      const cutoff = Math.max(120, 650 - val * 65)
      filter.frequency.setValueAtTime(cutoff, now)
      filter.Q.value = 3.0

      osc.connect(filter)
      filter.connect(master)
      osc.start(now)

      cleanups.push(() => {
        try {
          osc.stop()
        } catch { }
      })
    }

    // Auto fadeout after 2.8s if not stopped manually
    const autoStop = setTimeout(() => {
      stopCurrentAudition()
    }, 2800)

    soundStopRef.current = () => {
      clearTimeout(autoStop)
      const stopNow = ctx.currentTime
      master.gain.linearRampToValueAtTime(0.001, stopNow + 0.15)
      setTimeout(() => {
        cleanups.forEach((c) => c())
      }, 160)
    }
  }

  useEffect(() => {
    return () => {
      stopCurrentAudition()
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close()
        } catch { }
      }
    }
  }, [])

  const handleSliderChange = (cardId, newVal) => {
    setValues((prev) => ({ ...prev, [cardId]: newVal }))
    if (activeAudition === cardId) {
      playCardAudition(cardId, newVal)
    }
  }

  const toggleAudition = (cardId) => {
    if (activeAudition === cardId) {
      stopCurrentAudition()
    } else {
      playCardAudition(cardId, values[cardId])
    }
  }

  return (
    <section
      id="formulas"
      className="relative z-30 px-6 sm:px-8 md:px-10 lg:px-12 pt-10 pb-28 md:pt-14 md:pb-36 lg:pt-16 lg:pb-40"
      aria-label="Atmospheric Mappings and Sonification Formulas"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Section Header */}
        <Fade>
          <div className="grid gap-8 lg:grid-cols-12 items-end mb-10 md:mb-14">
            <div className="lg:col-span-7">
              <h2
                className="font-meno font-light leading-[0.95] text-ivory text-[clamp(2.2rem,4.2vw,4.4rem)] tracking-[-0.015em]"
                style={{ fontFamily: 'Meno Banner' }}
              >
                <span className="block whitespace-nowrap">ATMOSPHERIC</span>
                <span className="block whitespace-nowrap">MAPPINGS</span>
              </h2>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-end">
              <p className="max-w-md font-elegant text-[15px] md:text-[16px] leading-relaxed text-cream/85">
                Every planetary parameter is governed by an explicit mathematical transfer function.
                Adjust the controls below to audition how raw satellite telemetry maps directly into the
                acoustic spectrum.
              </p>
            </div>
          </div>
        </Fade>

        {/* 6 Formula Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {FORMULA_CARDS.map((card, idx) => {
            const val = values[card.id]
            const isPlaying = activeAudition === card.id

            return (
              <Fade key={card.id} delay={0.08 * idx}>
                <div className="group relative flex h-full flex-col justify-between border border-ivory/15 bg-black/55 backdrop-blur-md p-5 sm:p-6 transition-all duration-300 hover:border-ivory/30 hover:bg-black/70">
                  {/* 1. Top Bar: Formula & Sensor Source */}
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-ivory/10 pb-3">
                      <span className="font-data text-[9.5px] sm:text-[10px] uppercase tracking-[0.18em] text-[#8ea792] whitespace-nowrap">
                        {card.formula}
                      </span>
                      <span className="font-data text-[9px] sm:text-[9.5px] uppercase tracking-[0.14em] text-ivory/60 whitespace-nowrap">
                        {card.sensor}
                      </span>
                    </div>

                    {/* 2. Main Title Row: NAME * -> TARGET * */}
                    <div className="mt-3.5 flex items-baseline justify-between gap-1.5 flex-nowrap">
                      <h3
                        className="font-meno text-[15.5px] sm:text-[16.5px] md:text-[17.5px] tracking-wide text-ivory flex items-center gap-1 uppercase whitespace-nowrap"
                        style={{ fontFamily: 'Meno Banner' }}
                      >
                        <span>{card.name}</span>
                        <span className="text-[11px] text-ember">⚹</span>
                      </h3>
                      <span
                        className="font-meno text-[14.5px] sm:text-[15.5px] md:text-[16.5px] tracking-wide text-ember flex items-center gap-1 uppercase whitespace-nowrap"
                        style={{ fontFamily: 'Meno Banner' }}
                      >
                        <span>→ {card.target}</span>
                        <span className="text-[11px] text-ember">⚹</span>
                      </span>
                    </div>

                    {/* 3. Description Narrative */}
                    <p className="mt-3 font-elegant text-[13px] sm:text-[13.5px] leading-relaxed text-[#ede7dc]/80 min-h-[3.6rem]">
                      {card.desc}
                    </p>

                    {/* 4. Dark Waveform Display Window */}
                    <div className="relative mt-3.5 mb-3.5 border border-ivory/12 bg-black/85 p-3 flex flex-col justify-between h-32 w-full overflow-hidden">
                      {/* Top inside metrics */}
                      <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-data uppercase tracking-[0.14em]">
                        <span className="text-ivory/85">{card.calcMetricLeft(val)}</span>
                        <span className="text-ember font-medium">{card.calcMetricRight(val)}</span>
                      </div>

                      {/* Waveform graphic */}
                      <div className="relative my-auto h-16 w-full">
                        <CardWaveform
                          type={card.vizType}
                          val={val}
                          min={card.min}
                          max={card.max}
                        />
                      </div>

                      {/* Bottom inside labels */}
                      <div className="flex items-center justify-between text-[8px] sm:text-[8.5px] font-data uppercase tracking-[0.14em] text-ivory/40">
                        <span>{card.minLabel}</span>
                        <span>{card.maxLabel}</span>
                      </div>
                    </div>

                    {/* 5. Modulate Slider Row */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-data uppercase tracking-[0.16em] mb-1.5">
                        <span className="text-ivory/70">{card.sliderLabel}</span>
                        <span className="text-ember font-medium">
                          {val < 0 ? `- ${Math.abs(val)}` : `+${val}`} {card.unit}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={card.min}
                        max={card.max}
                        step={card.step}
                        value={val}
                        onChange={(e) => handleSliderChange(card.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/15 rounded-none appearance-none cursor-pointer accent-[#c19a5b] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 6. Audition Audio Button */}
                  <button
                    type="button"
                    onClick={() => toggleAudition(card.id)}
                    className={`mt-4 w-full flex items-center justify-center gap-2 border py-2.5 px-4 font-stencil text-[9.5px] sm:text-[10px] uppercase tracking-[0.22em] transition-all duration-300 active:scale-[0.99] ${isPlaying
                      ? 'border-ember bg-ember/20 text-ivory shadow-[0_0_20px_rgba(193,154,91,0.25)]'
                      : 'border-ivory/15 bg-white/[0.04] text-ivory/90 hover:border-ember/60 hover:bg-ember/10 hover:text-ivory'
                      }`}
                  >
                    <svg
                      className={`h-3.5 w-3.5 ${isPlaying ? 'text-ember animate-pulse' : 'text-ivory/70'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                    <span>{isPlaying ? 'ACTIVE AUDITION' : card.auditionLabel}</span>
                  </button>
                </div>
              </Fade>
            )
          })}
        </div>
      </div>
    </section>
  )
}

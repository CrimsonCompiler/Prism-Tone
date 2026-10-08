import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { StoryWave } from './Canvases'
import { EASE, Fade } from './ui'

const STORIES = [
  {
    id: 'temperature',
    n: '01',
    name: 'TEMPERATURE',
    img: '/images/story-temperature.jpg',
    alt: 'Satellite view of a cyclone swirling over a dark ocean',
    fig: 'Fig. 01 — cyclone, southern ocean',
    stats: [
      { label: 'SEA SURFACE ANOMALY', value: '+1.48', unit: '°C' },
      { label: 'HEAT ACCUMULATION', value: '385', unit: 'ZJ' },
    ],
    copy: 'A century of thermometers, compressed into a single rising line. The world ocean absorbs over 90 percent of excess solar heat. As the Gulf Stream destabilizes, thermal radiometry data shifts into upper vibrational harmonics- an ascending cello glissando alerting us to an overheating thermal engine.',
    viz: 'rise',
    reverse: false,
  },
  {
    id: 'wind',
    n: '02',
    name: 'WIND',
    img: '/images/story-wind.jpg',
    alt: 'Wind streaks and cloud streets stretched across a dark ocean',
    fig: 'Fig. 02 — cloud streets, open ocean',
    stats: [
      { label: 'PEAK TROPOSPHERIC GUST', value: '142', unit: 'km/h' },
      { label: 'ROSSBY WAVE AMPLITUDE', value: '8.4', unit: '°LAT' },
    ],
    copy: 'Meandering polar winds no longer follow predictable seasonal channels. Wind is motion you can trust. Surface gusts and jet streams set the tempo of the piece - calm days breathe slowly, storm systems race. Listen long enough and you can tell the season by the pulse.',
    viz: 'gust',
    reverse: true,
  },
  {
    id: 'rainfall',
    n: '03',
    name: 'RAINFALL',
    img: '/images/story-rainfall.jpg',
    alt: 'Rain shafts falling over a dark ocean at night',
    fig: 'Fig. 03 — rain shafts, tropical pacific',
    stats: [
      { label: 'PEAK WATER VAPOR FLUX', value: '68', unit: 'mm/h' },
      { label: 'INTEGRATED VAPOR TRANSPORT', value: '940', unit: 'kg/m/s' },
    ],
    copy: 'Rain is percussion written by physics. Every storm front becomes a rhythm - sparse drops at the edge, a full roll at the core. The heaviest bands don’t just get louder. They get busier. Narrow corridors of dense atmospheric moisture carry the equivalent of 25 Mississippi Rivers.',
    viz: 'drops',
    reverse: false,
  },
  {
    id: 'ice',
    n: '04',
    name: 'ICE',
    img: '/images/story-ice.jpg',
    alt: 'Sea ice floes and fractures seen from above',
    fig: 'Fig. 04 — sea ice, beaufort sea',
    stats: [
      { label: 'ANNUAL CONTINENTAL MASS LOSS', value: '-420', unit: 'Gt/yr' },
      { label: 'ICE ACCELERATION', value: '+34', unit: '%' },
    ],
    copy: 'Thwaites and Pine Island glaciers lose billions of tons of crystalline ice every lunar cycle. Laser altimeters document microscopic elevation drops, converted here into tectonic 42Hz sub-bass. As the ice retreats - the music becomes sparser, more haunting. The missing notes are the missing floes.',
    viz: 'crackle',
    reverse: true,
  },
  {
    id: 'wildfire',
    n: '05',
    name: 'WILDFIRE',
    img: '/images/story-wildfire.jpg',
    alt: 'A wildfire front glowing through darkness and smoke, seen from the air',
    fig: 'Fig. 05 — fire front, western range',
    stats: [
      { label: 'GLOBAL BURNED AREA', value: '≈ 4.0', unit: 'M km²' },
      { label: 'RADIATIVE INTENSITY', value: '1,420', unit: 'PJ' },
    ],
    copy: 'Wildfire is rendered as low, warm crackles and pops. Wildfires generate their own local weather and pyrocumulus storms. Thermal sensors detect thermal radiative power in megawatts, sonified into a crackling, dry granular static that swells with violent updrafts. When the flame line moves, the sound sharpens.',
    viz: 'flicker',
    reverse: false,
  },
]

/* --- Web Audio Sonification Engine --- */
class StorySoundEngine {
  constructor() {
    this.ctx = null
    this.currentId = null
    this.stopFn = null
  }

  getContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) this.ctx = new AudioCtx()
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  stop() {
    if (this.stopFn) {
      try {
        this.stopFn()
      } catch { }
      this.stopFn = null
    }
    this.currentId = null
  }

  play(id) {
    this.stop()
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0, now)
    masterGain.gain.linearRampToValueAtTime(0.18, now + 0.15)
    masterGain.connect(ctx.destination)

    const cleanup = []

    if (id === 'temperature') {
      // Ascending thermal cello glissando with resonant harmonics
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()

      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(110, now)

      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(165, now)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(450, now)
      filter.Q.value = 3.5

      // Ascending thermal wave LFO
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.22
      lfoGain.gain.value = 55
      lfo.connect(osc1.frequency)
      lfo.connect(osc2.frequency)
      lfo.start()

      osc1.connect(filter)
      osc2.connect(filter)
      filter.connect(masterGain)

      osc1.start()
      osc2.start()

      cleanup.push(() => {
        try {
          osc1.stop()
          osc2.stop()
          lfo.stop()
        } catch { }
      })
    } else if (id === 'wind') {
      // Filtered polar wind gusts with rhythmic breathing LFO
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(75, now)

      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(320, now)
      filter.Q.value = 5.0

      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.32
      lfoGain.gain.value = 320
      lfo.connect(filter.frequency)
      lfo.start()

      osc.connect(filter)
      filter.connect(masterGain)
      osc.start()

      cleanup.push(() => {
        try {
          osc.stop()
          lfo.stop()
        } catch { }
      })
    } else if (id === 'rainfall') {
      // Precipitation: rhythmic marimba / acoustic water droplet pulse sequence
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5, 880, 587.33]
      let step = 0
      const timer = setInterval(() => {
        if (!this.ctx || this.ctx.state === 'closed') return
        const t = this.ctx.currentTime
        const osc = this.ctx.createOscillator()
        const noteGain = this.ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freqs[step % freqs.length], t)
        noteGain.gain.setValueAtTime(0.14, t)
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26)

        osc.connect(noteGain)
        noteGain.connect(masterGain)

        osc.start(t)
        osc.stop(t + 0.28)
        step++
      }, 230)

      cleanup.push(() => clearInterval(timer))
    } else if (id === 'ice') {
      // Cryo: deep tectonic sub-drone with crystalline chime harmonics
      const sub = ctx.createOscillator()
      sub.type = 'sine'
      sub.frequency.setValueAtTime(55, now)

      const chime = ctx.createOscillator()
      chime.type = 'sine'
      chime.frequency.setValueAtTime(1760, now)

      const chimeGain = ctx.createGain()
      chimeGain.gain.value = 0.05

      sub.connect(masterGain)
      chime.connect(chimeGain)
      chimeGain.connect(masterGain)

      sub.start()
      chime.start()

      cleanup.push(() => {
        try {
          sub.stop()
          chime.stop()
        } catch { }
      })
    } else if (id === 'wildfire') {
      // Wildfire: crackle harmonics & ember radiation flicker
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(130, now)

      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(620, now)
      filter.Q.value = 5.5

      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 5.8
      lfoGain.gain.value = 220
      lfo.connect(filter.frequency)
      lfo.start()

      osc.connect(filter)
      filter.connect(masterGain)
      osc.start()

      cleanup.push(() => {
        try {
          osc.stop()
          lfo.stop()
        } catch { }
      })
    }

    this.currentId = id
    this.stopFn = () => {
      const stopNow = ctx.currentTime
      masterGain.gain.linearRampToValueAtTime(0.0001, stopNow + 0.12)
      setTimeout(() => {
        cleanup.forEach((fn) => fn())
        try {
          masterGain.disconnect()
        } catch { }
      }, 140)
    }
  }
}

const soundEngine = typeof window !== 'undefined' ? new StorySoundEngine() : null

function Story({ s, activeSoundId, onToggleSound }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [30, -30])
  const isPlaying = activeSoundId === s.id

  return (
    <article ref={ref} className="relative py-16 md:py-24">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
        <motion.div
          style={{ y }}
          className={`relative lg:col-span-7 ${s.reverse ? 'lg:order-2' : ''}`}
        >
          <Fade>
            <div className="relative overflow-hidden border border-[#f9eed8]/15">
              <motion.img
                src={s.img}
                alt={s.alt}
                width="1536"
                height="1024"
                loading="lazy"
                decoding="async"
                initial={{ scale: 1.14 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.8, ease: EASE }}
                className="h-[54vw] max-h-[560px] w-full object-cover grayscale brightness-[0.94] contrast-[1.06] sepia-[0.14] md:h-[420px] lg:h-[480px]"
              />
              <div className="vignette pointer-events-none absolute inset-0" />
              <p className="font-stencil uppercase text-[8.5px] md:text-[9.5px] tracking-[0.28em] text-[#f9eed8] absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 border border-[#f9eed8]/20 shadow-sm">
                <span className="mr-2 text-[#f9eed8]/60">+</span>
                {s.fig}
              </p>
            </div>
          </Fade>
        </motion.div>

        <div className={`lg:col-span-5 flex flex-col justify-between gap-8 lg:gap-0 h-full lg:min-h-[480px] pt-1 pb-1 ${s.reverse ? 'lg:order-1 lg:pr-8' : 'lg:pl-8'}`}>
          {/* Top group: Section number/name and copy */}
          <Fade>
            <p className="font-stencil uppercase text-[11px] md:text-[12px] tracking-[0.38em] text-[#f9eed8] font-medium">
              {`${s.n} — ${s.name}`}
            </p>
            <p className="mt-3.5 md:mt-4 max-w-xl font-elegant text-[16px] md:text-[17px] leading-[1.72] text-[#f9eed8]/90">
              {s.copy}
            </p>
          </Fade>

          {/* Middle group: Stats */}
          <Fade delay={0.15}>
            <div className="border-t border-[#f9eed8]/15 pt-5 grid grid-cols-2 gap-6 sm:gap-8">
              {s.stats ? (
                s.stats.map((st, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="font-stencil text-[9.5px] md:text-[10.5px] uppercase tracking-[0.22em] text-[#f9eed8]/75 mb-1.5">
                      {st.label}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span
                        className="font-meno font-light tracking-[-0.015em] text-[#f9eed8] text-[clamp(2.1rem,3.8vw,3.2rem)] leading-none"
                        style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
                      >
                        {st.value}
                      </span>
                      <span
                        className="font-meno font-light text-base md:text-lg text-[#f9eed8]/85 pl-0.5"
                        style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
                      >
                        {st.unit}
                      </span>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </Fade>

          {/* Bottom group: Waveform + Activate Sound button aligned to the bottom */}
          <Fade delay={0.25} className="mt-auto lg:mt-0">
            <StoryWave type={s.viz} className="h-16 w-full" />
            <div className="mt-6 md:mt-7 flex items-center justify-between gap-4">
              <p className="font-data text-[8.5px] md:text-[9px] uppercase tracking-[0.24em] text-[#f9eed8]/70">
                voice — {s.name.toLowerCase()} · loop
              </p>

              {/* Activate Sound Button in the corner */}
              <button
                type="button"
                onClick={() => onToggleSound(s.id)}
                className={`group flex items-center gap-2.5 px-3 py-1.5 border transition-all duration-300 cursor-pointer ${isPlaying
                  ? 'border-[#f9eed8] bg-[#f9eed8]/15 text-[#f9eed8] shadow-[0_0_12px_rgba(249,238,216,0.22)]'
                  : 'border-[#f9eed8]/25 hover:border-[#f9eed8]/70 bg-ink/70 hover:bg-[#f9eed8]/10 text-[#f9eed8]/85 hover:text-[#f9eed8]'
                  }`}
                aria-label={isPlaying ? `Stop ${s.name} sound` : `Activate ${s.name} sound`}
              >
                {/* 3 Equalizer bars */}
                <span className="flex items-end gap-[2px] h-3 w-2.5 shrink-0" aria-hidden="true">
                  <span
                    className={`w-[1.5px] bg-current rounded-[0.5px] transition-all ${isPlaying ? 'h-3 animate-[pulse_0.6s_ease-in-out_infinite]' : 'h-1.5'
                      }`}
                  />
                  <span
                    className={`w-[1.5px] bg-current rounded-[0.5px] transition-all ${isPlaying ? 'h-2.5 animate-[pulse_0.4s_ease-in-out_infinite_0.15s]' : 'h-3'
                      }`}
                  />
                  <span
                    className={`w-[1.5px] bg-current rounded-[0.5px] transition-all ${isPlaying ? 'h-2 animate-[pulse_0.8s_ease-in-out_infinite_0.3s]' : 'h-2'
                      }`}
                  />
                </span>

                <span className="font-stencil text-[9.5px] md:text-[10px] uppercase tracking-[0.18em] whitespace-nowrap">
                  {isPlaying ? 'ACTIVE SOUND' : 'ACTIVATE SOUND'}
                </span>
              </button>
            </div>
          </Fade>
        </div>
      </div>
    </article>
  )
}

export default function EarthStories() {
  const [activeSoundId, setActiveSoundId] = useState(null)

  useEffect(() => {
    return () => {
      soundEngine?.stop()
    }
  }, [])

  const handleToggleSound = (id) => {
    if (activeSoundId === id) {
      soundEngine?.stop()
      setActiveSoundId(null)
    } else {
      soundEngine?.play(id)
      setActiveSoundId(id)
    }
  }

  return (
    <section id="stories" className="relative border-t border-[#f9eed8]/10 px-6 py-32 md:px-12 md:py-44 lg:px-20">
      {/* Main heading and intro narrative from reference image */}
      <Fade delay={0.1}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-end mt-8 md:mt-10">
          <div className="lg:col-span-7">
            <h1
              className="font-meno font-light leading-[0.92] text-[#f9eed8] text-[clamp(2.8rem,5.8vw,5.8rem)] tracking-[-0.015em]"
              style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
            >
              <span className="block whitespace-nowrap">EARTH</span>
              <span className="block whitespace-nowrap">TRANSLATED</span>
            </h1>
          </div>

          <div className="flex flex-col justify-end lg:col-span-5 lg:pl-8 xl:pl-14 pb-1.5">
            <p className="max-w-lg font-elegant text-[16px] md:text-[17px] leading-[1.72] text-[#f9eed8]/90">
              Different patterns of Earth's signal. Each one gets its own instrument, its own behavior, its own part in the score. They may have some critical planetary phenomena. Read the scientific telemetry, then listen to the pulse of the Earth system in flux.
            </p>
          </div>
        </div>
      </Fade>

      <div className="mt-16 md:mt-24">
        {STORIES.map((s) => (
          <Story
            key={s.id}
            s={s}
            activeSoundId={activeSoundId}
            onToggleSound={handleToggleSound}
          />
        ))}
      </div>
    </section>
  )
}

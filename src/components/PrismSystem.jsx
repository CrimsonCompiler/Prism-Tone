import { useEffect, useRef, useState } from 'react'
import { PrismCanvas } from './Canvases'
import { Annot, Fade } from './ui'

const LAYERS = [
  ['01', 'THERMAL', 'temperature - pitch'],
  ['02', 'KINETIC', 'wind - tempo'],
  ['03', 'HYDRO', 'rainfall - rhythm'],
  ['04', 'CRYO', 'ice - texture'],
  ['05', 'PYRO', 'wildfire - detail'],
  ['06', 'DEFORESTATION', 'land cover - density'],
]

/* --- Web Audio Sonification Engine for Prism Tone --- */
class PrismToneEngine {
  constructor() {
    this.ctx = null
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
  }

  play() {
    this.stop()
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0, now)
    masterGain.gain.linearRampToValueAtTime(0.18, now + 0.3)
    masterGain.connect(ctx.destination)

    // 5 Spectral Voices sonification chord:
    const oscThermal = ctx.createOscillator()
    const gainThermal = ctx.createGain()
    oscThermal.type = 'sine'
    oscThermal.frequency.setValueAtTime(394, now)
    gainThermal.gain.value = 0.22
    oscThermal.connect(gainThermal)
    gainThermal.connect(masterGain)
    oscThermal.start(now)

    const oscKinetic = ctx.createOscillator()
    const gainKinetic = ctx.createGain()
    oscKinetic.type = 'triangle'
    oscKinetic.frequency.setValueAtTime(443, now)
    gainKinetic.gain.value = 0.18
    oscKinetic.connect(gainKinetic)
    gainKinetic.connect(masterGain)
    oscKinetic.start(now)

    const oscHydro = ctx.createOscillator()
    const gainHydro = ctx.createGain()
    oscHydro.type = 'sine'
    oscHydro.frequency.setValueAtTime(367, now)
    gainHydro.gain.value = 0.24
    oscHydro.connect(gainHydro)
    gainHydro.connect(masterGain)
    oscHydro.start(now)

    const oscCryo = ctx.createOscillator()
    const gainCryo = ctx.createGain()
    oscCryo.type = 'sine'
    oscCryo.frequency.setValueAtTime(329, now)
    gainCryo.gain.value = 0.2
    oscCryo.connect(gainCryo)
    gainCryo.connect(masterGain)
    oscCryo.start(now)

    const oscPyro = ctx.createOscillator()
    const gainPyro = ctx.createGain()
    oscPyro.type = 'triangle'
    oscPyro.frequency.setValueAtTime(168, now)
    gainPyro.gain.value = 0.28
    oscPyro.connect(gainPyro)
    gainPyro.connect(masterGain)
    oscPyro.start(now)

    const oscDeforestation = ctx.createOscillator()
    const gainDeforestation = ctx.createGain()
    oscDeforestation.type = 'sine'
    oscDeforestation.frequency.setValueAtTime(147, now)
    gainDeforestation.gain.value = 0.14
    oscDeforestation.connect(gainDeforestation)
    gainDeforestation.connect(masterGain)
    oscDeforestation.start(now)

    this.stopFn = () => {
      const stopTime = ctx.currentTime
      masterGain.gain.linearRampToValueAtTime(0.001, stopTime + 0.25)
      setTimeout(() => {
        try {
          oscThermal.stop()
          oscKinetic.stop()
          oscHydro.stop()
          oscCryo.stop()
          oscPyro.stop()
          oscDeforestation.stop()
        } catch { }
      }, 300)
    }
  }
}

const prismEngine = typeof window !== 'undefined' ? new PrismToneEngine() : null

export default function PrismSystem() {
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    return () => {
      prismEngine?.stop()
    }
  }, [])

  const handleToggleSound = () => {
    if (isPlaying) {
      prismEngine?.stop()
      setIsPlaying(false)
    } else {
      prismEngine?.play()
      setIsPlaying(true)
    }
  }

  return (
    <section id="system" className="relative z-30 px-6 pt-10 pb-20 md:px-12 md:pt-16 md:pb-28 lg:px-20 lg:pt-20 lg:pb-32">
      <div className="grid items-end gap-12 md:gap-14 lg:grid-cols-12">
        {/* Left column: text body + layers + voice tag & sound button directly below */}
        <div className="lg:col-span-4">
          <Fade delay={0.15}>
            <p className="max-w-md font-elegant text-[16.5px] md:text-[18px] leading-relaxed text-[#ede7dc]/95 font-light">
              Six datasets arrive as spectral layers — thermal, kinetic, hydro, cryo, pyro, and the slow subtraction of the forests — and converge into a single voice. Each layer is a sound. Each sound is a dataset. Together, they are the sound of a planet.
            </p>
          </Fade>

          <Fade delay={0.3}>
            <ul className="mt-10 md:mt-12 space-y-0">
              {LAYERS.map(([n, name, role]) => (
                <li
                  key={n}
                  className="flex items-baseline justify-between gap-4 border-t border-white/10 py-3.5"
                >
                  <span className="font-data text-[12px] sm:text-[13px] uppercase tracking-[0.26em] text-[#f2ede3]">
                    {n} <span className="mx-2 text-[#8ea792]">·</span> {name}
                  </span>
                  <span className="font-ui text-[11px] sm:text-[12px] uppercase tracking-[0.18em] text-[#cad7ce]">
                    {role}
                  </span>
                </li>
              ))}
            </ul>
          </Fade>

          {/* Placed directly under the text body: Voice tag & Active Sound Button */}
          <Fade delay={0.4}>
            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="font-data text-[10px] md:text-[11px] uppercase tracking-[0.24em] text-[#f2ede3]/70">
                voice — spectral split · loop
              </p>

              {/* Active Sound Button matching Earth Stories */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`group flex items-center gap-2.5 px-3.5 py-2 border transition-all duration-300 cursor-pointer ${isPlaying
                  ? 'border-[#f2ede3] bg-[#f2ede3]/15 text-[#f2ede3] shadow-[0_0_12px_rgba(242,237,227,0.22)]'
                  : 'border-white/25 hover:border-white/70 bg-[#162022]/70 hover:bg-white/10 text-[#f2ede3]/85 hover:text-[#f2ede3]'
                  }`}
                aria-label={isPlaying ? 'Stop prism sound' : 'Activate prism sound'}
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

                <span className="font-stencil text-[10.5px] md:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap">
                  {isPlaying ? 'ACTIVE SOUND' : 'ACTIVATE SOUND'}
                </span>
              </button>
            </div>
          </Fade>
        </div>

        {/* Right column: graph only */}
        <div className="lg:col-span-8">
          <Fade delay={0.2}>
            <div className="relative border border-white/10">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9]">
                <PrismCanvas className="absolute inset-0 h-full w-full" />
              </div>
              <Annot className="absolute right-3 top-3">Figure: spectral split</Annot>
              <Annot className="absolute bottom-3 right-3">live synth — 48 kHz</Annot>
            </div>
          </Fade>
        </div>
      </div>
    </section>
  )
}

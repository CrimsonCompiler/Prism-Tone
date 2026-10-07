import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { OrbitCanvas, Waveform } from './Canvases'
import { Fade, Reveal } from './ui'

function useDrift(base, amp, period = 8) {
  const [v, setV] = useState(base)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      const t = Date.now() / 1000
      const n =
        Math.sin((t * Math.PI * 2) / period) * 0.6 +
        Math.sin((t * Math.PI * 2) / (period * 2.63) + 1.3) * 0.4
      setV(base + amp * n)
    }, 240)
    return () => clearInterval(id)
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
    const id = setInterval(() => setMs((m) => m + 100), 100)
    return () => clearInterval(id)
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

export default function ExperiencePreview() {
  return (
    <section id="experience" className="stack-card z-30 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40">
      {/* Caption heading matching image */}
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

      {/* Main heading and intro narrative from reference image */}
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
          <p className="max-w-md font-elegant text-[15.5px] leading-relaxed text-cream/85 md:text-[16.5px]">
            Not a corporate dashboard. A living scientific listening post. Explore real-time planetary telemetry translated into pure acoustic vibration.
          </p>
        </div>
      </div>

      <Fade delay={0.25}>
        <div className="mt-16 grid border border-ivory/10 md:mt-20 lg:mt-24 lg:grid-cols-12">
          {/* left — orbital sweep */}
          <div className="flex flex-col border-b border-ivory/10 p-8 lg:col-span-3 lg:border-b-0 lg:border-r">
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
            <p className="mt-6 font-elegant text-[14px] md:text-[14.5px] leading-relaxed tracking-[0.04em] text-cream/75">
              3 satellites in view
              <br />
              swath — 2330 km
            </p>
          </div>

          {/* center — live telemetry */}
          <div className="border-b border-ivory/10 p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
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

          {/* right — signal out */}
          <div className="flex flex-col p-8 lg:col-span-4">
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

            <div className="flex items-center justify-between border-t border-ivory/10 pt-6">
              <button
                type="button"
                className="group flex items-center gap-3 border border-ivory/25 px-5 py-2.5 font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.34em] text-ivory transition-colors duration-300 hover:bg-ivory hover:text-ink cursor-pointer"
              >
                <span className="block h-2 w-2 bg-current" aria-hidden="true" />
                Play
              </button>
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

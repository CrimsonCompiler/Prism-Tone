import EarthCanvas from './EarthCanvas'
import { Waveform } from './Canvases'
import { Kicker, Reveal } from './ui'

export default function FinalCTA() {
  return (
    <section id="team" className="relative h-[100svh] min-h-[680px] overflow-hidden border-t border-ivory/10">
      <div className="absolute inset-0">
        <EarthCanvas variant="cta" />
      </div>
      <div className="vignette pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink/85 to-transparent" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <Kicker>Cosmic Cloud — NASA Space Apps Challenge 2026</Kicker>

        <h2 className="mt-8 font-display font-light leading-[0.84] tracking-[-0.01em] text-ivory text-[clamp(3.6rem,13vw,11.5rem)]">
          <Reveal delay={0.1} className="pr-[4vw] md:pr-[8vw]">
            PRISM
          </Reveal>
          <Reveal delay={0.22}>
            <span className="italic text-cream">TONE</span>
          </Reveal>
        </h2>

        <p className="mt-9 font-elegant text-[12px] uppercase tracking-[0.44em] text-cream/90 md:text-[14px]">
          Listen to a changing planet.
        </p>

        <button
          type="button"
          className="mt-12 border border-ivory/40 px-10 py-4 font-stencil text-[11px] uppercase tracking-[0.4em] text-ivory transition-colors duration-500 hover:bg-ivory hover:text-ink"
        >
          Begin listening
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6 md:px-12">
        <Waveform className="h-14 w-full opacity-75" />
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-ivory/10 pt-4 font-stencil text-[8px] uppercase tracking-[0.26em] text-parchment md:flex-row">
          <span>© 2026 Cosmic Cloud</span>
          <span className="text-center">data · NASA GISS / GPM / NSIDC / FIRMS / MERRA-2</span>
          <span>imagery · NASA visible earth</span>
        </div>
      </div>
    </section>
  )
}

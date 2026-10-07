import { PrismCanvas } from './Canvases'
import { Annot, Fade, Reveal, Rule } from './ui'

const LAYERS = [
  ['01', 'THERMAL', 'temperature — pitch'],
  ['02', 'KINETIC', 'wind — tempo'],
  ['03', 'HYDRO', 'rainfall — rhythm'],
  ['04', 'CRYO', 'ice — texture'],
  ['05', 'PYRO', 'wildfire — detail'],
]

export default function PrismSystem() {
  return (
    <section id="system" className="relative border-t border-ivory/10 px-6 py-32 md:px-12 md:py-44 lg:px-20">
      <Fade>
        <Rule index="03" label="The Prism System" meta="one signal — five voices" />
      </Fade>

      <div className="mt-16 grid items-end gap-14 md:mt-24 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="font-display font-light leading-[0.98] text-ivory text-[clamp(2.6rem,5vw,4.6rem)]">
            <Reveal delay={0.05}>ONE SIGNAL.</Reveal>
            <Reveal delay={0.16}>
              <em className="italic text-cream">FIVE VOICES.</em>
            </Reveal>
          </h2>

          <Fade delay={0.3}>
            <p className="mt-9 max-w-sm font-elegant text-[15px] leading-relaxed text-cream/85">
              Like a prism splitting white light, Prism Tone splits the Earth's data stream into
              spectral layers. Each layer is a voice. Each voice is a dataset. Together, they are the
              sound of a planet.
            </p>
          </Fade>

          <Fade delay={0.4}>
            <ul className="mt-12 space-y-0">
              {LAYERS.map(([n, name, role]) => (
                <li
                  key={n}
                  className="flex items-baseline justify-between gap-4 border-t border-ivory/10 py-3"
                >
                  <span className="font-data text-[10px] uppercase tracking-[0.26em] text-beige">
                    {n} <span className="mx-2 text-parchment">·</span> {name}
                  </span>
                  <span className="font-ui text-[9px] uppercase tracking-[0.18em] text-parchment">
                    {role}
                  </span>
                </li>
              ))}
            </ul>
          </Fade>
        </div>

        <div className="lg:col-span-8">
          <Fade delay={0.2}>
            <div className="relative border border-ivory/10">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9]">
                <PrismCanvas className="absolute inset-0 h-full w-full" />
              </div>
              <Annot className="absolute left-3 top-3">Fig. 03 — spectral split</Annot>
              <Annot className="absolute bottom-3 right-3">live synth — 48 kHz</Annot>
            </div>
          </Fade>
        </div>
      </div>
    </section>
  )
}

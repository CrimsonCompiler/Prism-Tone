import { Annot, Fade, Kicker, Reveal } from './ui'

const MODES = ['sonified', 'captioned', 'haptic']

export default function Accessibility() {
  return (
    <section id="access" className="stack-card z-50 -mt-10 md:-mt-14 px-6 py-28 md:py-40">
      <div className="mx-auto max-w-4xl text-center">
        <Fade>
          <Kicker center>06 — Access</Kicker>
        </Fade>

        <h2 className="mt-12 font-display font-light leading-[1.04] text-ivory text-[clamp(2.3rem,5.6vw,5.2rem)]">
          <Reveal delay={0.05}>“SCIENCE SHOULD HAVE</Reveal>
          <Reveal delay={0.17}>
            MORE THAN <em className="italic text-cream">ONE WAY IN.”</em>
          </Reveal>
        </h2>

        <Fade delay={0.3}>
          <p className="mx-auto mt-10 max-w-xl font-elegant text-[15px] leading-relaxed text-cream/85 md:text-base">
            Prism Tone began as an accessibility experiment. A sonified planet can be read without
            eyes and felt without numbers — and for everyone else, it turns statistics into
            something closer to weather: something you notice.
          </p>
        </Fade>
      </div>

      <Fade delay={0.25} className="mx-auto mt-16 max-w-3xl md:mt-20">
        <div className="relative overflow-hidden border border-ivory/10">
          <img
            src="/images/access-portrait.jpg"
            alt="Profile of a listener wearing headphones, lit by a thin rim of warm light in darkness"
            width="1024"
            height="1280"
            loading="lazy"
            decoding="async"
            className="h-[400px] w-full object-cover object-top grayscale brightness-[0.92] contrast-[1.05] md:h-[500px]"
          />
          <div className="vignette pointer-events-none absolute inset-0" />
          <Annot className="absolute bottom-3 left-3">Fig. 06 — listener, first light test</Annot>
        </div>

        <div className="mt-8 flex items-center justify-center gap-8 md:gap-14">
          {MODES.map((m, i) => (
            <span key={m} className="flex items-center gap-8 md:gap-14">
              {i > 0 && <span className="h-3 w-px bg-ivory/20" aria-hidden="true" />}
              <span className="font-stencil text-[9px] uppercase tracking-[0.36em] text-beige">
                {m}
              </span>
            </span>
          ))}
        </div>
      </Fade>
    </section>
  )
}

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { StoryWave } from './Canvases'
import { Annot, EASE, Fade, Kicker, Reveal, Rule } from './ui'

const STORIES = [
  {
    id: 'temperature',
    n: '5.1',
    name: 'TEMPERATURE',
    title: 'The anomaly rises.',
    img: '/images/story-temperature.jpg',
    alt: 'Satellite view of a cyclone swirling over a dark ocean',
    fig: 'Fig. 5.1 — cyclone, southern ocean',
    stat: { value: '+1.28', unit: '°C', label: '2024 — warmest year on record', src: 'NASA GISTEMP v4' },
    copy: 'A century of thermometers, compressed into a single rising line. In Prism Tone the temperature anomaly drives pitch — as the curve climbs, the tone climbs with it. You don’t read the trend. You hear it.',
    viz: 'rise',
    reverse: false,
  },
  {
    id: 'wind',
    n: '5.2',
    name: 'WIND',
    title: 'The planet has a tempo.',
    img: '/images/story-wind.jpg',
    alt: 'Wind streaks and cloud streets stretched across a dark ocean',
    fig: 'Fig. 5.2 — cloud streets, open ocean',
    stat: { value: '400+', unit: 'km/h', label: 'jet stream peaks — polar front', src: 'NASA MERRA-2' },
    copy: 'Wind is motion you can trust. Surface gusts and jet streams set the tempo of the piece — calm days breathe slowly, storm systems race. Listen long enough and you can tell the season by the pulse.',
    viz: 'gust',
    reverse: true,
  },
  {
    id: 'rainfall',
    n: '5.3',
    name: 'RAINFALL',
    title: 'Water keeps time.',
    img: '/images/story-rainfall.jpg',
    alt: 'Rain shafts falling over a dark ocean at night',
    fig: 'Fig. 5.3 — rain shafts, tropical pacific',
    stat: { value: '505,000', unit: 'km³', label: 'freshwater falling to earth each year', src: 'NASA GPM IMERG' },
    copy: 'Rain is percussion written by physics. Every storm front becomes a rhythm — sparse drops at the edge, a full roll at the core. The heaviest bands don’t just get louder. They get busier.',
    viz: 'drops',
    reverse: false,
  },
  {
    id: 'ice',
    n: '5.4',
    name: 'ICE',
    title: 'The sound of memory.',
    img: '/images/story-ice.jpg',
    alt: 'Sea ice floes and fractures seen from above',
    fig: 'Fig. 5.4 — sea ice, beaufort sea',
    stat: { value: '−12.2', unit: '% / decade', label: 'arctic sea-ice extent — september minimum', src: 'NSIDC sea ice index' },
    copy: 'Ice is memory — layered, ancient, fragile. Its voice is glassy and slow. As the extent thins, the timbre thins with it: brighter, grainier, more brittle. A thaw you can hear.',
    viz: 'crackle',
    reverse: true,
  },
  {
    id: 'wildfire',
    n: '5.5',
    name: 'WILDFIRE',
    title: 'The loudest voice.',
    img: '/images/story-wildfire.jpg',
    alt: 'A wildfire front glowing through darkness and smoke, seen from the air',
    fig: 'Fig. 5.5 — fire front, western range',
    stat: { value: '≈ 4.0M', unit: 'km² / yr', label: 'global burned area — satellite estimate', src: 'VIIRS · FIRMS' },
    copy: 'Fire is sudden by nature. Its part is quiet until it isn’t — a burst of detail, crackle and air. When the flame line moves, the sound sharpens. It is the one voice the planet raises.',
    viz: 'flicker',
    reverse: false,
  },
]

function Story({ s }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [46, -46])

  return (
    <article ref={ref} className="relative py-16 md:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <motion.div
          style={{ y }}
          className={`relative lg:col-span-7 ${s.reverse ? 'lg:order-2' : ''}`}
        >
          <Fade>
            <div className="relative overflow-hidden border border-ivory/10">
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
              <Annot className="absolute bottom-3 left-3">{s.fig}</Annot>
              <Annot className="absolute right-3 top-3">{`src · ${s.src}`}</Annot>
            </div>
          </Fade>
        </motion.div>

        <div className={`lg:col-span-5 ${s.reverse ? 'lg:order-1 lg:pr-8' : 'lg:pl-8'}`}>
          <Fade>
            <Kicker>{`${s.n} — ${s.name}`}</Kicker>
          </Fade>
          <h3 className="mt-5 font-display font-light leading-[0.98] text-ivory text-[clamp(2.2rem,4vw,3.8rem)]">
            <Reveal delay={0.08}>{s.title}</Reveal>
          </h3>
          <Fade delay={0.2}>
            <p className="mt-6 max-w-md font-elegant text-[15px] leading-relaxed text-cream/85">
              {s.copy}
            </p>
          </Fade>

          <Fade delay={0.3}>
            <div className="mt-9 flex items-end gap-4 border-t border-ivory/15 pt-5">
              <span className="font-data font-light tabular-nums text-ivory text-5xl md:text-6xl">
                {s.stat.value}
              </span>
              <span className="pb-1.5 font-data text-sm tracking-[0.12em] text-beige">
                {s.stat.unit}
              </span>
            </div>
            <p className="mt-3 font-stencil text-[9px] uppercase tracking-[0.26em] text-parchment">
              {s.stat.label}
            </p>
          </Fade>

          <Fade delay={0.4}>
            <StoryWave type={s.viz} className="mt-9 h-16 w-full" />
            <p className="mt-2 font-data text-[8px] uppercase tracking-[0.24em] text-parchment/70">
              voice — {s.name.toLowerCase()} · loop
            </p>
          </Fade>
        </div>
      </div>
    </article>
  )
}

export default function EarthStories() {
  return (
    <section id="stories" className="relative border-t border-ivory/10 px-6 py-32 md:px-12 md:py-44 lg:px-20">
      <Fade>
        <Rule index="05" label="Earth Stories" meta="five phenomena — five voices" />
      </Fade>

      <h2 className="mt-16 max-w-5xl font-display font-light leading-[0.96] text-ivory text-[clamp(2.8rem,6.4vw,6.4rem)] md:mt-20">
        <Reveal delay={0.05}>EVERY PHENOMENON</Reveal>
        <Reveal delay={0.16}>
          HAS A <em className="italic text-cream">VOICE.</em>
        </Reveal>
      </h2>

      <Fade delay={0.28}>
        <p className="mt-8 max-w-md font-elegant text-[15px] leading-relaxed text-cream/80">
          Five datasets. Five ways the planet is changing. Each one gets its own instrument, its own
          behavior, its own part in the score.
        </p>
      </Fade>

      <div className="mt-16 md:mt-24">
        {STORIES.map((s) => (
          <Story key={s.id} s={s} />
        ))}
      </div>
    </section>
  )
}

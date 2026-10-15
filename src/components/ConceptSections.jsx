import { motion } from 'motion/react'
import { Fade } from './ui'

/* =========================================================================
   SECTION 1: OBSERVATION / THE PLANET IN DIGITS & DATA
   ========================================================================= */
export function ConceptObservation() {
  const observationColumns = [
    {
      roman: 'I.',
      title: 'Translation',
      desc: 'A consistent, reversible bridge between a NASA variable and a sonic parameter - never arbitrary, always declared.',
    },
    {
      roman: 'II.',
      title: 'Resonance',
      desc: "The chosen sounds carry emotional weight - pitch, density, and grain reflect the data's behaviour, not just its value.",
    },
    {
      roman: 'III.',
      title: 'Accessibility',
      desc: 'Science should have more than one way in. Sound is the second door - a path for ears, not only eyes.',
    },
  ]

  return (
    <section className="relative w-full pb-24 md:pb-32 lg:pb-40">
      {/* Top Header Bar: OBSERVATION & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em]">
            OBSERVATION
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            EARTH OBSERVATORY - CHAPTER I
          </span>
        </div>
      </Fade>

      {/* Main Headline (2 lines) + Right-aligned Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
        {/* Left Headline (2 lines) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Fade delay={0.2}>
            <h1 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              The planet
              <br />
              <span className="italic font-normal">in digits & data.</span>
            </h1>
          </Fade>
        </div>

        {/* Right Explanatory Paragraph */}
        <div className="lg:col-span-5 xl:col-span-4 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.35}>
            <p className="max-w-lg lg:max-w-md font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              Planetary data is the planet's hidden language. Our vision is to decode their metrics into acoustic art - letting raw data dissolve into the universal language of sound.
            </p>
          </Fade>
        </div>
      </div>

      {/* Three Bottom Columns (I. Translation, II. Resonance, III. Accessibility) */}
      <Fade delay={0.5}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 lg:gap-20 xl:gap-28 pt-12 md:pt-16 mt-12 md:mt-16">
          {observationColumns.map((col) => (
            <div key={col.roman} className="flex flex-col">
              <span className="font-data text-[11px] md:text-xs tracking-[0.28em] text-[#cad7ce] uppercase font-light">
                {col.roman}
              </span>
              <h3 className="mt-3.5 font-display text-xl sm:text-2xl lg:text-[1.75rem] font-light text-ivory leading-snug">
                {col.title}
              </h3>
              <p className="mt-4 font-elegant text-sm md:text-[15px] leading-relaxed text-ivory/70 font-light">
                {col.desc}
              </p>
            </div>
          ))}
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 2: THE CRISIS OF PERCEPTION / THE PROBLEM
   ========================================================================= */
export function ConceptProblem() {
  const problemCards = [
    {
      n: '01',
      title: 'Emotional Distance',
      desc: 'Planetary change is often presented as numbers on a screen. A rising temperature curve may be scientifically precise, yet difficult to emotionally connect with the scale and urgency of a changing planet.',
      impact: 'IMPACT: DISCONNECTED PERCEPTION',
    },
    {
      n: '02',
      title: 'Visual Dependency',
      desc: 'Maps, charts, and satellite imagery make Earth science heavily dependent on sight. Without meaningful alternatives, many of these visual data patterns remain difficult to access for people who are blind or have visual impairments.',
      impact: 'IMPACT: LIMITED ACCESSIBILITY',
    },
    {
      n: '03',
      title: 'Hidden Patterns',
      desc: 'Earth’s systems are interconnected, but their signals are often examined through separate graphs and datasets. Subtle fluctuations, long-term trends, and relationships between variables can be difficult to recognise across multiple visual representations.',
      impact: 'IMPACT: OVERLOOKED CONNECTIONS',
    },
    {
      n: '04',
      title: 'Data Without Experience',
      desc: 'Scientific datasets contain continuous records of planetary change, yet static charts and spreadsheets offer limited ways to experience those changes dynamically. The information is available, but its movement through time can be difficult.',
      impact: 'IMPACT: PASSIVE UNDERSTANDING',
    },
  ]

  return (
    <section className="relative w-full py-20 md:py-28 lg:py-36 border-t border-white/10">
      {/* Top Header Bar: THE CRISIS OF PERCEPTION & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em] uppercase">
            THE CRISIS OF PERCEPTION
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            WHAT THE NUMBERS HIDE - CHAPTER II
          </span>
        </div>
      </Fade>

      {/* Main Headline (Left) + Right Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
        {/* Left Headline + Sub-text */}
        <div className="lg:col-span-5 xl:col-span-5">
          <Fade delay={0.15}>
            <h2 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.8rem] xl:text-[5.6rem] 2xl:text-[6.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              The Problem
            </h2>
            <p className="mt-4 font-display italic text-sm md:text-[15px] lg:text-base text-ivory/70 font-light">
              Charts and maps reduce the planet to pixels. They are precise, but quiet.
            </p>
          </Fade>
        </div>

        {/* Right Explanatory Paragraph */}
        <div className="lg:col-span-7 xl:col-span-7 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.25}>
            <p className="max-w-lg lg:max-w-[540px] xl:max-w-[570px] 2xl:max-w-[590px] font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              For over fifty years, humanity has recorded Earth’s vital signs via satellites—tracking thermal anomalies, gravity shifts, and laser altimetry. Yet, this vast scientific intelligence remains locked inside 2D graphs, static spreadsheets, and isolated academic journals.
            </p>
          </Fade>
        </div>
      </div>

      {/* Four Bottom Cards aligned across a single baseline */}
      <Fade delay={0.4}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 xl:gap-8 pt-12 md:pt-16 mt-12 md:mt-16">
          {problemCards.map((card) => (
            <div
              key={card.n}
              className="border border-white/10 bg-white/[0.02] backdrop-blur-[2px] p-6 sm:p-7 lg:p-6 xl:p-8 flex flex-col justify-between h-full"
            >
              <div>
                <span className="font-stencil text-[10px] md:text-[11px] tracking-[0.28em] text-[#cad7ce]">
                  {card.n}
                </span>
                <h3 className="mt-4 font-display text-xl sm:text-2xl lg:text-[1.4rem] xl:text-[1.6rem] font-light text-ivory leading-snug">
                  {card.title}
                </h3>
                <p className="mt-4 font-elegant text-[14.5px] sm:text-[15px] xl:text-[15.5px] leading-relaxed text-ivory/75 font-light">
                  {card.desc}
                </p>
              </div>

              <div className="pt-6 mt-8 border-t border-white/10">
                <span className="font-data text-[9.5px] md:text-[10px] tracking-[0.22em] text-[#cad7ce]/70 uppercase">
                  {card.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 3: A NEW TRANSPORT FOR DATA / THE IDEA (CHAPTER III)
   ========================================================================= */
export function ConceptIdea() {
  const ideaColumns = [
    {
      letter: 'A.',
      title: 'Sound as Another Dimension',
      desc: 'Visuals reveal where Earth is changing; sound reveals how those changes unfold through time. By translating shifts in environmental data into rhythms, we tried another way to perceive patterns.',
    },
    {
      letter: 'B.',
      title: 'Mapping, Not Metaphor',
      desc: 'Every sound has a defined relationship with the data behind it. The mapping remains interpretable, connecting what users hear to what the data actually represents.',
    },
    {
      letter: 'C.',
      title: 'From Data to Experience',
      desc: 'Earth science becomes more than something to examine on a screen. As data-driven sounds evolve with visualizations, users can explore planetary changes through both sight & hearing.',
    },
  ]

  return (
    <section className="relative w-full py-20 md:py-28 lg:py-36 border-t border-white/10">
      {/* Top Header Bar: A NEW TRANSPORT FOR DATA & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em] uppercase">
            A NEW TRANSPORT FOR DATA
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            THE IDEA - CHAPTER III
          </span>
        </div>
      </Fade>

      {/* Editorial Quote Block (Styled identically to SystemQuotes) */}
      <Fade delay={0.2}>
        <div className="pt-2 pb-16 md:pb-24 max-w-5xl">
          {/* Kicker Tag */}
          <div className="mb-6 flex items-center gap-3 md:mb-8">
            <span className="font-stencil text-[10px] uppercase tracking-[0.32em] text-[#8ea792] sm:text-[11px]">
              A · NOTE ON FREQUENCY
            </span>
            <span className="inline-block h-px w-12 bg-ivory/20 md:w-16" aria-hidden="true" />
          </div>

          {/* Main Italic Quote */}
          <blockquote
            style={{ fontFamily: '"Adrianna", "EB Garamond", Georgia, serif' }}
            className="max-w-4xl text-[clamp(1.4rem,2.6vw,2.35rem)] font-normal italic leading-[1.38] tracking-[-0.01em] text-ivory/95"
          >
            “our entire biological system – the brain and the earth itself – work on the same frequencies.”
          </blockquote>

          {/* Author Attribution */}
          <p className="mt-6 font-stencil text-[9.5px] uppercase tracking-[0.26em] text-[#cad7ce]/80 sm:text-[10.5px] md:mt-8">
            ~ Nicola Tesla
          </p>
        </div>
      </Fade>

      {/* Three Columns (A, B, C) */}
      <Fade delay={0.35}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 lg:gap-20 xl:gap-24 2xl:gap-28 pt-12 md:pt-16 lg:pt-20">
          {ideaColumns.map((col) => (
            <div key={col.letter} className="flex flex-col">
              <div>
                <span className="font-stencil text-[11px] md:text-[12px] tracking-[0.28em] text-[#cad7ce]">
                  {col.letter}
                </span>
                <h3 className="mt-4 font-display text-2xl sm:text-[1.75rem] lg:text-[1.95rem] font-light text-ivory leading-snug">
                  {col.title}
                </h3>
              </div>

              {/* Horizontal line across the column under the title */}
              <div className="w-full h-px bg-white/10 my-6 sm:my-7" />

              <p className="font-elegant text-sm md:text-[14.5px] lg:text-[15px] leading-[1.7] text-ivory/75 font-light">
                {col.desc}
              </p>
            </div>
          ))}
        </div>
      </Fade>
    </section>
  )
}

/* =========================================================================
   SECTION 4: THE SONIC PALETTE (CHAPTER IV)
   ========================================================================= */
export function ConceptPalette() {
  const paletteLayers = [
    {
      n: '01',
      title: 'Thermal Flux',
      mapping: 'Temperature → Pitch',
      source: 'NASA POWER',
      desc: 'Temperature variations shape the pitch of the melodic layer. As temperatures rise, the tone moves upward in frequency, making long-term warming trends audible.',
      spec: '220 Hz — 880 Hz',
      specLabel: 'PROPOSED FREQUENCY RANGE',
      viz: 'pitch',
    },
    {
      n: '02',
      title: 'Hydrologic Cadence',
      mapping: 'Precipitation → Rhythm',
      source: 'NASA POWER',
      desc: 'Rainfall influences the density of rhythmic events. Lower precipitation produces sparse notes, while heavier rainfall creates increasingly active patterns.',
      spec: 'SPARSE → DENSE',
      specLabel: 'RHYTHMIC DENSITY',
      viz: 'rhythm',
    },
    {
      n: '03',
      title: 'Thermal Static',
      mapping: 'Fire Activity → Percussion',
      source: 'NASA FIRMS',
      desc: 'Active fire observations and Fire Radiative Power influence percussive activity. Changes in fire intensity can trigger more frequent and pronounced sonic events.',
      spec: 'INTENSITY → IMPACT',
      specLabel: 'PERCUSSIVE RESPONSE',
      viz: 'static',
    },
    {
      n: '04',
      title: 'Tectonic Bass',
      mapping: 'Water Storage → Low Frequencies',
      source: 'GRACE / GRACE-FO',
      desc: 'Terrestrial water-storage anomalies shape the low-frequency layer. Long-term changes in stored water become subtle shifts in the depth & intensity of the bass.',
      spec: '30 Hz — 80 Hz',
      specLabel: 'PROPOSED FREQUENCY RANGE',
      viz: 'bass',
    },
    {
      n: '05',
      title: 'Spectral Vegetation',
      mapping: 'Vegetation → Harmonic Texture',
      source: 'MODIS / VIIRS',
      desc: 'Vegetation indices influence the richness of the sustained harmonic layer. Changes in vegetation conditions can alter the density and texture of the sound.',
      spec: 'SPARSE → RICH',
      specLabel: 'HARMONIC TEXTURE',
      viz: 'vegetation',
    },
  ]

  return (
    <section className="relative w-full py-20 md:py-28 lg:py-36 border-t border-white/10">
      {/* Top Header Bar: HOW EARTH'S SIGNALS SHAPE THE SOUND & Chapter Meta */}
      <Fade delay={0.1}>
        <div className="flex items-center justify-between pb-8 md:pb-12 text-[#cad7ce]">
          <span className="font-stencil text-[10px] md:text-[11.5px] tracking-[0.34em] uppercase">
            HOW EARTH'S SIGNALS SHAPE THE SOUND
          </span>
          <span className="font-stencil text-[9.5px] md:text-[11px] uppercase tracking-[0.34em] text-ivory/60">
            CENTRAL THEME - CHAPTER IV
          </span>
        </div>
      </Fade>

      {/* Main Headline (Left) + Right Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between mb-16 md:mb-20">
        {/* Left Headline */}
        <div className="lg:col-span-6 xl:col-span-5">
          <Fade delay={0.15}>
            <h2 className="font-display font-light text-4xl sm:text-5xl md:text-6xl lg:text-[4.6rem] xl:text-[5.2rem] leading-[1.06] tracking-[-0.035em] text-ivory">
              The Sonic
              <span className="italic font-normal"> Palette.</span>
            </h2>
          </Fade>
        </div>

        {/* Right Subtext */}
        <div className="lg:col-span-6 xl:col-span-7 lg:flex lg:justify-end lg:pb-3">
          <Fade delay={0.25}>
            <p className="max-w-xl font-elegant text-sm sm:text-[15px] md:text-base leading-relaxed text-ivory/80 font-light lg:ml-auto">
              Every layer translates a different environmental signal into a distinct sonic behaviour. Together, they form an evolving acoustic portrait of a changing planet.
            </p>
          </Fade>
        </div>
      </div>

      {/* Unique Pattern: Horizontal Acoustic Score Tracks */}
      <div>
        {paletteLayers.map((layer, idx) => (
          <Fade key={layer.n} delay={0.1 * idx}>
            <div className="group border-t border-white/10 py-8 md:py-10 lg:py-11 transition-colors duration-500 hover:bg-white/[0.015] -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                {/* 1. Track Number, Title & Sensor Mapping */}
                <div className="lg:col-span-4 xl:col-span-4">
                  <div className="flex items-center gap-3">
                    <span className="font-stencil text-[11px] tracking-[0.28em] text-[#cad7ce]">
                      {layer.n}
                    </span>
                    <span className="h-px w-4 bg-white/20" />
                    <span className="font-stencil text-[9.5px] uppercase tracking-[0.22em] text-ivory/50">
                      SOURCE · {layer.source}
                    </span>
                  </div>

                  <h3 className="mt-3.5 font-display text-2xl sm:text-3xl lg:text-[1.95rem] font-light text-ivory leading-tight group-hover:text-white transition-colors">
                    {layer.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-data text-[11px] sm:text-[11.5px] tracking-[0.16em] text-[#8ea792] uppercase font-light">
                      {layer.mapping}
                    </span>
                  </div>
                </div>

                {/* 2. Bespoke Acoustic Waveform Visualization */}
                <div className="lg:col-span-3 xl:col-span-3 py-2">
                  <div className="max-w-[200px]">
                    <WaveformViz type={layer.viz} />
                  </div>
                </div>

                {/* 3. Narrative Translation Description */}
                <div className="lg:col-span-3 xl:col-span-3">
                  <p className="font-elegant text-sm md:text-[14px] lg:text-[14.5px] leading-relaxed text-ivory/70 font-light">
                    {layer.desc}
                  </p>
                </div>

                {/* 4. Acoustic Specification Badge */}
                <div className="lg:col-span-2 xl:col-span-2 lg:text-right">
                  <p className="font-data text-xs sm:text-[13px] tracking-[0.16em] text-[#cad7ce] uppercase font-medium">
                    {layer.spec}
                  </p>
                  <p className="mt-1 font-stencil text-[9px] uppercase tracking-[0.2em] text-ivory/45">
                    {layer.specLabel}
                  </p>
                </div>
              </div>
            </div>
          </Fade>
        ))}
      </div>

      {/* A Note on Mapping: Clean Footnote with vertical accent line on left */}
      <Fade delay={0.3}>
        <div className="mt-14 md:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-baseline">
          <div className="lg:col-span-4 border-l-2 border-[#8ea792] pl-4 sm:pl-5">
            <span className="font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.34em] text-[#8ea792]">
              A NOTE ON MAPPING
            </span>
            <p className="mt-1.5 font-display italic text-lg sm:text-xl text-ivory/90 font-light">
              Scientific Interpretability & Coherence
            </p>
          </div>

          <div className="lg:col-span-8">
            <p className="font-elegant text-sm sm:text-[15px] leading-relaxed text-ivory/75 font-light">
              These relationships describe the proposed sonification design. Exact mappings and frequency ranges will be refined through implementation and testing to balance scientific interpretability, perceptual clarity, and musical coherence.
            </p>
          </div>
        </div>
      </Fade>

      <br /> <br /> <br /> <br />

      {/* Fail-Safe Architectural Strategy (Hackathon Reliability Assurance) */}
      <Fade delay={0.35}>
        <div className="mt-10 md:mt-14 border border-white/10 bg-white/[0.015] backdrop-blur-[2px] p-6 sm:p-8 lg:p-9">
          {/* Header Row */}
          <div className="flex items-center justify-between text-[#cad7ce] pb-6 sm:pb-8">
            <span className="font-stencil text-[10px] md:text-[11px] tracking-[0.34em] uppercase">
              FAIL-SAFE ARCHITECTURAL STRATEGY
            </span>
            <span className="font-stencil text-[9.5px] md:text-[10.5px] uppercase tracking-[0.3em] text-ivory/50">
              HACKATHON RELIABILITY ASSURANCE
            </span>
          </div>

          {/* 4 Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                tier: 'TIER 1',
                title: 'Photographic 3D View',
                desc: 'Cinematic Earth crescent with slow orbital rotation',
              },
              {
                tier: 'TIER 2',
                title: 'Canvas / SVG Layer',
                desc: 'Hardware-accelerated waveform & vector charts',
              },
              {
                tier: 'TIER 3',
                title: 'Cached Telemetry',
                desc: 'Local NASA historical baselines for offline stability',
              },
              {
                tier: 'TIER 4',
                title: 'Web Audio Synthesis',
                desc: 'Auto client-side procedural sound generation',
              },
            ].map((item) => (
              <div
                key={item.tier}
                className="border border-white/10 bg-white/[0.02] p-5 sm:p-6 text-center flex flex-col justify-center items-center hover:border-white/20 transition-all duration-300"
              >
                <span className="font-stencil text-[9.5px] md:text-[10px] tracking-[0.28em] text-[#cad7ce] uppercase">
                  {item.tier}
                </span>
                <h4 className="mt-2.5 font-display text-base sm:text-lg lg:text-[1.12rem] font-light text-ivory leading-snug">
                  {item.title}
                </h4>
                <p className="mt-2 font-elegant text-xs sm:text-[13px] text-ivory/60 font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Fade>
    </section>
  )
}

function WaveformViz({ type }) {
  if (type === 'pitch') {
    return (
      <svg viewBox="0 0 160 36" fill="none" className="w-full h-8 text-[#8ea792]/80">
        <path
          d="M 0 18 Q 20 6, 40 18 T 70 18 T 94 18 T 112 18 T 126 18 T 136 18 T 144 18 T 150 18 T 155 18 T 160 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="160" cy="18" r="2.5" fill="#cad7ce" />
      </svg>
    )
  }
  if (type === 'rhythm') {
    const bars = [6, 22, 45, 75, 96, 112, 124, 134, 142, 148, 153, 157, 160]
    return (
      <svg viewBox="0 0 160 36" fill="none" className="w-full h-8 text-[#8ea792]/80">
        <line x1="0" y1="18" x2="160" y2="18" stroke="rgba(242,237,227,0.15)" strokeWidth="1" strokeDasharray="2 3" />
        {bars.map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={18 - 4 - (i % 3) * 3}
            x2={x}
            y2={18 + 4 + (i % 3) * 3}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </svg>
    )
  }
  if (type === 'static') {
    return (
      <svg viewBox="0 0 160 36" fill="none" className="w-full h-8 text-[#c19a5b]/80">
        <path
          d="M 0 18 L 24 18 L 28 8 L 32 28 L 36 18 L 68 18 L 72 4 L 76 32 L 80 18 L 108 18 L 111 10 L 114 26 L 117 18 L 134 18 L 137 6 L 140 30 L 143 18 L 160 18"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (type === 'bass') {
    return (
      <svg viewBox="0 0 160 36" fill="none" className="w-full h-8 text-[#3f75bb]/90">
        <path
          d="M 0 18 C 25 3, 55 3, 80 18 C 105 33, 135 33, 160 18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 0 18 C 25 3, 55 3, 80 18 C 105 33, 135 33, 160 18"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.18"
        />
      </svg>
    )
  }
  if (type === 'vegetation') {
    return (
      <svg viewBox="0 0 160 36" fill="none" className="w-full h-8 text-[#739a69]/85">
        <path d="M 0 12 Q 40 4, 80 12 T 160 12" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <path d="M 0 18 Q 40 26, 80 18 T 160 18" stroke="currentColor" strokeWidth="1.6" />
        <path d="M 0 24 Q 40 16, 80 24 T 160 24" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      </svg>
    )
  }
  return null
}
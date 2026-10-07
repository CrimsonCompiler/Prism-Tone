import { motion } from 'motion/react'
import { Fade } from './ui'

function ListenerIllustration() {
  const strokeStyle = {
    fill: 'none',
    stroke: '#e6d8b8',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  return (
    <div className="relative mx-auto flex items-center justify-center w-full max-w-[340px] md:max-w-[380px] aspect-[360/420]">
      {/* Soft circular ambient glow behind head */}
      <div
        className="absolute top-[35px] left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(220, 200, 160, 0.22) 0%, rgba(220, 200, 160, 0.08) 42%, transparent 72%)',
          filter: 'blur(14px)',
        }}
      />

      <svg
        viewBox="0 0 360 420"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
      >
        {/* Left sound waves */}
        <g>
          <path {...strokeStyle} strokeWidth={1.2} opacity={0.75} d="M 70 195 Q 55 210 70 225" />
          <path {...strokeStyle} strokeWidth={1.2} opacity={0.5} d="M 55 180 Q 35 210 55 240" />
          <path {...strokeStyle} strokeWidth={1.2} opacity={0.35} d="M 40 165 Q 15 210 40 255" />
        </g>

        {/* Right sound waves */}
        <g>
          <path {...strokeStyle} strokeWidth={1.2} opacity={0.75} d="M 290 195 Q 305 210 290 225" />
          <path {...strokeStyle} strokeWidth={1.2} opacity={0.5} d="M 305 180 Q 325 210 305 240" />
          <path {...strokeStyle} strokeWidth={1.2} opacity={0.35} d="M 320 165 Q 345 210 320 255" />
        </g>

        {/* Head */}
        <circle cx={180} cy={170} r={60} {...strokeStyle} />

        {/* Headband */}
        <path {...strokeStyle} d="M 122 158 Q 180 100 238 158" />

        {/* Earcups */}
        <ellipse cx={120} cy={175} rx={14} ry={22} {...strokeStyle} />
        <ellipse cx={240} cy={175} rx={14} ry={22} {...strokeStyle} />

        {/* Closed eyes */}
        <path {...strokeStyle} d="M 152 175 Q 162 182 172 175" />
        <path {...strokeStyle} d="M 188 175 Q 198 182 208 175" />

        {/* Nose hint */}
        <path {...strokeStyle} d="M 180 195 Q 180 200 178 205" />

        {/* Neck */}
        <line x1={165} y1={228} x2={165} y2={260} {...strokeStyle} />
        <line x1={195} y1={228} x2={195} y2={260} {...strokeStyle} />

        {/* Body / shoulders */}
        <path
          {...strokeStyle}
          d="M 165 260 Q 165 255 180 255 Q 195 255 195 260 L 230 295 Q 245 310 245 330 L 245 400 L 115 400 L 115 330 Q 115 310 130 295 Z"
        />
      </svg>
    </div>
  )
}

export default function Accessibility() {
  return (
    <section
      id="access"
      className="stack-card z-40 px-6 pt-10 pb-28 md:px-12 md:pt-12 md:pb-36 lg:px-20 lg:pt-14 lg:pb-40"
    >
      {/* Left-aligned caption heading matching previous sections */}
      <div className="flex items-center justify-between gap-6 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <span
            className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige font-normal"
            style={{ fontFamily: '"Meno Banner", "Bodoni Moda", "Source Serif 4", Georgia, serif' }}
          >
            04 / ACCESSIBILITY
          </span>
          <span className="h-px w-14 md:w-20 bg-ivory/25 inline-block" aria-hidden="true" />
        </div>
        <span className="font-stencil text-[10px] md:text-[11px] uppercase tracking-[0.26em] text-parchment/80">
          A SECOND DOOR
        </span>
      </div>

      <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-12 lg:gap-14 items-center">
        {/* Left Column: Heading, Narrative and Feature Tags */}
        <div className="lg:col-span-7">
          <Fade delay={0.2}>
            <p className="mt-8 max-w-xl font-elegant text-[15.5px] leading-relaxed text-cream/85 md:text-[16.5px]">
              Charts privilege those who see.
              <br />
              Prism Tone opens the same data to those who can listen.
              <br /><br />
              Gigabytes of satellite data are traditionally flattened into colored heatmaps, isolines, and visual dashboards-rendering them inaccessible to many people worldwide. A student in a rural classroom or an astrophysicist with visual impairment can perceive the health of the biosphere with the same-or greater-fidelity than a visual analyst.
            </p>
          </Fade>

          {/* 4 Feature Callouts (2x2 grid) */}
          <Fade delay={0.3}>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7 border-t border-ivory/10 pt-8">
              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  BLIND / LOW VISION
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  Full sonic narrative
                </p>
              </div>

              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  DEAF / HARD OF HEARING
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  Visual waveform + captions
                </p>
              </div>

              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  DYSLEXIA
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  No reliance on dense text
                </p>
              </div>

              <div className="border-l border-ivory/25 pl-3.5 sm:pl-4 py-0.5">
                <p className="font-stencil text-[10.5px] md:text-[11.5px] uppercase tracking-[0.24em] text-beige font-medium">
                  NEURODIVERGENT
                </p>
                <p className="mt-2 font-data text-[12.5px] md:text-[13.5px] text-ivory/95 tracking-[0.04em]">
                  Adjustable intensity
                </p>
              </div>
            </div>
          </Fade>
        </div>

        {/* Right Column: Cartoon / Vector Illustration */}
        <div className="flex items-center justify-center lg:col-span-5">
          <Fade delay={0.25}>
            <ListenerIllustration />
          </Fade>
        </div>
      </div>
    </section>
  )
}

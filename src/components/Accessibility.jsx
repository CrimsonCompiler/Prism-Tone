import { motion } from 'motion/react'
import { Fade } from './ui'
import { Waveform } from './Canvases'

function ListenerIllustration() {
  return (
    <svg
      viewBox="0 0 200 280"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <radialGradient id="figGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(244,236,225,0.12)" />
          <stop offset="100%" stopColor="rgba(244,236,225,0)" />
        </radialGradient>
      </defs>

      <ellipse cx={100} cy={80} rx={60} ry={70} fill="url(#figGlow)" />

      {/* Head outline */}
      <ellipse
        cx={100}
        cy={80}
        rx={34}
        ry={40}
        fill="none"
        stroke="rgba(244,236,225,0.7)"
        strokeWidth={1.5}
      />

      {/* Left eye */}
      <path
        d="M 85 80 Q 88 83, 91 80"
        fill="none"
        stroke="rgba(244,236,225,0.6)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Right eye */}
      <path
        d="M 109 80 Q 112 83, 115 80"
        fill="none"
        stroke="rgba(244,236,225,0.6)"
        strokeWidth={1}
        strokeLinecap="round"
      />

      {/* Headband */}
      <path
        d="M 66 70 Q 100 36, 134 70"
        fill="none"
        stroke="rgba(244,236,225,0.8)"
        strokeWidth={1.8}
        strokeLinecap="round"
      />

      {/* Left earcup */}
      <ellipse
        cx={62}
        cy={85}
        rx={10}
        ry={14}
        fill="rgba(244,236,225,0.1)"
        stroke="rgba(244,236,225,0.7)"
        strokeWidth={1.5}
      />

      {/* Right earcup */}
      <ellipse
        cx={138}
        cy={85}
        rx={10}
        ry={14}
        fill="rgba(244,236,225,0.1)"
        stroke="rgba(244,236,225,0.7)"
        strokeWidth={1.5}
      />

      {/* Speaker grille lines */}
      <line x1={58} y1={85} x2={66} y2={85} stroke="rgba(244,236,225,0.5)" strokeWidth={0.8} />
      <line x1={134} y1={85} x2={142} y2={85} stroke="rgba(244,236,225,0.5)" strokeWidth={0.8} />

      {/* Neck */}
      <line x1={100} y1={120} x2={100} y2={135} stroke="rgba(244,236,225,0.5)" strokeWidth={1.5} />

      {/* Body / shoulders */}
      <path
        d="M 60 175 Q 60 145, 100 135 Q 140 145, 140 175 L 140 200 L 60 200 Z"
        fill="rgba(244,236,225,0.04)"
        stroke="rgba(244,236,225,0.6)"
        strokeWidth={1.5}
      />

      {/* Left animated sound waves */}
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.path
          key={`l-${i}`}
          d={`M ${42 - i * 6} ${85 - i * 3} Q ${42 - i * 8} 85, ${42 - i * 6} ${85 + i * 3}`}
          fill="none"
          stroke="rgba(244,236,225,0.4)"
          strokeWidth={0.8}
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: [0, 0.5, 0], pathLength: [0, 1, 1] }}
          transition={{ duration: 2.4, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* Right animated sound waves */}
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.path
          key={`r-${i}`}
          d={`M ${158 + i * 6} ${85 - i * 3} Q ${158 + i * 8} 85, ${158 + i * 6} ${85 + i * 3}`}
          fill="none"
          stroke="rgba(244,236,225,0.4)"
          strokeWidth={0.8}
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: [0, 0.5, 0], pathLength: [0, 1, 1] }}
          transition={{ duration: 2.4, delay: i * 0.3 + 0.4, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </svg>
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
            <div className="w-[420px] md:w-[480px] lg:w-[520px] aspect-[200/280]">
              <ListenerIllustration />
            </div>
          </Fade>
        </div>
      </div>

      {/* Continuous Team & Closing Footer — compact, no divider, waveform brought up */}
      <div
        id="team"
        className="mt-14 md:mt-20 text-center flex flex-col items-center w-full"
      >

        {/* Waveform and technical telemetry footer */}
        <div className="mt-8 md:mt-10 w-full">
          <Waveform className="h-14 w-full opacity-75" />
          <div className="mt-8 md:mt-10 flex flex-col items-start justify-between gap-6 border-t border-ivory/10 pt-9 md:pt-12 font-data text-[10px] md:text-[10.5px] uppercase tracking-[0.16em] text-[#f9eed8] md:flex-row md:items-center">
            {/* Left: Challenge info */}
            <div className="flex items-start gap-2.5 text-left">
              <span
                className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-current shrink-0"
                aria-hidden="true"
              />
              <div className="leading-tight">
                <p>DEVELOPED FOR NASA SPACE APPS</p>
                <p className="mt-0.5">CHALLENGE 2026</p>
              </div>
            </div>

            {/* Middle: Data sources & Audio engine */}
            <div className="text-left md:text-center leading-tight">
              <p>DATA SOURCES: NASA EOSDIS • MODIS • CYGNSS • GPM • ICESAT-2</p>
              <p className="mt-2.5">AUDIO ENGINE: WEB AUDIO API SYNTHESIS</p>
            </div>

            {/* Right: Copyright */}
            <div className="text-left md:text-right leading-tight">
              <p className="flex items-center md:justify-end gap-1.5">
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" aria-label="Copyright">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                  <text x="8" y="10.8" textAnchor="middle" fontSize="8.5" fill="currentColor" fontFamily="system-ui, sans-serif" fontWeight="600">C</text>
                </svg>
                <span>PRISM TONE • COSMIC CLOUD</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

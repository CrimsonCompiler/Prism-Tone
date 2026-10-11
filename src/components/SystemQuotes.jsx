import { Fade } from './ui'

const QUOTES = [
  {
    tag: 'A · NOTE ON SPACE & SONIFICATION',
    text: '“No sound can travel in space, but sonifications provide a new way of experiencing and conceptualizing data.”',
    author: '~ NASA',
  },
  {
    tag: 'A · NOTE FROM THE FIELD',
    text: '“But even if it cannot produce art, sonification is clearly a powerful and flexible approach well suited for both data exploration and public outreach.”',
    author: '~ SCOTT ST. GEORGE ET AL. · MAKING CLIMATE DATA SING · 2017',
  },
]

export default function SystemQuotes() {
  return (
    <section
      id="epilogue-quotes"
      className="relative z-30 w-full overflow-hidden px-6 pt-12 pb-24 sm:px-10 sm:pt-16 sm:pb-28 md:px-16 md:pt-20 md:pb-32 lg:px-20 lg:pt-24 lg:pb-36"
      aria-label="Perspectives on Sonification"
    >
      {/* 1. Subtle celestial orbital lines in background */}
      <div className="pointer-events-none absolute inset-0 select-none opacity-40">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="none" className="h-full w-full">
          <ellipse
            cx="300"
            cy="450"
            rx="650"
            ry="320"
            fill="none"
            stroke="rgba(242,237,227,0.06)"
            strokeWidth="0.8"
            strokeDasharray="3 4"
          />
          <ellipse
            cx="850"
            cy="200"
            rx="520"
            ry="260"
            fill="none"
            stroke="rgba(142,167,146,0.08)"
            strokeWidth="0.8"
          />
          <line
            x1="100"
            y1="500"
            x2="900"
            y2="100"
            stroke="rgba(242,237,227,0.03)"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
          <circle cx="280" cy="180" r="1" fill="#f2ede3" opacity="0.4" />
          <circle cx="680" cy="420" r="1.2" fill="#f2ede3" opacity="0.35" />
          <circle cx="950" cy="280" r="0.8" fill="#c19a5b" opacity="0.5" />
          <circle cx="450" cy="310" r="0.9" fill="#f2ede3" opacity="0.3" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#121313]/80" />
      </div>

      {/* 2. Editorial Quote Blocks */}
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {QUOTES.map((q, idx) => (
          <Fade key={idx} delay={0.15 * idx}>
            <div className={idx > 0 ? 'mt-12 border-t border-ivory/10 pt-12 md:mt-16 md:pt-16' : ''}>
              {/* Kicker Tag */}
              <div className="mb-6 flex items-center gap-3 md:mb-8">
                <span className="font-stencil text-[10px] uppercase tracking-[0.32em] text-[#8ea792] sm:text-[11px]">
                  {q.tag}
                </span>
                <span className="inline-block h-px w-12 bg-ivory/20 md:w-16" aria-hidden="true" />
              </div>

              {/* Main Italic Quote */}
              <blockquote
                style={{ fontFamily: '"Adrianna", "EB Garamond", Georgia, serif' }}
                className="max-w-4xl text-[clamp(1.4rem,2.6vw,2.35rem)] font-normal italic leading-[1.38] tracking-[-0.01em] text-ivory/95"
              >
                {q.text}
              </blockquote>

              {/* Author / Citation Attribution */}
              <p className="mt-6 font-stencil text-[9.5px] uppercase tracking-[0.26em] text-[#cad7ce]/80 sm:text-[10.5px] md:mt-8">
                {q.author}
              </p>
            </div>
          </Fade>
        ))}
      </div>
    </section>
  )
}

import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { EASE } from './ui'

const LINKS = [
  ['Concept', '#concept'],
  ['Translation', '#translation'],
  ['Prism System', 'system.html'],
  ['Preview', '#preview'],
  ['Team', '#team'],
  ['Stories', 'stories.html'],
]

export default function Nav({ page = 'index' }) {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 80))

  const hrefFor = (href) =>
    page === 'index' ? href : href.startsWith('#') ? `index.html${href}` : href

  const isActive = (label) =>
    (page === 'stories' && label === 'Stories') ||
    (page === 'system' && label === 'Prism System')

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-[80] transition-colors duration-500 ${solid
        ? (page === 'system'
          ? 'border-b border-white/10 bg-[#162022]/90 backdrop-blur-md shadow-lg shadow-black/20'
          : 'border-b border-ivory/10 bg-ink/90 backdrop-blur-md shadow-lg shadow-black/20')
        : 'border-b border-transparent bg-transparent'
        }`}
    >
      <nav className="flex h-18 sm:h-20 md:h-22 lg:h-24 items-center justify-between px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16 w-full">
        <a
          href={page === 'index' ? '#top' : 'index.html#top'}
          className="group flex flex-col justify-center gap-1 focus:outline-none shrink-0 mr-2 sm:mr-4"
          aria-label="Prism Tone — back to top"
        >
          <img
            src="/images/prism-tone-logo.png"
            alt="Prism Tone"
            className="h-8 sm:h-9 md:h-11 lg:h-13 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span className="whitespace-nowrap font-stencil text-[7.5px] sm:text-[8.5px] md:text-[9.5px] lg:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.25em] text-[#f9eed8]/80 transition-colors duration-300 group-hover:text-[#f9eed8]">
            [N · 37.7749° / W · 122.4194°]
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-8 2xl:gap-10 shrink-0">
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={hrefFor(href)}
              className={`font-ui text-[9px] sm:text-[10.5px] md:text-[11.5px] lg:text-[12.5px] xl:text-[13.5px] uppercase tracking-[0.09em] sm:tracking-[0.13em] md:tracking-[0.16em] xl:tracking-[0.22em] font-medium transition-colors duration-300 shrink-0 ${isActive(label)
                ? 'text-[#f9eed8]'
                : 'text-[#f9eed8]/80 hover:text-[#f9eed8]'
                }`}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
    </motion.header>
  )
}

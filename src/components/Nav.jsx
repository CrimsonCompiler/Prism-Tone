import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { EASE } from './ui'

const LINKS = [
  ['Concept', '#concept'],
  ['Translation', '#translation'],
  ['Experience', '#experience'],
  ['Prism System', 'system.html'],
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
        ? 'border-b border-ivory/10 bg-ink/90 backdrop-blur-md shadow-lg shadow-black/20'
        : 'border-b border-transparent bg-transparent'
        }`}
    >
      <nav className="flex h-24 md:h-28 items-center justify-between px-6 md:px-12 lg:px-16">
        <a
          href={page === 'index' ? '#top' : 'index.html#top'}
          className="group flex flex-col justify-center gap-1.5 focus:outline-none"
          aria-label="Prism Tone — back to top"
        >
          <img
            src="/images/prism-tone-logo.png"
            alt="Prism Tone"
            className="h-11 w-auto md:h-14 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span className="whitespace-nowrap font-stencil text-[8.5px] md:text-[10px] uppercase tracking-[0.25em] text-[#f9eed8]/80 transition-colors duration-300 group-hover:text-[#f9eed8]">
            [N · 37.7749° / W · 122.4194°]
          </span>
        </a>

        <div className="hidden items-center gap-8 lg:flex xl:gap-10">
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={hrefFor(href)}
              className={`font-ui text-[13px] md:text-[14px] uppercase tracking-[0.22em] font-medium transition-colors duration-300 ${isActive(label)
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

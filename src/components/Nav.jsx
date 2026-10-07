import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { EASE } from './ui'

const LINKS = [
  ['Concept', '#data'],
  ['Prism System', '#system'],
  ['Team', '#team'],
  ['Preview', '#experience'],
  ['Phenomena', '#translation'],
  ['Stories', 'stories.html'],
]

export default function Nav({ page = 'index' }) {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 80))

  const hrefFor = (href) =>
    page === 'index' ? href : href.startsWith('#') ? `index.html${href}` : href

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.5, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ${
        solid ? 'border-b border-ivory/10 bg-ink/90' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="flex h-16 items-center justify-between px-6 md:px-12">
        <a
          href={page === 'index' ? '#top' : 'index.html#top'}
          className="flex flex-col justify-center gap-1"
          aria-label="Prism Tone — back to top"
        >
          <img
            src="/images/prism-tone-logo.png"
            alt="Prism Tone"
            className="h-7 w-auto md:h-8"
          />
          <span className="whitespace-nowrap font-stencil text-[7px] uppercase tracking-[0.22em] text-parchment">
            (N · 37.7749° / W · 122.4194° ORBIT ALT 408 KM)
          </span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={label}
              href={hrefFor(href)}
              className={`font-ui text-[10px] uppercase tracking-[0.28em] transition-colors duration-300 ${
                page === 'stories' && label === 'Stories'
                  ? 'text-ivory'
                  : 'text-cream/55 hover:text-ivory'
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

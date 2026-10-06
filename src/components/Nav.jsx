import { useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { EASE } from './ui'

const LINKS = [
  ['Data', '#data'],
  ['Translation', '#translation'],
  ['System', '#system'],
  ['Experience', '#experience'],
  ['Stories', '#stories'],
  ['Access', '#access'],
]

export default function Nav() {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 80))

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
        <a href="#top" className="flex items-baseline gap-3" aria-label="Prism Tone — back to top">
          <span className="font-display text-lg tracking-[0.06em] text-ivory">PRISM TONE</span>
          <span className="hidden font-stencil text-[8px] uppercase tracking-[0.3em] text-parchment sm:inline">
            V.01
          </span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="font-ui text-[10px] uppercase tracking-[0.28em] text-cream/55 transition-colors duration-300 hover:text-ivory"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-block h-1 w-1 bg-ember" aria-hidden="true" />
          <span className="font-stencil text-[9px] uppercase tracking-[0.3em] text-beige">
            Space Apps '26
          </span>
        </div>
      </nav>
    </motion.header>
  )
}

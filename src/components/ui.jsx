import { motion } from 'motion/react'

export const EASE = [0.16, 1, 0.3, 1]

/* Tiny stencil / scientific annotation label */
export function Kicker({ children, className = '', center = false }) {
  return (
    <p
      className={`font-stencil uppercase text-[10px] md:text-[11px] tracking-[0.42em] text-beige ${center ? 'text-center' : ''} ${className}`}
    >
      {children}
    </p>
  )
}

/* Masked line reveal — the core editorial text motion */
export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block will-change-transform"
        initial={{ y: '115%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true, margin: '-6% 0px -6% 0px' }}
        transition={{ duration: 1.2, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  )
}

/* Soft editorial fade-up */
export function Fade({ children, delay = 0, y = 24, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* Thin technical divider with section marker — like a film leader */
export function Rule({ index, label, meta, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-6 border-t border-ivory/15 pt-3 ${className}`}>
      <span className="font-stencil uppercase text-[9px] md:text-[10px] tracking-[0.38em] text-beige">
        {index} <span className="mx-1 text-parchment">/</span> {label}
      </span>
      {meta && (
        <span className="truncate font-data text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-parchment/80">
          {meta}
        </span>
      )}
    </div>
  )
}

/* Tiny scientific annotation with a registration mark */
export function Annot({ children, className = '' }) {
  return (
    <p
      className={`font-stencil uppercase text-[8px] md:text-[9px] tracking-[0.28em] text-parchment ${className}`}
    >
      <span className="mr-2 text-ivory/40">+</span>
      {children}
    </p>
  )
}

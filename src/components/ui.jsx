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
        viewport={{ once: true }}
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
      viewport={{ once: true }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* Thin technical header with section marker — like a film leader */
export function Rule({ index, label, meta, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between gap-6 pt-2 ${className}`}>
      <span className="font-stencil uppercase text-[10.5px] md:text-[12px] tracking-[0.38em] text-[#f2ede3]">
        {index} <span className="mx-1 text-[#8ea792]">/</span> {label}
      </span>
      {meta && (
        <span className="truncate font-data text-[10px] md:text-[11.5px] uppercase tracking-[0.22em] text-[#cad7ce]">
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
      className={`font-stencil uppercase text-[10.5px] md:text-[12px] tracking-[0.26em] text-[#d4decb] ${className}`}
    >
      <span className="mr-2 text-white/50">+</span>
      {children}
    </p>
  )
}

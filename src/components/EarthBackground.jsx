import { motion } from 'motion/react'

export default function EarthBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* 1. Base earthy tone: softened with an ivory undertone (less dark) */}
      <div className="absolute inset-0 bg-[#1e2a2c]" />

      {/* 2. Soft Earth Swatches: #3f75bb (oceanic atmosphere) and #739a69 (terrestrial moss) */}

      {/* Atmospheric blue (#3f75bb) swatch - top right wash */}
      <motion.div
        animate={{
          opacity: [0.22, 0.28, 0.22],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[12%] -right-[8%] w-[70vw] h-[70vw] max-w-[850px] max-h-[850px] rounded-full blur-[95px]"
        style={{
          background: 'radial-gradient(circle, #3f75bb 0%, rgba(63, 117, 187, 0.42) 45%, transparent 72%)',
        }}
      />

      {/* Earthy sage green (#739a69) swatch - bottom left wash */}
      <motion.div
        animate={{
          opacity: [0.22, 0.28, 0.22],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-[12%] -left-[8%] w-[70vw] h-[70vw] max-w-[850px] max-h-[850px] rounded-full blur-[95px]"
        style={{
          background: 'radial-gradient(circle, #739a69 0%, rgba(115, 154, 105, 0.42) 45%, transparent 72%)',
        }}
      />

      {/* Midpoint soft organic blend swatch - subtle meeting of ocean & land */}
      <div
        className="absolute top-[35%] left-[30%] w-[55vw] h-[55vw] max-w-[680px] max-h-[680px] rounded-full blur-[110px] opacity-[0.16]"
        style={{
          background: 'radial-gradient(ellipse at 45% 45%, #739a69 0%, #3f75bb 55%, transparent 75%)',
        }}
      />

      {/* Subtle upper-left atmosphere blue highlight */}
      <div
        className="absolute top-[16%] left-[8%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full blur-[90px] opacity-[0.15]"
        style={{
          background: 'radial-gradient(circle, #3f75bb 0%, transparent 68%)',
        }}
      />

      {/* Subtle lower-right terrain green highlight */}
      <div
        className="absolute bottom-[16%] right-[10%] w-[44vw] h-[44vw] max-w-[540px] max-h-[540px] rounded-full blur-[90px] opacity-[0.18]"
        style={{
          background: 'radial-gradient(circle, #739a69 0%, transparent 68%)',
        }}
      />

      {/* 3. Subtle tactile grainy / texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.065] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Soft ivory edge wash: reduces outer dark shade with gentle ivory warmth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 42%, rgba(242, 237, 227, 0.055) 100%)',
        }}
      />
    </div>
  )
}

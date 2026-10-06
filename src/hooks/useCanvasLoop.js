import { useEffect, useRef } from 'react'

/**
 * Drives a <canvas> with a time-based draw loop that only runs while the
 * canvas is on screen, halts for prefers-reduced-motion (draws one static
 * frame instead), and redraws on resize.
 *
 * draw: (ctx, cssWidth, cssHeight, timeSeconds) => void
 */
export function useCanvasLoop(drawRef, { fps = 60 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let running = false
    let last = 0
    const t0 = performance.now()

    const render = (t) => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      if (w < 2 || h < 2) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawRef.current?.(ctx, w, h, t)
    }

    const drawOnce = () => render(2.4)

    const frame = (now) => {
      if (!running) {
        raf = 0
        return
      }
      if (now - last >= 1000 / fps) {
        last = now
        render((now - t0) / 1000)
      }
      raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
      if (!running) drawOnce()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const shouldRun = entry.isIntersecting && !reduced
        if (shouldRun && !running) {
          running = true
          last = 0
          raf = requestAnimationFrame(frame)
        } else if (!shouldRun) {
          running = false
          if (entry.isIntersecting && reduced) drawOnce()
        }
      },
      { rootMargin: '140px' },
    )
    io.observe(canvas)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    return () => {
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      running = false
    }
  }, [drawRef, fps])

  return ref
}

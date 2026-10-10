import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * Custom hook providing oval.earth-inspired inertial smooth scrolling
 * utilizing Lenis linear interpolation (lerp) for physical, buttery-smooth gliding.
 */
export function useLenisScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      lerp: 0.085, // Fluid momentum rate matching modern Awwwards / oval.earth experience
      wheelMultiplier: 0.95, // Balanced scroll step
      touchMultiplier: 1.5,
      smoothWheel: true,
      syncTouch: false,
    })
    window.__lenis = lenis

    let rafId
    const loop = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const targetId = a.getAttribute('href')
      const el = document.querySelector(targetId)
      if (!el) return
      e.preventDefault()
      lenis.scrollTo(el, {
        duration: 1.8,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      })
    }
    document.addEventListener('click', onClick)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('click', onClick)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])
}

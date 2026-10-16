import { useEffect, useState } from 'react'

/**
 * Tracks whether the Hero section is active and within or near the viewport.
 * Because Hero has `sticky top-[-45vh]`, IntersectionObserver always sees it as intersecting.
 * This hook checks scroll position (supporting both native scroll and Lenis virtual scroll)
 * so heavy WebGL, canvas rAF, and dust animations can be suspended while covered by stack-cards
 * and seamlessly resumed as soon as the user scrolls back to Hero.
 */
export function useHeroActive(factor = 1.25) {
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const getScrollY = () => {
      if (window.__lenis && typeof window.__lenis.scroll === 'number') {
        return window.__lenis.scroll
      }
      return window.scrollY || document.documentElement.scrollTop || 0
    }

    const check = () => {
      const scrollY = getScrollY()
      const threshold = window.innerHeight * factor
      const isHeroVisible = scrollY < threshold
      const isDocVisible = !document.hidden
      setActive(isHeroVisible && isDocVisible)
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })
    document.addEventListener('visibilitychange', check)

    let lenisBound = false
    let lenisTimer = null

    const bindLenis = () => {
      if (window.__lenis && typeof window.__lenis.on === 'function') {
        window.__lenis.on('scroll', check)
        lenisBound = true
      }
    }

    bindLenis()
    if (!lenisBound) {
      lenisTimer = setTimeout(bindLenis, 250)
    }

    return () => {
      if (lenisTimer) clearTimeout(lenisTimer)
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      document.removeEventListener('visibilitychange', check)
      if (lenisBound && window.__lenis && typeof window.__lenis.off === 'function') {
        try {
          window.__lenis.off('scroll', check)
        } catch {
          // ignore
        }
      }
    }
  }, [factor])

  return active
}

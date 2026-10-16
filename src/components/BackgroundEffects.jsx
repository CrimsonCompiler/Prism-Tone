import { useEffect, useRef } from 'react'
import { useHeroActive } from '../hooks/useHeroActive'

export default function BackgroundEffects() {
  const heroActive = useHeroActive(1.25)
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const heroActiveRef = useRef(heroActive)
  heroActiveRef.current = heroActive

  const loopControls = useRef({ start: null, stop: null })

  // Synchronize rAF particle animation loop with hero visibility
  useEffect(() => {
    if (heroActive) {
      loopControls.current.start?.()
    } else {
      loopControls.current.stop?.()
    }
  }, [heroActive])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let rafId = null
    let running = false
    let particles = []
    let winW = container.clientWidth || window.innerWidth
    let winH = container.clientHeight || window.innerHeight
    let mouseX = winW / 2
    let mouseY = winH / 2
    let tiltX = 0
    let tiltY = 0

    const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    const options = {
      minSpeedX: 0.1,
      maxSpeedX: 0.55,
      minSpeedY: 0.1,
      maxSpeedY: 0.55,
      density: 13000,
      dotColor: 'rgba(242, 237, 227, 0.42)',
      lineColor: 'rgba(242, 237, 227, 0.13)',
      particleRadius: 5.5,
      proximity: 110,
      parallax: true,
      parallaxMultiplier: 5,
    }

    class Particle {
      constructor(stackPos) {
        this.stackPos = stackPos
        this.layer = Math.ceil(Math.random() * 3) // 3D depth layer: 1, 2, or 3
        this.parallaxOffsetX = 0
        this.parallaxOffsetY = 0
        this.parallaxTargX = 0
        this.parallaxTargY = 0

        this.position = {
          x: Math.random() * winW,
          y: Math.random() * winH,
        }

        const sx = -options.maxSpeedX / 2 + Math.random() * options.maxSpeedX
        this.speedX = sx + (sx > 0 ? options.minSpeedX : -options.minSpeedX)

        const sy = -options.maxSpeedY / 2 + Math.random() * options.maxSpeedY
        this.speedY = sy + (sy > 0 ? options.minSpeedY : -options.minSpeedY)
      }

      updatePosition() {
        if (options.parallax) {
          let pointerX = mouseX
          let pointerY = mouseY

          if (!isDesktop && (tiltX !== 0 || tiltY !== 0)) {
            const ratioX = winW / 60
            pointerX = (tiltX - -30) * ratioX
            const ratioY = winH / 60
            pointerY = (tiltY - -30) * ratioY
          }

          this.parallaxTargX = (pointerX - winW / 2) / (options.parallaxMultiplier * this.layer)
          this.parallaxOffsetX += (this.parallaxTargX - this.parallaxOffsetX) / 12
          this.parallaxTargY = (pointerY - winH / 2) / (options.parallaxMultiplier * this.layer)
          this.parallaxOffsetY += (this.parallaxTargY - this.parallaxOffsetY) / 12
        }

        if (
          this.position.x + this.speedX + this.parallaxOffsetX > winW ||
          this.position.x + this.speedX + this.parallaxOffsetX < 0
        ) {
          this.speedX = -this.speedX
        }
        if (
          this.position.y + this.speedY + this.parallaxOffsetY > winH ||
          this.position.y + this.speedY + this.parallaxOffsetY < 0
        ) {
          this.speedY = -this.speedY
        }

        this.position.x += this.speedX
        this.position.y += this.speedY
      }
    }

    function resize() {
      const rect = container.getBoundingClientRect()
      winW = Math.max(300, rect.width || window.innerWidth)
      winH = Math.max(300, rect.height || window.innerHeight)
      canvas.width = winW
      canvas.height = winH

      const targetCount = Math.min(100, Math.round((winW * winH) / options.density))

      if (targetCount > particles.length) {
        while (particles.length < targetCount) {
          particles.push(new Particle(particles.length))
        }
      } else if (targetCount < particles.length) {
        particles.splice(targetCount)
      }

      particles.forEach((p, idx) => {
        p.stackPos = idx
      })
    }

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }

    function onDeviceOrientation(e) {
      if (e.beta !== null && e.gamma !== null) {
        tiltY = Math.min(Math.max(-e.beta, -30), 30)
        tiltX = Math.min(Math.max(-e.gamma, -30), 30)
      }
    }

    let resizeTimer = null
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 120)
    }

    resize()

    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    if (window.DeviceOrientationEvent && !isDesktop) {
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })
    }

    let lastFrame = 0
    const frameInterval = 1000 / 50

    function loop(now = performance.now()) {
      if (!running) return
      rafId = requestAnimationFrame(loop)

      if (now - lastFrame < frameInterval) return
      lastFrame = now

      ctx.clearRect(0, 0, winW, winH)

      // 1. Update all particle positions
      const len = particles.length
      for (let i = 0; i < len; i++) {
        particles[i].updatePosition()
      }

      // 2. Batched proximity lines - single stroke call for all lines
      const prox = options.proximity
      const proxSq = prox * prox
      ctx.beginPath()
      ctx.strokeStyle = options.lineColor
      ctx.lineWidth = 1

      for (let i = 0; i < len; i++) {
        const p1 = particles[i]
        const p1x = p1.position.x + p1.parallaxOffsetX
        const p1y = p1.position.y + p1.parallaxOffsetY

        for (let j = i + 1; j < len; j++) {
          const p2 = particles[j]
          const p2x = p2.position.x + p2.parallaxOffsetX
          const dx = p1x - p2x
          if (Math.abs(dx) > prox) continue

          const p2y = p2.position.y + p2.parallaxOffsetY
          const dy = p1y - p2y
          if (Math.abs(dy) > prox) continue

          const distSq = dx * dx + dy * dy
          if (distSq < proxSq) {
            ctx.moveTo(p1x, p1y)
            ctx.lineTo(p2x, p2y)
          }
        }
      }
      ctx.stroke()

      // 3. Batched particle dots
      ctx.fillStyle = options.dotColor
      for (let i = 0; i < len; i++) {
        const p = particles[i]
        const px = p.position.x + p.parallaxOffsetX
        const py = p.position.y + p.parallaxOffsetY
        const r = (options.particleRadius / 2) * (0.65 + p.layer * 0.22)

        ctx.beginPath()
        ctx.arc(px, py, Math.max(1, r), 0, Math.PI * 2, true)
        ctx.fill()
      }
    }

    const startLoop = () => {
      if (running) return
      running = true
      lastFrame = 0
      rafId = requestAnimationFrame(loop)
    }

    const stopLoop = () => {
      running = false
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    loopControls.current = { start: startLoop, stop: stopLoop }

    if (heroActiveRef.current && !document.hidden) {
      startLoop()
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop()
      } else if (heroActiveRef.current) {
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopLoop()
      clearTimeout(resizeTimer)
      loopControls.current = { start: null, stop: null }
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (window.DeviceOrientationEvent && !isDesktop) {
        window.removeEventListener('deviceorientation', onDeviceOrientation)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 3D Interactive Connected Particles (Particleground) Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Cosmic Dust Particle Drift Animation — strictly Hero-scoped */}
      <div
        className={`bg-animation absolute inset-0 h-full w-full opacity-65 ${
          heroActive ? '' : 'is-paused'
        }`}
        style={{ contain: 'strict' }}
      >
        <div id="stars" />
        <div id="stars2" />
        <div id="stars3" />
        <div id="stars4" />
      </div>
    </div>
  )
}

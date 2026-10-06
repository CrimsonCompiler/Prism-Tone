import { useEffect, useRef } from 'react'

export default function BackgroundEffects() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId
    let particles = []
    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let winW = window.innerWidth
    let winH = window.innerHeight
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

        const sx = (-options.maxSpeedX / 2 + Math.random() * options.maxSpeedX)
        this.speedX = sx + (sx > 0 ? options.minSpeedX : -options.minSpeedX)

        const sy = (-options.maxSpeedY / 2 + Math.random() * options.maxSpeedY)
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

        if (this.position.x + this.speedX + this.parallaxOffsetX > winW || this.position.x + this.speedX + this.parallaxOffsetX < 0) {
          this.speedX = -this.speedX
        }
        if (this.position.y + this.speedY + this.parallaxOffsetY > winH || this.position.y + this.speedY + this.parallaxOffsetY < 0) {
          this.speedY = -this.speedY
        }

        this.position.x += this.speedX
        this.position.y += this.speedY
      }

      draw() {
        const px = this.position.x + this.parallaxOffsetX
        const py = this.position.y + this.parallaxOffsetY

        // Draw particle dot with size & alpha modulated by depth layer
        ctx.beginPath()
        const r = (options.particleRadius / 2) * (0.65 + this.layer * 0.22)
        ctx.arc(px, py, Math.max(1, r), 0, Math.PI * 2, true)
        ctx.fillStyle = options.dotColor
        ctx.fill()
        ctx.closePath()

        // Proximity lines between particles
        for (let i = particles.length - 1; i > this.stackPos; i--) {
          const p2 = particles[i]
          const p2x = p2.position.x + p2.parallaxOffsetX
          const p2y = p2.position.y + p2.parallaxOffsetY

          const dx = px - p2x
          const dy = py - p2y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < options.proximity) {
            ctx.beginPath()
            ctx.moveTo(px, py)
            ctx.lineTo(p2x, p2y)
            ctx.strokeStyle = options.lineColor
            ctx.stroke()
            ctx.closePath()
          }
        }
      }
    }

    function resize() {
      winW = window.innerWidth
      winH = window.innerHeight
      canvas.width = winW
      canvas.height = winH

      const targetCount = Math.min(120, Math.round((winW * winH) / options.density))

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
      mouseX = e.clientX
      mouseY = e.clientY
    }

    function onDeviceOrientation(e) {
      if (e.beta !== null && e.gamma !== null) {
        tiltY = Math.min(Math.max(-e.beta, -30), 30)
        tiltX = Math.min(Math.max(-e.gamma, -30), 30)
      }
    }

    resize()

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    if (window.DeviceOrientationEvent && !isDesktop) {
      window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })
    }

    function loop() {
      ctx.clearRect(0, 0, winW, winH)

      for (let i = 0; i < particles.length; i++) {
        particles[i].updatePosition()
      }
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw()
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      if (window.DeviceOrientationEvent && !isDesktop) {
        window.removeEventListener('deviceorientation', onDeviceOrientation)
      }
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 3D Interactive Connected Particles (Particleground) Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Whole Page Cosmic Dust Particle Drift Animation */}
      <div className="bg-animation absolute inset-0 h-full w-full opacity-65">
        <div id="stars" />
        <div id="stars2" />
        <div id="stars3" />
        <div id="stars4" />
      </div>
    </div>
  )
}

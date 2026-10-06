import { useRef } from 'react'
import { useCanvasLoop } from '../hooks/useCanvasLoop'

/* ————— palette (warm monochrome, ember only as muted data accent) ————— */
const IVORY = (a) => `rgba(242, 237, 227, ${a})`
const BEIGE = (a) => `rgba(177, 166, 140, ${a})`
const EMBER = (a) => `rgba(193, 154, 91, ${a})`

/* deterministic hash noise */
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const smooth = (f) => f * f * (3 - 2 * f)

function line(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.stroke()
}

function tag(ctx, text, x, y, { alpha = 0.5, size = 8, align = 'left', color = BEIGE } = {}) {
  ctx.save()
  ctx.font = `${size}px "Oxanium", "Titillium Web", sans-serif`
  ctx.textAlign = align
  ctx.fillStyle = color(alpha)
  try {
    ctx.letterSpacing = '2px'
  } catch {}
  ctx.fillText(text.toUpperCase(), x, y)
  ctx.restore()
}

function qpoint(ax, ay, cx, cy, bx, by, p) {
  const o = 1 - p
  return [
    o * o * ax + 2 * o * p * cx + p * p * bx,
    o * o * ay + 2 * o * p * cy + p * p * by,
  ]
}

/* ————————————————————————————————————————————————————————
   SIGNAL FIELD — section 01 · four data traces evolving live
———————————————————————————————————————————————————————— */
function drawSignalField(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h)
  const lanes = [
    { y: h * 0.14, label: 'T — anomaly' },
    { y: h * 0.38, label: 'U — wind' },
    { y: h * 0.62, label: 'precip' },
    { y: h * 0.86, label: 'sea ice' },
  ]

  ctx.lineWidth = 1
  for (const { y, label } of lanes) {
    ctx.strokeStyle = IVORY(0.08)
    line(ctx, [[0, y], [w, y]])
    tag(ctx, label, 2, y - 9, { alpha: 0.45, size: 8 })
  }

  /* temperature — a curve slowly climbing */
  {
    const y = lanes[0].y
    const f = (x) => {
      const v =
        Math.sin(x * 0.006 + t * 0.28) * 0.5 +
        Math.sin(x * 0.017 - t * 0.22) * 0.3 +
        Math.sin(x * 0.041 + t * 0.5) * 0.16
      return y - 7 - (v * 0.5 + 0.5) * 17 - (Math.sin(t * 0.12) * 0.5 + 0.5) * 7
    }
    ctx.strokeStyle = IVORY(0.85)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let x = 0; x <= w; x += 4) {
      const yy = f(x)
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    }
    ctx.stroke()
    const ph = ((t * 38) % (w + 60)) - 30
    ctx.lineWidth = 1
    ctx.strokeStyle = IVORY(0.18)
    line(ctx, [[ph, y - 34], [ph, y + 6]])
    ctx.fillStyle = IVORY(0.95)
    ctx.beginPath()
    ctx.arc(ph, f(Math.max(0, ph)), 2.2, 0, Math.PI * 2)
    ctx.fill()
    tag(ctx, '+0.28°c / dec', ph + 8, y - 30, { alpha: 0.4, size: 7 })
  }

  /* wind — drifting vector dashes at varying speed */
  {
    const y = lanes[1].y
    for (let i = 0; i < 30; i++) {
      const s = hash(i)
      const speed = 24 + s * 90
      const x = (s * w + t * speed) % (w + 30)
      const yy = y + (hash(i + 50) - 0.5) * 20
      const len = 5 + hash(i + 90) * 16
      ctx.strokeStyle = IVORY(0.12 + hash(i + 7) * 0.4)
      line(ctx, [[x, yy], [x + len, yy]])
    }
  }

  /* rainfall — rhythmic falling ticks */
  {
    const y = lanes[2].y
    ctx.strokeStyle = IVORY(0.16)
    line(ctx, [[0, y + 14], [w, y + 14]])
    for (let i = 0; i < 44; i++) {
      const s = hash(i + 3)
      const period = 1.1 + hash(i + 9) * 1.9
      const ph = ((t * 0.9 + s * period) % period) / period
      const x = s * w
      const yy = y - 11 + ph * 24
      ctx.strokeStyle = IVORY(Math.sin(ph * Math.PI) * 0.55)
      line(ctx, [[x, yy], [x, yy + 4 + hash(i + 21) * 3]])
    }
  }

  /* sea ice — stepped contour drifting */
  {
    const y = lanes[3].y
    ctx.strokeStyle = IVORY(0.6)
    ctx.lineWidth = 1.1
    ctx.beginPath()
    for (let x = 0; x <= w; x += 5) {
      const u = x / 34 + t * 0.3
      const i = Math.floor(u)
      const v = (hash(i) + (hash(i + 1) - hash(i)) * smooth(u % 1) - 0.5) * 13
      const yy = y + 3 + v
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
}

/* ————————————————————————————————————————————————————————
   MAPPING VIZ — section 02 · one behavior per mapping row
———————————————————————————————————————————————————————— */
function drawMapping(ctx, w, h, t, type) {
  ctx.clearRect(0, 0, w, h)
  ctx.lineWidth = 1
  /* faint measurement grid */
  ctx.strokeStyle = IVORY(0.05)
  for (let x = 44; x < w; x += 44) line(ctx, [[x, 4], [x, h - 4]])

  if (type === 'rise') {
    const base = h * 0.84
    const f = (x) => {
      const p = x / w
      return base - Math.pow(p, 1.35) * h * 0.52 - Math.sin(x * 0.05 + t * 0.8) * 2.5 * (0.3 + p)
    }
    ctx.strokeStyle = IVORY(0.14)
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) x === 0 ? ctx.moveTo(x, f(x)) : ctx.lineTo(x, f(x))
    ctx.stroke()
    const ph = ((t * 0.13) % 1.18)
    const lim = Math.min(1, ph) * w
    ctx.strokeStyle = IVORY(0.9)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let x = 0; x <= lim; x += 3) x === 0 ? ctx.moveTo(x, f(x)) : ctx.lineTo(x, f(x))
    ctx.stroke()
    ctx.fillStyle = IVORY(0.95)
    ctx.beginPath()
    ctx.arc(lim, f(lim), 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = IVORY(0.3)
    line(ctx, [[lim, h - 6], [lim, f(lim)]])
    tag(ctx, 'anomaly', 4, 12, { alpha: 0.4, size: 7 })
  }

  if (type === 'gust') {
    const f = (x) => {
      const p = x / w
      const freq = 0.018 + p * 0.1
      return (
        h * 0.5 +
        Math.sin(x * freq - t * (1.6 + p * 4.2)) * h * 0.3 * (0.3 + p * 0.7) +
        Math.sin(x * freq * 2.7 + t * 1.2) * 3
      )
    }
    ctx.strokeStyle = IVORY(0.28)
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) x === 0 ? ctx.moveTo(x, f(x + 14)) : ctx.lineTo(x, f(x + 14))
    ctx.stroke()
    ctx.strokeStyle = IVORY(0.85)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) x === 0 ? ctx.moveTo(x, f(x)) : ctx.lineTo(x, f(x))
    ctx.stroke()
    tag(ctx, 'm/s', 4, 12, { alpha: 0.4, size: 7 })
  }

  if (type === 'drops') {
    const base = h * 0.82
    ctx.strokeStyle = IVORY(0.2)
    line(ctx, [[0, base], [w, base]])
    for (let c = 0; c < 8; c++) {
      const colX = w * (0.05 + c * 0.13)
      for (let j = 0; j < 2; j++) {
        const seed = c * 7 + j
        const period = 0.85 + hash(seed) * 0.9
        const ph = ((t + hash(seed + 1) * period) % period) / period
        const yy = h * 0.1 + ph * (base - h * 0.1)
        ctx.strokeStyle = IVORY(Math.sin(ph * Math.PI) * 0.65)
        line(ctx, [[colX + hash(seed + 4) * 14, yy], [colX + hash(seed + 4) * 14, yy + 4.5]])
      }
      const beat = hash(c + Math.floor(t * 1.6) * 13)
      if (beat > 0.62) {
        ctx.strokeStyle = IVORY((beat - 0.62) * 1.2)
        line(ctx, [[colX + 2, base + 4], [colX + 12, base + 4]])
      }
    }
    tag(ctx, 'mm/h', 4, 12, { alpha: 0.4, size: 7 })
  }

  if (type === 'timbre') {
    const f = (x) => {
      const u = x / 15
      const i = Math.floor(u)
      const v = (hash(i) + (hash(i + 1) - hash(i)) * smooth(u % 1) - 0.5) * h * 0.34
      return h * 0.5 + v + Math.sin(x * 0.02 + t * 0.5) * 2
    }
    ctx.strokeStyle = IVORY(0.8)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) x === 0 ? ctx.moveTo(x, f(x)) : ctx.lineTo(x, f(x))
    ctx.stroke()
    for (let k = 0; k < 22; k++) {
      const x = hash(k + 31) * w
      const alpha = 0.1 + hash(k + 61) * 0.25
      ctx.strokeStyle = IVORY(alpha)
      line(ctx, [[x, h * 0.52], [x, h * 0.52 + 6 + hash(k + 91) * 12]])
    }
    tag(ctx, 'texture', 4, 12, { alpha: 0.4, size: 7 })
  }
}

export function MappingViz({ type, className = '' }) {
  const drawRef = useRef((ctx, w, h, t) => drawMapping(ctx, w, h, t, type))
  const ref = useCanvasLoop(drawRef, { fps: 48 })
  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={`Data-to-sound mapping visualization: ${type}`}
    />
  )
}

/* ————————————————————————————————————————————————————————
   STORY WAVE — section 05 · each phenomenon has a voice
———————————————————————————————————————————————————————— */
function drawStoryWave(ctx, w, h, t, type) {
  ctx.clearRect(0, 0, w, h)
  ctx.lineWidth = 1

  const envelope = (x) => Math.pow(Math.sin((Math.PI * x) / w), 1.1)

  if (type === 'rise') {
    const base = h * 0.8
    ctx.strokeStyle = IVORY(0.12)
    line(ctx, [[0, base], [w, base]])
    ctx.strokeStyle = IVORY(0.85)
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) {
      const p = x / w
      const y = base - Math.pow(p, 1.4) * h * 0.55 - Math.sin(x * 0.06 + t * 0.9) * 1.8
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  if (type === 'gust') {
    ctx.strokeStyle = IVORY(0.8)
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) {
      const p = x / w
      const y =
        h * 0.5 +
        Math.sin(x * (0.02 + p * 0.09) - t * (1.4 + p * 3.4)) * h * 0.34 * envelope(x) * (0.35 + p * 0.65)
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  if (type === 'drops') {
    const base = h * 0.84
    ctx.strokeStyle = IVORY(0.18)
    line(ctx, [[0, base], [w, base]])
    for (let i = 0; i < 34; i++) {
      const s = hash(i + 3)
      const period = 0.9 + hash(i + 9) * 1.6
      const ph = ((t * 0.9 + s * period) % period) / period
      const x = s * w
      const yy = h * 0.12 + ph * (base - h * 0.12)
      ctx.strokeStyle = IVORY(Math.sin(ph * Math.PI) * 0.5 * envelope(x))
      line(ctx, [[x, yy], [x, yy + 3.5]])
    }
  }

  if (type === 'crackle') {
    ctx.strokeStyle = IVORY(0.75)
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) {
      const u = x / 11 + t * 0.22
      const i = Math.floor(u)
      const v = (hash(i) + (hash(i + 1) - hash(i)) * smooth(u % 1) - 0.5) * h * 0.42
      const y = h * 0.5 + v * envelope(x)
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  if (type === 'flicker') {
    const base = h * 0.78
    ctx.strokeStyle = IVORY(0.16)
    line(ctx, [[0, base], [w, base]])
    for (let i = 0; i < 60; i++) {
      const s = hash(i)
      const ph = ((t * 0.32 + s) % 1)
      const x = s * w
      const y = base - ph * h * 0.55
      const flick = Math.sin(t * 5 + hash(i + 17) * 40)
      if (flick < 0) continue
      ctx.fillStyle = EMBER((1 - ph) * 0.55 * envelope(x) * flick)
      ctx.fillRect(x, y, 1.6, 1.6)
    }
    ctx.fillStyle = IVORY(0.5)
    for (let i = 0; i < 14; i++) {
      const x = hash(i + 201) * w
      const y = base - hash(i + 211) * 5
      if (Math.sin(t * 4 + hash(i + 221) * 30) > 0.3) ctx.fillRect(x, y, 1.4, 1.4)
    }
  }
}

export function StoryWave({ type, className = '' }) {
  const drawRef = useRef((ctx, w, h, t) => drawStoryWave(ctx, w, h, t, type))
  const ref = useCanvasLoop(drawRef, { fps: 45 })
  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={`Sound signature of ${type}`}
    />
  )
}

/* ————————————————————————————————————————————————————————
   WAVEFORM — hero outro / final CTA · slow breathing master
———————————————————————————————————————————————————————— */
function drawWaveform(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h)
  const layers = [
    { a: 0.9, lw: 1.3, f: 0.009, sp: 0.7 },
    { a: 0.34, lw: 1, f: 0.016, sp: 1.1 },
    { a: 0.15, lw: 1, f: 0.027, sp: 1.7 },
  ]
  for (const { a, lw, f, sp } of layers) {
    ctx.strokeStyle = IVORY(a)
    ctx.lineWidth = lw
    ctx.beginPath()
    for (let x = 0; x <= w; x += 3) {
      const env = Math.pow(Math.sin((Math.PI * x) / w), 1.25)
      const y =
        h * 0.5 +
        (Math.sin(x * f + t * sp) * 0.7 + Math.sin(x * f * 2.6 - t * sp * 1.5) * 0.3) *
          h * 0.36 *
          env *
          (0.85 + 0.15 * Math.sin(t * 0.35))
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export function Waveform({ className = '' }) {
  const drawRef = useRef(drawWaveform)
  const ref = useCanvasLoop(drawRef, { fps: 45 })
  return <canvas ref={ref} className={className} role="img" aria-label="A slowly moving audio waveform" />
}

/* ————————————————————————————————————————————————————————
   PRISM — section 03 · one beam, five spectral voices
———————————————————————————————————————————————————————— */
function drawPrism(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h)

  /* faint Earth limb, left edge */
  const ecx = w * 0.1
  const ecy = h * 0.55
  ctx.lineWidth = 1
  ctx.strokeStyle = IVORY(0.14)
  ctx.beginPath()
  ctx.arc(ecx, ecy, h * 0.62, -Math.PI * 0.42, Math.PI * 0.28)
  ctx.stroke()
  ctx.strokeStyle = IVORY(0.05)
  ctx.beginPath()
  ctx.arc(ecx, ecy, h * 0.62 + 9, -Math.PI * 0.4, Math.PI * 0.26)
  ctx.stroke()

  const ax = w * 0.34
  const ay = h * 0.5
  tag(ctx, 'prism split — 5 voices', 14, 18, { alpha: 0.4, size: 8 })

  /* incoming beam + traveling pulse */
  ctx.strokeStyle = IVORY(0.8)
  ctx.lineWidth = 1.2
  line(ctx, [[-4, ay], [ax, ay]])
  const px = ((t * 130) % (ax + 20)) - 10
  ctx.fillStyle = IVORY(0.95)
  ctx.beginPath()
  ctx.arc(px, ay, 2, 0, Math.PI * 2)
  ctx.fill()

  /* apex */
  ctx.fillStyle = IVORY(0.9)
  ctx.beginPath()
  ctx.arc(ax, ay, 2.4, 0, Math.PI * 2)
  ctx.fillStyle = IVORY(0.25)
  ctx.beginPath()
  ctx.arc(ax, ay, 6 + Math.sin(t * 1.4) * 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = IVORY(0.9)
  ctx.beginPath()
  ctx.arc(ax, ay, 2.2, 0, Math.PI * 2)
  ctx.fill()

  const names = ['thermal', 'kinetic', 'hydro', 'cryo', 'pyro']
  for (let i = 0; i < 5; i++) {
    const yT = h * (0.14 + i * 0.18)
    const ex = w * 0.84
    const wob = Math.sin(t * 0.4 + i * 1.3) * 5
    const cxp = w * 0.58
    const cyp = (ay + yT) / 2 + wob
    const at = (p) => qpoint(ax, ay, cxp, cyp, ex, yT, p)

    if (i === 0) {
      /* thermal — smooth tone */
      ctx.strokeStyle = IVORY(0.8)
      ctx.lineWidth = 1.3
      ctx.beginPath()
      for (let k = 0; k <= 60; k++) {
        const [x, y] = at(k / 60)
        const yy = y + Math.sin(k * 0.5 + t * 1.6) * 1.2
        k === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
      }
      ctx.stroke()
    } else if (i === 1) {
      /* kinetic — accelerating pulses */
      ctx.strokeStyle = IVORY(0.7)
      ctx.lineWidth = 1.2
      ctx.setLineDash([9, 7])
      ctx.lineDashOffset = -t * 46
      ctx.beginPath()
      const [sx, sy] = at(0)
      ctx.moveTo(sx, sy)
      for (let k = 1; k <= 40; k++) {
        const [x, y] = at(k / 40)
        ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    } else if (i === 2) {
      /* hydro — droplets along the path */
      ctx.strokeStyle = IVORY(0.35)
      line(ctx, [at(0), at(1)])
      for (let k = 0; k < 8; k++) {
        const p = ((t * 0.28 + k / 8) % 1)
        const [x, y] = at(p)
        ctx.fillStyle = IVORY((1 - Math.abs(p - 0.5)) * 0.9)
        ctx.beginPath()
        ctx.arc(x, y, 1.7, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (i === 3) {
      /* cryo — brittle crystalline line */
      ctx.strokeStyle = IVORY(0.65)
      ctx.lineWidth = 1.1
      ctx.beginPath()
      for (let k = 0; k <= 34; k++) {
        const [x, y] = at(k / 34)
        const jitter = (hash(k + Math.floor(t * 0.6) * 7) - 0.5) * 3.2
        const yy = y + jitter
        k === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
      }
      ctx.stroke()
      for (let k = 1; k <= 6; k++) {
        const [x, y] = at(k / 7)
        ctx.strokeStyle = IVORY(0.25)
        line(ctx, [[x, y - 5], [x, y + 5]])
      }
    } else {
      /* pyro — flickering embers */
      for (let k = 0; k < 26; k++) {
        const p0 = k / 26
        const p1 = (k + 1) / 26
        const flick = hash(k + Math.floor(t * 9) * 31)
        if (flick < 0.35) continue
        const [x0, y0] = at(p0)
        const [x1, y1] = at(p1)
        ctx.strokeStyle = k % 3 === 0 ? EMBER(flick * 0.75) : IVORY(flick * 0.55)
        ctx.lineWidth = 1.2
        line(ctx, [[x0, y0], [x1, y1]])
      }
    }

    /* stratum labels */
    tag(ctx, `0${i + 1} ${names[i]}`, ex + 12, yT + 1, { alpha: 0.6, size: 8 })
    const hz = 82 + hash(i + Math.floor(t * 0.5)) * 380
    tag(ctx, `${hz.toFixed(0)} hz`, ex + 12, yT + 13, { alpha: 0.32, size: 7, color: BEIGE })
  }
}

export function PrismCanvas({ className = '' }) {
  const drawRef = useRef(drawPrism)
  const ref = useCanvasLoop(drawRef, { fps: 48 })
  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label="A signal beam splitting into five spectral voices, like light through a prism"
    />
  )
}

/* ————————————————————————————————————————————————————————
   ORBIT — section 04 · live telemetry sweep
———————————————————————————————————————————————————————— */
function drawOrbit(ctx, w, h, t) {
  ctx.clearRect(0, 0, w, h)
  const cx = w * 0.5
  const cy = h * 0.5
  const R = Math.min(w, h) * 0.37

  ctx.lineWidth = 1
  ctx.strokeStyle = IVORY(0.25)
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = IVORY(0.07)
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.66, 0, Math.PI * 2)
  ctx.stroke()

  /* tick ring */
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2
    const l = k % 6 === 0 ? 8 : 4
    ctx.strokeStyle = IVORY(k % 6 === 0 ? 0.4 : 0.2)
    line(ctx, [
      [cx + Math.cos(a) * R, cy + Math.sin(a) * R],
      [cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)],
    ])
  }

  /* sweep with decaying trail */
  const a0 = t * 0.55
  for (let i = 0; i < 42; i++) {
    const a = a0 - i * 0.02
    ctx.strokeStyle = IVORY((1 - i / 42) * 0.3)
    line(ctx, [
      [cx, cy],
      [cx + Math.cos(a) * R, cy + Math.sin(a) * R],
    ])
  }

  /* satellites */
  const sats = [
    { r: 0.66, sp: 0.3, ph: 0 },
    { r: 0.84, sp: -0.2, ph: 2.1 },
    { r: 1.0, sp: 0.42, ph: 4.2 },
  ]
  for (const { r, sp, ph } of sats) {
    const a = t * sp + ph
    const x = cx + Math.cos(a) * R * r
    const y = cy + Math.sin(a) * R * r
    ctx.fillStyle = IVORY(0.85)
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = IVORY(0.18)
    ctx.beginPath()
    ctx.arc(cx, cy, R * r, a - 0.5 * Math.sign(sp), a)
    ctx.stroke()
  }

  /* center */
  ctx.fillStyle = IVORY(0.9)
  ctx.beginPath()
  ctx.arc(cx, cy, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = IVORY(0.3)
  line(ctx, [[cx - 9, cy], [cx - 4, cy]])
  line(ctx, [[cx + 4, cy], [cx + 9, cy]])

  tag(ctx, 'live', cx, cy + 20, { align: 'center', alpha: 0.55, size: 8 })
  const az = (((a0 * 57.2958) % 360) + 360) % 360
  tag(ctx, `az ${az.toFixed(1).padStart(5, '0')}°`, cx, cy + R + 20, {
    align: 'center',
    alpha: 0.4,
    size: 8,
  })
}

export function OrbitCanvas({ className = '' }) {
  const drawRef = useRef(drawOrbit)
  const ref = useCanvasLoop(drawRef, { fps: 45 })
  return (
    <canvas ref={ref} className={className} role="img" aria-label="Live orbital sweep visualization" />
  )
}

/* ————————————————————————————————————————————————————————
   SIGNAL FIELD export for section 01
———————————————————————————————————————————————————————— */
export function SignalField({ className = '' }) {
  const drawRef = useRef(drawSignalField)
  const ref = useCanvasLoop(drawRef, { fps: 48 })
  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label="Animated Earth data traces — temperature, wind, rainfall and sea ice rendered as signal lines"
    />
  )
}

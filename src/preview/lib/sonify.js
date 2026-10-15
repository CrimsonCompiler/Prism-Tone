/**
 * Prism Tone Preview — data-driven sonification engine.
 *
 * One month of environmental data = one audible event. The mapping per
 * variable is documented in data/datasets.js and in the on-screen mapping
 * panel; nothing here plays pre-recorded audio and nothing is decorative:
 * every audible parameter is computed from the validated data values
 * handed to configure().
 *
 *   T2M          → pitch of a warm oscillator voice
 *   PRECTOTCORR  → rhythm (note density of a plucked figure)
 *   WS10M        → timbre + step tempo (filtered noise brightness / rate)
 *
 * Missing values (null) always produce a rest plus a time-pulse tick, so a
 * gap in the data is audible as a gap — never patched over.
 */

const BASE_STEP_S = 0.9
const PENTA = [220, 261.63, 293.66, 349.23, 392, 440, 523.25, 587.33]

export class SonificationEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.analyser = null
    this.voiceBus = null
    this.pulseBus = null
    this.noiseBuffer = null

    this.steps = []
    this.position = 0
    this.variable = 'T2M'
    this.range = { lo: 0, hi: 1 }
    this.volume = 0.8
    this.rate = 1
    this.layers = { pulse: true }
    this.state = 'idle' // idle | playing | paused
    this.timer = null
    this.active = new Set()
    this.onstep = null
    this.onend = null
  }

  /* ---------- lifecycle ---------- */

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC()

    this.master = this.ctx.createGain()
    this.master.gain.value = this.volume * 0.9
    this.master.connect(this.ctx.destination)

    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.55

    const dry = this.ctx.createGain()
    dry.gain.value = 1
    this.voiceBus = this.ctx.createGain()
    this.voiceBus.gain.value = 1
    this.pulseBus = this.ctx.createGain()
    this.pulseBus.gain.value = 1

    this.voiceBus.connect(this.analyser)
    this.pulseBus.connect(this.analyser)
    this.analyser.connect(dry)
    dry.connect(this.master)

    /* 2 s of white noise, reused by the wind layer */
    const len = this.ctx.sampleRate * 2
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }

  release() {
    this.stop()
    if (this.ctx) {
      const ctx = this.ctx
      this.ctx = null
      ctx.close().catch(() => { /* already closed */ })
    }
  }

  /* ---------- configuration ---------- */

  configure({ variable, range, steps }) {
    this.variable = variable
    if (range) this.range = range
    if (steps) this.steps = steps
  }

  setVolume(v) {
    this.volume = v
    if (this.master) {
      this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.05)
    }
  }

  setLayers(layers) {
    this.layers = { ...this.layers, ...layers }
  }

  setRate(r) {
    this.rate = Math.max(0.5, Math.min(2, r))
  }

  /* ---------- transport ---------- */

  play() {
    if (this.state === 'playing') return
    this.ensureContext()
    this.state = 'playing'
    this.position = 0
    this._scheduleCurrent()
  }

  pause() {
    if (this.state !== 'playing') return
    this._clearTimer()
    this._silence(0.06)
    this.state = 'paused'
  }

  resume() {
    if (this.state !== 'paused') return
    this.ensureContext()
    this.state = 'playing'
    this._scheduleCurrent()
  }

  stop() {
    this._clearTimer()
    this._silence(0.04)
    this.state = 'idle'
    this.position = 0
  }

  seek(index) {
    const clamped = Math.max(0, Math.min(index, this.steps.length - 1))
    this.position = clamped
    if (this.state === 'paused') this._emitStep()
  }

  _clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  _silence(ramp) {
    const t = this.ctx ? this.ctx.currentTime : 0
    for (const node of this.active) {
      try {
        node.gain.cancelScheduledValues(t)
        node.gain.setTargetAtTime(0, t, ramp)
      } catch { /* node already released */ }
    }
    setTimeout(() => this.active.clear(), ramp * 4000 + 120)
  }

  _emitStep() {
    if (this.onstep) {
      this.onstep(this.position, this.steps[this.position] || null)
    }
  }

  /* ---------- scheduling ---------- */

  _stepDuration(step) {
    let d = BASE_STEP_S
    if (this.variable === 'WS10M' && step && step.value !== null) {
      const n = this._norm(step.value)
      /* wind tempo mapping: stronger wind walks through months faster */
      d = BASE_STEP_S * (1.15 - 0.45 * n)
    }
    return d / this.rate
  }

  _norm(v) {
    const { lo, hi } = this.range
    if (v === null || v === undefined) return null
    if (hi === lo) return 0.5
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
  }

  _scheduleCurrent() {
    if (this.state !== 'playing') return
    if (this.position >= this.steps.length) {
      this.state = 'idle'
      this.position = 0
      if (this.onend) this.onend()
      return
    }
    const step = this.steps[this.position]
    const dur = this._stepDuration(step)
    const t = this.ctx.currentTime + 0.03

    if (step) {
      if (this.layers.pulse) this._pulse(t, dur)
      if (step.value !== null && this.layers.voice !== false) {
        this._voice(t, dur, step)
      }
      this._emitStep()
    }

    this.position += 1
    this.timer = setTimeout(() => this._scheduleCurrent(), dur * 1000)
  }

  /* ---------- voices ---------- */

  _track(node) {
    this.active.add(node)
    return node
  }

  _pulse(t, dur) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = this._track(ctx.createGain())
    osc.type = 'square'
    osc.frequency.value = 1180
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    osc.connect(g)
    g.connect(this.pulseBus)
    osc.start(t)
    osc.stop(t + 0.07)
  }

  _voice(t, dur, step) {
    if (this.variable === 'T2M') this._voiceTemp(t, dur, step)
    else if (this.variable === 'PRECTOTCORR') this._voiceRain(t, dur, step)
    else if (this.variable === 'WS10M') this._voiceWind(t, dur, step)
  }

  /** T2M → pitch. Warm triangle voice; higher temperature = higher pitch. */
  _voiceTemp(t, dur, step) {
    const ctx = this.ctx
    const n = this._norm(step.value)
    if (n === null) return
    const freq = 150 + n * 330

    const osc = ctx.createOscillator()
    const g = this._track(ctx.createGain())
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900 + n * 1400
    lp.Q.value = 0.7

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq * 0.985, t)
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.09)
    const noteLen = Math.min(dur * 0.62, 0.85)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.06)
    g.gain.setValueAtTime(0.22, t + noteLen * 0.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + noteLen)

    osc.connect(lp)
    lp.connect(g)
    g.connect(this.voiceBus)
    osc.start(t)
    osc.stop(t + noteLen + 0.05)
  }

  /** PRECTOTCORR → rhythm. Density 1..8 plucks across the step. */
  _voiceRain(t, dur, step) {
    const ctx = this.ctx
    const n = this._norm(step.value)
    if (n === null) return
    const count = 1 + Math.round(n * 7)
    const span = dur * 0.78

    for (let i = 0; i < count; i++) {
      const tt = t + (span * i) / count
      const idx = (Math.abs(step.key.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) + i * 3) % PENTA.length
      const osc = ctx.createOscillator()
      const g = this._track(ctx.createGain())
      osc.type = 'sine'
      osc.frequency.value = PENTA[idx]
      const peak = 0.16 * (0.55 + 0.45 * n)
      g.gain.setValueAtTime(0.0001, tt)
      g.gain.exponentialRampToValueAtTime(peak, tt + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.16)
      osc.connect(g)
      g.connect(this.voiceBus)
      osc.start(tt)
      osc.stop(tt + 0.2)
    }
  }

  /** WS10M → timbre + tempo. Band-passed noise; stronger = brighter, louder. */
  _voiceWind(t, dur, step) {
    const ctx = this.ctx
    const n = this._norm(step.value)
    if (n === null) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true

    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(320 + n * 1500, t)
    bp.frequency.linearRampToValueAtTime(380 + n * 1650, t + dur * 0.7)
    bp.Q.value = 1.1

    const g = this._track(ctx.createGain())
    const peak = 0.05 + n * 0.17
    const len = dur * 0.9
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + len * 0.35)
    g.gain.linearRampToValueAtTime(0.0001, t + len)

    src.connect(bp)
    bp.connect(g)
    g.connect(this.voiceBus)
    src.start(t)
    src.stop(t + len + 0.05)
  }
}

/* Single shared instance — the app has exactly one audio experience at a time. */
export const engine = new SonificationEngine()

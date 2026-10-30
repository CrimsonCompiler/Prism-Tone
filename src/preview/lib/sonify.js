/**
 * Prism Tone Preview — data-driven sonification engine (Tone.js).
 *
 * Tone.js is loaded lazily on the first Play gesture (dynamic import), so
 * the preview page ships without the audio library until it is needed.
 * The public surface is unchanged from the original engine so the locked
 * map controls and transport keep working:
 *
 *   configure({ variable, range, steps, normals })      // one layer
 *   configure({ primary, layers })                     // layered mix
 *   play() / pause() / resume() / stop() / seek(index)
 *   setVolume(v) / setRate(r) / setLayers(layers)
 *   release() / analyser / onstep / onend / state / position
 *
 * Added for the redesign: onerror, previewPoint(plan) (graph hover).
 *
 * The musical language follows qoder V2's voice racks:
 *   • temperature — a slow sine pad with a sparse FM arpeggio, Dorian turning
 *     minor/major with the anomaly;
 *   • rainfall    — marimba-like plucks in G major pentatonic, a soft bass and
 *     a shaker;
 *   • wind        — a D minor pentatonic drone pair, a sine ripple and a
 *     filtered wind wash.
 *
 * Two or three datasets can sound at once. Each keeps its own rack, filter and
 * pan; the lead dataset sets the tempo and the captions. One month spans two
 * beats, two months make a 4/4 bar — a deliberately calm walk, close to
 * qoder V2's listening pace. There is no metronomic tick: events are sparse
 * and probability-driven, the pad holds its chord until the mode changes, and
 * the bass restates the root on bar lines. Missing values never produce a note.
 *
 * Audio graph: rack voices → rack filter → rack pan → rack gain → bus →
 * Freeverb → compressor → limiter → volume gain → destination, with a native
 * AnalyserNode tapped after the master for the waveform view. Nothing is
 * recorded, amplified or looped; every parameter is ramped so playback cannot
 * click.
 */

import { MONTH_BEATS, planForStep, phraseForSteps, quantize } from './music'
import { VARIABLE_BY_ID } from '../data/datasets'

const VOLUME_HEADROOM = 0.52
const volumeToGain = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1.6) * VOLUME_HEADROOM

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))

function hashKey(key) {
  if (!key) return 0
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Local note-name helper: ASCII accidentals, exactly what Tone.js parses. */
function midiToName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const m = Math.round(midi)
  return `${names[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`
}

export class SonificationEngine {
  constructor() {
    this.Tone = null
    this.ctx = null
    this.ready = false
    this._bootPromise = null
    this._disposed = false

    this.bus = null
    this.reverb = null
    this.compressor = null
    this.limiter = null
    this.master = null
    this.analyser = null

    /* Per-dataset racks. Each one keeps its own filter, pan and gain so the
       selected datasets can be mixed without rebuilding the graph. */
    this.tempRack = null
    this.rainRack = null
    this.windRack = null

    this.padVoices = null
    this.padGain = null
    this.arp = null
    this.tempBass = null
    this.airNoise = null
    this.airFilter = null
    this.airGain = null

    this.pluck = null
    this.rainBass = null
    this.shaker = null
    this.rainNoise = null
    this.rainNoiseFilter = null
    this.rainNoiseGain = null

    this.droneA = null
    this.droneB = null
    this.droneGain = null
    this.ripple = null
    this.windNoise = null
    this.windNoiseFilter = null
    this.windNoiseGain = null

    this.primary = 'T2M'
    this.variable = 'T2M' // backwards-compatible alias
    this.layers = []
    this.steps = []
    this.range = { lo: 0, hi: 1 }
    this.normals = null
    this.volume = 0.8
    this.rate = 1
    this.layersSetting = { pulse: false }
    this.state = 'idle' // idle | playing | paused

    this.timer = null
    this.onstep = null
    this.onend = null
    this.onerror = null

    this._lastPreview = 0
    /* The sustained pad chord. Temperature holds one chord until the mode
       (and therefore the chord) changes, as in qoder V2's pad track. */
    this._padNotes = null
  }

  /* ---------------- lifecycle ---------------- */

  async _boot() {
    if (this.ready) return true
    if (this._bootPromise) return this._bootPromise
    this._bootPromise = (async () => {
      try {
        const mod = await import('tone')
        const Tone = mod.default || mod
        this.Tone = Tone
        if (Tone.start) await Tone.start()
        if (Tone.getContext && Tone.getContext().state !== 'running') {
          await Tone.getContext().resume()
        }
        this._build(Tone)
        this.ready = true
        this._applyLayerMix()
        return true
      } catch (err) {
        this._bootPromise = null
        if (this.onerror) this.onerror(err)
        return false
      }
    })()
    return this._bootPromise
  }

  _rack(Tone, name, pan, type, frequency) {
    const gain = new Tone.Gain(0).connect(this.bus)
    const panner = new Tone.Panner(pan).connect(gain)
    const filter = new Tone.Filter({ type, frequency, rolloff: -24 }).connect(panner)
    this[name] = { gain, panner, filter }
    return this[name]
  }

  _build(Tone) {
    /* qoder V2's master chain: -20 dB compressor at 3.5:1, a -2 dB limiter and
       plenty of headroom, so several layers never clip. */
    this.master = new Tone.Gain(volumeToGain(this.volume)).toDestination()
    this.limiter = new Tone.Limiter(-2).connect(this.master)
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 3.5,
      attack: 0.02,
      release: 0.25,
    }).connect(this.limiter)
    this.reverb = new Tone.Freeverb({ roomSize: 0.62, dampening: 3200, wet: 0.2 }).connect(this.compressor)
    this.bus = new Tone.Gain(1).connect(this.reverb)

    /* Native analyser, so the existing waveform contract
       (analyser.getFloatTimeDomainData) keeps working. */
    try {
      const raw = Tone.getContext().rawContext
      this.analyser = raw.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.55
      this.master.connect(this.analyser)
    } catch {
      this.analyser = null
    }

    /* ---- temperature rack: sustained pad + sparse FM arpeggio ---- */
    const temp = this._rack(Tone, 'tempRack', -0.14, 'lowpass', 1800)
    /* Three fixed Synth voices (one per chord tone) rather than a PolySynth:
       the chord glides to each new mode without allocating voices, which keeps
       long runs free of pool exhaustion. */
    this.padGain = new Tone.Gain(0.42).connect(temp.filter)
    this.padVoices = [0, 1, 2].map(() =>
      new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 2.6, decay: 1.8, sustain: 0.55, release: 4.5 },
      }).connect(this.padGain),
    )
    for (const voice of this.padVoices) voice.volume.value = -7

    this.arp = new Tone.FMSynth({
      harmonicity: 2.01,
      modulationIndex: 3.5,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.05, release: 2.2 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.4 },
    }).connect(temp.filter)
    this.arp.volume.value = -17

    this.tempBass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.7, decay: 0.9, sustain: 0.18, release: 2.6 },
    }).connect(temp.filter)
    this.tempBass.volume.value = -19

    this.airNoise = new Tone.Noise({ type: 'pink', volume: -13 })
    this.airFilter = new Tone.Filter({ type: 'bandpass', frequency: 700, Q: 0.7 }).connect(temp.filter)
    this.airGain = new Tone.Gain(0.0001).connect(this.airFilter)
    this.airNoise.connect(this.airGain)
    this.airNoise.start()

    /* ---- rainfall rack: marimba plucks, soft bass, shaker ---- */
    const rain = this._rack(Tone, 'rainRack', 0.16, 'lowpass', 2400)
    this.pluck = new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 12,
      options: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.5, sustain: 0.03, release: 1.2 },
      },
    }).connect(rain.filter)
    this.pluck.volume.value = -12

    this.rainBass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.6, decay: 0.8, sustain: 0.15, release: 2.4 },
    }).connect(rain.filter)
    this.rainBass.volume.value = -19

    this.shaker = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.004, decay: 0.05, sustain: 0, release: 0.04 },
    }).connect(rain.filter)
    this.shaker.volume.value = -28

    this.rainNoise = new Tone.Noise({ type: 'pink', volume: -12 })
    this.rainNoiseFilter = new Tone.Filter({ type: 'bandpass', frequency: 1600, Q: 0.7 }).connect(rain.filter)
    this.rainNoiseGain = new Tone.Gain(0.0001).connect(this.rainNoiseFilter)
    this.rainNoise.connect(this.rainNoiseGain)
    this.rainNoise.start()

    /* ---- wind rack: drone pair + sine ripple ---- */
    const wind = this._rack(Tone, 'windRack', 0.34, 'lowpass', 1400)
    this.droneGain = new Tone.Gain(0.0001).connect(wind.filter)
    this.droneA = new Tone.Oscillator({ frequency: 73.42, type: 'sine', volume: -14 }).connect(this.droneGain)
    this.droneB = new Tone.Oscillator({ frequency: 110.0, type: 'sine', volume: -16 }).connect(this.droneGain)
    this.droneA.start()
    this.droneB.start()

    this.ripple = new Tone.PolySynth({
      voice: Tone.Synth,
      maxPolyphony: 6,
      options: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.45, decay: 1.8, sustain: 0.06, release: 2.8 },
      },
    }).connect(wind.filter)
    this.ripple.volume.value = -16

    this.windNoise = new Tone.Noise({ type: 'brown', volume: -8 })
    this.windNoiseFilter = new Tone.Filter({ type: 'lowpass', frequency: 900, Q: 0.5 }).connect(wind.filter)
    this.windNoiseGain = new Tone.Gain(0.0001).connect(this.windNoiseFilter)
    this.windNoise.connect(this.windNoiseGain)
    this.windNoise.start()
  }

  release() {
    this.stop()
    if (!this.ready || !this.Tone) {
      this.ctx = null
      return
    }
    const nodes = [
      ...(this.padVoices || []), this.padGain,
      this.arp, this.tempBass,
      this.airNoise, this.airFilter, this.airGain,
      this.pluck, this.rainBass, this.shaker,
      this.rainNoise, this.rainNoiseFilter, this.rainNoiseGain,
      this.droneA, this.droneB, this.droneGain, this.ripple,
      this.windNoise, this.windNoiseFilter, this.windNoiseGain,
      this.tempRack?.gain, this.tempRack?.panner, this.tempRack?.filter,
      this.rainRack?.gain, this.rainRack?.panner, this.rainRack?.filter,
      this.windRack?.gain, this.windRack?.panner, this.windRack?.filter,
      this.bus, this.reverb, this.compressor, this.limiter, this.master,
    ]
    for (const node of nodes) {
      try { if (node) node.dispose() } catch { /* already disposed */ }
    }
    if (this.analyser) {
      try { this.analyser.disconnect() } catch { /* already detached */ }
    }
    this.analyser = null
    this.padVoices = this.padGain = null
    this._padNotes = null
    this.arp = this.tempBass = null
    this.airNoise = this.airFilter = this.airGain = null
    this.pluck = this.rainBass = this.shaker = null
    this.rainNoise = this.rainNoiseFilter = this.rainNoiseGain = null
    this.droneA = this.droneB = this.droneGain = this.ripple = null
    this.windNoise = this.windNoiseFilter = this.windNoiseGain = null
    this.tempRack = this.rainRack = this.windRack = null
    this.bus = this.reverb = this.compressor = this.limiter = this.master = null
    this.ready = false
    this._bootPromise = null
    this.Tone = null
  }

  /* ---------------- configuration ---------------- */

  /**
   * Accept either the original single-variable shape or the layered shape:
   *   configure({ primary, layers: [{ variable, range, steps, normals }] })
   * The lead layer supplies the tempo and the steps reported to the UI.
   */
  configure({ primary, variable, range, steps, normals, layers }) {
    if (Array.isArray(layers) && layers.length) {
      this.layers = layers.map((layer) => ({
        variable: layer.variable,
        range: layer.range || this.range,
        steps: layer.steps || [],
        normals: layer.normals === undefined ? null : layer.normals,
      }))
      this.primary = primary || this.layers[0].variable.id
    } else if (variable || steps) {
      const id = variable || this.primary
      this.primary = id
      this.layers = [{
        variable: VARIABLE_BY_ID[id] || { id, mapping: {} },
        range: range || this.range,
        steps: steps || [],
        normals: normals === undefined ? null : normals,
      }]
    }

    const lead = this._leadLayer()
    if (lead) {
      this.steps = lead.steps || []
      this.range = lead.range || this.range
      this.normals = lead.normals ?? null
    }
    this.variable = this.primary
    if (this.ready) this._applyLayerMix()
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.ready && this.master) {
      this.master.gain.rampTo(volumeToGain(this.volume), 0.08)
    }
  }

  setLayers(layers) {
    this.layersSetting = { ...this.layersSetting, ...layers }
  }

  setRate(r) {
    this.rate = Math.max(0.5, Math.min(2, r))
  }

  /* ---------------- layer helpers ---------------- */

  _leadLayer() {
    if (!this.layers.length) return null
    return this.layers.find((layer) => layer.variable.id === this.primary) || this.layers[0]
  }

  _layerById(id) {
    return this.layers.find((layer) => layer.variable.id === id) || null
  }

  _planAt(layer, index) {
    if (!layer || !layer.steps || !layer.steps[index]) return null
    const step = layer.steps[index]
    const month = Number(String(step.key).slice(4, 6))
    const normal = layer.normals && Number.isFinite(month) ? layer.normals[month] ?? null : null
    const prevValue = index > 0 && layer.steps[index - 1] ? layer.steps[index - 1].value : null
    return planForStep({
      variable: layer.variable,
      step,
      normal,
      range: layer.range,
      prevValue,
    })
  }

  _plansAt(index) {
    const entries = []
    for (const layer of this.layers) {
      const plan = this._planAt(layer, index)
      if (plan) entries.push({ layer, plan })
    }
    return entries
  }

  _rackFor(id) {
    if (id === 'T2M') return this.tempRack
    if (id === 'PRECTOTCORR') return this.rainRack
    return this.windRack
  }

  /** Balance the selected racks; the lead gets a little more room. */
  _applyLayerMix() {
    if (!this.ready) return
    const count = this.layers.length
    const base = count <= 1 ? 1 : count === 2 ? 0.72 : 0.58
    const ids = new Set(this.layers.map((layer) => layer.variable.id))
    for (const [id, rack] of [
      ['T2M', this.tempRack],
      ['PRECTOTCORR', this.rainRack],
      ['WS10M', this.windRack],
    ]) {
      if (!rack) continue
      const active = ids.has(id)
      const level = active ? base * (id === this.primary ? 1.1 : 0.92) : 0
      rack.gain.gain.rampTo(level, active ? 0.6 : 0.35)
    }
    /* Temperature joining mid-run needs its held chord, since the pad is only
       attacked on play or on a mode change. */
    if (ids.has('T2M') && this.state === 'playing' && !this._padNotes) {
      const plan = this._planAt(this._layerById('T2M'), this.position)
      if (plan && !plan.missing) this._attackPad(plan.chordNames, this.Tone.now() + 0.05, 0.42)
    }
  }

  /* ---------------- transport ---------------- */

  play() {
    if (this.state === 'playing') return
    this.state = 'playing'
    this.position = 0
    this._boot().then((ok) => {
      if (!ok || this.state !== 'playing') return
      this._startrun()
    })
  }

  pause() {
    if (this.state !== 'playing') return
    this._clearTimer()
    this.state = 'paused'
    this._fadeBus(0.12)
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this._boot().then((ok) => {
      if (!ok || this.state !== 'playing') return
      this._startrun()
    })
  }

  stop() {
    this._clearTimer()
    this._fadeBus(0.08)
    this.state = 'idle'
    this.position = 0
  }

  seek(index) {
    const clamped = Math.max(0, Math.min(index, Math.max(this.steps.length - 1, 0)))
    this.position = clamped
    if (this.state === 'paused') this._emitStep()
  }

  /** A single soft note for graph hover/focus sonification. */
  previewPoint(plan) {
    if (!plan || plan.missing || plan.midi === null) return
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - this._lastPreview < 120) return
    this._lastPreview = now
    this._boot().then((ok) => {
      if (!ok) return
      try {
        const t = this.Tone.now() + 0.02
        /* A graph preview outside playback is the only sound allowed then, so
           lift the bus in case a previous stop faded it to silence. */
        if (this.state !== 'playing' && this.bus) this.bus.gain.rampTo(1, 0.04)
        const voice = plan.rack === 'rain' ? this.pluck : plan.rack === 'wind' ? this.ripple : this.arp
        voice.triggerAttackRelease(plan.note, '32n', t, 0.3)
      } catch { /* a preview is optional — never break the UI */ }
    })
  }

  _clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  _releasePad(t) {
    if (!this.padVoices) return
    for (const voice of this.padVoices) {
      try { voice.triggerRelease(t) } catch { /* already released */ }
    }
    this._padNotes = null
  }

  _attackPad(notes, t, velocity = 0.42) {
    if (!this.padVoices) return
    const chord = notes.slice(0, this.padVoices.length)
    chord.forEach((note, i) => {
      try { this.padVoices[i].triggerAttack(note, t, velocity) } catch { /* ignore */ }
    })
    this._padNotes = chord
  }

  /** Glide the held pad to a new chord without allocating new voices. */
  _retunePad(notes, t) {
    if (!this.padVoices) return
    const chord = notes.slice(0, this.padVoices.length)
    chord.forEach((note, i) => {
      try { this.padVoices[i].frequency.rampTo(this.Tone.Frequency(note).toFrequency(), 0.6, t) } catch { /* ignore */ }
    })
    this._padNotes = chord
  }

  _fadeBus(seconds) {
    if (!this.ready || !this.bus) return
    try {
      this.bus.gain.rampTo(0, seconds)
      this._releasePad()
      this.pluck?.releaseAll()
      this.ripple?.releaseAll()
      this.arp?.triggerRelease()
      this.tempBass?.triggerRelease()
      this.rainBass?.triggerRelease()
      this.airGain?.gain.rampTo(0.0001, seconds)
      this.rainNoiseGain?.gain.rampTo(0.0001, seconds)
      this.windNoiseGain?.gain.rampTo(0.0001, seconds)
      this.droneGain?.gain.rampTo(0.0001, seconds)
    } catch { /* nodes may already be released */ }
  }

  _startrun() {
    if (!this.ready) return
    try {
      this.bus.gain.rampTo(1, 0.18)
      this._applyLayerMix()
      /* Restart the sustained chord on play/resume. _harmony then sees the
         held chord and does not double-attack it. */
      const lead = this._leadLayer()
      if (lead && lead.variable.id === 'T2M') {
        const plan = this._planAt(lead, this.position)
        if (plan && !plan.missing && !this._padNotes) {
          this._attackPad(plan.chordNames, this.Tone.now() + 0.04, 0.42)
        }
      }
    } catch { /* ignore a failed initial attack */ }
    this._scheduleCurrent()
  }

  _emitStep() {
    if (this.onstep) this.onstep(this.position, this.steps[this.position] || null)
  }

  /* ---------------- scheduling ---------------- */

  /** One month = two beats at the lead tempo, as in the calm qoder V2 walk. */
  _stepDuration(plan) {
    const tempo = plan && plan.tempo ? plan.tempo : 66
    return (MONTH_BEATS * 60) / tempo / this.rate
  }

  _scheduleCurrent() {
    if (this.state !== 'playing' || !this.ready) return
    if (this.position >= this.steps.length) {
      this.state = 'idle'
      this.position = 0
      this._fadeBus(0.5)
      if (this.onend) this.onend()
      return
    }

    const entries = this._plansAt(this.position)
    const lead = entries.find((entry) => entry.layer.variable.id === this.primary) || entries[0]
    const duration = this._stepDuration(lead ? lead.plan : null)
    const step = this.steps[this.position]

    if (!step || !entries.length) {
      this.position += 1
      this.timer = setTimeout(() => this._scheduleCurrent(), duration * 1000)
      return
    }

    const t = this.Tone.now() + 0.06

    for (const { layer, plan } of entries) {
      if (!plan || plan.missing) continue
      const id = layer.variable.id
      try {
        if (id === 'T2M') this._temperature(t, duration, plan, layer)
        else if (id === 'PRECTOTCORR') this._rain(t, duration, plan, layer)
        else if (id === 'WS10M') this._wind(t, duration, plan)
      } catch { /* one missed layer must never stop the run */ }
    }

    if (this.reverb) {
      const wet = entries.length
        ? entries.reduce((sum, entry) => sum + (entry.plan.reverb || 0.14), 0) / entries.length
        : 0.18
      this.reverb.wet.rampTo(clamp(wet + 0.04, 0.12, 0.36), 0.5)
    }

    this._emitStep()
    this.position += 1
    this.timer = setTimeout(() => this._scheduleCurrent(), duration * 1000)
  }

  /* ---------------- voices ---------------- */

  _harmony(t, duration, plan) {
    try {
      const key = plan.chordNames.join(' ')
      const held = this._padNotes ? this._padNotes.join(' ') : ''
      if (!held) this._attackPad(plan.chordNames, t, 0.42)
      else if (key !== held) this._retunePad(plan.chordNames, t)
      /* Every second month is a bar line in 4/4: the bass restates. */
      if (this.position % 2 === 0) {
        this.tempBass.triggerAttackRelease(
          plan.chordNames[0],
          Math.min(duration * 1.6, 2.8),
          t,
          0.3,
        )
      }
    } catch { /* a missed chord must never stop the run */ }
  }

  _temperature(t, duration, plan, layer) {
    if (this.tempRack) this.tempRack.filter.frequency.rampTo(clamp(plan.cutoff, 500, 3400), 0.35)
    this._harmony(t, duration, plan)

    const phrase = phraseForSteps(layer.steps, this.position, layer.range, 8)
    const middle = Math.floor(phrase.length / 2)
    try {
      this.arp.triggerAttackRelease(plan.note, Math.min(duration * 0.5, 1.0), t, clamp(0.3 + plan.brightness * 0.14, 0.24, 0.48))
      /* qoder V2's probability-driven arpeggio, kept sparse: at most two
         neighbour notes per month, placed off the beat. */
      if (this._pulse(this.position * 3 + 1) < 0.28 + plan.rhythm * 0.36) {
        const neighbour = quantize(phrase[(middle + 1) % phrase.length], plan.scaleId, plan.leadRoot, 2)
        this.arp.triggerAttackRelease(midiToName(neighbour), Math.min(duration * 0.3, 0.6), t + duration * 0.38, 0.26)
      }
      if (this._pulse(this.position * 5 + 2) < 0.18 + plan.rhythm * 0.28) {
        const third = quantize(phrase[(middle + 3) % phrase.length], plan.scaleId, plan.leadRoot, 2)
        this.arp.triggerAttackRelease(midiToName(third), Math.min(duration * 0.25, 0.5), t + duration * 0.72, 0.22)
      }
    } catch { /* a missed note must never stop the run */ }

    try {
      this.airFilter.frequency.rampTo(clamp(plan.textureCutoff, 300, 3200), 0.5)
      this.airGain.gain.rampTo(Math.max(0.0001, plan.textureGain), 0.6)
    } catch { /* ignore */ }
  }

  _rain(t, duration, plan, layer) {
    if (this.rainRack) this.rainRack.filter.frequency.rampTo(clamp(plan.cutoff, 900, 3200), 0.35)
    const notes = plan.scaleMidi
    const count = clamp(plan.density, 1, 5)
    const span = duration * 0.7
    const seed = hashKey(layer.steps[this.position] ? layer.steps[this.position].key : '')
    const peak = 0.26 + (plan.norm === null ? 0 : plan.norm) * 0.12
    try {
      for (let i = 0; i < count; i += 1) {
        const tt = t + (span * i) / count
        const midi = notes[(seed + i * 3) % notes.length]
        this.pluck.triggerAttackRelease(midiToName(midi), '32n', tt, peak)
      }
      if (this.position % 2 === 0) {
        this.rainBass.triggerAttackRelease(
          plan.chordNames[0],
          Math.min(duration * 1.6, 2.8),
          t,
          0.3,
        )
      }
      if (this._pulse(this.position + 9) < 0.55) {
        this.shaker.triggerAttackRelease('32n', t + span * 0.5, 0.14)
      }
    } catch { /* ignore */ }

    try {
      this.rainNoiseFilter.frequency.rampTo(clamp(plan.textureCutoff, 700, 3600), 0.5)
      this.rainNoiseGain.gain.rampTo(0.005 + (plan.norm === null ? 0 : plan.norm) * 0.06, 0.6)
    } catch { /* ignore */ }
  }

  _wind(t, duration, plan) {
    if (this.windRack) this.windRack.filter.frequency.rampTo(clamp(plan.cutoff, 300, 3000), 0.45)
    try {
      const root = midiToFrequency(plan.padMidi[0])
      this.droneA.frequency.rampTo(root, 0.9)
      this.droneB.frequency.rampTo(root * 1.5, 1.1)
      const level = 0.16 + (plan.norm === null ? 0.5 : plan.norm) * 0.28
      this.droneGain.gain.rampTo(level, 1.0)
      this.ripple.triggerAttackRelease(plan.note, Math.min(duration * 1.1, 1.8), t, 0.34)
      if (this._pulse(this.position + 4) < 0.32 && plan.padMidi[2] !== undefined) {
        this.ripple.triggerAttackRelease(
          midiToName(plan.padMidi[2] + 12),
          Math.min(duration * 0.8, 1.4),
          t + duration * 0.55,
          0.2,
        )
      }
      this.windNoiseFilter.frequency.rampTo(clamp(plan.textureCutoff, 300, 2400), 0.6)
      this.windNoiseGain.gain.rampTo(0.028 + (plan.norm === null ? 0.5 : plan.norm) * 0.1, 0.9)
    } catch { /* ignore */ }
  }

  _pulse(step) {
    /* deterministic, gently uneven pattern — no allocation, like qoder V2 */
    return Math.abs(Math.sin((step + 1) * 12.9898) * 43758.5453) % 1
  }
}

/* Single shared instance — the app has exactly one audio experience at a time. */
export const engine = new SonificationEngine()

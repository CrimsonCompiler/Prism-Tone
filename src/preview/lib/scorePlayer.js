/**
 * Tone.js player for a backend MusicalScore.
 *
 * The score is already musical: notes carry beats, velocity and pan; tracks
 * carry a role and filter/reverb/detune/density parameters. This module only
 * realises those decisions.
 *
 *   • Tone is imported on the first Play gesture, never at module load.
 *   • One AudioContext, one master chain, one Transport.
 *   • Parts are scheduled in transport ticks, so `setRate()` changes the
 *     timing (Transport.bpm) and never the pitch. Seconds are only used for a
 *     note's duration: `dur_beats * 60 / bpm`.
 *   • pad → slow sine PolySynth · lead → triangle FMSynth · bass → sine Synth
 *     · texture → filtered noise · perc → short noise.
 *   • Master: tracks → lowpass → Chorus → Freeverb → Compressor → Limiter →
 *     gain (v^1.6 × 0.52) → destination, with a native AnalyserNode tapped
 *     after the master so the existing waveform view keeps working.
 *
 * Missing months have no notes and no captions; they are rests, never
 * filled. `stop()` fades, releases every voice and disposes the tracks, so a
 * run cannot leave a hanging pad or a leaked node behind.
 */

import {
  scoreBeatsPerStep,
  scoreLengthBeats,
  stepFromTicks,
  transportTicks,
  isValidScore,
} from './score'

const VOLUME_HEADROOM = 0.52
const volumeToGain = (value) => Math.pow(Math.max(0, Math.min(1, value)), 1.6) * VOLUME_HEADROOM
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(value) ? value : lo))
const midiToFrequency = (midi) => 440 * Math.pow(2, (clamp(midi, 0, 127) - 69) / 12)

export class ScorePlayer {
  constructor() {
    this.Tone = null
    this.transport = null
    this.ready = false
    this._bootPromise = null

    this.master = null
    this.limiter = null
    this.compressor = null
    this.reverb = null
    this.chorus = null
    this.masterFilter = null
    this.bus = null
    this._analyser = null

    this.tracks = []
    this.stepPart = null
    this.captionPart = null
    this.endEventId = null
    this._previewVoice = null

    this._score = null
    this._steps = []
    this._beatsPerStep = 2
    this._baseBpm = 60
    this._rate = 1
    this._volume = 0.8
    this._position = 0
    this._skipStep = null
    this._runToken = 0

    this.state = 'idle' // idle | playing | paused
    this.mode = 'data' // data | image

    this.onstep = null
    this.onend = null
    this.onerror = null
    this.oncaption = null
  }

  get analyser() {
    return this._analyser
  }

  get position() {
    if (this.transport && this._steps.length && this.state !== 'idle') {
      const derived = stepFromTicks(this.transport.ticks, this.transport.PPQ || 192, this._beatsPerStep)
      return Math.min(this._steps.length - 1, derived)
    }
    return this._position
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
        const context = Tone.getContext && Tone.getContext()
        if (context && context.state !== 'running' && context.resume) await context.resume()
        this.transport = Tone.getTransport ? Tone.getTransport() : Tone.Transport
        this._buildMaster(Tone)
        this.ready = true
        return true
      } catch (err) {
        this._bootPromise = null
        if (this.onerror) this.onerror(err)
        return false
      }
    })()
    return this._bootPromise
  }

  _buildMaster(Tone) {
    this.master = new Tone.Gain(volumeToGain(this._volume)).toDestination()
    this.limiter = new Tone.Limiter(-2).connect(this.master)
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 3.5,
      attack: 0.02,
      release: 0.25,
    }).connect(this.limiter)
    this.reverb = new Tone.Freeverb({ roomSize: 0.62, dampening: 3200, wet: 0.24 }).connect(this.compressor)
    this.chorus = new Tone.Chorus({ frequency: 0.3, delayTime: 3.5, depth: 0.2, wet: 0.15 }).connect(this.reverb)
    try { this.chorus.start() } catch { /* already started */ }
    this.masterFilter = new Tone.Filter({ type: 'lowpass', frequency: 7000, rolloff: -12 }).connect(this.chorus)
    this.bus = new Tone.Gain(1).connect(this.masterFilter)

    try {
      const raw = Tone.getContext().rawContext
      this._analyser = raw.createAnalyser()
      this._analyser.fftSize = 2048
      this._analyser.smoothingTimeConstant = 0.55
      this.master.connect(this._analyser)
    } catch {
      this._analyser = null
    }
  }

  /* ---------------- public transport ---------------- */

  /**
   * Load and start a score.
   *
   * @param {object} args
   * @param {object} args.score       a validated MusicalScore
   * @param {Array} [args.steps]      data steps aligned to month boundaries
   * @param {'data'|'image'} [args.mode]
   * @param {number} [args.rate]
   * @param {number} [args.volume]
   * @param {number} [args.beatsPerStep]
   */
  async play({ score, steps = [], mode = 'data', rate, volume, beatsPerStep } = {}) {
    if (!isValidScore(score)) return false
    const ready = await this._boot()
    if (!ready) return false

    this._hardStop()
    this._score = score
    this._steps = Array.isArray(steps) ? steps : []
    this.mode = mode === 'image' ? 'image' : 'data'
    this._beatsPerStep = Number.isFinite(beatsPerStep) && beatsPerStep > 0
      ? beatsPerStep
      : scoreBeatsPerStep(score)
    this._baseBpm = clamp(score.tempo_bpm, 20, 300)
    if (Number.isFinite(rate)) this._rate = clamp(rate, 0.25, 4)
    if (Number.isFinite(volume)) this._volume = clamp(volume, 0, 1)
    this._applyVolume(0)
    this._skipStep = null
    this._position = 0

    try {
      this.transport.cancel(0)
      this._buildTracks(score)
      this.transport.bpm.value = this._baseBpm * this._rate
      this.transport.ticks = 0
      this.bus.gain.rampTo(1, 0.18)
      this.state = 'playing'
      this.transport.start('+0.08')
      return true
    } catch (err) {
      this.state = 'idle'
      if (this.onerror) this.onerror(err)
      return false
    }
  }

  pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    try { this.transport.pause() } catch { /* ignore */ }
    this._fadeBus(0.1)
    this._releaseAll()
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    if (this.bus) this.bus.gain.rampTo(1, 0.14)
    try { this.transport.start() } catch { /* ignore */ }
    this._retriggerPad()
  }

  stop() {
    this._hardStop()
    this.mode = 'data'
  }

  seek(index) {
    if (!this._steps.length) return
    const clamped = Math.max(0, Math.min(index, this._steps.length - 1))
    this._position = clamped
    this._skipStep = clamped
    try {
      this.transport.ticks = Math.round(clamped * this._beatsPerStep * (this.transport.PPQ || 192))
    } catch { /* ignore */ }
    if (this.state === 'paused' || this.state === 'playing') {
      if (this.onstep) this.onstep(clamped, this._steps[clamped] || null)
    }
  }

  setVolume(value) {
    this._volume = clamp(value, 0, 1)
    this._applyVolume(0.08)
  }

  setRate(value) {
    this._rate = clamp(value, 0.25, 4)
    if (this.ready && this.transport && this._score) {
      try { this.transport.bpm.rampTo(this._baseBpm * this._rate, 0.12) } catch { /* ignore */ }
    }
  }

  /** A single soft note for graph hover/focus sonification. */
  async previewNote(note) {
    if (!note) return
    const ready = await this._boot()
    if (!ready) return
    try {
      if (!this._previewVoice) {
        this._previewVoice = new this.Tone.FMSynth({
          harmonicity: 2.01,
          modulationIndex: 2.5,
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.5, sustain: 0.04, release: 1.6 },
          modulation: { type: 'sine' },
          modulationEnvelope: { attack: 0.05, decay: 0.3, sustain: 0, release: 0.4 },
        }).connect(this.bus)
        this._previewVoice.volume.value = -16
      }
      if (this.state !== 'playing' && this.bus) this.bus.gain.rampTo(1, 0.04)
      this._previewVoice.triggerAttackRelease(note, '32n', this.Tone.now() + 0.02, 0.26)
    } catch { /* previews are optional */ }
  }

  release() {
    this._hardStop()
    if (this.ready) {
      const nodes = [
        this._previewVoice,
        this.stepPart, this.captionPart,
        this.bus, this.masterFilter, this.chorus, this.reverb,
        this.compressor, this.limiter, this.master,
      ]
      for (const node of nodes) {
        try { if (node) node.dispose() } catch { /* already disposed */ }
      }
      if (this.endEventId !== null && this.transport) {
        try { this.transport.clear(this.endEventId) } catch { /* already cleared */ }
      }
      if (this._analyser) {
        try { this._analyser.disconnect() } catch { /* already detached */ }
      }
    }
    this._analyser = null
    this._previewVoice = null
    this.stepPart = this.captionPart = null
    this.endEventId = null
    this.bus = this.masterFilter = this.chorus = this.reverb = null
    this.compressor = this.limiter = this.master = null
    this.transport = null
    this.Tone = null
    this.ready = false
    this._bootPromise = null
    this._score = null
    this.state = 'idle'
    this.mode = 'data'
  }

  /* ---------------- scheduling ---------------- */

  _buildTracks(score) {
    const Tone = this.Tone
    const ppq = this.transport.PPQ || 192
    const bpm = this._baseBpm * this._rate

    for (const track of score.tracks) {
      const record = this._createTrack(Tone, track, bpm)
      this.tracks.push(record)

      if (track.notes.length) {
        const events = track.notes.map((note) => ({
          time: transportTicks(note.t_beats, ppq),
          note,
        }))
        record.part = new Tone.Part((time, event) => this._trigger(record, event.note, time), events)
        record.part.start(0)
      }
    }

    if (this._steps.length) {
      const events = this._steps.map((step, index) => ({
        time: transportTicks(index * this._beatsPerStep, ppq),
        index,
        step,
      }))
      this.stepPart = new Tone.Part((time, event) => {
        if (this._skipStep !== null && event.index === this._skipStep) {
          this._skipStep = null
          return
        }
        this._position = event.index
        if (this.onstep) this.onstep(event.index, event.step || null)
      }, events)
      this.stepPart.start(0)
    }

    if (this.mode === 'image') {
      const captions = (score.captions || []).map((caption) => ({
        time: transportTicks(caption.t_beats, ppq),
        text: caption.text,
        t: caption.t_beats,
      }))
      if (captions.length) {
        this.captionPart = new Tone.Part((time, event) => {
          if (this.oncaption) this.oncaption(event.text, event.t)
        }, captions)
        this.captionPart.start(0)
      }
    }

    const stepLength = this._steps.length ? this._steps.length * this._beatsPerStep : 0
    const endBeats = Math.max(scoreLengthBeats(score), stepLength) + 0.25
    this.endEventId = this.transport.scheduleOnce((time) => this._finish(time), transportTicks(endBeats, ppq))
  }

  _createTrack(Tone, track, bpm) {
    const params = track.params || {}
    const cutoff = clamp(Number(params.cutoff_hz) || 2000, 60, 14000)
    const send = clamp(Number(params.reverb_send) || 0, 0, 1)
    const detune = clamp(Number(params.detune_cents) || 0, -100, 100)

    const panner = new Tone.Panner(0)
    const dry = new Tone.Gain(1).connect(this.bus)
    panner.connect(dry)
    const reverbSend = new Tone.Gain(send).connect(this.reverb)
    panner.connect(reverbSend)

    const filter = new Tone.Filter({ type: 'lowpass', frequency: cutoff, rolloff: -24 }).connect(panner)

    let voice = null
    let noise = null
    let noiseGain = null

    if (track.role === 'pad') {
      voice = new Tone.PolySynth({
        voice: Tone.Synth,
        maxPolyphony: 12,
        options: {
          oscillator: { type: 'sine' },
          envelope: { attack: 2.5, decay: 1.6, sustain: 0.55, release: 4.0 },
        },
      }).connect(filter)
      voice.volume.value = -17
    } else if (track.role === 'lead') {
      voice = new Tone.FMSynth({
        harmonicity: 2.01,
        modulationIndex: 3,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.6, sustain: 0.08, release: 1.9 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.05, decay: 0.4, sustain: 0, release: 0.5 },
      }).connect(filter)
      voice.volume.value = -13
    } else if (track.role === 'bass') {
      voice = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.6, decay: 1.0, sustain: 0.18, release: 2.5 },
      }).connect(filter)
      voice.volume.value = -16
    } else if (track.role === 'texture') {
      const isWind = /WS10M/i.test(track.id || '')
      const isRain = /PRECTOTCORR/i.test(track.id || '')
      noise = new Tone.Noise({ type: isWind ? 'brown' : isRain ? 'pink' : 'pink', volume: -13 }).start()
      noiseGain = new Tone.Gain(0.0001).connect(filter)
      noise.connect(noiseGain)
    } else {
      voice = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.004, decay: 0.07, sustain: 0, release: 0.05 },
      }).connect(filter)
      voice.volume.value = -30
    }

    if (voice && detune) {
      try {
        if (voice.detune) voice.detune.value = detune
        else if (voice.set) voice.set({ detune })
      } catch { /* this voice has no detune input */ }
    }

    if (noiseGain) {
      const density = clamp(Number(params.density) || 0, 0, 1)
      noiseGain.gain.rampTo(0.008 + density * 0.075, 0.8)
    }

    return {
      role: track.role,
      id: track.id,
      notes: track.notes,
      params,
      part: null,
      voice,
      noise,
      noiseGain,
      filter,
      panner,
      dry,
      reverbSend,
    }
  }

  _trigger(track, note, time) {
    try {
      if (track.panner) {
        track.panner.pan.rampTo(clamp(Number(note.pan) || 0, -1, 1), 0.06, time)
      }
      /* Read the live tempo: a rate change mid-run retimes note lengths too,
         while pitch stays the score's own. */
      const bpm = this._baseBpm * this._rate
      const duration = Math.max(0.08, (Math.max(0, Number(note.dur_beats) || 0) * 60) / bpm)
      const velocity = clamp(Number(note.vel) || 0.4, 0.02, 1)

      if (track.role === 'texture') return
      if (track.role === 'perc') {
        if (track.voice) track.voice.triggerAttackRelease(duration, time, velocity * 0.6)
        return
      }
      if (track.voice) {
        track.voice.triggerAttackRelease(midiToFrequency(note.midi), duration, time, velocity)
      }
    } catch { /* one missed note must never stop the run */ }
  }

  _retriggerPad() {
    if (!this.transport || !this.Tone) return
    const beats = this.transport.ticks / (this.transport.PPQ || 192)
    const bpm = this._baseBpm * this._rate
    const now = this.Tone.now() + 0.02
    for (const track of this.tracks) {
      if (track.role !== 'pad' || !track.voice) continue
      const held = (track.notes || []).filter(
        (note) => note.t_beats <= beats + 0.001 && note.t_beats + note.dur_beats > beats + 0.001,
      )
      if (!held.length) continue
      const last = Math.max(...held.map((note) => note.t_beats + note.dur_beats))
      const remaining = Math.max(0.12, ((last - beats) * 60) / bpm)
      for (const note of held) {
        try {
          track.voice.triggerAttackRelease(
            midiToFrequency(note.midi),
            remaining,
            now,
            clamp(Number(note.vel) || 0.28, 0.05, 1),
          )
        } catch { /* ignore */ }
      }
    }
  }

  _finish(time) {
    if (this.state === 'idle') return
    this.state = 'idle'
    this._position = 0
    this._fadeBus(0.2, time)
    this._releaseAll(time)
    const records = this._takeTracks()
    this._runToken += 1
    try {
      /* Pass the callback time so Tone does not schedule the stop against
         the audio clock from inside a transport callback. */
      this.transport.stop(Number.isFinite(time) ? time : undefined)
      this.transport.cancel(0)
    } catch { /* ignore */ }
    setTimeout(() => this._disposeRecords(records), 280)
    if (this.onend) this.onend()
  }

  _hardStop() {
    this.state = 'idle'
    this._position = 0
    if (!this.ready || !this.transport) return
    this._fadeBus(0.08)
    this._releaseAll()
    const records = this._takeTracks()
    this._runToken += 1
    try {
      this.transport.stop()
      this.transport.cancel(0)
    } catch { /* ignore */ }
    setTimeout(() => this._disposeRecords(records), 140)
  }

  _takeTracks() {
    const records = this.tracks
    this.tracks = []
    if (this.stepPart) {
      try { this.stepPart.dispose() } catch { /* ignore */ }
      this.stepPart = null
    }
    if (this.captionPart) {
      try { this.captionPart.dispose() } catch { /* ignore */ }
      this.captionPart = null
    }
    if (this.endEventId !== null && this.transport) {
      try { this.transport.clear(this.endEventId) } catch { /* ignore */ }
      this.endEventId = null
    }
    return records
  }

  _disposeRecords(records) {
    for (const track of records || []) {
      const nodes = [track.part, track.voice, track.noise, track.noiseGain, track.filter, track.panner, track.dry, track.reverbSend]
      for (const node of nodes) {
        try { if (node) node.dispose() } catch { /* already disposed */ }
      }
      if (track.noise) {
        try { track.noise.stop() } catch { /* ignore */ }
      }
    }
  }

  _releaseAll(at) {
    if (!this.Tone) return
    const now = Number.isFinite(at) ? at : this.Tone.now()
    for (const track of this.tracks) {
      try {
        if (track.voice && track.voice.releaseAll) track.voice.releaseAll(now)
        else if (track.voice && track.voice.triggerRelease) track.voice.triggerRelease(now)
      } catch { /* ignore */ }
      if (track.noiseGain) {
        try { track.noiseGain.gain.rampTo(0.0001, 0.12, now) } catch { /* ignore */ }
      }
    }
  }

  _fadeBus(seconds, at) {
    const start = Number.isFinite(at) ? at : undefined
    const ramp = (param) => {
      try {
        if (start === undefined) param.rampTo(0.0001, seconds)
        else param.rampTo(0.0001, seconds, start)
      } catch { /* ignore */ }
    }
    if (this.bus) ramp(this.bus.gain)
    for (const track of this.tracks) {
      if (track.noiseGain) ramp(track.noiseGain.gain)
    }
  }

  _applyVolume(ramp) {
    if (!this.master) return
    try { this.master.gain.rampTo(volumeToGain(this._volume), ramp) } catch { /* ignore */ }
  }
}

export default ScorePlayer
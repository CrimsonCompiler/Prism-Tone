/**
 * Pure data → music mapping for the Preview experience.
 *
 * The musical language follows the qoder V2 pattern:
 *
 *   • track-led scales — Dorian by default for temperature (minor when the
 *     month is at least 0.9 °C warmer than normal, major when 0.6 °C cooler),
 *     G major pentatonic for rainfall, D minor pentatonic for wind;
 *   • a root note per variable (D3 / G3 / D2), with the lead two octaves up;
 *   • a three-note chord built from scale degrees 0, 2 and 4, held by the pad
 *     until the mode changes;
 *   • a phrase buffer sampled from the surrounding months, quantised into the
 *     scale for the arpeggio;
 *   • a data-led tempo (52–96 bpm) — one month is two beats, two months make
 *     a 4/4 bar;
 *   • several datasets can be layered at once. Each keeps its own rack and
 *     plan; the lead dataset sets the tempo, the map and the captions.
 *
 * Nothing here touches Web Audio or Tone.js. Given one validated monthly
 * value, its normal and the observed range, it returns the exact musical
 * decisions the engine will make, so the caption, the diagram and the sound
 * cannot drift apart.
 *
 * Value → pitch inside the scale, anomaly → scale and register, rate of
 * change → rhythmic density, and the value also moves the tempo. Missing
 * values never produce a note.
 */

import { clamp01, normalize } from './processing'

/* ASCII accidentals: Tone.js's note parser only accepts '#' and 'b', so the
   names shown in the UI are exactly the names handed to the audio engine. */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/* The exact scale sets used by qoder V2 (frontend/src/audio/scales.js). */
export const SCALES = {
  major: { id: 'major', label: 'major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { id: 'minor', label: 'minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  dorian: { id: 'dorian', label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { id: 'phrygian', label: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10] },
  majorPentatonic: { id: 'majorPentatonic', label: 'major pentatonic', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { id: 'minorPentatonic', label: 'minor pentatonic', intervals: [0, 3, 5, 7, 10] },
}

/* One month spans two beats: the walk through time is deliberately calm,
   close to qoder V2's listening pace, and leaves room between notes. */
export const MONTH_BEATS = 2

/* Per-variable rack, mirroring qoder V2's track roots and tempos. */
const VOICES = {
  T2M: { rootMidi: 50, bpm: 66, rack: 'temperature' }, // D3 / 66 bpm
  PRECTOTCORR: { rootMidi: 55, bpm: 76, rack: 'rain' }, // G3 / 76 bpm
  WS10M: { rootMidi: 38, bpm: 58, rack: 'wind' }, // D2 / 58 bpm
}

const DEFAULT_VOICE = { rootMidi: 50, bpm: 72, rack: 'temperature' }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))

export function midiToName(midi) {
  if (midi === null || midi === undefined || !Number.isFinite(midi)) return '—'
  const m = Math.round(midi)
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`
}

/** Build the MIDI notes of a scale from a root, exactly as qoder V2 does. */
export function scaleMidi(scaleId, rootMidi = 62, octaves = 2) {
  const scale = SCALES[scaleId] || SCALES.dorian
  const notes = []
  for (let octave = 0; octave < Math.max(1, octaves); octave += 1) {
    for (const degree of scale.intervals) {
      notes.push(rootMidi + octave * 12 + degree)
    }
  }
  return notes
}

/** Quantise a 0–1 position onto a scale, returning a MIDI note number. */
export function quantize(norm, scaleId = 'dorian', rootMidi = 62, octaves = 2) {
  const notes = scaleMidi(scaleId, rootMidi, octaves)
  const v = clamp01(Number.isFinite(norm) ? norm : 0.5)
  const index = Math.round(v * (notes.length - 1))
  return notes[Math.min(notes.length - 1, Math.max(0, index))]
}

/** A three-note chord built on a scale degree, as qoder V2's chordFor. */
export function chordFor(scaleId, rootMidi = 50, degree = 0) {
  const scale = SCALES[scaleId] || SCALES.dorian
  const intervals = scale.intervals
  return [0, 2, 4].map((step) => {
    const index = degree + step
    const octave = Math.floor(index / intervals.length)
    return rootMidi + octave * 12 + intervals[index % intervals.length]
  })
}

/**
 * Anomaly expressed in units of "one noticeable step" for the variable.
 * Temperature/wind use absolute units; rainfall is relative to the normal.
 */
export function anomalyScore(variable, value, normal) {
  if (value === null || value === undefined || normal === null || normal === undefined) return 0
  const delta = value - normal
  if (variable.id === 'PRECTOTCORR') {
    if (normal > 0.05) return delta / normal
    return delta > 0 ? 2 : delta < 0 ? -2 : 0
  }
  const step = variable.mapping && variable.mapping.noticeable ? variable.mapping.noticeable : 0.3
  return delta / step
}

/**
 * qoder V2's track-led scale rule, expressed in Prism-Tone's noticeable
 * steps: temperature is Dorian by default, minor when at least 0.9 °C above
 * normal and major when at least 0.6 °C below. Rainfall and wind keep their
 * rack's pentatonic.
 */
export function scaleFor(variable, score) {
  if (variable.id === 'T2M') return score > 3 ? 'minor' : score < -2 ? 'major' : 'dorian'
  if (variable.id === 'PRECTOTCORR') return 'majorPentatonic'
  return 'minorPentatonic'
}

/**
 * A phrase of normalised values centred on the current month, the same
 * contour idea as qoder V2's buildPhrase. Used by the arpeggio for neighbour
 * notes so melodies move through the record rather than repeating one pitch.
 */
export function phraseForSteps(steps, index, range, length = 8) {
  const out = []
  const lo = range && Number.isFinite(range.lo) ? range.lo : 0
  const hi = range && Number.isFinite(range.hi) ? range.hi : 1
  for (let i = 0; i < length; i += 1) {
    const offset = i - Math.floor(length / 2)
    const at = Math.max(0, Math.min(steps.length - 1, index + offset))
    const value = steps[at] ? steps[at].value : null
    out.push(value === null || value === undefined ? 0.5 : hi > lo ? clamp01((value - lo) / (hi - lo)) : 0.5)
  }
  return out
}

const speedWord = (tempo, base) =>
  tempo >= base + 18 ? 'briskly' : tempo >= base + 8 ? 'a little faster' : 'at the base pace'

/**
 * Plan one monthly event.
 *
 * @param {object} args
 * @param {object} args.variable  registry entry (id, decimals, mapping)
 * @param {object|null} args.step { key, value }
 * @param {number|null} args.normal 1991–2020 normal for this calendar month
 * @param {{lo:number,hi:number}} args.range observed range of the loaded record
 * @param {number|null} args.prevValue previous step value (rate of change)
 */
export function planForStep({ variable, step, normal, range, prevValue }) {
  const value = step && step.value !== null && step.value !== undefined ? step.value : null
  const lo = range && Number.isFinite(range.lo) ? range.lo : 0
  const hi = range && Number.isFinite(range.hi) ? range.hi : 1
  const norm = value === null ? null : normalize(value, lo, hi)
  const score = anomalyScore(variable, value, normal)
  const isMissing = value === null

  const voice = VOICES[variable.id] || DEFAULT_VOICE
  const scaleId = scaleFor(variable, score)
  const leadRoot = voice.rootMidi + 12
  const scaleNotes = scaleMidi(scaleId, leadRoot, 2)
  const position = norm === null ? 0.5 : norm

  const midi = quantize(position, scaleId, leadRoot, 2)
  const note = isMissing ? null : midiToName(midi)
  const chord = chordFor(scaleId, voice.rootMidi, 0)
  const bassMidi = quantize(clamp01(position * 0.55 + 0.1), scaleId, voice.rootMidi - 12, 1)

  const change =
    !isMissing && prevValue !== null && prevValue !== undefined && hi > lo
      ? Math.abs(value - prevValue) / (hi - lo)
      : 0

  /* qoder V2's tempo idea, kept deliberately gentle: base + data + rhythmic
     density, bounded 52–96 bpm. */
  const rhythm = clamp01(0.18 + position * 0.82 + change * 0.22)
  const tempo = Math.round(clamp(voice.bpm + position * 6 + rhythm * 14, 52, 96))

  const bright = clamp01(0.5 + score * 0.18)

  let density = 2
  let cutoff = 420 + bright * 2000 + position * 700
  let leadGain = 0.3 + position * 0.14
  let textureGain = 0.012 + position * 0.022
  let textureCutoff = 380 + position * 700
  let reverb = 0.12 + Math.min(0.22, Math.abs(score) * 0.04)

  if (variable.id === 'PRECTOTCORR') {
    /* 1–5 marimba notes per month — a sparse figure, not a downpour. */
    density = 1 + Math.round(position * 4)
    cutoff = 1100 + position * 2100
    leadGain = 0.28
    textureGain = 0.02 + position * 0.055
    textureCutoff = 900 + position * 2400
    reverb = 0.16 + Math.min(0.2, Math.abs(score) * 0.03)
  } else if (variable.id === 'WS10M') {
    density = 1
    cutoff = 700 + position * 1800
    leadGain = 0.26
    textureGain = 0.06 + position * 0.18
    textureCutoff = 320 + position * 1500
    reverb = 0.18 + Math.min(0.2, Math.abs(score) * 0.03)
  }

  /* Must match SonificationEngine._stepDuration: one month is two beats. */
  const tempoFactor = tempo / voice.bpm

  const mode = `${NOTE_NAMES[leadRoot % 12]} ${SCALES[scaleId].label}`

  return {
    value,
    normal,
    norm,
    score,
    missing: isMissing,
    rack: voice.rack,
    scaleId,
    scaleName: SCALES[scaleId].label,
    scaleMidi: scaleNotes,
    rootMidi: voice.rootMidi,
    leadRoot,
    chord,
    chordNames: chord.map(midiToName),
    bassMidi,
    mode,
    midi: isMissing ? null : midi,
    note,
    octaveShift: 0,
    brightness: bright,
    tempo,
    tempoFactor,
    rhythm,
    density: Math.max(1, density),
    cutoff: Math.round(clamp(cutoff, 300, 3400)),
    textureGain,
    textureCutoff: Math.round(clamp(textureCutoff, 250, 5200)),
    leadGain,
    padRoot: chord[0],
    padMidi: chord,
    change,
    detune: score > 1 ? -7 : score < -1 ? 7 : 0,
    urgency: Math.max(0, score - 0.55),
    depth: Math.max(0, -score - 0.55),
    speedWord: speedWord(tempo, voice.bpm),
    brightnessWord: bright > 0.58 ? 'bright' : bright < 0.42 ? 'dark' : 'balanced',
  }
}

/** The audible layers, described for the Notes view and mapping diagram. */
export function layerPlan(plan, variable) {
  const chord = plan && plan.chordNames ? plan.chordNames.join('–') : 'waits for data'
  const leadRoot = plan ? plan.leadRoot : 50
  const lead = plan && plan.note ? `${plan.note} · ${plan.mode}` : 'rests — no value'

  let drum = 'waits for data'
  if (plan && !plan.missing) {
    if (variable.id === 'WS10M') drum = `${plan.textureCutoff} Hz filtered wind · ${plan.brightnessWord}`
    else if (variable.id === 'PRECTOTCORR') drum = `${plan.density} marimba notes + shaker · ${plan.brightnessWord} wash`
    else drum = `${plan.textureCutoff} Hz air texture · ${plan.brightnessWord}`
  }

  const leadLabel =
    variable.id === 'T2M' ? 'FM arpeggio' : variable.id === 'PRECTOTCORR' ? 'Marimba figure' : 'Ripple voice'
  const droneLabel =
    variable.id === 'T2M' ? 'Harmony pad' : variable.id === 'PRECTOTCORR' ? 'Bass' : 'Drone'

  return [
    {
      id: 'drone',
      label: droneLabel,
      detail: plan ? chord : 'waits for data',
      meta: plan ? `${plan.mode} · root ${midiToName(plan.padRoot)}` : '1991–2020 comparison',
      level: plan ? 0.34 : 0.1,
    },
    {
      id: 'lead',
      label: leadLabel,
      detail: lead,
      meta: plan ? `${plan.mode} · ${plan.tempo} bpm` : `one note per month · ${midiToName(leadRoot)}`,
      level: plan ? Math.min(1, 0.35 + (plan.norm === null ? 0 : plan.norm) * 0.55) : 0.1,
    },
    {
      id: 'texture',
      label:
        variable.id === 'PRECTOTCORR' ? 'Rain wash' : variable.id === 'WS10M' ? 'Wind texture' : 'Air texture',
      detail: drum,
      meta: plan && !plan.missing ? (variable.id === 'WS10M' ? plan.speedWord : 'filtered noise') : 'silent',
      level: plan && !plan.missing ? Math.min(1, 0.12 + plan.textureGain * 3) : 0.08,
    },
  ]
}

/** Plain-language sentence about the sound for this month. */
export function describeSound(plan, variable) {
  if (!plan || plan.missing) {
    return 'The data voice rests this month — the mix adds no new note, so no value is invented.'
  }
  if (variable.id === 'T2M') {
    const colour = plan.score > 3
      ? 'the warmth has turned the mode minor'
      : plan.score < -2
        ? 'the cool month has opened the mode to major'
        : 'close to its usual Dorian colour'
    return `The FM arpeggio sounds ${plan.note} over the pad chord ${plan.chordNames.join('–')} in ${plan.mode}; ${colour}. The months move at ${plan.tempo} bpm.`
  }
  if (variable.id === 'PRECTOTCORR') {
    const densityWord = plan.density >= 4 ? 'a fuller, monsoon-like figure' : plan.density <= 2 ? 'a sparse, dry figure' : 'a moderate figure'
    return `The marimba plays ${plan.density} ${plan.density === 1 ? 'note' : 'notes'} — ${densityWord} — from the ${plan.mode}, over a soft bass and shaker at ${plan.tempo} bpm.`
  }
  return `The ${plan.mode} drone holds ${midiToName(plan.padMidi[0])} and ${midiToName(plan.padMidi[2])}; the ripple sounds ${plan.note}, the filter follows the wind, and the months move at ${plan.tempo} bpm.`
}

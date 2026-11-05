/**
 * Pure helpers for the backend MusicalScore contract.
 *
 * Nothing here imports Tone.js or React, so the mapping can be tested in
 * plain Node and shared by the player, the facade and the captions without
 * pulling in the audio library.
 *
 * A MusicalScore is versioned (`version: "1.0"`), carries one key/scale and
 * an array of tracks. Notes are positioned in beats; data scores put one
 * month on two beats, and `provenance.stats.beats_per_month` states the real
 * cadence when the backend changes it. Missing months have no note and no
 * caption, so a step without a caption simply falls back to the data sentence.
 */

export const SCORE_VERSION = '1.0'
export const DEFAULT_BEATS_PER_STEP = 2
export const ROLES = ['pad', 'lead', 'bass', 'texture', 'perc']

/** Strict enough to reject a wrong envelope without guessing at missing data. */
export function isValidScore(score) {
  if (!score || typeof score !== 'object') return false
  if (score.version !== SCORE_VERSION) return false
  if (!Array.isArray(score.tracks)) return false
  if (!Number.isFinite(score.tempo_bpm) || score.tempo_bpm <= 0) return false

  for (const track of score.tracks) {
    if (!track || typeof track !== 'object') return false
    if (!ROLES.includes(track.role)) return false
    if (!Array.isArray(track.notes)) return false
    for (const note of track.notes) {
      if (!note || typeof note !== 'object') return false
      if (!Number.isFinite(note.t_beats) || note.t_beats < 0) return false
      if (!Number.isFinite(note.midi)) return false
      if (!Number.isFinite(note.dur_beats) || note.dur_beats < 0) return false
    }
  }

  if (score.captions !== undefined && !Array.isArray(score.captions)) return false
  return true
}

/** The month cadence stated by the score; two beats when it is absent. */
export function scoreBeatsPerStep(score) {
  const stats = score && score.provenance && score.provenance.stats
  const stated = stats ? Number(stats.beats_per_month) : NaN
  return Number.isFinite(stated) && stated > 0 ? stated : DEFAULT_BEATS_PER_STEP
}

/** Last sounding beat, including note durations and captions. */
export function scoreLengthBeats(score) {
  let end = 0
  for (const track of (score && score.tracks) || []) {
    for (const note of track.notes || []) {
      const tail = note.t_beats + Math.max(0, Number(note.dur_beats) || 0)
      if (tail > end) end = tail
    }
  }
  for (const caption of (score && score.captions) || []) {
    if (Number.isFinite(caption.t_beats) && caption.t_beats > end) end = caption.t_beats
  }
  return end
}

/** "D Dorian" — the one mode the whole score keeps. */
export function scoreScaleLabel(score) {
  if (!score) return ''
  return [score.key, score.scale].filter((part) => typeof part === 'string' && part.trim()).join(' ')
}

/** Round a caption beat onto its month/step index. */
export function captionStepIndex(tBeats, beatsPerStep = DEFAULT_BEATS_PER_STEP) {
  if (!Number.isFinite(tBeats)) return null
  const span = Number.isFinite(beatsPerStep) && beatsPerStep > 0 ? beatsPerStep : DEFAULT_BEATS_PER_STEP
  return Math.round(tBeats / span)
}

/**
 * Captions keyed by step index. A missing month has no caption, so the array
 * can be sparse; callers must treat an absent entry as "use the data sentence".
 */
export function scoreCaptionMap(score, beatsPerStep = scoreBeatsPerStep(score)) {
  const map = []
  for (const caption of (score && score.captions) || []) {
    if (!caption || typeof caption.text !== 'string' || !caption.text.trim()) continue
    const index = captionStepIndex(caption.t_beats, beatsPerStep)
    if (index === null || index < 0) continue
    map[index] = caption.text.trim()
  }
  return map
}

/** Transport-relative time string; ticks follow the tempo, seconds do not. */
export function transportTicks(beats, ppq = 192) {
  const resolution = Number.isFinite(ppq) && ppq > 0 ? ppq : 192
  const safe = Number.isFinite(beats) ? Math.max(0, beats) : 0
  return `${Math.round(safe * resolution)}i`
}

/** Which step a transport position lands on. */
export function stepFromTicks(ticks, ppq = 192, beatsPerStep = DEFAULT_BEATS_PER_STEP) {
  const resolution = Number.isFinite(ppq) && ppq > 0 ? ppq : 192
  const span = Number.isFinite(beatsPerStep) && beatsPerStep > 0 ? beatsPerStep : DEFAULT_BEATS_PER_STEP
  return Math.max(0, Math.floor((Number(ticks) || 0) / resolution / span))
}

/** The musical clause of a data caption ("…; Dorian colour." → "Dorian colour."). */
export function musicalClause(caption) {
  if (typeof caption !== 'string') return ''
  const index = caption.lastIndexOf(';')
  return (index >= 0 ? caption.slice(index + 1) : caption).trim()
}

/**
 * Turn a score caption's musical clause into one sentence for the caption
 * bar. It never repeats or overrides the data-derived value/normal sentence,
 * and it never claims a mode change: the score has one key and scale.
 */
export function scoreSoundSentence({ caption, scaleLabel, tempo } = {}) {
  const mode = typeof scaleLabel === 'string' && scaleLabel.trim() ? scaleLabel.trim() : 'the score scale'
  const bpm = Number.isFinite(tempo) && tempo > 0 ? Math.round(tempo) : null
  const base = `The score holds ${mode}${bpm ? ` at ${bpm} bpm` : ''}`
  const clause = musicalClause(caption).replace(/\.$/, '').trim()
  if (!clause) return `${base}.`
  if (/\bcolour$/i.test(clause)) return `${base}; the month keeps that colour.`
  if (/\bripple$/i.test(clause)) return `${base}; the month adds one ripple note.`
  if (/^\d/.test(clause)) return `${base}; it plays ${clause}.`
  return `${base}; ${clause}.`
}
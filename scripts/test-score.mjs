/**
 * Plain-Node checks for the MusicalScore contract and the engine facade.
 *
 *   node scripts/test-score.mjs
 *
 * No test runner is installed in this project, so this small script holds the
 * pure rules that must not drift: envelope validation, beats→steps mapping,
 * caption placement, seek/transport ticks and score-vs-local selection.
 */

import { registerHooks } from 'node:module'
import {
  isValidScore,
  scoreBeatsPerStep,
  scoreCaptionMap,
  scoreLengthBeats,
  scoreScaleLabel,
  captionStepIndex,
  transportTicks,
  stepFromTicks,
  musicalClause,
  scoreSoundSentence,
} from '../src/preview/lib/score.js'

/* The app imports extensionless specifiers (Vite resolves them); plain Node
   needs the `.js` suffix. This hook only affects this test process. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?js$/i.test(specifier)) {
      for (const suffix of ['.js', '/index.js']) {
        try {
          return nextResolve(specifier + suffix, context)
        } catch {
          /* try the next candidate */
        }
      }
    }
    return nextResolve(specifier, context)
  },
})

const { engine } = await import('../src/preview/lib/sonify.js')

let failures = 0
let checks = 0

function ok(label, condition) {
  checks += 1
  if (condition) {
    console.log(`  pass  ${label}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${label}`)
  }
}

function eq(label, actual, expected) {
  ok(`${label} (got ${JSON.stringify(actual)})`, actual === expected)
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const score = {
  version: '1.0',
  key: 'D',
  scale: 'Dorian',
  tempo_bpm: 60,
  time_sig: [4, 4],
  tracks: [
    {
      id: 'pad:T2M',
      role: 'pad',
      notes: [
        { t_beats: 0, dur_beats: 8, midi: 50, vel: 0.24, pan: 0 },
        { t_beats: 8, dur_beats: 8, midi: 52, vel: 0.24, pan: 0 },
      ],
      params: { cutoff_hz: 1400, reverb_send: 0.4, detune_cents: 0, density: 0 },
    },
    {
      id: 'lead:T2M',
      role: 'lead',
      notes: [
        { t_beats: 0, dur_beats: 0.9, midi: 62, vel: 0.4, pan: 0.1 },
        { t_beats: 2, dur_beats: 0.9, midi: 64, vel: 0.4, pan: 0.1 },
        { t_beats: 4, dur_beats: 0.9, midi: 66, vel: 0.4, pan: 0.1 },
      ],
      params: { cutoff_hz: 2400, reverb_send: 0.3, detune_cents: 4, density: 0 },
    },
    {
      id: 'bass:T2M',
      role: 'bass',
      notes: [{ t_beats: 0, dur_beats: 4, midi: 38, vel: 0.3, pan: 0 }],
      params: { cutoff_hz: 700, reverb_send: 0.1, detune_cents: 0, density: 0 },
    },
    {
      id: 'texture:T2M',
      role: 'texture',
      notes: [],
      params: { cutoff_hz: 1200, reverb_send: 0.5, detune_cents: 0, density: 0.35 },
    },
  ],
  captions: [
    { t_beats: 0, text: 'Jan 2016 — 18.0 °C, -6.2 °C vs the labelled record normal (z -1.4); Dorian colour.' },
    { t_beats: 2, text: 'Feb 2016 — 19.5 °C, -4.0 °C vs the labelled record normal (z -0.9); Dorian colour.' },
    { t_beats: 4, text: 'Mar 2016 — 21.0 °C, -2.1 °C vs the labelled record normal (z -0.5); Dorian colour.' },
  ],
  provenance: {
    stats: { beats_per_month: 2, months: 3 },
    mapping: {},
    missing_policy: 'Missing months produce no note and no caption.',
  },
}

const clone = (value) => JSON.parse(JSON.stringify(value))

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

console.log('score validation')
ok('accepts a versioned score with tracks', isValidScore(score))
ok('rejects a missing score', !isValidScore(null))
ok('rejects the wrong version', !isValidScore({ ...score, version: '2.0' }))
ok('rejects a missing tracks array', !isValidScore({ ...score, tracks: undefined }))
ok('rejects an unknown role', !isValidScore({ ...score, tracks: [{ ...score.tracks[0], role: 'brass' }] }))
ok('rejects a note without a finite midi', !isValidScore({
  ...score,
  tracks: [{ ...score.tracks[0], notes: [{ t_beats: 0, dur_beats: 1, midi: null }] }],
}))
ok('rejects a negative note beat', !isValidScore({
  ...score,
  tracks: [{ ...score.tracks[0], notes: [{ t_beats: -1, dur_beats: 1, midi: 60 }] }],
}))
ok('rejects a non-numeric tempo', !isValidScore({ ...score, tempo_bpm: 'slow' }))
ok('rejects captions that are not an array', !isValidScore({ ...score, captions: 'none' }))

/* ------------------------------------------------------------------ */
/* Beats ↔ steps                                                       */
/* ------------------------------------------------------------------ */

console.log('beats and steps')
eq('beats per step from provenance', scoreBeatsPerStep(score), 2)
eq('beats per step defaults to 2', scoreBeatsPerStep({ ...score, provenance: { stats: {} } }), 2)
eq('beats per step honours an explicit cadence', scoreBeatsPerStep({
  ...score,
  provenance: { stats: { beats_per_month: 3 } },
}), 3)
eq('caption at beat 0 maps to step 0', captionStepIndex(0, 2), 0)
eq('caption at beat 2 maps to step 1', captionStepIndex(2, 2), 1)
eq('caption at beat 22 maps to step 11', captionStepIndex(22, 2), 11)
eq('ticks round-trip to the same step', stepFromTicks(384, 192, 2), 1)
eq('a beat inside step 1 stays on step 1', stepFromTicks(767, 192, 2), 1)
eq('the exact next boundary moves to step 2', stepFromTicks(768, 192, 2), 2)
eq('transport ticks quote ticks', transportTicks(2, 192), '384i')
eq('transport ticks clamp negatives to zero', transportTicks(-3, 192), '0i')
eq('score length includes the last caption', scoreLengthBeats(score), 16)
eq('scale label joins key and scale', scoreScaleLabel(score), 'D Dorian')

/* Missing months leave a hole in the caption map; nothing is filled. */
const gapped = clone(score)
const keptCaptions = [gapped.captions[0], gapped.captions[2]]
gapped.captions = keptCaptions
const map = scoreCaptionMap(gapped)
eq('caption map keeps step 0', map[0], keptCaptions[0].text)
eq('caption map leaves step 1 empty', map[1], undefined)
eq('caption map keeps step 2', map[2], keptCaptions[1].text)

/* ------------------------------------------------------------------ */
/* Caption language never claims a per-month mode change              */
/* ------------------------------------------------------------------ */

console.log('caption language')
eq('musical clause reads after the semicolon', musicalClause(score.captions[0].text), 'Dorian colour.')
const sentence = scoreSoundSentence({
  caption: score.captions[0].text,
  scaleLabel: 'D Dorian',
  tempo: 60,
})
ok('score sentence names the one scale and tempo', sentence.includes('D Dorian') && sentence.includes('60 bpm'))
ok('score sentence makes no mode-change claim', !/minor|major|phrygian/i.test(sentence))
ok('rain caption keeps the note count', scoreSoundSentence({
  caption: 'Apr 2016 — 4.2 mm/day; 4 marimba notes.',
  scaleLabel: 'G Major pentatonic',
  tempo: 76,
}).endsWith('it plays 4 marimba notes.'))

/* ------------------------------------------------------------------ */
/* Facade: score vs local selection                                    */
/* ------------------------------------------------------------------ */

console.log('engine selection')
const payload = { score, cache: { hit: false }, source: { kind: 'data' } }
engine.setScore(payload, 'selection-a')
ok('a valid score is available', engine.scoreInfo.available === true)
eq('facade reports the score scale', engine.scoreInfo.scaleLabel, 'D Dorian')
eq('facade reports the score tempo', engine.scoreInfo.tempo, 60)
eq('facade reports the step cadence', engine.scoreInfo.beatsPerStep, 2)
eq('facade exposes caption 0', engine.scoreCaptionAt(0), score.captions[0].text)
eq('a missing caption returns null', engine.scoreCaptionAt(99), null)

engine.setScore(null, 'selection-b')
ok('clearing a score falls back to local', engine.scoreInfo.available === false)
eq('fallback source is local', engine.scoreInfo.source, 'local')

engine.setScore({ score: { ...score, version: '9.9' } }, 'selection-c')
ok('an invalid score never becomes available', engine.scoreInfo.available === false)

engine.setScore(payload, 'selection-d')
engine.configure({ primary: 'T2M', layers: [], selectionKey: 'selection-e' })
ok('a selection change drops the old score', engine.scoreInfo.available === false)

console.log('')
console.log(`${checks - failures}/${checks} checks passed`)
if (failures > 0) process.exitCode = 1
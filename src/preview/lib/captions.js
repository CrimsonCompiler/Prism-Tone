/**
 * Live caption generators.
 *
 * Every caption is assembled from the actual selected data (the step value,
 * the scope, the comparison against the climate normal). The three epistemic
 * classes are phrased distinctly and labelled in the UI legend:
 *   measured      — a real retrieved value
 *   derived       — computed from real values (national mean, normal, delta)
 *   interpretation— describes the sound mapping, not a fact about the world
 */

import { keyToLabel, monthLong, baselineNormal, getMonthly } from './processing'
import { fmtValue, fmtDelta } from './format'
import { BASELINE } from '../data/datasets'

function normalFor(seriesMap) {
  if (!seriesMap) return null
  const normal = baselineNormal(seriesMap, BASELINE)
  return normal
}

export function describeStep({ variable, step, seriesMap, scopeName, scopeKind }) {
  if (!step) return { text: 'Nothing selected yet.', cls: 'interpretation' }

  const label = keyToLabel(step.key)
  const scopeText = scopeKind === 'national'
    ? 'World (planetary mean of 7 continents)'
    : scopeName

  if (step.value === null) {
    return {
      text: `${label} — ${scopeText}: no valid observation for this month. The data voice rests; only the time pulse marks the step.`,
      cls: 'measured',
    }
  }

  const unit = variable.unit
  const v = fmtValue(step.value, variable.decimals)

  const normal = normalFor(seriesMap)
  const month = Number(step.key.slice(4, 6))
  const nv = normal ? normal[month] : null

  let comparison = ''
  let soundNote = ''
  const name = variable.name.toLowerCase()

  if (nv !== null && nv !== undefined) {
    const delta = step.value - nv
    if (variable.id === 'T2M') {
      comparison =
        Math.abs(delta) < 0.3
          ? ` close to the 1991–2020 normal of ${fmtValue(nv, 1)} ${unit} for ${label.slice(0, 3)}.`
          : delta > 0
            ? ` ${fmtDelta(delta, 1, unit)} above the 1991–2020 normal (${fmtValue(nv, 1)} ${unit} for ${label.slice(0, 3)}).`
            : ` ${fmtDelta(delta, 1, unit)} below the 1991–2020 normal (${fmtValue(nv, 1)} ${unit} for ${label.slice(0, 3)}).`
      soundNote = delta > 0.3
        ? ' The temperature voice sits higher in pitch than a typical month.'
        : delta < -0.3
          ? ' The temperature voice sits lower in pitch than a typical month.'
          : ' The temperature voice holds near its usual register.'
    } else if (variable.id === 'PRECTOTCORR') {
      comparison =
        Math.abs(delta) < nv * 0.1
          ? ` near the 1991–2020 normal of ${fmtValue(nv, 2)} ${unit}.`
          : delta > 0
            ? ` ${fmtDelta(delta, 2, unit)} above the 1991–2020 normal (${fmtValue(nv, 2)} ${unit}).`
            : ` ${fmtDelta(delta, 2, unit)} below the 1991–2020 normal (${fmtValue(nv, 2)} ${unit}).`
      soundNote = delta > nv * 0.1
        ? ' The rain figure plays dense and bright — a monsoon-strength burst.'
        : delta < -nv * 0.1
          ? ' The rain figure is sparse — a dry-season whisper.'
          : ' The rain figure plays at an average density.'
    } else if (variable.id === 'WS10M') {
      comparison =
        Math.abs(delta) < 0.2
          ? ` close to the 1991–2020 normal of ${fmtValue(nv, 1)} ${unit}.`
          : delta > 0
            ? ` ${fmtDelta(delta, 1, unit)} above the 1991–2020 normal (${fmtValue(nv, 1)} ${unit}).`
            : ` ${fmtDelta(delta, 1, unit)} below the 1991–2020 normal (${fmtValue(nv, 1)} ${unit}).`
      soundNote = delta > 0.2
        ? ' The wind layer is bright and pushes the months along faster.'
        : delta < -0.2
          ? ' The wind layer is a soft, dark wash and the months pass slowly.'
          : ' The wind layer sits at an average brightness.'
    }
  } else {
    comparison = ' No 1991–2020 normal is available for this scope, so no comparison is made.'
  }

  return {
    text: `${label} — ${scopeText}: ${name} ${v} ${unit}.${comparison}${soundNote}`,
    cls: 'measured',
  }
}

/** Static caption while paused / before audio init. */
export function idleCaption({ variable, scopeName, scopeKind, hasData, ready }) {
  if (!ready) return 'Retrieving NASA POWER data — captions will follow the data.'
  if (!hasData) return 'No valid observations for this selection — nothing can be sonified.'
  const scopeText = scopeKind === 'national' ? 'World (planetary mean)' : scopeName
  const mapping = {
    T2M: 'Each month becomes one note: warmer months sound higher.',
    PRECTOTCORR: 'Each month becomes one bar: heavier rain plays more notes.',
    WS10M: 'Each month becomes one wash of wind noise: stronger wind sounds brighter and moves faster.',
  }[variable.id]
  return `Paused — ${variable.name} at ${scopeText}. ${mapping} Press play to listen through the selected time.`
}

/** Short announcement when playback reaches the end naturally. */
export function endCaption({ variable }) {
  return `Playback complete — that was ${variable.name.toLowerCase()} across the selected time. Press play to listen again, or change the time selection.`
}

export function monthLabel(year, month) {
  return monthLong(year, month)
}

export { getMonthly }

/**
 * Live caption generators.
 *
 * Every caption is assembled from the actual selected data: the step value,
 * the scope, the 1991–2020 comparison, and the mapping in lib/music.js.
 * Captions are plain language, 2–3 sentences, and follow the same shape:
 *
 *   place / time  →  value  →  comparison  →  what the sound is doing
 *                 →  one line of context (measured vs derived)
 *
 * Missing values are stated, never patched. Captions are produced whether
 * or not audio is audible — muting changes sound, not information.
 */

import { keyToLabel, monthLong, baselineNormal, getMonthly } from './processing'
import { fmtValue } from './format'
import { describeSound, planForStep } from './music'
import { BASELINE } from '../data/datasets'

export function normalsFor(seriesMap) {
  if (!seriesMap) return null
  return baselineNormal(seriesMap, BASELINE)
}

export function scopeLabel(scopeName, scopeKind) {
  if (scopeKind === 'national') return 'World — planetary mean of seven continental samples'
  return `${scopeName} — measured continental sample`
}

export function scopeShort(scopeName, scopeKind) {
  return scopeKind === 'national' ? 'World planetary mean' : scopeName
}

function contextLine(scopeKind) {
  return scopeKind === 'national'
    ? 'Context: this is a derived mean of seven continental sample points, not a national weather-station reading.'
    : 'Context: this is a measured NASA POWER sample at the continent centroid, not an area average.'
}

function comparisonFor({ variable, value, normal, label }) {
  if (normal === null || normal === undefined || value === null || value === undefined) {
    return {
      text: 'No 1991–2020 normal is available for this scope, so no comparison is made.',
      delta: null,
      normal: null,
    }
  }
  const delta = value - normal
  const unit = variable.unit
  const decimals = variable.decimals
  const month = label ? label.slice(0, 3) : 'this month'

  /* Plain-language comparison band. Independent of the scale rule in
     music.js: a slightly warm month can still sound Dorian. */
  const step = variable.mapping && variable.mapping.noticeable ? variable.mapping.noticeable : 0.3
  const score = variable.id === 'PRECTOTCORR'
    ? normal > 0.05 ? delta / normal : 0
    : delta / step

  let text
  if (Math.abs(score) < 0.55) {
    text = `close to the 1991–2020 normal of ${fmtValue(normal, decimals)} ${unit} for ${month}`
  } else if (delta > 0) {
    text = `${fmtValue(Math.abs(delta), decimals)} ${unit} above the 1991–2020 normal of ${fmtValue(normal, decimals)} ${unit} for ${month}`
  } else {
    text = `${fmtValue(Math.abs(delta), decimals)} ${unit} below the 1991–2020 normal of ${fmtValue(normal, decimals)} ${unit} for ${month}`
  }
  return { text, delta, normal }
}

function valueSentence(variable, value) {
  const unit = variable.unit
  if (variable.id === 'T2M') return `Air temperature was ${fmtValue(value, variable.decimals)} ${unit}`
  if (variable.id === 'PRECTOTCORR') return `Precipitation was ${fmtValue(value, variable.decimals)} ${unit}`
  if (variable.id === 'WS10M') return `Wind speed was ${fmtValue(value, variable.decimals)} ${unit}`
  return `${variable.name} was ${fmtValue(value, variable.decimals)} ${unit}`
}

function deltaShort(variable, delta) {
  if (delta === null || delta === undefined) return 'no baseline comparison'
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return `${sign}${fmtValue(Math.abs(delta), variable.decimals)} ${variable.unit} vs 1991–2020`
}

/**
 * Describe one monthly step.
 *
 * @returns {{
 *   text:string, shortText:string, key:string, label:string,
 *   value:number|null, delta:number|null, normal:number|null,
 *   plan:object, cls:string, variableId:string
 * }}
 */
export function describeStep({
  variable,
  step,
  seriesMap,
  normal,
  scopeName,
  scopeKind,
  range,
  prevValue,
}) {
  const label = step && step.key ? keyToLabel(step.key) : ''
  const scope = scopeShort(scopeName, scopeKind)
  const normals = normal !== undefined ? null : normalsFor(seriesMap)
  const month = step && step.key ? Number(String(step.key).slice(4, 6)) : null
  const normalValue = normal !== undefined ? normal : normals && month ? normals[month] : null

  const value = step && step.value !== null && step.value !== undefined ? step.value : null
  const plan = planForStep({
    variable,
    step: step || { key: null, value: null },
    normal: normalValue,
    range: range || { lo: 0, hi: 1 },
    prevValue: prevValue === undefined ? null : prevValue,
  })

  if (value === null) {
    return {
      text: `${label} — ${scope}. No valid ${variable.name.toLowerCase()} observation was returned for this month, so the mix adds no new note and nothing is invented. ${contextLine(scopeKind)}`,
      shortText: `${label} · no valid observation`,
      key: step ? step.key : '',
      label,
      value: null,
      delta: null,
      normal: normalValue,
      plan,
      cls: 'measured',
      variableId: variable.id,
    }
  }

  const cmp = comparisonFor({ variable, value, normal: normalValue, label })
  const sound = describeSound(plan, variable)

  return {
    text: `${label} — ${scope}. ${valueSentence(variable, value)}, ${cmp.text}. ${sound} ${contextLine(scopeKind)}`,
    shortText: `${label} · ${fmtValue(value, variable.decimals)} ${variable.unit} · ${deltaShort(variable, cmp.delta)}`,
    key: step.key,
    label,
    value,
    delta: cmp.delta,
    normal: normalValue,
    plan,
    cls: 'measured',
    variableId: variable.id,
  }
}

/** Describe an idle selection (month, year or range) so captions never go stale. */
export function describeSelection({
  variable,
  state,
  seriesMap,
  normal,
  scopeName,
  scopeKind,
  range,
}) {
  if (state.timeMode === 'range') {
    return describeRange({
      variable,
      state,
      seriesMap,
      normal,
      scopeName,
      scopeKind,
      range,
    })
  }
  const key = state.timeMode === 'month'
    ? `${state.year}${String(state.month).padStart(2, '0')}`
    : `${state.year}${String(state.month).padStart(2, '0')}`
  const value = getMonthly(seriesMap, state.year, state.month)
  return describeStep({
    variable,
    step: { key, value },
    seriesMap,
    normal,
    scopeName,
    scopeKind,
    range,
    prevValue: getMonthly(seriesMap, state.year, state.month - 1),
  })
}

/** Range mean caption, computed from the same validated monthly values. */
export function describeRange({
  variable,
  state,
  seriesMap,
  normal,
  scopeName,
  scopeKind,
  range,
}) {
  const { startYear, endYear } = state.range
  const label = `${startYear}–${endYear}`
  const scope = scopeShort(scopeName, scopeKind)
  let sum = 0
  let n = 0
  let total = 0
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      total += 1
      const v = getMonthly(seriesMap, y, m)
      if (v !== null) {
        sum += v
        n += 1
      }
    }
  }
  const mean = n ? sum / n : null
  const plan = planForStep({
    variable,
    step: { key: null, value: mean },
    normal: normal === undefined ? null : normal,
    range: range || { lo: 0, hi: 1 },
    prevValue: null,
  })

  if (mean === null) {
    return {
      text: `${label} at ${scope}. No valid ${variable.name.toLowerCase()} observations were returned for this range, so nothing is sonified. ${contextLine(scopeKind)}`,
      shortText: `${label} · no valid observations`,
      key: null,
      label,
      value: null,
      delta: null,
      normal: normal === undefined ? null : normal,
      plan,
      cls: 'derived',
      variableId: variable.id,
    }
  }

  const cmp = comparisonFor({ variable, value: mean, normal: normal === undefined ? null : normal, label })
  const coverage = total ? n / total : 0
  const coverageText = coverage < 1
    ? `${n} of ${total} months had a valid value.`
    : `All ${total} months had a valid value.`

  return {
    text: `${label} at ${scope}. ${variable.name} averaged ${fmtValue(mean, variable.decimals)} ${variable.unit} across ${n} months, ${cmp.text}. ${describeSound(plan, variable)} ${coverageText} ${contextLine(scopeKind)}`,
    shortText: `${label} · mean ${fmtValue(mean, variable.decimals)} ${variable.unit} · ${deltaShort(variable, cmp.delta)}`,
    key: null,
    label,
    value: mean,
    delta: cmp.delta,
    normal: normal === undefined ? null : normal,
    plan,
    cls: 'derived',
    variableId: variable.id,
  }
}

/** Static caption while idle. */
export function idleCaption({ variable, scopeName, scopeKind, hasData, ready }) {
  if (!ready) return 'Retrieving NASA POWER data — captions will follow the data.'
  if (!hasData) return 'No valid observations for this selection — nothing can be sonified.'
  const scope = scopeShort(scopeName, scopeKind)
  const mapping = {
    T2M: 'Each month becomes two beats in D Dorian: warmer months sound higher, a warm anomaly turns the mode minor, and the chord holds while the bass returns every two months.',
    PRECTOTCORR: 'Each month becomes two beats of marimba in G major pentatonic: heavier rain adds notes over a bass and a filtered wash.',
    WS10M: 'Each month becomes two beats of filtered wind in D minor pentatonic: stronger wind weighs the drone and opens the filter.',
  }[variable.id]
  return `Paused — ${variable.name} at ${scope}. ${mapping} Press play to listen through the selected time.`
}

/** Short announcement when playback reaches the end naturally. */
export function endCaption({ variable }) {
  return `Playback complete — that was ${variable.name.toLowerCase()} across the selected time. Press play to listen again, or change the time selection.`
}

export function monthLabel(year, month) {
  return monthLong(year, month)
}

/** Rich description for the “Describe this view” action. */
export function describeView({
  state,
  variable,
  steps,
  seriesMap,
  caption,
  summary,
}) {
  const scope = scopeLabel(
    state.scope.type === 'division' ? (summary && summary.scopeName) || 'selected continent' : 'World',
    state.scope.type,
  )
  const time = state.timeMode === 'range'
    ? `the range ${state.range.startYear} to ${state.range.endYear}`
    : state.timeMode === 'year'
      ? `the year ${state.year}, listening to ${monthLong(state.year, state.month)}`
      : `${monthLong(state.year, state.month)}`
  const play = state.playState === 'idle'
    ? 'Playback is stopped.'
    : state.playState === 'paused'
      ? 'Playback is paused.'
      : `Playback is playing, step ${state.position + 1} of ${steps.length}.`
  const focus = state.isolatedCountry
    ? `The map is isolated on ${state.isolatedCountry.name}.`
    : state.focusedCountry
      ? `The map is focused on ${state.focusedCountry.name}.`
      : 'The map is in global view.'
  const coverage = summary
    ? `${summary.validCount} of ${summary.totalCount} selected periods have a valid value.`
    : ''
  const current = caption && caption.text ? caption.text : ''
  const sound = state.soundPlan && state.soundPlan.missing
    ? 'This step has no data, so the mix adds no new note.'
    : ''
  return `Preview view. ${variable.name} at ${scope}. ${focus} Time: ${time}. ${play} ${current} ${coverage} ${sound} Captions are ${state.settings && state.settings.captionsVisible === false ? 'off' : 'on'}. Volume is ${Math.round((state.volume || 0) * 100)} percent.`
}

export { getMonthly }

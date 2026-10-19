/**
 * Display selectors — resolve "what value should the map / list / summary
 * show right now" from shared state. Pure functions; no synthetic values.
 */

import { monthsInSelection, monthKey, keyToLabel, extent, meanOf, baselineNormal, getMonthly } from './processing'
import { YEAR_MIN, YEAR_MAX, BASELINE } from '../data/datasets'
import { REGIONS as DIVISIONS } from '../data/subcontinent'

/** Month key the map and readouts should display. Null in range mode when idle (→ show range mean). */
export function displayKey(state, steps, position, playState) {
  if (playState === 'playing' || playState === 'paused') {
    const step = steps[position]
    if (step) return step.key
  }
  if (state.timeMode === 'range') return null
  return monthKey(state.year, state.month)
}

/** Per-division values for the map and the accessible region list. */
export function divisionDisplayValues({ state, variable, displayKey }) {
  const out = {}
  const param = variable.param
  const ready = state.data.status === 'ready'

  if (!ready) {
    for (const d of DIVISIONS) out[d.id] = { value: null, status: 'loading' }
    return out
  }

  if (displayKey) {
    for (const d of DIVISIONS) {
      const series = state.data.divisions[d.id]
      const map = series && series[param]
      const v = map && Object.prototype.hasOwnProperty.call(map, displayKey) ? map[displayKey] : null
      const failed = state.data.outcomes && state.data.outcomes[d.id] && !state.data.outcomes[d.id].ok
      out[d.id] = { value: v, status: failed ? 'error' : v === null ? 'missing' : 'ok' }
    }
    return out
  }

  /* range mode, idle: derived mean over the selected range */
  const keys = monthsInSelection('range', state, YEAR_MIN, YEAR_MAX)
  for (const d of DIVISIONS) {
    const series = state.data.divisions[d.id]
    const map = series && series[param]
    let sum = 0
    let n = 0
    for (const k of keys) {
      const v = map && Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null
      if (v !== null) {
        sum += v
        n += 1
      }
    }
    const failed = state.data.outcomes && state.data.outcomes[d.id] && !state.data.outcomes[d.id].ok
    out[d.id] = {
      value: n ? sum / n : null,
      status: failed ? 'error' : n === 0 ? 'missing' : 'derived',
      coverage: keys.length ? n / keys.length : 0,
    }
  }
  return out
}

/** Everything the summary panel needs, computed from the real series. */
export function selectionSummary({ state, variable, seriesMap, steps, position, playState }) {
  const key = displayKey(state, steps, position, playState)
  const param = variable.param

  let selectionPoints = []
  let selectionLabel = ''

  if (state.timeMode === 'month') {
    selectionLabel = keyToLabel(key)
    const v = getMonthly(seriesMap, state.year, state.month)
    selectionPoints = [{ value: v }]
  } else if (state.timeMode === 'year') {
    selectionLabel = `${state.year}`
    selectionPoints = []
    for (let m = 1; m <= 12; m++) {
      selectionPoints.push({ key: monthKey(state.year, m), value: getMonthly(seriesMap, state.year, m) })
    }
  } else {
    selectionLabel = `${state.range.startYear}–${state.range.endYear}`
    selectionPoints = steps
  }

  const valid = selectionPoints.filter((p) => p.value !== null && p.value !== undefined)
  const [selMin, selMax] = extent(selectionPoints)
  const selMean = meanOf(selectionPoints)
  const coverage = selectionPoints.length ? valid.length / selectionPoints.length : 0

  /* current display value */
  let current = { value: null, label: '', kind: 'none' }
  if (key) {
    const v = seriesMap && Object.prototype.hasOwnProperty.call(seriesMap, key) ? seriesMap[key] : null
    current = { value: v, label: keyToLabel(key), kind: state.scope.type === 'national' ? 'derived' : 'measured' }
  } else if (valid.length) {
    current = { value: selMean, label: `mean over ${selectionLabel}`, kind: 'derived' }
  }

  /* baseline comparison (same calendar months, same scope, same units) */
  let normal = null
  let delta = null
  if (seriesMap) {
    const normals = baselineNormal(seriesMap, BASELINE)
    if (state.timeMode === 'month') {
      normal = normals[state.month]
      if (normal !== null && current.value !== null) delta = current.value - normal
    } else {
      const ns = []
      for (const p of selectionPoints) {
        const m = p.key ? Number(p.key.slice(4, 6)) : null
        if (m && normals[m] !== null && normals[m] !== undefined) ns.push(normals[m])
      }
      if (ns.length >= valid.length * 0.75 && ns.length > 0) {
        const normalMean = ns.reduce((a, b) => a + b, 0) / ns.length
        normal = normalMean
        if (selMean !== null) delta = selMean - normalMean
      }
    }
  }

  return {
    key,
    selectionLabel,
    current,
    selMin,
    selMax,
    selMean,
    coverage,
    validCount: valid.length,
    totalCount: selectionPoints.length,
    normal,
    delta,
    scopeKind: state.scope.type,
  }
}

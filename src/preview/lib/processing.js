/**
 * Data processing for the Preview experience.
 *
 * Everything here operates on validated NASA POWER series
 * ({ 'YYYYMM': number|null }) and derived national aggregates.
 * No synthetic values are ever produced: gaps stay null and every
 * derived figure is computed from real observations.
 */

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const monthKey = (year, month) => `${year}${String(month).padStart(2, '0')}`
export const parseMonthKey = (key) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(4, 6)) })

export function keyToLabel(key) {
  const { year, month } = parseMonthKey(key)
  return `${MONTHS_SHORT[month - 1]} ${year}`
}

export function monthLong(year, month) {
  return `${MONTHS_LONG[month - 1]} ${year}`
}

/* ---------- series shaping ---------- */

/** Sorted monthly points [{key, year, month, value}] excluding the annual (13) slot. */
export function monthlyArray(seriesMap, yearMin, yearMax) {
  const out = []
  for (let y = yearMin; y <= yearMax; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = monthKey(y, m)
      const value = seriesMap && Object.prototype.hasOwnProperty.call(seriesMap, key) ? seriesMap[key] : null
      out.push({ key, year: y, month: m, value })
    }
  }
  return out
}

/**
 * Annual values. The source's own year slot (`YYYY13`) is used when the API
 * provides it; otherwise the mean of that year's monthly values is derived
 * (and flagged) so the annual view never shows an empty record. A year with
 * fewer than 10 valid months is left blank rather than averaged from a
 * fragment.
 */
export function annualArray(seriesMap, yearMin, yearMax) {
  const out = []
  for (let y = yearMin; y <= yearMax; y++) {
    const key = `${y}13`
    const slot = seriesMap && Object.prototype.hasOwnProperty.call(seriesMap, key) ? seriesMap[key] : null
    if (typeof slot === 'number') {
      out.push({ year: y, key, value: slot, derived: false })
      continue
    }
    let sum = 0
    let n = 0
    for (let m = 1; m <= 12; m++) {
      const v = seriesMap ? seriesMap[monthKey(y, m)] : null
      if (typeof v === 'number') {
        sum += v
        n += 1
      }
    }
    out.push({ year: y, key, value: n >= 10 ? sum / n : null, derived: true, months: n })
  }
  return out
}

export function getMonthly(seriesMap, year, month) {
  if (!seriesMap) return null
  const v = seriesMap[monthKey(year, month)]
  return typeof v === 'number' ? v : null
}

/* ---------- national aggregate (derived, labelled) ---------- */

export function deriveNational(divisionSeries, params) {
  const totalRegions = Object.keys(divisionSeries || {}).length || 7
  const minRequired = Math.max(2, Math.floor(totalRegions * 0.5))
  const national = {}
  for (const p of params) {
    const acc = {}
    for (const series of Object.values(divisionSeries)) {
      const map = series && series[p]
      if (!map) continue
      for (const [key, v] of Object.entries(map)) {
        if (v === null) continue
        if (!acc[key]) acc[key] = { sum: 0, n: 0 }
        acc[key].sum += v
        acc[key].n += 1
      }
    }
    national[p] = {}
    for (const [key, { sum, n }] of Object.entries(acc)) {
      national[p][key] = n >= minRequired ? sum / n : null
    }
  }
  return national
}

export function scopeSeries(data, scope, param) {
  if (!data || data.status !== 'ready') return null
  if (scope.type === 'division' || scope.type === 'region') {
    const div = data.divisions && data.divisions[scope.id]
    return div ? div[param] || null : null
  }
  return (data.national && data.national[param]) || null
}

/* ---------- statistics ---------- */

export function extent(points) {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    if (p.value === null) continue
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  if (min === Infinity) return [null, null]
  return [min, max]
}

export function meanOf(points) {
  let sum = 0
  let n = 0
  for (const p of points) {
    if (p.value === null) continue
    sum += p.value
    n += 1
  }
  return n ? sum / n : null
}

export const clamp01 = (v) => Math.max(0, Math.min(1, v))
export const normalize = (v, min, max) => (min === max ? 0.5 : clamp01((v - min) / (max - min)))

/**
 * WMO climate normal: per calendar-month mean over the baseline years,
 * computed from the same series the user is looking at. Returns
 * { month: value } or nulls when the baseline is not covered.
 */
export function baselineNormal(seriesMap, baseline) {
  const normal = {}
  for (let m = 1; m <= 12; m++) {
    let sum = 0
    let n = 0
    for (let y = baseline.start; y <= baseline.end; y++) {
      const v = getMonthly(seriesMap, y, m)
      if (v !== null) {
        sum += v
        n += 1
      }
    }
    normal[m] = n >= (baseline.end - baseline.start + 1) * 0.75 ? sum / n : null
  }
  return normal
}

/* ---------- selection helpers ---------- */

/** Ordered month keys covered by the current selection. */
export function monthsInSelection(mode, sel, yearMin, yearMax) {
  const keys = []
  if (mode === 'year') {
    for (let m = 1; m <= 12; m++) keys.push(monthKey(sel.year, m))
  } else if (mode === 'month') {
    keys.push(monthKey(sel.year, sel.month))
  } else if (mode === 'range') {
    const r = sel.range || sel /* accept either the full state or a range object */
    const from = Math.max(r.startYear, yearMin)
    const to = Math.min(r.endYear, yearMax)
    for (let y = from; y <= to; y++) for (let m = 1; m <= 12; m++) keys.push(monthKey(y, m))
  }
  return keys
}

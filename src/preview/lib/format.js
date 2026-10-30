/** Display formatting helpers for the Preview experience. */

export function fmtValue(v, decimals = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return Number(v).toFixed(decimals)
}

export function fmtDelta(v, decimals = 1, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const magnitude = Math.abs(v).toFixed(decimals)
  /* A value that rounds to zero is shown without a sign — never “−0.0”. */
  const sign = Number(magnitude) === 0 ? '' : v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sign}${magnitude}${unit ? ' ' + unit : ''}`
}

export function fmtPct(v) {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return '—'
  const magnitude = Math.abs(v).toFixed(1)
  const sign = Number(magnitude) === 0 ? '' : v > 0 ? '+' : v < 0 ? '−' : ''
  return `${sign}${magnitude}%`
}

export function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

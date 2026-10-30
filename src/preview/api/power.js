/**
 * NASA POWER monthly data client.
 *
 * Two retrieval paths, in this order:
 *
 *  1. The project's FastAPI service (`backend/`), reached through Vite's `/api`
 *     proxy in development and `VITE_PREVIEW_API` in a deployed build. One
 *     request returns all seven continental series for 1981–2025, validated
 *     server-side and served from a warmed on-disk cache.
 *  2. Direct calls to the public POWER endpoint
 *     (https://power.larc.nasa.gov/api/temporal/monthly/point), used when the
 *     backend is unreachable — e.g. the static GitHub Pages build. This is the
 *     original path and remains fully functional.
 *
 * Integrity rules enforced here on both paths:
 *  - nothing is rendered until a real, structurally valid response arrives
 *  - fill values (-999) and the source's annual YYYY13 slot become null/dropped,
 *    never 0; a parameter needs 12 valid months to count
 *  - failed divisions are reported per-division; partial data is labelled
 *  - responses are cached in sessionStorage only for the session
 */

import { CONTINENTS as DIVISIONS } from '../data/world'
import { YEAR_MIN, YEAR_MAX, SOURCE } from '../data/datasets'

const BACKEND_BASE = (import.meta.env.VITE_PREVIEW_API || '/api').replace(/\/+$/, '')
const API_ROOT = 'https://power.larc.nasa.gov/api/temporal/monthly/point'
const PARAMS = ['T2M', 'PRECTOTCORR', 'WS10M']
const FILL = -999
const TIMEOUT_MS = 25000
const RETRY_DELAY_MS = 900
const STAGGER_MS = 140
const CACHE_PREFIX = 'pt-power-v1'
const BACKEND_STAMP_KEY = 'pt-power-backend-at'
const BACKEND_FRESH_MS = 10 * 60 * 1000

export class PowerError extends Error {
  constructor(kind, message, divisionId = null) {
    super(message)
    this.kind = kind // 'network' | 'http' | 'invalid' | 'timeout' | 'offline' | 'backend'
    this.divisionId = divisionId
  }
}

/* ------------------------------------------------------------------ */
/* session cache                                                       */
/* ------------------------------------------------------------------ */

function cacheKey(division) {
  return `${CACHE_PREFIX}:${division.id}:${YEAR_MIN}-${YEAR_MAX}`
}

function readCache(division) {
  try {
    const raw = sessionStorage.getItem(cacheKey(division))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (!entry || entry.v !== 1 || !entry.data) return null
    return entry.data
  } catch {
    return null
  }
}

function writeCache(division, data) {
  try {
    sessionStorage.setItem(
      cacheKey(division),
      JSON.stringify({ v: 1, at: Date.now(), data }),
    )
  } catch {
    /* quota exceeded or blocked — caching is an optimisation, not a requirement */
  }
}

/**
 * True when the session has not asked the project API recently. The mount-time
 * refresh uses this so revisiting the page does not re-download seven series
 * within the same session.
 */
export function backendRefreshDue() {
  try {
    const at = Number(sessionStorage.getItem(BACKEND_STAMP_KEY) || 0)
    return !at || Date.now() - at > BACKEND_FRESH_MS
  } catch {
    return true
  }
}

export function markBackendRefresh() {
  try {
    sessionStorage.setItem(BACKEND_STAMP_KEY, String(Date.now()))
  } catch {
    /* storage unavailable — the refresh simply runs again next mount */
  }
}

/* ------------------------------------------------------------------ */
/* validation shared by both paths                                     */
/* ------------------------------------------------------------------ */

/** Convert a POWER parameter map to { YYYYMM: number|null }, months only. */
function sanitizeParamMap(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw)) {
    // Skip non-month keys and the source's annual slot (YYYY13).
    if (!/^\d{6}$/.test(key) || key.endsWith('13')) continue
    const v = Number(value)
    out[key] = Number.isFinite(v) && v !== FILL ? v : null
  }
  return out
}

function cleanSeries(rawSeries, divisionId) {
  const cleaned = {}
  for (const p of PARAMS) {
    if (!rawSeries || typeof rawSeries[p] !== 'object') {
      throw new PowerError('invalid', `Response missing parameter ${p}`, divisionId)
    }
    cleaned[p] = sanitizeParamMap(rawSeries[p])
    const present = Object.values(cleaned[p]).filter((v) => v !== null).length
    if (present < 12) {
      throw new PowerError(
        'invalid',
        `Parameter ${p} contained fewer than 12 valid monthly values`,
        divisionId,
      )
    }
  }
  return cleaned
}

function validateResponse(json, division) {
  if (!json || typeof json !== 'object') {
    throw new PowerError('invalid', 'Response was not an object', division.id)
  }
  const parameter = json.properties && json.properties.parameter
  if (!parameter || typeof parameter !== 'object') {
    throw new PowerError('invalid', 'Response missing properties.parameter', division.id)
  }
  const cleaned = cleanSeries(parameter, division.id)
  const header = json.header || {}
  return {
    series: cleaned,
    meta: {
      apiVersion: header.api ? header.api.version || null : null,
      sources: Array.isArray(header.sources) ? header.sources : [],
      messages: Array.isArray(header.messages) ? header.messages : [],
      elevation: json.geometry && json.geometry.coordinates ? json.geometry.coordinates[2] ?? null : null,
      fetchedAt: new Date().toISOString(),
      upstream: 'NASA POWER',
      via: 'direct',
    },
  }
}

/* ------------------------------------------------------------------ */
/* path 1 — project API (one request for all seven divisions)         */
/* ------------------------------------------------------------------ */

function backendUrl() {
  return (
    `${BACKEND_BASE}/preview/series` +
    `?start=${YEAR_MIN}&end=${YEAR_MAX}&parameters=${PARAMS.join(',')}`
  )
}

async function fetchBackendDivisions() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(backendUrl(), {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new PowerError('timeout', 'Project API did not answer in time')
    }
    throw new PowerError('backend', 'Project API could not be reached')
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson && errJson.detail) detail = typeof errJson.detail === 'string' ? errJson.detail : detail
    } catch { /* keep status detail */ }
    throw new PowerError('backend', `Project API request failed (${detail})`)
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new PowerError('invalid', 'Project API returned a non-JSON response')
  }
  if (!json || typeof json !== 'object' || !json.divisions || typeof json.divisions !== 'object') {
    throw new PowerError('invalid', 'Project API response is missing divisions')
  }

  const series = {}
  const outcomes = {}

  for (const division of DIVISIONS) {
    const entry = json.divisions[division.id]
    if (!entry || !entry.series) {
      const remote = json.outcomes && json.outcomes[division.id]
      outcomes[division.id] = {
        ok: false,
        cached: false,
        via: 'backend',
        error: new PowerError(
          'backend',
          (remote && remote.error) || 'Project API returned no series for this division',
          division.id,
        ),
      }
      continue
    }
    try {
      const cleaned = cleanSeries(entry.series, division.id)
      const remoteMeta = entry.meta || {}
      const data = {
        series: cleaned,
        meta: {
          apiVersion: remoteMeta.apiVersion ?? null,
          sources: Array.isArray(remoteMeta.sources) ? remoteMeta.sources : [],
          messages: Array.isArray(remoteMeta.messages) ? remoteMeta.messages : [],
          elevation: remoteMeta.elevation ?? null,
          fetchedAt: remoteMeta.fetchedAt || new Date().toISOString(),
          upstream: remoteMeta.upstream || 'NASA POWER',
          via: 'backend',
        },
      }
      writeCache(division, data)
      series[division.id] = cleaned
      outcomes[division.id] = {
        ok: true,
        cached: Boolean(entry.cached),
        stale: Boolean(entry.stale),
        via: 'backend',
        meta: data.meta,
      }
    } catch (err) {
      outcomes[division.id] = {
        ok: false,
        cached: false,
        via: 'backend',
        error: err instanceof PowerError ? err : new PowerError('invalid', err.message, division.id),
      }
    }
  }

  if (Object.keys(series).length === 0) {
    throw new PowerError('invalid', 'Project API returned no usable division series')
  }

  const topMeta = json.meta || {}
  const meta = {
    apiVersion: topMeta.apiVersion || null,
    sources: Array.isArray(topMeta.sources) ? topMeta.sources : [],
    fetchedAt: topMeta.fetchedAt || new Date().toISOString(),
    parameters: Array.isArray(topMeta.parameters) ? topMeta.parameters : PARAMS,
    start: typeof topMeta.start === 'number' ? topMeta.start : YEAR_MIN,
    end: typeof topMeta.end === 'number' ? topMeta.end : YEAR_MAX,
    upstream: topMeta.upstream || 'NASA POWER',
    via: 'backend',
    cached: Boolean(json.cached),
  }

  return { series, outcomes, meta, count: Object.keys(series).length, total: DIVISIONS.length }
}

/* ------------------------------------------------------------------ */
/* path 2 — direct POWER, one request per division                     */
/* ------------------------------------------------------------------ */

async function fetchDivision(division, { signal } = {}) {
  const url =
    `${API_ROOT}?parameters=${PARAMS.join(',')}` +
    `&community=RE&longitude=${division.lon}&latitude=${division.lat}` +
    `&start=${YEAR_MIN}&end=${YEAR_MAX}&format=JSON`

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson && errJson.message) detail = errJson.message
    } catch { /* keep status detail */ }
    throw new PowerError('http', `POWER request failed (${detail})`, division.id)
  }
  const json = await res.json()
  return validateResponse(json, division)
}

function fetchWithTimeout(division) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    fetchDivision(division, { signal: ctrl.signal })
      .then(resolve)
      .catch((err) => {
        if (err.name === 'AbortError') {
          reject(new PowerError('timeout', 'Request timed out', division.id))
        } else {
          reject(err)
        }
      })
      .finally(() => clearTimeout(timer))
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* combined loader                                                     */
/* ------------------------------------------------------------------ */

/**
 * Load every division. Never throws for individual divisions — returns a
 * per-division outcome map so partial failures surface honestly instead of
 * blanking the whole app.
 *
 * Order: project API → session cache → direct POWER (staggered, one retry).
 */
export async function loadAllDivisions() {
  const results = {}
  const outcomes = {}
  let backendMeta = null

  /* 1. project API — one request, seven validated series */
  try {
    const backend = await fetchBackendDivisions()
    backendMeta = backend.meta
    for (const division of DIVISIONS) {
      if (backend.series[division.id]) {
        results[division.id] = backend.series[division.id]
        outcomes[division.id] = backend.outcomes[division.id]
      }
    }
  } catch {
    /* backend offline (or not deployed) — the direct path below is the fallback */
  }

  /* 2. session cache for anything the backend did not supply */
  for (const division of DIVISIONS) {
    if (results[division.id]) continue
    const cached = readCache(division)
    if (cached) {
      results[division.id] = cached.series
      outcomes[division.id] = { ok: true, cached: true, via: 'session', meta: cached.meta }
    }
  }

  /* 3. direct POWER for the remaining divisions */
  await Promise.all(
    DIVISIONS.map(async (division, i) => {
      if (results[division.id]) return
      await sleep(i * STAGGER_MS)

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        outcomes[division.id] = {
          ok: false,
          cached: false,
          via: 'direct',
          error: new PowerError('offline', 'Browser reports it is offline', division.id),
        }
        return
      }

      try {
        const data = await fetchWithTimeout(division)
        writeCache(division, data)
        results[division.id] = data.series
        outcomes[division.id] = { ok: true, cached: false, via: 'direct', meta: data.meta }
      } catch (err) {
        const first = err instanceof PowerError ? err : new PowerError('network', err.message, division.id)
        try {
          await sleep(RETRY_DELAY_MS)
          const data = await fetchWithTimeout(division)
          writeCache(division, data)
          results[division.id] = data.series
          outcomes[division.id] = { ok: true, cached: false, retried: true, via: 'direct', meta: data.meta }
        } catch (err2) {
          const second = err2 instanceof PowerError ? err2 : new PowerError('network', err2.message, division.id)
          outcomes[division.id] = { ok: false, cached: false, via: 'direct', error: second, firstError: first }
        }
      }
    }),
  )

  /* Retrieval path, described honestly for the source bar. */
  const used = new Set(Object.values(outcomes).filter((o) => o.ok).map((o) => o.via))
  let via = null
  if (used.has('backend')) via = used.has('direct') ? 'mixed' : 'backend'
  else if (used.has('direct')) via = 'direct'
  else if (used.has('session')) via = 'session'

  /* Metadata from the freshest successful response (all share one API version). */
  let meta = backendMeta
  if (!meta) {
    const anyOk = Object.values(outcomes).find((o) => o.ok && o.meta)
    meta = anyOk
      ? { apiVersion: anyOk.meta.apiVersion, sources: anyOk.meta.sources, fetchedAt: anyOk.meta.fetchedAt }
      : { apiVersion: null, sources: [], fetchedAt: null }
  }
  meta = { ...meta, via }

  return { series: results, outcomes, meta }
}

/**
 * Ask the project API for a complete seven-division refresh. Returns null
 * when any division is missing so the caller keeps its current, complete
 * dataset rather than silently dropping a continent.
 */
export async function refreshDivisionsFromBackend() {
  const backend = await fetchBackendDivisions()
  const missing = DIVISIONS.filter((division) => !backend.series[division.id]).map((d) => d.id)
  if (missing.length > 0) return null
  return {
    series: backend.series,
    outcomes: backend.outcomes,
    meta: backend.meta,
    cached: backend.meta.cached,
  }
}

export function sourceLabel(meta) {
  const version = meta && meta.apiVersion ? `API ${meta.apiVersion}` : 'API version unknown'
  return `${SOURCE.name} — ${SOURCE.dataset} — ${version}`
}

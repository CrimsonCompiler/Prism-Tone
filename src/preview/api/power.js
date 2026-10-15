/**
 * NASA POWER API client — monthly point data.
 *
 * Endpoint (verified live, keyless, CORS-enabled):
 *   https://power.larc.nasa.gov/api/temporal/monthly/point
 *     ?parameters=T2M,PRECTOTCORR,WS10M
 *     &community=RE&longitude={lon}&latitude={lat}
 *     &start={YYYY}&end={YYYY}&format=JSON
 *
 * Response: GeoJSON-ish Feature; properties.parameter.<PARAM> is an object
 * keyed "YYYYMM" (13 = source-computed annual mean); header.fill_value marks
 * missing data (-999). All of this is validated before anything is shown.
 *
 * Integrity rules enforced here:
 *  - nothing is rendered until a real, structurally valid response arrives
 *  - fill values become null, never 0
 *  - failed divisions are reported per-division; partial data is labelled
 *  - cached responses live in sessionStorage only for the session
 */

import { DIVISIONS } from '../data/bangladesh'
import { YEAR_MIN, YEAR_MAX, SOURCE } from '../data/datasets'

const API_ROOT = 'https://power.larc.nasa.gov/api/temporal/monthly/point'
const PARAMS = ['T2M', 'PRECTOTCORR', 'WS10M']
const FILL = -999
const TIMEOUT_MS = 25000
const RETRY_DELAY_MS = 900
const STAGGER_MS = 140
const CACHE_PREFIX = 'pt-power-v1'

export class PowerError extends Error {
  constructor(kind, message, divisionId = null) {
    super(message)
    this.kind = kind // 'network' | 'http' | 'invalid' | 'timeout' | 'offline'
    this.divisionId = divisionId
  }
}

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

/** Convert the raw POWER parameter map to { YYYYMM: number|null }. */
function sanitizeParamMap(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{6}$/.test(key)) continue
    const v = Number(value)
    out[key] = Number.isFinite(v) && v !== FILL ? v : null
  }
  return out
}

function validateResponse(json, division) {
  if (!json || typeof json !== 'object') {
    throw new PowerError('invalid', 'Response was not an object', division.id)
  }
  const parameter = json.properties && json.properties.parameter
  if (!parameter || typeof parameter !== 'object') {
    throw new PowerError('invalid', 'Response missing properties.parameter', division.id)
  }
  const cleaned = {}
  for (const p of PARAMS) {
    if (!parameter[p] || typeof parameter[p] !== 'object') {
      throw new PowerError('invalid', `Response missing parameter ${p}`, division.id)
    }
    cleaned[p] = sanitizeParamMap(parameter[p])
    const present = Object.values(cleaned[p]).filter((v) => v !== null).length
    if (present < 12) {
      throw new PowerError(
        'invalid',
        `Parameter ${p} contained fewer than 12 valid monthly values`,
        division.id,
      )
    }
  }
  const header = json.header || {}
  return {
    series: cleaned,
    meta: {
      apiVersion: header.api ? header.api.version || null : null,
      sources: Array.isArray(header.sources) ? header.sources : [],
      messages: Array.isArray(header.messages) ? header.messages : [],
      elevation: json.geometry && json.geometry.coordinates ? json.geometry.coordinates[2] ?? null : null,
      fetchedAt: new Date().toISOString(),
    },
  }
}

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

/**
 * Load every division, with session cache, polite staggering and one retry.
 * Never throws for individual divisions — returns a per-division outcome map
 * so partial failures surface honestly instead of blanking the whole app.
 */
export async function loadAllDivisions() {
  const results = {}
  const outcomes = {}

  await Promise.all(
    DIVISIONS.map(async (division, i) => {
      await sleep(i * STAGGER_MS)

      const cached = readCache(division)
      if (cached) {
        results[division.id] = cached.series
        outcomes[division.id] = { ok: true, cached: true, meta: cached.meta }
        return
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        outcomes[division.id] = {
          ok: false,
          cached: false,
          error: new PowerError('offline', 'Browser reports it is offline', division.id),
        }
        return
      }

      try {
        const data = await fetchWithTimeout(division)
        writeCache(division, data)
        results[division.id] = data.series
        outcomes[division.id] = { ok: true, cached: false, meta: data.meta }
      } catch (err) {
        const first = err instanceof PowerError ? err : new PowerError('network', err.message, division.id)
        try {
          await sleep(RETRY_DELAY_MS)
          const data = await fetchWithTimeout(division)
          writeCache(division, data)
          results[division.id] = data.series
          outcomes[division.id] = { ok: true, cached: false, retried: true, meta: data.meta }
        } catch (err2) {
          const second = err2 instanceof PowerError ? err2 : new PowerError('network', err2.message, division.id)
          outcomes[division.id] = { ok: false, cached: false, error: second, firstError: first }
        }
      }
    }),
  )

  /* Merge metadata from any successful response (they all share one API version). */
  const anyOk = Object.values(outcomes).find((o) => o.ok && o.meta)
  const meta = anyOk
    ? { apiVersion: anyOk.meta.apiVersion, sources: anyOk.meta.sources, fetchedAt: anyOk.meta.fetchedAt }
    : { apiVersion: null, sources: [], fetchedAt: null }

  return { series: results, outcomes, meta }
}

export function sourceLabel(meta) {
  const version = meta && meta.apiVersion ? `API ${meta.apiVersion}` : 'API version unknown'
  return `${SOURCE.name} — ${SOURCE.dataset} — ${version}`
}

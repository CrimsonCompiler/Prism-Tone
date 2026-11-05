/**
 * Client for the project's sonification service.
 *
 * The backend returns a versioned envelope (see backend/NOTES.md):
 *
 *   { version: "1.0", source, musical_score, cache, analysis? }
 *
 * Nothing here schedules audio. It only retrieves and validates a
 * MusicalScore; lib/scorePlayer.js owns playback. Both calls:
 *
 *   • use the same base URL rule as api/power.js (VITE_PREVIEW_API or /api);
 *   • time out after 20 s and honour an outer AbortController;
 *   • retry once for a network failure or a 5xx, never for a 4xx;
 *   • return a plain result instead of throwing into the UI.
 *
 * A response without `version === "1.0"` or a tracks array is treated as
 * unavailable, so the caller keeps the local mapping rather than playing an
 * unverified score.
 */

import { SCORE_VERSION, isValidScore } from '../lib/score'

const API_BASE = (import.meta.env.VITE_PREVIEW_API || '/api').replace(/\/+$/, '')
const TIMEOUT_MS = 20000
const RETRY_DELAY_MS = 700
const IMAGE_MAX_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg']

export class SonifyApiError extends Error {
  constructor(kind, message, status = null) {
    super(message)
    this.name = 'SonifyApiError'
    this.kind = kind // 'aborted' | 'timeout' | 'network' | 'http' | 'invalid'
    this.status = status
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function linkAbort(signal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  return {
    controller,
    cleanup() {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onAbort)
    },
  }
}

function detailFrom(payload, fallback) {
  if (!payload) return fallback
  if (typeof payload.detail === 'string') return payload.detail
  if (payload.detail && typeof payload.detail.detail === 'string') return payload.detail.detail
  if (typeof payload.message === 'string') return payload.message
  if (typeof payload.error === 'string') return payload.error
  return fallback
}

async function attempt(path, init, signal) {
  const { controller, cleanup } = linkAbort(signal)
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    })

    if (!response.ok) {
      let payload = null
      try {
        payload = await response.json()
      } catch {
        /* keep the HTTP status as the detail */
      }
      throw new SonifyApiError(
        'http',
        detailFrom(payload, `Project API request failed (HTTP ${response.status})`),
        response.status,
      )
    }

    try {
      return await response.json()
    } catch {
      throw new SonifyApiError('invalid', 'Project API returned a non-JSON response')
    }
  } catch (err) {
    if (err instanceof SonifyApiError) throw err
    if (err && err.name === 'AbortError') {
      throw new SonifyApiError('aborted', signal && signal.aborted
        ? 'Request cancelled'
        : 'Project API did not answer in time')
    }
    throw new SonifyApiError('network', 'Project API could not be reached')
  } finally {
    cleanup()
  }
}

async function withRetry(run, signal) {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof SonifyApiError)) throw err
    if (err.kind === 'aborted' || (signal && signal.aborted)) throw err
    const retryable = err.kind !== 'http' || (err.status !== null && err.status >= 500)
    if (!retryable) throw err
    await sleep(RETRY_DELAY_MS)
    if (signal && signal.aborted) throw new SonifyApiError('aborted', 'Request cancelled')
    return run()
  }
}

/** Validate the envelope and score. Returns null when the payload is unusable. */
function readEnvelope(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (payload.version !== SCORE_VERSION) return null
  const score = payload.musical_score
  if (!isValidScore(score)) return null
  return {
    ok: true,
    score,
    analysis: payload.analysis || null,
    source: payload.source || null,
    cache: payload.cache || null,
  }
}

function unavailable(err) {
  if (err instanceof SonifyApiError && err.kind === 'aborted') {
    return { ok: false, aborted: true, kind: 'aborted', message: err.message }
  }
  return {
    ok: false,
    aborted: false,
    kind: err instanceof SonifyApiError ? err.kind : 'network',
    message: err instanceof Error ? err.message : 'Project score unavailable',
  }
}

/**
 * Score the current data selection.
 *
 * @param {object} args
 * @param {Record<string, Record<string, number|null>>} args.series
 * @param {string[]} args.variables
 * @param {object} [args.options]
 * @param {AbortSignal} [args.signal]
 */
export async function fetchDataScore({ series, variables, options, signal } = {}) {
  if (!series || typeof series !== 'object' || !Object.keys(series).length) {
    return { ok: false, aborted: false, kind: 'invalid', message: 'No series selected for scoring' }
  }
  if (!Array.isArray(variables) || !variables.length) {
    return { ok: false, aborted: false, kind: 'invalid', message: 'No variables selected for scoring' }
  }

  try {
    const payload = await withRetry(
      () => attempt('/sonify/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series, variables, options: options || {} }),
      }, signal),
      signal,
    )
    const result = readEnvelope(payload)
    if (!result) {
      return {
        ok: false,
        aborted: false,
        kind: 'invalid',
        message: 'Project API returned an unsupported score version or shape',
      }
    }
    return result
  } catch (err) {
    return unavailable(err)
  }
}

function validateImageFile(file) {
  if (!file) return 'Choose a PNG or JPEG image first.'
  if (!IMAGE_TYPES.includes(file.type)) return 'The image must be a PNG or JPEG.'
  if (file.size > IMAGE_MAX_BYTES) return 'The image must be 10 MB or smaller.'
  return null
}

function validateImageUrl(imageUrl) {
  if (!imageUrl) return 'Enter an https image URL first.'
  let parsed
  try {
    parsed = new URL(imageUrl)
  } catch {
    return 'That is not a valid image URL.'
  }
  if (parsed.protocol !== 'https:') return 'Only https image URLs are accepted.'
  return null
}

/**
 * Sonify an uploaded image or a remote https image.
 *
 * @param {object} args
 * @param {File} [args.file]
 * @param {string} [args.imageUrl]
 * @param {{scan?: 'columns'|'radial'|'regions'}} [args.options]
 * @param {AbortSignal} [args.signal]
 */
export async function fetchImageScore({ file, imageUrl, options, signal } = {}) {
  const usingFile = Boolean(file)
  const problem = usingFile ? validateImageFile(file) : validateImageUrl(imageUrl)
  if (problem) return { ok: false, aborted: false, kind: 'invalid', message: problem }

  try {
    let payload
    if (usingFile) {
      const form = new FormData()
      form.append('file', file)
      form.append('options', JSON.stringify(options || {}))
      payload = await withRetry(
        () => attempt('/sonify/image', { method: 'POST', body: form }, signal),
        signal,
      )
    } else {
      payload = await withRetry(
        () => attempt('/sonify/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl, options: options || {} }),
        }, signal),
        signal,
      )
    }

    const result = readEnvelope(payload)
    if (!result) {
      return {
        ok: false,
        aborted: false,
        kind: 'invalid',
        message: 'Project API returned an unsupported score version or shape',
      }
    }
    return result
  } catch (err) {
    return unavailable(err)
  }
}
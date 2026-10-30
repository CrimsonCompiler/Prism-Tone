/**
 * Shared state for the Preview experience.
 *
 * One source of truth keeps the variable, geographic scope, time selection,
 * map, graphs, summary, captions, transcript and the audio engine in step.
 * The engine is a singleton (lib/sonify.js); this context mirrors its
 * transport state so React can render it, and rebuilds its step list
 * whenever the data selection changes — stopping playback first so no stale
 * audio ever continues after a selection change.
 *
 * The original public surface is unchanged. Additions for the redesign:
 * settings (captions, size, contrast, motion, haptics), a session transcript,
 * a gated live-announcement channel, the current sound plan, and
 * describeText for “Describe this view”.
 */

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  loadAllDivisions,
  refreshDivisionsFromBackend,
  backendRefreshDue,
  markBackendRefresh,
} from '../api/power'
import {
  deriveNational,
  monthsInSelection,
  scopeSeries,
  monthlyArray,
  extent,
  baselineNormal,
  monthKey,
  getMonthly,
} from '../lib/processing'
import {
  describeStep,
  describeRange,
  idleCaption,
  endCaption,
  normalsFor,
} from '../lib/captions'
import { engine } from '../lib/sonify'
import { DEFAULT_SETTINGS, CAPTION_SIZES, loadSettings, saveSettings, shouldOpenGuide } from '../lib/settings'
import { LIVE_VARIABLES, VARIABLE_BY_ID, YEAR_MIN, YEAR_MAX } from '../data/datasets'
import { REGION_BY_ID, DIVISION_BY_ID, GEOJSON_URL } from '../data/world'
import baselineData from '../data/worldPowerBaseline.json'
import worldGeoJson from '../data/world-regions.json'

const PreviewContext = createContext(null)

const initialNational = deriveNational(baselineData.series, LIVE_VARIABLES.map((v) => v.param))

const initialState = {
  variableId: 'T2M',
  selectedVariableIds: ['T2M'],
  scope: { type: 'national' },
  timeMode: 'year', // year | month | range
  year: 2010,
  month: 7,
  range: { startYear: 2001, endYear: 2020 },
  volume: 0.8,
  rate: 1,
  layers: { pulse: true },
  view: 'series', // series | waveform | notes
  granularity: 'monthly', // monthly | annual

  data: {
    status: 'ready',
    divisions: baselineData.series,
    national: initialNational,
    outcomes: baselineData.outcomes,
    meta: baselineData.meta,
    retryCount: 0,
  },
  geo: { status: 'ready', json: worldGeoJson },

  settings: loadSettings(),
  transcript: [],
  live: { id: 0, text: '' },
  soundPlan: null,
  describeText: '',
  settingsOpen: false,
  transcriptOpen: false,

  playState: 'idle', // idle | playing | paused
  position: 0,
  caption: { text: idleCaption({
    variable: VARIABLE_BY_ID['T2M'],
    scopeName: 'Global (World)',
    scopeKind: 'national',
    hasData: true,
    ready: true,
  }), cls: 'interpretation' },

  guideOpen: shouldOpenGuide(),
  continentModalOpen: false,
  unavailableNoticeId: null,
  focusedCountry: null,
  isolatedCountry: null,
}

/* ------------------------------------------------------------------ */
/* caption helpers                                                     */
/* ------------------------------------------------------------------ */

function divisionName(id) {
  return REGION_BY_ID[id] ? REGION_BY_ID[id].name : DIVISION_BY_ID[id] ? DIVISION_BY_ID[id].name : id
}

function scopeNameFor(state) {
  return state.scope.type === 'division' || state.scope.type === 'region'
    ? divisionName(state.scope.id)
    : 'World'
}

const initialStateCaption = idleSelectionFor(initialState)
initialState.caption = initialStateCaption
initialState.soundPlan = initialStateCaption.plan

export function currentSeriesMap(state) {
  const variable = VARIABLE_BY_ID[state.variableId]
  return scopeSeries(state.data, state.scope, variable.param)
}

function rangeOf(seriesMap) {
  if (!seriesMap) return { lo: 0, hi: 1 }
  const [lo, hi] = extent(monthlyArray(seriesMap, YEAR_MIN, YEAR_MAX))
  if (lo === null || hi === null) return { lo: 0, hi: 1 }
  return { lo, hi }
}

function normalForKey(seriesMap, key) {
  if (!seriesMap || !key) return null
  const month = Number(String(key).slice(4, 6))
  if (!month) return null
  const normals = normalsFor(seriesMap)
  return normals && normals[month] !== undefined ? normals[month] : null
}

function previousValue(seriesMap, key) {
  if (!seriesMap || !key) return null
  const year = Number(String(key).slice(0, 4))
  const month = Number(String(key).slice(4, 6))
  const py = month === 1 ? year - 1 : year
  const pm = month === 1 ? 12 : month - 1
  if (py < YEAR_MIN) return null
  return getMonthly(seriesMap, py, pm)
}

function rangeNormal(seriesMap, range) {
  if (!seriesMap) return null
  const normals = normalsFor(seriesMap)
  if (!normals) return null
  let sum = 0
  let n = 0
  let total = 0
  for (let y = range.startYear; y <= range.endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      total += 1
      if (normals[m] !== null && normals[m] !== undefined) {
        sum += normals[m]
        n += 1
      }
    }
  }
  if (!n || n < total * 0.75) return null
  return sum / n
}

function normalizeCaption(caption) {
  if (!caption || !caption.text) {
    return {
      text: 'Nothing selected yet.',
      shortText: '',
      key: null,
      label: '',
      value: null,
      delta: null,
      normal: null,
      plan: null,
      cls: 'interpretation',
    }
  }
  return caption
}

function idleSelectionFor(state) {
  const variable = VARIABLE_BY_ID[state.variableId]
  const seriesMap = currentSeriesMap(state)
  const range = rangeOf(seriesMap)
  const scopeName = scopeNameFor(state)
  const scopeKind = state.scope.type

  if (state.timeMode === 'range') {
    return normalizeCaption(describeRange({
      variable,
      state,
      seriesMap,
      normal: rangeNormal(seriesMap, state.range),
      scopeName,
      scopeKind,
      range,
    }))
  }

  const key = monthKey(state.year, state.month)
  return normalizeCaption(describeStep({
    variable,
    step: { key, value: getMonthly(seriesMap, state.year, state.month) },
    seriesMap,
    normal: normalForKey(seriesMap, key),
    scopeName,
    scopeKind,
    range,
    prevValue: previousValue(seriesMap, key),
  }))
}

function stepCaptionFor(state, step) {
  const variable = VARIABLE_BY_ID[state.variableId]
  const seriesMap = currentSeriesMap(state)
  const range = rangeOf(seriesMap)
  return normalizeCaption(describeStep({
    variable,
    step,
    seriesMap,
    normal: normalForKey(seriesMap, step && step.key),
    scopeName: scopeNameFor(state),
    scopeKind: state.scope.type,
    range,
    prevValue: previousValue(seriesMap, step && step.key),
  }))
}

function refreshIdle(state) {
  const caption = idleSelectionFor(state)
  return { ...state, caption, soundPlan: caption.plan || null }
}

function transcriptEntry(state, caption, at) {
  const variable = VARIABLE_BY_ID[state.variableId]
  const last = state.transcript[state.transcript.length - 1]
  return [
    ...state.transcript,
    {
      id: (last ? last.id : 0) + 1,
      at: at || Date.now(),
      label: caption.label,
      text: caption.text,
      shortText: caption.shortText,
      variable: variable.name,
      value: caption.value,
      unit: variable.unit,
      decimals: variable.decimals,
      delta: caption.delta,
    },
  ].slice(-400)
}

function liveFor(state, text) {
  if (!state.settings.captionsVisible) return state.live
  return { id: state.live.id + 1, text }
}

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */

function reducer(state, action) {
  switch (action.type) {
    case 'DATA_LOADING':
      return { ...state, data: { ...state.data, status: 'loading' } }
    case 'DATA_RETRY':
      return {
        ...state,
        data: { ...state.data, status: 'loading', retryCount: (state.data.retryCount || 0) + 1 },
      }
    case 'DATA_READY': {
      const next = {
        ...state,
        data: {
          ...state.data,
          status: 'ready',
          divisions: action.divisions,
          national: action.national,
          outcomes: action.outcomes,
          meta: action.meta,
          retryCount: state.data.retryCount || 0,
        },
      }
      return refreshIdle(next)
    }
    case 'DATA_ERROR':
      return { ...state, data: { ...state.data, status: 'error', outcomes: action.outcomes || {} } }
    case 'GEO_STATUS':
      return { ...state, geo: { status: action.status, json: action.json || null } }

    case 'SET_VARIABLE': {
      const chosen = VARIABLE_BY_ID[action.id]
      if (!chosen || chosen.status !== 'live') {
        return { ...state, unavailableNoticeId: action.id }
      }
      const current = state.selectedVariableIds || [state.variableId]
      const updated = current.includes(action.id) ? current : [...current, action.id].slice(-3)
      const next = refreshIdle({
        ...state,
        variableId: action.id,
        selectedVariableIds: updated,
        unavailableNoticeId: null,
      })
      return { ...next, live: liveFor(state, `${chosen.name} is now the lead dataset.`) }
    }
    case 'TOGGLE_VARIABLE': {
      const chosen = VARIABLE_BY_ID[action.id]
      if (!chosen || chosen.status !== 'live') {
        return { ...state, unavailableNoticeId: action.id }
      }
      const current = state.selectedVariableIds || [state.variableId]
      const exists = current.includes(action.id)
      /* At least one dataset always stays in the mix; at most three can. */
      if (exists && current.length === 1) {
        return { ...state, live: liveFor(state, 'At least one dataset must stay in the mix.') }
      }
      if (!exists && current.length >= 3) {
        return { ...state, live: liveFor(state, 'Three layers is the maximum. Remove one before adding another.') }
      }
      const updated = exists
        ? current.filter((id) => id !== action.id)
        : [...current, action.id].slice(0, 3)
      const activeId = updated.includes(state.variableId) ? state.variableId : updated[0]
      const next = refreshIdle({
        ...state,
        selectedVariableIds: updated,
        variableId: activeId,
        unavailableNoticeId: null,
      })
      const text = exists
        ? `${chosen.name} removed from the mix. ${updated.length} ${updated.length === 1 ? 'layer' : 'layers'} remain.`
        : `${chosen.name} added to the mix. ${updated.length} ${updated.length === 1 ? 'layer' : 'layers'} sound together.`
      return { ...next, live: liveFor(state, text) }
    }
    case 'SET_SELECTED_VARIABLES': {
      const ids = (action.ids && action.ids.length > 0 ? action.ids : [state.variableId])
        .filter((id) => VARIABLE_BY_ID[id]?.status === 'live')
        .slice(0, 3)
      const nextIds = ids.length ? ids : ['T2M']
      const activeId = nextIds.includes(state.variableId) ? state.variableId : nextIds[0]
      return refreshIdle({ ...state, selectedVariableIds: nextIds, variableId: activeId })
    }
    case 'SHOW_UNAVAILABLE':
      return { ...state, unavailableNoticeId: action.id }
    case 'SET_SCOPE':
      return refreshIdle({ ...state, scope: action.scope })
    case 'FOCUS_COUNTRY':
      return refreshIdle({
        ...state,
        focusedCountry: action.country,
        isolatedCountry: null,
        scope: action.country?.continentId
          ? { type: 'division', id: action.country.continentId }
          : state.scope,
      })
    case 'ISOLATE_COUNTRY': {
      const country = action.country || state.focusedCountry
      return refreshIdle({
        ...state,
        focusedCountry: country,
        isolatedCountry: country,
        scope: country?.continentId
          ? { type: 'division', id: country.continentId }
          : state.scope,
      })
    }
    case 'CLEAR_ISOLATED_COUNTRY':
      return { ...state, isolatedCountry: null }
    case 'CLEAR_FOCUSED_COUNTRY':
      return { ...state, focusedCountry: null, isolatedCountry: null }
    case 'SET_TIME_MODE':
      return refreshIdle({ ...state, timeMode: action.mode })
    case 'SET_YEAR': {
      const next = refreshIdle({ ...state, year: action.year })
      return action.announce ? { ...next, live: liveFor(state, next.caption.text) } : next
    }
    case 'SET_MONTH': {
      const next = refreshIdle({ ...state, month: action.month })
      return action.announce ? { ...next, live: liveFor(state, next.caption.text) } : next
    }
    case 'SET_RANGE': {
      const next = refreshIdle({ ...state, range: action.range })
      return action.announce ? { ...next, live: liveFor(state, next.caption.text) } : next
    }

    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'SET_GRANULARITY':
      return { ...state, granularity: action.granularity }
    case 'SET_VOLUME':
      return { ...state, volume: action.volume }
    case 'SET_RATE':
      return { ...state, rate: action.rate }
    case 'TOGGLE_LAYER':
      return { ...state, layers: { ...state.layers, [action.layer]: !state.layers[action.layer] } }

    case 'SET_SETTING': {
      const settings = { ...state.settings, [action.key]: action.value }
      const next = { ...state, settings }
      if (action.key === 'captionsVisible' && action.value) {
        next.live = { id: state.live.id + 1, text: state.caption.text }
      }
      if (action.key === 'captionsVisible' && !action.value) {
        next.live = { id: state.live.id + 1, text: 'Captions hidden. Press C to show them again.' }
      }
      return next
    }
    case 'RESET_SETTINGS':
      return { ...state, settings: { ...DEFAULT_SETTINGS } }
    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: action.open !== undefined ? action.open : !state.settingsOpen }
    case 'TOGGLE_TRANSCRIPT':
      return { ...state, transcriptOpen: action.open !== undefined ? action.open : !state.transcriptOpen }
    case 'CLEAR_TRANSCRIPT':
      return { ...state, transcript: [] }
    case 'ANNOUNCE':
      return { ...state, live: { id: state.live.id + 1, text: action.text } }
    case 'SET_DESCRIBE':
      return {
        ...state,
        describeText: action.text,
        live: { id: state.live.id + 1, text: action.text },
      }

    case 'PLAY':
      return { ...state, playState: 'playing' }
    case 'PAUSE':
      return { ...state, playState: 'paused' }
    case 'STOP': {
      const next = { ...state, playState: 'idle', position: 0, soundPlan: null }
      return { ...next, caption: { text: idleCaption({
        variable: VARIABLE_BY_ID[next.variableId],
        scopeName: scopeNameFor(next),
        scopeKind: next.scope.type,
        hasData: true,
        ready: next.data.status === 'ready',
      }), cls: 'interpretation' } }
    }
    case 'STOP_SELECTION_CHANGED': {
      const next = { ...state, playState: 'idle', position: 0, soundPlan: null }
      const idle = idleSelectionFor(next)
      return {
        ...next,
        caption: {
          text: `Selection changed — playback stopped so the audio always matches what you see. ${idle.text}`,
          shortText: idle.shortText,
          label: idle.label,
          value: idle.value,
          delta: idle.delta,
          plan: idle.plan,
          cls: 'interpretation',
        },
        soundPlan: idle.plan || null,
      }
    }
    case 'STEP': {
      const caption = stepCaptionFor(state, action.step)
      const transcript = transcriptEntry(state, caption, action.at)
      return {
        ...state,
        position: action.index,
        caption,
        soundPlan: caption.plan || null,
        transcript,
        live: liveFor(state, caption.text),
      }
    }
    case 'END': {
      const variable = VARIABLE_BY_ID[state.variableId]
      /* Back to idle: keep the selection's plan (including the previous-month
         change term) so the notes and diagram agree with the caption. */
      const idle = idleSelectionFor(state)
      return {
        ...state,
        playState: 'idle',
        position: 0,
        soundPlan: idle.plan || null,
        caption: { text: endCaption({ variable }), cls: 'interpretation', label: '', value: null, delta: null, plan: null },
      }
    }
    case 'SEEK':
      return { ...state, position: action.index }
    case 'CAPTION':
      return { ...state, caption: action.caption }
    case 'GUIDE':
      return { ...state, guideOpen: action.open }
    case 'CONTINENT_MODAL':
      return { ...state, continentModalOpen: action.open }
    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* provider                                                            */
/* ------------------------------------------------------------------ */

export function PreviewProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const settingsRef = useRef(state.settings)
  const liveRef = useRef(state.live)
  const playStateRef = useRef(state.playState)
  const dataStatusRef = useRef(state.data.status)
  const pendingRefreshRef = useRef(null)

  useEffect(() => {
    settingsRef.current = state.settings
    liveRef.current = state.live
  }, [state.settings, state.live])

  useEffect(() => {
    playStateRef.current = state.playState
  }, [state.playState])

  useEffect(() => {
    dataStatusRef.current = state.data.status
  }, [state.data.status])

  /* ---- persist + apply display settings (scoped to this page's mount) ---- */
  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.ptContrast = state.settings.highContrast ? 'high' : 'normal'
    root.dataset.ptMotion = state.settings.reduceMotion ? 'reduced' : 'normal'
    root.dataset.ptCaptionSize = state.settings.captionSize
    const px = (CAPTION_SIZES[state.settings.captionSize] || CAPTION_SIZES.m).px
    root.style.setProperty('--pt-caption-size', `${px}px`)
    return () => {
      delete root.dataset.ptContrast
      delete root.dataset.ptMotion
      delete root.dataset.ptCaptionSize
      root.style.removeProperty('--pt-caption-size')
    }
  }, [state.settings.highContrast, state.settings.reduceMotion, state.settings.captionSize])

  /* ---- data load: seven division point-samples from NASA POWER (re-runs on retry) ---- */
  const retryCount = state.data.retryCount
  useEffect(() => {
    /* The bundled baseline is already displayed with status "ready"; only skip
       if that ready state came from a real retrieval (meta.via). Without this,
       a revisit inside the ten-minute refresh window would stay on the bundle. */
    if (retryCount === 0 && state.data.status === 'ready' && state.data.meta && state.data.meta.via) return
    let cancelled = false
    const background = retryCount === 0 && state.data.status === 'ready'
    if (!background) dispatch({ type: 'DATA_LOADING' })
    loadAllDivisions()
      .then(({ series, outcomes, meta }) => {
        if (cancelled) return
        const okCount = Object.values(outcomes).filter((o) => o.ok).length
        if (okCount === 0) {
          /* The bundled baseline is still valid data — a failed background
             fetch must not replace it with an error screen. */
          if (background) return
          const firstErr = Object.values(outcomes).find((o) => o.error)
          dispatch({ type: 'DATA_ERROR', outcomes })
          dispatch({
            type: 'CAPTION',
            caption: {
              text: `Could not retrieve any NASA POWER data (${firstErr ? firstErr.error.kind : 'unknown error'}). Check your connection and retry.`,
              cls: 'interpretation',
            },
          })
          return
        }
        const national = deriveNational(series, LIVE_VARIABLES.map((v) => v.param))
        if (meta && meta.via === 'backend') markBackendRefresh()
        if (playStateRef.current !== 'idle' || engine.state !== 'idle') {
          pendingRefreshRef.current = { series, outcomes, meta }
          return
        }
        dispatch({ type: 'DATA_READY', divisions: series, national, outcomes, meta })
      })
      .catch(() => {
        if (!cancelled && !background) dispatch({ type: 'DATA_ERROR', outcomes: {} })
      })
    return () => {
      cancelled = true
    }
  }, [retryCount])

  /* ---- silent refresh from the project API --------------------------------
     The bundled baseline paints instantly. Shortly after mount, ask the
     project's FastAPI service for the validated 1981–2025 series and swap it
     in only while the transport is idle — never mid-playback, so the audio
     always matches the selection. If playback is in progress (or the page is
     still loading), the payload waits until the transport returns to idle.
     A session timestamp keeps revisits within ten minutes from re-requesting. */
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled || !backendRefreshDue()) return
      refreshDivisionsFromBackend()
        .then((payload) => {
          if (cancelled || !payload) return
          markBackendRefresh()
          if (playStateRef.current !== 'idle' || engine.state !== 'idle' || dataStatusRef.current !== 'ready') {
            pendingRefreshRef.current = payload
            return
          }
          const national = deriveNational(payload.series, LIVE_VARIABLES.map((v) => v.param))
          dispatch({
            type: 'DATA_READY',
            divisions: payload.series,
            national,
            outcomes: payload.outcomes,
            meta: payload.meta,
          })
        })
        .catch(() => {
          /* Project API not deployed or offline — keep the bundled baseline. */
        })
    }, 1200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  /* Apply a deferred refresh once playback has stopped. */
  useEffect(() => {
    const pending = pendingRefreshRef.current
    if (!pending) return
    if (state.playState !== 'idle' || state.data.status !== 'ready' || engine.state !== 'idle') return
    pendingRefreshRef.current = null
    if (state.data.meta && state.data.meta.via === 'backend') return
    const national = deriveNational(pending.series, LIVE_VARIABLES.map((v) => v.param))
    dispatch({
      type: 'DATA_READY',
      divisions: pending.series,
      national,
      outcomes: pending.outcomes,
      meta: pending.meta,
    })
  }, [state.playState, state.data.status, state.data.meta])

  /* ---- map geometry (local vendored copy of GADM 4.1 level 1, simplified) ---- */
  useEffect(() => {
    if (state.geo.status === 'ready' && state.geo.json) return
    let cancelled = false
    dispatch({ type: 'GEO_STATUS', status: 'loading' })
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => {
        if (!cancelled) dispatch({ type: 'GEO_STATUS', status: 'ready', json })
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'GEO_STATUS', status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* ---- engine wiring: steps + range, rebuilt on any selection change ---- */
  const variable = VARIABLE_BY_ID[state.variableId]
  const seriesMap = currentSeriesMap(state)

  const steps = useMemo(() => {
    if (state.data.status !== 'ready' || !seriesMap) return []
    return monthsInSelection(state.timeMode, state, YEAR_MIN, YEAR_MAX).map((key) => ({
      key,
      value: Object.prototype.hasOwnProperty.call(seriesMap, key) ? seriesMap[key] : null,
    }))
  }, [
    state.data.status,
    seriesMap,
    state.timeMode,
    state.year,
    state.month,
    state.range.startYear,
    state.range.endYear,
  ])

  const mappingRange = useMemo(() => rangeOf(seriesMap), [seriesMap])
  const normalByMonth = useMemo(() => normalsFor(seriesMap), [seriesMap])

  /* The datasets sounding together. At least one is always present; the
     reducer never lets the count fall below one or rise above three. */
  const selectedVariableIds = useMemo(() => {
    const ids = state.selectedVariableIds && state.selectedVariableIds.length
      ? state.selectedVariableIds
      : [state.variableId]
    const live = ids.filter((id) => VARIABLE_BY_ID[id]?.status === 'live')
    return live.length ? live : [state.variableId]
  }, [state.selectedVariableIds, state.variableId])

  /* Every selected dataset keeps its own series, range and normals, so its
     rack can be mapped independently while the lead supplies the tempo. */
  const layerConfigs = useMemo(() => {
    if (state.data.status !== 'ready' || !steps.length) return []
    return selectedVariableIds.map((id) => {
      const layerVariable = VARIABLE_BY_ID[id]
      const layerSeries = layerVariable ? scopeSeries(state.data, state.scope, layerVariable.param) : null
      return {
        variable: layerVariable,
        range: rangeOf(layerSeries),
        steps: steps.map((step) => ({
          key: step.key,
          value: layerSeries && Object.prototype.hasOwnProperty.call(layerSeries, step.key)
            ? layerSeries[step.key]
            : null,
        })),
        normals: normalsFor(layerSeries),
      }
    })
  }, [selectedVariableIds, state.data, state.scope, steps])

  const engineLayers = useMemo(
    () => (layerConfigs.length ? layerConfigs : [{ variable, range: mappingRange, steps, normals: normalByMonth }]),
    [layerConfigs, variable, mappingRange, steps, normalByMonth],
  )

  const analysisKey = [
    state.variableId,
    state.scope.type,
    state.scope.id || '',
    state.timeMode,
    state.year,
    state.month,
    state.range.startYear,
    state.range.endYear,
  ].join('|')
  const layerKey = selectedVariableIds.join(',')
  const lastAnalysisRef = useRef(null)

  useEffect(() => {
    const leadChanged = lastAnalysisRef.current !== null && lastAnalysisRef.current !== analysisKey
    /* A lead, scope or time change restarts the walk so audio and captions
       agree. Adding or removing a layer simply re-balances the live mix. */
    if (leadChanged && state.playState !== 'idle') {
      engine.stop()
      dispatch({ type: 'STOP_SELECTION_CHANGED' })
    }
    engine.configure({ primary: state.variableId, layers: engineLayers })
    lastAnalysisRef.current = analysisKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisKey, layerKey, state.data.status, engineLayers])

  useEffect(() => {
    engine.onstep = (index, step) => {
      dispatch({ type: 'STEP', index, step, at: Date.now() })
      const settings = settingsRef.current
      if (settings.haptics && typeof navigator !== 'undefined' && navigator.vibrate && !document.hidden) {
        const valid = step && step.value !== null
        navigator.vibrate(valid ? 14 : 24)
      }
    }
    engine.onend = () => dispatch({ type: 'END' })
    engine.onerror = () => {
      dispatch({ type: 'PAUSE' })
      dispatch({
        type: 'ANNOUNCE',
        text: 'Audio could not start in this browser. The data, captions and graphs remain available; try pressing play again or check that audio is allowed for this site.',
      })
    }
    return () => {
      engine.onstep = null
      engine.onend = null
      engine.onerror = null
      engine.release()
    }
  }, [])

  /* ---- pause audio and the walk through time when the tab is hidden ---- */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && engine.state === 'playing') {
        engine.pause()
        dispatch({ type: 'PAUSE' })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    engine.setVolume(state.volume)
  }, [state.volume])
  useEffect(() => {
    engine.setRate(state.rate)
  }, [state.rate])
  useEffect(() => {
    engine.setLayers(state.layers)
  }, [state.layers])

  /* ---- transport actions ---- */
  const actions = useMemo(
    () => ({
      play: () => {
        dispatch({ type: 'PLAY' })
        engine.play()
      },
      pause: () => {
        engine.pause()
        dispatch({ type: 'PAUSE' })
      },
      resume: () => {
        dispatch({ type: 'PLAY' })
        engine.resume()
      },
      stop: () => {
        engine.stop()
        dispatch({ type: 'STOP' })
      },
      seek: (index) => {
        engine.seek(index)
        dispatch({ type: 'SEEK', index })
      },
      announce: (text) => dispatch({ type: 'ANNOUNCE', text }),
    }),
    [],
  )

  const value = useMemo(
    () => ({
      state,
      dispatch,
      actions,
      steps,
      mappingRange,
      seriesMap,
      variable,
      normalByMonth,
    }),
    [state, actions, steps, mappingRange, seriesMap, variable, normalByMonth],
  )

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
}

export function usePreview() {
  const ctx = useContext(PreviewContext)
  if (!ctx) throw new Error('usePreview must be used inside PreviewProvider')
  return ctx
}

/** The month key the map/summary should display right now. */
export function currentDisplayKey(state, steps, position, playState) {
  if (playState === 'playing' || playState === 'paused') {
    const step = steps[position]
    if (step) return step.key
  }
  if (state.timeMode === 'range') return null // range idle → mean over range, handled by caller
  return monthKey(state.year, state.month)
}

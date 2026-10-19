/**
 * Shared state for the Preview experience.
 *
 * One source of truth keeps the variable, geographic scope, time selection,
 * map, graphs, summary, captions and the audio engine in step. The engine
 * itself is a singleton (lib/sonify.js); this context mirrors its transport
 * state so React can render it, and rebuilds its step list whenever the
 * data selection changes — stopping playback first so no stale audio ever
 * continues after a selection change.
 */

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { loadAllDivisions } from '../api/power'
import { deriveNational, monthsInSelection, scopeSeries, monthlyArray, extent, monthKey } from '../lib/processing'
import { describeStep, idleCaption, endCaption } from '../lib/captions'
import { engine } from '../lib/sonify'
import { LIVE_VARIABLES, VARIABLE_BY_ID, YEAR_MIN, YEAR_MAX } from '../data/datasets'
import { REGION_BY_ID, DIVISION_BY_ID, GEOJSON_URL, REGIONAL, GLOBAL } from '../data/world'
import baselineData from '../data/worldPowerBaseline.json'
import worldGeoJson from '../data/world-regions.json'

const PreviewContext = createContext(null)

const GUIDE_KEY = 'pt-preview-guide-dismissed'

function initialGuideOpen() {
  try {
    return sessionStorage.getItem(GUIDE_KEY) === '1'
  } catch {
    return false
  }
}

const initialNational = deriveNational(baselineData.series, LIVE_VARIABLES.map((v) => v.param))

const initialCaptionText = idleCaption({
  variable: VARIABLE_BY_ID['T2M'],
  scopeName: 'Global (World)',
  scopeKind: 'national',
  hasData: true,
  ready: true,
})

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
  view: 'series', // series | waveform
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

  playState: 'idle', // idle | playing | paused
  position: 0,
  caption: { text: initialCaptionText, cls: 'interpretation' },
  guideOpen: false,
  continentModalOpen: false,
  unavailableNoticeId: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'DATA_LOADING':
      return { ...state, data: { ...state.data, status: 'loading' } }
    case 'DATA_RETRY':
      return {
        ...state,
        data: { ...state.data, status: 'loading', retryCount: state.data.retryCount + 1 },
      }
    case 'DATA_READY': {
      const readyState = {
        ...state,
        data: {
          status: 'ready',
          divisions: action.divisions,
          national: action.national,
          outcomes: action.outcomes,
          meta: action.meta,
        },
      }
      return {
        ...readyState,
        caption: { text: idleCaption(captionArgs(readyState, VARIABLE_BY_ID[readyState.variableId])), cls: 'interpretation' },
      }
    }
    case 'DATA_ERROR':
      return { ...state, data: { ...state.data, status: 'error', outcomes: action.outcomes || {} } }
    case 'GEO_STATUS':
      return { ...state, geo: { status: action.status, json: action.json || null } }

    case 'SET_VARIABLE': {
      const current = state.selectedVariableIds || [state.variableId]
      const updated = current.includes(action.id) ? current : [...current, action.id]
      return { ...state, variableId: action.id, selectedVariableIds: updated, unavailableNoticeId: null }
    }
    case 'TOGGLE_VARIABLE': {
      const current = state.selectedVariableIds || [state.variableId]
      const exists = current.includes(action.id)
      let updated
      if (exists) {
        if (current.length === 1) {
          updated = current
        } else {
          updated = current.filter((id) => id !== action.id)
        }
      } else {
        updated = [...current, action.id]
      }
      let activeId = state.variableId
      if (!updated.includes(activeId)) {
        const firstLive = updated.find((id) => VARIABLE_BY_ID[id]?.status === 'live')
        activeId = firstLive || updated[0]
      } else if (!exists && VARIABLE_BY_ID[action.id]?.status === 'live') {
        activeId = action.id
      }
      return {
        ...state,
        selectedVariableIds: updated,
        variableId: activeId,
        unavailableNoticeId: VARIABLE_BY_ID[action.id]?.status === 'unavailable' ? action.id : null,
      }
    }
    case 'SET_SELECTED_VARIABLES': {
      const ids = action.ids && action.ids.length > 0 ? action.ids : ['T2M']
      let activeId = ids.includes(state.variableId) ? state.variableId : (ids.find((id) => VARIABLE_BY_ID[id]?.status === 'live') || ids[0])
      return { ...state, selectedVariableIds: ids, variableId: activeId }
    }
    case 'SHOW_UNAVAILABLE':
      return { ...state, unavailableNoticeId: action.id }
    case 'SET_SCOPE':
      return { ...state, scope: action.scope }
    case 'SET_TIME_MODE':
      return { ...state, timeMode: action.mode }
    case 'SET_YEAR':
      return { ...state, year: action.year }
    case 'SET_MONTH':
      return { ...state, month: action.month }
    case 'SET_RANGE':
      return { ...state, range: action.range }

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

    case 'PLAY':
      return { ...state, playState: 'playing' }
    case 'PAUSE':
      return { ...state, playState: 'paused' }
    case 'STOP': {
      const variable = VARIABLE_BY_ID[state.variableId]
      return {
        ...state,
        playState: 'idle',
        position: 0,
        caption: { text: idleCaption(captionArgs(state, variable)), cls: 'interpretation' },
      }
    }
    case 'STOP_SELECTION_CHANGED':
      return {
        ...state,
        playState: 'idle',
        position: 0,
        caption: {
          text: 'Selection changed — playback stopped so the audio always matches what you see. Press play to listen to the new selection.',
          cls: 'interpretation',
        },
      }
    case 'STEP': {
      const variable = VARIABLE_BY_ID[state.variableId]
      const seriesMap = currentSeriesMap(state)
      const scopeName = state.scope.type === 'division' ? divisionName(state.scope.id) : 'Bangladesh'
      return {
        ...state,
        position: action.index,
        caption: {
          text: describeStep({
            variable,
            step: action.step,
            seriesMap,
            scopeName,
            scopeKind: state.scope.type,
          }).text,
          cls: 'measured',
        },
      }
    }
    case 'END': {
      const variable = VARIABLE_BY_ID[state.variableId]
      return {
        ...state,
        playState: 'idle',
        position: 0,
        caption: { text: endCaption({ variable }), cls: 'interpretation' },
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

function divisionName(id) {
  return REGION_BY_ID[id] ? REGION_BY_ID[id].name : DIVISION_BY_ID[id] ? DIVISION_BY_ID[id].name : id
}

function captionArgs(state, variable) {
  const seriesMap = currentSeriesMap(state)
  const hasData = seriesMap && Object.values(seriesMap).some((v) => v !== null)
  return {
    variable,
    scopeName: (state.scope.type === 'division' || state.scope.type === 'region') ? divisionName(state.scope.id) : 'Global (World)',
    scopeKind: state.scope.type,
    hasData,
    ready: state.data.status === 'ready',
  }
}

export function currentSeriesMap(state) {
  const variable = VARIABLE_BY_ID[state.variableId]
  return scopeSeries(state.data, state.scope, variable.param)
}

export function PreviewProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  /* ---- data load: 8 division point-samples from NASA POWER (re-runs on retry) ---- */
  const retryCount = state.data.retryCount
  useEffect(() => {
    if (retryCount === 0 && state.data.status === 'ready') return
    let cancelled = false
    dispatch({ type: 'DATA_LOADING' })
    loadAllDivisions()
      .then(({ series, outcomes, meta }) => {
        if (cancelled) return
        const okCount = Object.values(outcomes).filter((o) => o.ok).length
        if (okCount === 0) {
          const firstErr = Object.values(outcomes).find((o) => o.error)
          dispatch({
            type: 'DATA_ERROR',
            outcomes,
          })
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
        dispatch({ type: 'DATA_READY', divisions: series, national, outcomes, meta })
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'DATA_ERROR', outcomes: {} })
      })
    return () => {
      cancelled = true
    }
  }, [retryCount])

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

  const mappingRange = useMemo(() => {
    if (!seriesMap) return { lo: 0, hi: 1 }
    const [lo, hi] = extent(monthlyArray(seriesMap, YEAR_MIN, YEAR_MAX))
    if (lo === null || hi === null) return { lo: 0, hi: 1 }
    return { lo, hi }
  }, [seriesMap])

  const selectionKey = [
    state.variableId,
    state.scope.type,
    state.scope.id || '',
    state.timeMode,
    state.year,
    state.month,
    state.range.startYear,
    state.range.endYear,
  ].join('|')

  useEffect(() => {
    engine.configure({ variable: state.variableId, range: mappingRange, steps })
    if (state.playState !== 'idle') {
      engine.stop()
      dispatch({ type: 'STOP_SELECTION_CHANGED' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, state.data.status, mappingRange, steps])

  useEffect(() => {
    engine.onstep = (index, step) => dispatch({ type: 'STEP', index, step })
    engine.onend = () => dispatch({ type: 'END' })
    return () => {
      engine.onstep = null
      engine.onend = null
      engine.release()
    }
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
        engine.play()
        dispatch({ type: 'PLAY' })
      },
      pause: () => {
        engine.pause()
        dispatch({ type: 'PAUSE' })
      },
      resume: () => {
        engine.resume()
        dispatch({ type: 'PLAY' })
      },
      stop: () => {
        engine.stop()
        dispatch({ type: 'STOP' })
      },
      seek: (index) => {
        engine.seek(index)
        dispatch({ type: 'SEEK', index })
      },
    }),
    [],
  )

  const value = useMemo(() => ({ state, dispatch, actions, steps, mappingRange, seriesMap, variable }), [
    state,
    actions,
    steps,
    mappingRange,
    seriesMap,
    variable,
  ])

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

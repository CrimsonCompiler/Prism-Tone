/**
 * Accessibility plumbing for the Preview page.
 *
 *  LiveRegion     one polite, keyed announcement channel for the whole page.
 *                 Playback updates it once per sounding step; timeline drags
 *                 never do. It is deliberately the only aria-live region in
 *                 this experience, so screen readers hear captions in order
 *                 instead of three competing panels.
 *
 *  usePreviewKeys global shortcuts: Space, ←/→, ↑/↓, C, T, ?, Esc.
 *                 Shortcuts are ignored while typing, while a dialog is open,
 *                 and while focus is on a native control that uses the key
 *                 itself (range sliders, selects, buttons, the graph canvas).
 */

import { useEffect, useRef } from 'react'
import { usePreview } from '../state/PreviewContext'
import { YEAR_MIN, YEAR_MAX } from '../data/datasets'

export function LiveRegion() {
  const { state } = usePreview()
  const live = state.live || { id: 0, text: '' }

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {/* The region itself stays mounted; only its content changes, which is
          the reliable pattern for screen readers. The key lets an identical
          message be announced again. */}
      <span key={live.id}>{live.text}</span>
    </div>
  )
}

const TYPING = 'input, textarea, select, [contenteditable="true"], [role="textbox"]'
const NATIVE = 'button, a, summary, [role="button"], [role="slider"], canvas'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function usePreviewKeys() {
  const ctx = usePreview()
  const ref = useRef(ctx)
  ref.current = ctx

  useEffect(() => {
    const onKey = (e) => {
      const { state, dispatch, actions, steps } = ref.current
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (state.guideOpen || state.continentModalOpen || state.settingsOpen) return

      const target = e.target instanceof Element ? e.target : null
      const typing = target && target.closest(TYPING)
      const native = target && target.closest(NATIVE)

      if (e.key === 'Escape') {
        if (state.transcriptOpen) {
          dispatch({ type: 'TOGGLE_TRANSCRIPT', open: false })
          actions.announce('Transcript closed.')
        }
        return
      }
      if (typing) return

      /* --- transport --- */
      if (e.key === ' ' || e.code === 'Space') {
        if (native) return
        e.preventDefault()
        if (state.playState === 'playing') {
          actions.pause()
          actions.announce('Playback paused.')
        } else if (state.playState === 'paused') {
          actions.resume()
          actions.announce('Playback resumed.')
        } else {
          actions.play()
          actions.announce('Playback started.')
        }
        return
      }

      /* --- step through time --- */
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (native) return
        const dir = e.key === 'ArrowRight' ? 1 : -1
        e.preventDefault()

        if (state.playState !== 'idle' && steps.length) {
          if (state.playState === 'playing') actions.pause()
          actions.seek(clamp(state.position + dir, 0, steps.length - 1))
          return
        }

        if (state.timeMode === 'year') {
          dispatch({ type: 'SET_YEAR', year: clamp(state.year + dir, YEAR_MIN, YEAR_MAX), announce: true })
        } else if (state.timeMode === 'month') {
          const index = state.year * 12 + (state.month - 1) + dir
          const year = Math.floor(index / 12)
          const month = (index % 12) + 1
          if (year < YEAR_MIN || year > YEAR_MAX) return
          if (year !== state.year) dispatch({ type: 'SET_YEAR', year })
          dispatch({ type: 'SET_MONTH', month, announce: true })
        } else {
          const startYear = clamp(state.range.startYear + dir, YEAR_MIN, YEAR_MAX)
          const endYear = clamp(state.range.endYear + dir, YEAR_MIN, YEAR_MAX)
          if (startYear === state.range.startYear && endYear === state.range.endYear) return
          dispatch({ type: 'SET_RANGE', range: { startYear, endYear }, announce: true })
        }
        return
      }

      /* --- volume --- */
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (native) return
        e.preventDefault()
        const next = clamp(Math.round((state.volume + (e.key === 'ArrowUp' ? 0.1 : -0.1)) * 10) / 10, 0, 1)
        dispatch({ type: 'SET_VOLUME', volume: next })
        actions.announce(`Volume ${Math.round(next * 100)} percent${next === 0 ? ', muted' : ''}.`)
        return
      }

      /* --- panels --- */
      const key = e.key.toLowerCase()
      if (key === 'c') {
        if (native && target.closest('input, select, textarea')) return
        dispatch({ type: 'SET_SETTING', key: 'captionsVisible', value: !state.settings.captionsVisible })
        return
      }
      if (key === 't') {
        if (native) return
        dispatch({ type: 'TOGGLE_TRANSCRIPT' })
        actions.announce(state.transcriptOpen ? 'Transcript closed.' : 'Transcript opened.')
        return
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (native) return
        e.preventDefault()
        dispatch({ type: 'GUIDE', open: true })
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Shortcut list shared by the drawer and the guide, so they cannot drift. */
export const SHORTCUTS = [
  ['Space', 'Play, pause or resume'],
  ['← / →', 'Step back or forward in time'],
  ['↑ / ↓', 'Volume up or down by 10%'],
  ['C', 'Show or hide captions'],
  ['T', 'Open or close the transcript'],
  ['?', 'Open this guide'],
  ['Esc', 'Close the guide, drawer or transcript'],
]

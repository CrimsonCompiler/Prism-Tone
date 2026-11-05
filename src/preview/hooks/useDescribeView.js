/**
 * Shared “Describe this view” action.
 *
 * Both the display drawer and the caption bar call this one hook, so the
 * description is assembled from the same state and announced through the one
 * existing live region. There is exactly one announcement path.
 */

import { useCallback } from 'react'
import { usePreview } from '../state/PreviewContext'
import { selectionSummary } from '../lib/selectors'
import { describeView } from '../lib/captions'
import { CONTINENT_BY_ID } from '../data/world'

export function useDescribeView() {
  const { state, dispatch, variable, seriesMap, steps } = usePreview()

  return useCallback(() => {
    const summary = selectionSummary({
      state,
      variable,
      seriesMap,
      steps,
      position: state.position,
      playState: state.playState,
    })
    const scopeName =
      state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
        ? CONTINENT_BY_ID[state.scope.id].name
        : 'World'
    const text = describeView({
      state,
      variable,
      steps,
      seriesMap,
      caption: state.caption,
      summary: { ...summary, scopeName },
    })
    dispatch({ type: 'SET_DESCRIBE', text })
  }, [state, dispatch, variable, seriesMap, steps])
}

export default useDescribeView

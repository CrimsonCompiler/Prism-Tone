/**
 * Scope panel — choose national (derived) or a single division.
 * The region list is the keyboard/screen-reader equivalent of the map:
 * same values, same selection model.
 */

import { usePreview } from '../state/PreviewContext'
import { displayKey, divisionDisplayValues } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { DIVISIONS } from '../data/bangladesh'
import { fmtValue } from '../lib/format'

const STATUS_NOTE = {
  ok: '',
  derived: 'mean over range',
  missing: 'no data this period',
  error: 'load failed',
  loading: 'loading…',
}

export default function ScopePanel() {
  const { state, dispatch, variable, steps } = usePreview()
  const key = displayKey(state, steps, state.position, state.playState)
  const values = divisionDisplayValues({ state, variable, displayKey: key })

  const failedCount = Object.values(state.data.outcomes || {}).filter((o) => !o.ok).length

  return (
    <div className="flex h-full flex-col border border-ivory/10 bg-coal/40">
      <div className="flex items-baseline justify-between border-b border-ivory/10 px-4 py-3 md:px-5">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">Region</p>
        <span className="font-data text-[10px] md:text-[11px] uppercase tracking-[0.16em] text-parchment">
          {key ? keyToLabel(key) : `mean · ${state.range.startYear}–${state.range.endYear}`}
        </span>
      </div>

      <div className="flex-1 p-3 md:p-4">
        <ul className="flex flex-col divide-y divide-ivory/8" role="listbox" aria-label="Geographic scope">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={state.scope.type === 'national'}
              onClick={() => dispatch({ type: 'SET_SCOPE', scope: { type: 'national' } })}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${
                state.scope.type === 'national' ? 'bg-ivory/10' : 'hover:bg-ivory/5'
              }`}
            >
              <span>
                <span className="block font-ui text-[13px] font-medium tracking-[0.06em] text-ivory">Bangladesh</span>
                <span className="block font-stencil text-[9px] uppercase tracking-[0.18em] text-parchment">
                  derived — mean of 8 division samples
                </span>
              </span>
              <span className="font-data text-[11px] uppercase tracking-[0.1em] text-beige">
                {state.scope.type === 'national' ? '●' : ''}
              </span>
            </button>
          </li>

          {DIVISIONS.map((d) => {
            const v = values[d.id]
            const selected = state.scope.type === 'division' && state.scope.id === d.id
            const shown = v.value !== null
            return (
              <li key={d.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id: d.id } })}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${
                    selected ? 'bg-ivory/10' : 'hover:bg-ivory/5'
                  }`}
                >
                  <span>
                    <span className="block font-ui text-[13px] font-medium tracking-[0.06em] text-ivory">{d.name}</span>
                    <span className="block font-stencil text-[9px] uppercase tracking-[0.18em] text-parchment">
                      {STATUS_NOTE[v.status] || 'point sample'}
                    </span>
                  </span>
                  <span className="font-data text-[12px] tracking-[0.04em] text-cream/90">
                    {shown ? `${fmtValue(v.value, variable.decimals)} ${variable.unit}` : '—'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {failedCount > 0 && state.data.status === 'ready' && (
        <p className="border-t border-ivory/10 px-4 py-2.5 font-stencil text-[9px] uppercase tracking-[0.18em] text-ember/90">
          {failedCount} division{failedCount > 1 ? 's' : ''} failed to load — national mean uses the remaining samples.
        </p>
      )}
    </div>
  )
}

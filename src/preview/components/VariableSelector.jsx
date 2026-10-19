/**
 * Variable selector — the six environmental categories.
 * Three are live (NASA POWER, verified at runtime); three are declared
 * unavailable with their specific reason and can never be activated.
 */

import { VARIABLES } from '../data/datasets'
import { usePreview } from '../state/PreviewContext'

export default function VariableSelector() {
  const { state, dispatch } = usePreview()

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">
          01 · Environmental variable
        </p>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-parchment">
          NASA POWER · MERRA-2 monthly
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2" role="listbox" aria-label="Environmental variable">
        {VARIABLES.map((v) => {
          const live = v.status === 'live'
          const selected = state.variableId === v.id
          return (
            <button
              key={v.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-disabled={!live}
              aria-label={`${v.name}${live ? `, ${v.unit}, live NASA POWER data` : ', unavailable — activate to read why'}`}
              title={live ? v.headline : v.unavailableReason}
              onClick={() =>
                live ? dispatch({ type: 'SET_VARIABLE', id: v.id }) : dispatch({ type: 'SHOW_UNAVAILABLE', id: v.id })
              }
              className={`group relative border px-3 py-3 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${selected
                  ? 'border-ivory/60 bg-ivory/10'
                  : live
                    ? 'border-ivory/12 hover:border-ivory/35 hover:bg-ivory/5'
                    : 'cursor-not-allowed border-ivory/8 opacity-55'
                }`}
            >
              <span className="flex items-baseline justify-between">
                <span className="font-stencil text-[10px] tracking-[0.22em] text-parchment">{v.index}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${live ? (selected ? 'bg-ember' : 'bg-sage/80') : 'bg-ivory/25'
                    }`}
                  aria-hidden="true"
                />
              </span>
              <span className={`mt-2 block font-ui text-[13px] md:text-[13.5px] font-medium tracking-[0.05em] ${selected ? 'text-ivory' : 'text-cream/85'}`}>
                {v.name}
              </span>
              <span className="mt-0.5 block font-stencil text-[8.5px] uppercase tracking-[0.16em] text-parchment/85">
                {live ? `${v.unit} · ${v.cadence}` : 'unavailable'}
              </span>
            </button>
          )
        })}
      </div>

      <UnavailableNote />
    </div>
  )
}

function UnavailableNote() {
  const { state } = usePreview()
  const shown = VARIABLES.find((v) => v.id === (state.unavailableNoticeId || state.variableId))
  if (!shown || shown.status !== 'unavailable') return null
  return (
    <div className="mt-3 border border-ivory/12 bg-coal/50 px-4 py-3" role="note">
      <p className="font-stencil text-[10px] uppercase tracking-[0.2em] text-ember">
        {shown.name} is not available in this release
      </p>
      <p className="mt-1.5 max-w-2xl font-ui text-[12.5px] leading-relaxed text-cream/75">
        {shown.unavailableReason}
      </p>
      <p className="mt-1.5 max-w-2xl font-ui text-[12.5px] leading-relaxed text-cream/55">
        Planned mapping: {shown.description}
      </p>
    </div>
  )
}

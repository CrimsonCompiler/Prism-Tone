/**
 * Data tracks — qoder V2-style dataset options for the preview.
 *
 * The three live NASA POWER tracks are presented as selectable sound layers,
 * each with its own accent dot, legend and rack. Two or three can sound at
 * once: every selected track adds its voice to the mix, while the lead track
 * supplies the tempo, map, graphs and captions. Fire, water and vegetation
 * stay visibly planned and cannot join the mix, because no complete,
 * attributable series exists in this build.
 */

import { VARIABLES, VARIABLE_BY_ID } from '../data/datasets'
import { usePreview } from '../state/PreviewContext'

const MAX_LAYERS = 3

export default function VariableSelector() {
  const { state, dispatch } = usePreview()
  const selectedIds = state.selectedVariableIds && state.selectedVariableIds.length
    ? state.selectedVariableIds
    : [state.variableId]
  const selectedLive = selectedIds.filter((id) => VARIABLE_BY_ID[id]?.status === 'live')

  return (
    <section aria-labelledby="pt-tracks-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="pt-tracks-title"
          className="font-stencil text-[12px] uppercase tracking-[0.24em] text-ivory"
        >
          Data tracks
        </h2>
        <span className="font-data text-[12px] text-cream">
          {selectedLive.length} of {MAX_LAYERS} layers
        </span>
      </div>

      <p className="mt-1.5 font-ui text-[13px] leading-relaxed text-cream">
        Layer up to three live tracks; the lead sets both tempo and map.
      </p>

      <div role="group" aria-label="NASA data tracks" className="mt-3 flex flex-col gap-2">
        {VARIABLES.map((v) => {
          const isLive = v.status === 'live'
          const selected = isLive && selectedLive.includes(v.id)
          const isLead = state.variableId === v.id
          const isNoteOpen = !isLive && state.unavailableNoticeId === v.id

          return (
            <div
              key={v.id}
              className="border transition-colors duration-200"
              style={{
                borderColor: selected
                  ? v.accent
                  : isNoteOpen
                    ? 'rgba(245,242,235,0.35)'
                    : 'rgba(245,242,235,0.12)',
                background: selected
                  ? v.accentSoft
                  : isNoteOpen
                    ? 'rgba(255,255,255,0.03)'
                    : 'transparent',
              }}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (isLive) {
                    dispatch({ type: 'TOGGLE_VARIABLE', id: v.id })
                  } else {
                    dispatch({
                      type: 'SHOW_UNAVAILABLE',
                      id: state.unavailableNoticeId === v.id ? null : v.id,
                    })
                  }
                }}
                className="flex w-full items-start gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
              >
                <span
                  className="mt-1.5 block h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: v.accent,
                    boxShadow: selected ? `0 0 0 3px ${v.accentSoft}` : 'none',
                    opacity: isLive ? 1 : 0.75,
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="font-ui text-[15px] font-medium text-ivory">{v.name}</span>
                    <span className="font-data text-[12px] text-beige">
                      {isLive ? `${v.unit} · ${v.cadence}` : 'Planned'}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-ui text-[12.5px] leading-snug text-cream/80">
                    {v.headline}
                  </span>
                </span>
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected
                    ? 'border-ivory/70 bg-ivory text-[#121313]'
                    : isLive
                      ? 'border-ivory/30 bg-black/20'
                      : 'border-ivory/15 bg-white/[0.02]'
                    }`}
                  aria-hidden="true"
                >
                  {selected ? (
                    <svg className="h-2.5 w-2.5 stroke-current stroke-[3]" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isLive ? (
                    <span className="h-1 w-1 rounded-full bg-ivory/40" />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-ivory/20" />
                  )}
                </span>
              </button>

              {/* Lead details for active live track */}
              {selected && (
                <div className="px-3 pb-3 pl-8">
                  <div
                    className="h-[3px] w-full rounded-full"
                    style={{ background: v.legend.gradient }}
                    aria-hidden="true"
                  />
                  <div className="mt-1 flex justify-between font-ui text-[12px] text-beige">
                    <span>{v.legend.low}</span>
                    <span>{v.legend.high}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    {isLead ? (
                      <span className="inline-flex items-center gap-1.5 font-stencil text-[12px] uppercase tracking-[0.14em] text-ivory">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: v.accent }}
                          aria-hidden="true"
                        />
                        Lead · map, graphs, tempo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SET_VARIABLE', id: v.id })}
                        aria-label={`Make ${v.name} the lead dataset`}
                        className="border border-ivory/25 px-2.5 py-1 font-ui text-[12px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
                      >
                        Make lead
                      </button>
                    )}
                    <span className="font-ui text-[12px] text-beige">
                      {v.id === state.variableId ? 'describes the captions' : 'layered in the mix'}
                    </span>
                  </div>
                </div>
              )}

              {/* Expandable info note for planned track */}
              {isNoteOpen && (
                <div className="px-3 pb-3 pl-8">
                  <div className="rounded border border-white/10 bg-coal/60 p-2.5 text-left">
                    <p className="font-ui text-[12px] leading-relaxed text-cream/90">
                      {v.unavailableReason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

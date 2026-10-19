/**
 * Timeline — choose how to move through the 1981–2025 record.
 *
 *   year  → pick a year; playback walks Jan→Dec; the strip of 12 months
 *           doubles as a position readout while playing and is clickable
 *           when paused to inspect a single month.
 *   range → pick a start and end year; playback walks every month in
 *           between, and the map shows the derived range mean while idle.
 */

import { usePreview } from '../state/PreviewContext'
import { YEAR_MIN, YEAR_MAX } from '../data/datasets'
import { MONTHS_SHORT } from '../lib/processing'

const MODES = [
  ['year', 'Year'],
  ['range', 'Range'],
]

const YEARS = []
for (let y = YEAR_MIN; y <= YEAR_MAX; y++) YEARS.push(y)

function YearSelect({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-stencil text-[11px] uppercase tracking-[0.2em] text-parchment">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-ivory/15 bg-ink px-3 py-1.5 font-data text-[13px] tracking-[0.06em] text-ivory focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer"
      >
        {YEARS.map((y) => (
          <option key={y} value={y} className="bg-ink text-ivory">
            {y}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function Timeline() {
  const { state, dispatch, actions, steps } = usePreview()
  const { timeMode, year, month, range, playState, position } = state

  const playing = playState === 'playing' || playState === 'paused'

  const stepIndexFor = (y, m) => steps.findIndex((s) => s.key === `${y}${String(m).padStart(2, '0')}`)

  return (
    <div
      className="border-t border-ivory/20 bg-[#101721]/94 backdrop-blur-xl p-3 md:p-4 shadow-[0_-6px_25px_rgba(0,0,0,0.5)]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Top bar: Mode tabs + Controls + Monthly record badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* mode tabs */}
          <div className="flex gap-1.5" role="tablist" aria-label="Time selection mode">
            {MODES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={timeMode === id}
                onClick={() => dispatch({ type: 'SET_TIME_MODE', mode: id })}
                className={`border px-4 py-1.5 font-stencil text-[11.5px] md:text-[12px] uppercase tracking-[0.22em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer ${timeMode === id
                  ? 'border-ivory/50 bg-ivory/10 text-ivory font-medium'
                  : 'border-ivory/12 text-parchment hover:border-ivory/30 hover:text-cream'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* controls per mode: positioned right next to Range button */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            {timeMode !== 'range' && (
              <YearSelect
                label="Year"
                value={year}
                onChange={(y) => dispatch({ type: 'SET_YEAR', year: y })}
              />
            )}

            {timeMode === 'range' && (
              <>
                <YearSelect
                  label="From"
                  value={range.startYear}
                  onChange={(y) =>
                    dispatch({ type: 'SET_RANGE', range: { ...range, startYear: Math.min(y, range.endYear) } })
                  }
                />
                <YearSelect
                  label="To"
                  value={range.endYear}
                  onChange={(y) =>
                    dispatch({ type: 'SET_RANGE', range: { ...range, endYear: Math.max(y, range.startYear) } })
                  }
                />
                <span className="font-data text-[12px] uppercase tracking-[0.14em] text-parchment">
                  {steps.length} months selected
                </span>
              </>
            )}
          </div>
        </div>

        {/* monthly record badge placed inside the box on the right */}
        <span className="font-data text-[11px] md:text-[11.5px] uppercase tracking-[0.18em] text-parchment/80">
          monthly record · {YEAR_MIN}–{YEAR_MAX}
        </span>
      </div>

      {/* month strip for year mode */}
      {timeMode === 'year' && (
        <div className="mt-3.5 grid grid-cols-6 gap-1.5 sm:grid-cols-12" role="group" aria-label="Months of the selected year">
          {MONTHS_SHORT.map((m, i) => {
            const idx = stepIndexFor(year, i + 1)
            const active = playing ? position === idx : month === i + 1
            const isCurrent = playing && position === idx
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                aria-label={`${m} ${year}${isCurrent ? ' — currently playing' : ''}`}
                onClick={() => {
                  if (!playing) dispatch({ type: 'SET_MONTH', month: i + 1 })
                  else if (idx >= 0) actions.seek(idx)
                }}
                className={`border px-1.5 py-2 font-data text-[11.5px] md:text-[12.5px] uppercase tracking-[0.12em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer ${active
                  ? isCurrent
                    ? 'border-ember/70 bg-ember/20 text-ivory'
                    : 'border-ivory/50 bg-ivory/10 text-ivory'
                  : 'border-ivory/10 text-parchment hover:border-ivory/30 hover:text-cream'
                  }`}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

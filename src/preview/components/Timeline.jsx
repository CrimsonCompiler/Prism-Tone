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
    <label className="flex items-center gap-2.5">
      <span className="font-stencil text-[12px] uppercase tracking-[0.2em] text-ivory font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-white/20 bg-[#252830] px-3.5 py-1.5 font-data text-[14px] tracking-[0.06em] text-ivory font-medium focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer rounded-sm"
      >
        {YEARS.map((y) => (
          <option key={y} value={y} className="bg-[#252830] text-ivory">
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
      className="border-t border-white/20 bg-[#1e2126]/95 backdrop-blur-xl p-3.5 md:p-4 shadow-[0_-10px_35px_rgba(0,0,0,0.5)]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Top bar: Mode tabs + Controls + Monthly record badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* mode tabs */}
          <div className="flex gap-2" role="tablist" aria-label="Time selection mode">
            {MODES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={timeMode === id}
                onClick={() => dispatch({ type: 'SET_TIME_MODE', mode: id })}
                className={`border px-4 py-1.5 font-stencil text-[12.5px] md:text-[13px] uppercase tracking-[0.22em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer rounded-sm ${timeMode === id
                  ? 'border-[#e2d9c6] bg-[#e2d9c6]/20 text-ivory font-semibold shadow-[0_0_12px_rgba(226,217,198,0.14)]'
                  : 'border-white/20 bg-white/[0.04] text-ivory/80 hover:border-ivory/40 hover:text-ivory hover:bg-white/[0.08] font-medium'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* controls per mode: positioned right next to Range button */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                <span className="font-data text-[13px] uppercase tracking-[0.14em] text-ivory font-medium">
                  {steps.length} months selected
                </span>
              </>
            )}
          </div>
        </div>

        {/* monthly record badge placed inside the box on the right */}
        <span className="font-ui text-[12px] md:text-[12.5px] uppercase tracking-[0.16em] text-ivory/70 font-medium">
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
                className={`border px-2 py-2 font-data text-[13px] md:text-[13.5px] uppercase tracking-[0.14em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 cursor-pointer rounded-sm ${active
                  ? isCurrent
                    ? 'border-[#e2d9c6] bg-[#e2d9c6]/30 text-ivory font-semibold shadow-[0_0_14px_rgba(226,217,198,0.22)]'
                    : 'border-[#e2d9c6] bg-[#e2d9c6]/20 text-ivory font-semibold shadow-[0_0_10px_rgba(226,217,198,0.14)]'
                  : 'border-white/15 bg-white/[0.05] text-ivory/80 hover:border-ivory/40 hover:bg-white/[0.12] hover:text-ivory font-medium'
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

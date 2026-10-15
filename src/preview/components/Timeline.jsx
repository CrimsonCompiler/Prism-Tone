/**
 * Timeline — choose how to move through the 1981–2025 record.
 *
 *   year  → pick a year; playback walks Jan→Dec; the strip of 12 months
 *           doubles as a position readout while playing and is clickable
 *           when paused to inspect a single month.
 *   month → pick one year + month; a single step plays.
 *   range → pick a start and end year; playback walks every month in
 *           between, and the map shows the derived range mean while idle.
 */

import { usePreview } from '../state/PreviewContext'
import { YEAR_MIN, YEAR_MAX } from '../data/datasets'
import { MONTHS_SHORT, keyToLabel } from '../lib/processing'

const MODES = [
  ['year', 'Year'],
  ['month', 'Month'],
  ['range', 'Range'],
]

const YEARS = []
for (let y = YEAR_MIN; y <= YEAR_MAX; y++) YEARS.push(y)

function YearSelect({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-parchment">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-ivory/15 bg-ink px-2 py-1.5 font-data text-[12px] tracking-[0.06em] text-ivory focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
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
  const currentStep = playing ? steps[position] : null

  const stepIndexFor = (y, m) => steps.findIndex((s) => s.key === `${y}${String(m).padStart(2, '0')}`)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">
          03 · Time selection
        </p>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-parchment">
          monthly record · {YEAR_MIN}–{YEAR_MAX}
        </span>
      </div>

      <div className="mt-4 border border-ivory/10 bg-coal/40 p-3 md:p-4">
        {/* mode tabs */}
        <div className="flex gap-1.5" role="tablist" aria-label="Time selection mode">
          {MODES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={timeMode === id}
              onClick={() => dispatch({ type: 'SET_TIME_MODE', mode: id })}
              className={`border px-3.5 py-1.5 font-stencil text-[10px] uppercase tracking-[0.22em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${
                timeMode === id ? 'border-ivory/50 bg-ivory/10 text-ivory' : 'border-ivory/12 text-parchment hover:border-ivory/30 hover:text-cream'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* controls per mode */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {timeMode !== 'range' && (
            <YearSelect
              label="Year"
              value={year}
              onChange={(y) => dispatch({ type: 'SET_YEAR', year: y })}
            />
          )}

          {timeMode === 'month' && (
            <label className="flex items-center gap-2">
              <span className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-parchment">Month</span>
              <select
                value={month}
                onChange={(e) => dispatch({ type: 'SET_MONTH', month: Number(e.target.value) })}
                className="border border-ivory/15 bg-ink px-2 py-1.5 font-data text-[12px] tracking-[0.06em] text-ivory focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70"
              >
                {MONTHS_SHORT.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
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
              <span className="font-data text-[11px] uppercase tracking-[0.12em] text-parchment">
                {steps.length} months selected
              </span>
            </>
          )}
        </div>

        {/* month strip for year mode */}
        {timeMode === 'year' && (
          <div className="mt-4 grid grid-cols-6 gap-1 sm:grid-cols-12" role="group" aria-label="Months of the selected year">
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
                  className={`border px-1 py-1.5 font-data text-[10.5px] uppercase tracking-[0.1em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${
                    active
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

        <p className="mt-3.5 border-t border-ivory/8 pt-2.5 font-data text-[10.5px] uppercase tracking-[0.14em] text-parchment/85">
          {playing && currentStep
            ? `Playing ${keyToLabel(currentStep.key)} — step ${Math.min(position + 1, steps.length)} of ${steps.length}`
            : timeMode === 'year'
              ? `Inspecting ${MONTHS_SHORT[month - 1]} ${year} · playback walks all 12 months`
              : timeMode === 'month'
                ? `Inspecting ${MONTHS_SHORT[month - 1]} ${year}`
                : `Range ${range.startYear}–${range.endYear} · playback walks ${steps.length} months`}
        </p>
      </div>
    </div>
  )
}

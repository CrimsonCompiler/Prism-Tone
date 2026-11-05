/**
 * Data summary — the selected scope and period, computed only from the
 * validated series. Everything unavailable is labelled instead of guessed.
 *
 * The live value belongs to the caption bar, so this panel leads with the
 * scope and the trend, then the selection’s statistics.
 */

import { memo } from 'react'
import { usePreview } from '../state/PreviewContext'
import { selectionSummary, sparklineWindow } from '../lib/selectors'
import { fmtValue, fmtDelta, fmtPct } from '../lib/format'
import { YEAR_MIN, YEAR_MAX, BASELINE, SOURCE } from '../data/datasets'
import { CONTINENT_BY_ID } from '../data/world'
import Sparkline from './Sparkline'
import Panel from './Panel'

function SummaryPanel() {
  const { state, steps, seriesMap, variable } = usePreview()

  if (state.data.status === 'loading' || state.data.status === 'idle') {
    return (
      <Panel title="Data summary">
        <div role="status" aria-label="Data summary">
          <p className="font-ui text-[15px] leading-relaxed text-ivory">
            Retrieving the NASA POWER global climate record…
          </p>
        </div>
      </Panel>
    )
  }

  if (state.data.status === 'error') {
    return (
      <Panel title="Data summary">
        <div role="alert" aria-label="Data summary">
          <p className="font-ui text-[15px] leading-relaxed text-ivory">
            No summary can be shown — the NASA POWER data could not be retrieved. The map and controls stay
            available; retry from the status banner when your connection is back.
          </p>
        </div>
      </Panel>
    )
  }

  const s = selectionSummary({
    state,
    variable,
    seriesMap,
    steps,
    position: state.position,
    playState: state.playState,
  })
  const spark = sparklineWindow({ state, seriesMap, steps, position: state.position })
  const scopeName = state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
    ? CONTINENT_BY_ID[state.scope.id].name
    : 'World'
  const scopeColor = state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
    ? CONTINENT_BY_ID[state.scope.id].color
    : '#c19a5b'
  const kindLabel = s.scopeKind === 'national'
    ? 'derived — planetary mean of seven continental samples'
    : 'measured — continental sample at the centroid'
  const hasComparison = s.normal !== null && s.delta !== null

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 border border-ivory/20 bg-white/[0.04] px-2.5 py-1 font-ui text-[13px] text-ivory">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: scopeColor }} aria-hidden="true" />
        {scopeName}
      </span>
      <span className="font-ui text-[13px] text-cream">{s.selectionLabel}</span>
    </div>
  )

  return (
    <Panel title="Data summary" actions={header}>
      <Sparkline
        points={spark.points}
        current={spark.current}
        normal={s.normal}
        decimals={variable.decimals}
        unit={variable.unit}
        label={`${variable.name} trend ending at the current selection. Dashed line is the 1991–2020 normal.`}
      />

      <dl className="mt-4 grid grid-cols-2 border-t border-ivory/10">
        <SummaryStat label="Minimum" value={s.selMin} decimals={variable.decimals} unit={variable.unit} />
        <SummaryStat
          label="Maximum"
          value={s.selMax}
          decimals={variable.decimals}
          unit={variable.unit}
          className="border-l border-ivory/10 pl-3"
        />
        <SummaryStat label="Mean" value={s.selMean} decimals={variable.decimals} unit={variable.unit} />
        <div className="border-b border-l border-ivory/10 py-2.5 pl-3">
          <dt className="font-ui text-[13px] text-cream">
            vs {BASELINE.start}–{BASELINE.end} normal
          </dt>
          <dd className="mt-0.5 font-data text-[15px] text-ivory">
            {hasComparison ? (
              <>
                {fmtDelta(s.delta, variable.decimals, variable.unit)}{' '}
                {Math.abs(s.normal) > 0.05 && (
                  <span className="font-ui text-[13px] text-cream">({fmtPct((s.delta / s.normal) * 100)})</span>
                )}
              </>
            ) : (
              <span className="font-ui text-[13px] text-cream">unavailable at this scope</span>
            )}
          </dd>
        </div>
        <div className="col-span-2 border-b border-ivory/10 py-2.5">
          <dt className="font-ui text-[13px] text-cream">Coverage</dt>
          <dd className="mt-0.5 font-data text-[15px] text-ivory">
            {s.validCount}/{s.totalCount} periods
            {s.coverage < 1 && s.totalCount > 0 && (
              <span className="ml-2 font-ui text-[13px] text-cream">({Math.round(s.coverage * 100)}% valid)</span>
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-3 font-ui text-[14px] leading-relaxed text-cream">
        {variable.name} · {kindLabel}
        <br />
        {SOURCE.name} {SOURCE.dataset} · record {YEAR_MIN}–{YEAR_MAX}
      </p>

      {s.normal === null && (
        <p className="mt-2 font-ui text-[14px] leading-relaxed text-cream">
          The {BASELINE.start}–{BASELINE.end} comparison needs at least 75% baseline coverage at this scope, so it
          is not shown rather than guessed.
        </p>
      )}
    </Panel>
  )
}

function SummaryStat({ label, value, decimals, unit, className = '' }) {
  const shown = value !== null && value !== undefined
  return (
    <div className={`border-b border-ivory/10 py-2.5 ${className}`}>
      <dt className="font-ui text-[13px] text-cream">{label}</dt>
      <dd className="mt-0.5 font-data text-[15px] text-ivory">
        {shown ? `${fmtValue(value, decimals)} ${unit}` : '—'}
      </dd>
    </div>
  )
}

const MemoSummaryPanel = memo(SummaryPanel)

export { MemoSummaryPanel as SummaryPanel }
export default MemoSummaryPanel

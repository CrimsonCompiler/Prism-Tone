/**
 * Data summary — the selected scope and period, computed only from the
 * validated series. Everything unavailable is labelled instead of guessed.
 */

import { usePreview } from '../state/PreviewContext'
import { selectionSummary, sparklineWindow, anomalyTone, anomalyWord } from '../lib/selectors'
import { fmtValue, fmtDelta, fmtPct } from '../lib/format'
import { YEAR_MIN, YEAR_MAX, BASELINE, SOURCE } from '../data/datasets'
import { CONTINENT_BY_ID } from '../data/world'
import Sparkline from './Sparkline'

const TONE = {
  warm: 'border-ember/60 bg-ember/10 text-ember',
  cool: 'border-ice/60 bg-ice/10 text-ice',
  near: 'border-cream/40 bg-cream/5 text-cream',
  none: 'border-ivory/20 bg-white/[0.03] text-beige',
}

export function SummaryPanel() {
  const { state, steps, seriesMap, variable } = usePreview()

  if (state.data.status === 'loading' || state.data.status === 'idle') {
    return (
      <section className="flex h-full flex-col border border-ivory/15 bg-coal/60 p-4 md:p-5" role="status" aria-label="Data summary">
        <p className="font-stencil text-[12px] uppercase tracking-[0.22em] text-beige">Data summary</p>
        <p className="mt-4 font-ui text-[15px] leading-relaxed text-ivory">Retrieving the NASA POWER global climate record…</p>
      </section>
    )
  }

  if (state.data.status === 'error') {
    return (
      <section className="flex h-full flex-col border border-ivory/15 bg-coal/60 p-4 md:p-5" role="alert" aria-label="Data summary">
        <p className="font-stencil text-[12px] uppercase tracking-[0.22em] text-beige">Data summary</p>
        <p className="mt-4 font-ui text-[15px] leading-relaxed text-ivory">
          No summary can be shown — the NASA POWER data could not be retrieved. The map and controls stay available; retry from the status banner when your connection is back.
        </p>
      </section>
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
  const tone = anomalyTone(variable, s.delta, s.normal)
  const scopeName = state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
    ? CONTINENT_BY_ID[state.scope.id].name
    : 'World'
  const scopeColor = state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
    ? CONTINENT_BY_ID[state.scope.id].color
    : '#c19a5b'
  const kindLabel = s.scopeKind === 'national'
    ? 'derived — planetary mean of seven continental samples'
    : 'measured — continental sample at the centroid'

  return (
    <section className="flex h-full flex-col border border-ivory/15 bg-coal/60" aria-label="Data summary">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory/10 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-stencil text-[12px] uppercase tracking-[0.22em] text-beige">Data summary</p>
          <span className="inline-flex items-center gap-2 border border-ivory/20 bg-white/[0.04] px-2.5 py-1 font-ui text-[12px] text-ivory">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: scopeColor }} aria-hidden="true" />
            {scopeName}
          </span>
        </div>
        <span className="font-ui text-[13px] text-cream">{s.selectionLabel}</span>
      </div>

      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-ui text-[14px] capitalize text-cream">{s.current.label || 'Current value'}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-data text-[44px] leading-none tracking-tight text-ivory font-semibold">
                {s.current.value !== null ? fmtValue(s.current.value, variable.decimals) : '—'}
              </span>
              <span className="font-ui text-[16px] text-cream">{variable.unit}</span>
            </p>
          </div>
          <span className={`inline-flex max-w-[190px] items-center border px-2.5 py-1.5 text-left font-ui text-[13px] leading-snug ${TONE[tone]}`}>
            {anomalyWord(variable, s.delta, s.normal)}
            {s.delta !== null && s.delta !== undefined ? ` · ${fmtDelta(s.delta, variable.decimals, variable.unit)}` : ''}
          </span>
        </div>

        <div className="mt-4">
          <Sparkline
            points={spark.points}
            current={spark.current}
            normal={s.normal}
            decimals={variable.decimals}
            unit={variable.unit}
            label={`${variable.name} trend ending at the current selection. Dashed line is the 1991–2020 normal.`}
          />
        </div>

        <dl className="mt-4 border-t border-ivory/10">
          <SummaryRow label="minimum" value={s.selMin} decimals={variable.decimals} unit={variable.unit} />
          <SummaryRow label="maximum" value={s.selMax} decimals={variable.decimals} unit={variable.unit} />
          <SummaryRow label="mean" value={s.selMean} decimals={variable.decimals} unit={variable.unit} />
          <div className="flex items-baseline justify-between gap-4 border-b border-ivory/10 py-2.5">
            <dt className="font-ui text-[15px] text-ivory">
              vs {BASELINE.start}–{BASELINE.end} normal{s.key && s.current.label ? ` · ${s.current.label}` : ''}
            </dt>
            <dd className="font-data text-[16px] text-ivory">
              {s.normal !== null && s.delta !== null ? (
                <>
                  {fmtDelta(s.delta, variable.decimals, variable.unit)}{' '}
                  {Math.abs(s.normal) > 0.05 && (
                    <span className="font-ui text-[13px] text-cream">({fmtPct((s.delta / s.normal) * 100)})</span>
                  )}
                </>
              ) : (
                <span className="font-ui text-[14px] text-beige">unavailable at this scope</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="font-ui text-[15px] text-ivory">Coverage</dt>
            <dd className="font-data text-[16px] text-ivory">
              {s.validCount}/{s.totalCount} periods
              {s.coverage < 1 && s.totalCount > 0 && (
                <span className="ml-2 font-ui text-[13px] text-cream">({Math.round(s.coverage * 100)}% valid)</span>
              )}
            </dd>
          </div>
        </dl>

        <p className="mt-auto border-t border-ivory/10 pt-3 font-ui text-[13px] leading-relaxed text-beige">
          {variable.name} · {kindLabel}
          <br />
          {SOURCE.name} {SOURCE.dataset} · record {YEAR_MIN}–{YEAR_MAX}
        </p>

        {s.normal === null && (
          <p className="mt-2 font-ui text-[13px] leading-relaxed text-beige">
            The {BASELINE.start}–{BASELINE.end} comparison needs at least 75% baseline coverage at this scope, so it is not shown rather than guessed.
          </p>
        )}
      </div>
    </section>
  )
}

function SummaryRow({ label, value, decimals, unit }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ivory/10 py-2.5">
      <dt className="font-ui text-[15px] capitalize text-ivory">{label}</dt>
      <dd className="font-data text-[16px] text-ivory">
        {value !== null ? `${fmtValue(value, decimals)} ${unit}` : '—'}
      </dd>
    </div>
  )
}

export default SummaryPanel

/**
 * Captions, summary and mapping panels.
 *
 * Captions live in an aria-live region and are generated from the actual
 * data (see lib/captions.js). The summary only reports statistics computed
 * from the real loaded series — anything it cannot compute is labelled
 * unavailable. The mapping panel documents the live implementation.
 */

import { usePreview } from '../state/PreviewContext'
import { selectionSummary } from '../lib/selectors'
import { fmtValue, fmtDelta, fmtPct } from '../lib/format'
import { YEAR_MIN, YEAR_MAX, BASELINE, SOURCE } from '../data/datasets'

const CLS_LABEL = {
  measured: 'measured',
  derived: 'derived',
  interpretation: 'guide note',
}

export function CaptionsPanel() {
  const { state } = usePreview()
  return (
    <section aria-label="Live captions">
      <div className="flex items-baseline justify-between">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">05 · Live captions</p>
        <span className={`font-stencil text-[9px] uppercase tracking-[0.2em] text-parchment/80`}>
          {CLS_LABEL[state.caption.cls] || 'note'}
        </span>
      </div>
      <div className="mt-3 min-h-24 border border-ivory/10 bg-coal/40 px-4 py-3.5 md:px-5">
        <p aria-live="polite" aria-atomic="true" className="font-elegant text-[15px] leading-relaxed text-cream/95">
          {state.caption.text}
        </p>
      </div>
      <p className="mt-2 font-stencil text-[8.5px] uppercase tracking-[0.18em] text-parchment/70">
        captions work without audio — every statement is labelled measured, derived, or guide note
      </p>
    </section>
  )
}

export function SummaryPanel() {
  const { state, steps, seriesMap, variable } = usePreview()

  if (state.data.status === 'loading' || state.data.status === 'idle') {
    return (
      <div className="flex h-full flex-col border border-ivory/10 bg-coal/40 p-4 md:p-5" role="status">
        <p className="font-stencil text-[11px] uppercase tracking-[0.26em] text-beige">06 · Data summary</p>
        <p className="mt-4 font-ui text-[13px] text-cream/70">Retrieving the NASA POWER global climate record…</p>
      </div>
    )
  }

  if (state.data.status === 'error') {
    return (
      <div className="flex h-full flex-col border border-ivory/10 bg-coal/40 p-4 md:p-5" role="alert">
        <p className="font-stencil text-[11px] uppercase tracking-[0.26em] text-beige">06 · Data summary</p>
        <p className="mt-4 font-ui text-[13px] leading-relaxed text-cream/75">
          No summary can be shown — the NASA POWER data could not be retrieved. The controls above stay
          available; retry from the status banner once your connection is back.
        </p>
      </div>
    )
  }

  const s = selectionSummary({ state, variable, seriesMap, steps, position: state.position, playState: state.playState })

  const kindLabel =
    s.scopeKind === 'national'
      ? 'derived — planetary mean of all 7 continents'
      : 'measured continental sample (continental centroid)'

  return (
    <div className="flex h-full flex-col border border-ivory/10 bg-coal/40">
      <div className="flex items-baseline justify-between border-b border-ivory/10 px-4 py-3 md:px-5">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">06 · Data summary</p>
        <span className="font-data text-[10px] uppercase tracking-[0.14em] text-parchment">{s.selectionLabel}</span>
      </div>

      <div className="flex-1 p-4 md:p-5">
        <dl>
          <div className="flex items-baseline justify-between gap-4 border-b border-ivory/8 pb-2.5">
            <dt className="font-stencil text-[9.5px] uppercase tracking-[0.18em] text-parchment">
              {s.current.label || 'current'}
            </dt>
            <dd className="font-data text-[22px] leading-none tracking-[0.02em] text-ivory">
              {s.current.value !== null ? fmtValue(s.current.value, variable.decimals) : '—'}
              <span className="ml-1.5 text-[12px] text-parchment">{variable.unit}</span>
            </dd>
          </div>

          <Row label="minimum" value={s.selMin} decimals={variable.decimals} unit={variable.unit} />
          <Row label="maximum" value={s.selMax} decimals={variable.decimals} unit={variable.unit} />
          <Row label="mean" value={s.selMean} decimals={variable.decimals} unit={variable.unit} />

          <div className="flex items-baseline justify-between gap-4 border-b border-ivory/8 py-2.5">
            <dt className="font-stencil text-[9.5px] uppercase tracking-[0.18em] text-parchment">
              vs {BASELINE.start}–{BASELINE.end} normal
            </dt>
            <dd className="font-data text-[13px] text-cream/90">
              {s.normal !== null && s.delta !== null ? (
                <>
                  {fmtDelta(s.delta, variable.decimals, variable.unit)}{' '}
                  <span className="text-parchment/80">({fmtPct((s.delta / s.normal) * 100)})</span>
                </>
              ) : (
                <span className="text-parchment/70">unavailable</span>
              )}
            </dd>
          </div>

          <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="font-stencil text-[9.5px] uppercase tracking-[0.18em] text-parchment">coverage</dt>
            <dd className="font-data text-[12.5px] text-cream/90">
              {s.validCount}/{s.totalCount} periods valid
              {s.coverage < 1 && s.totalCount > 0 && (
                <span className="ml-1.5 text-ember/90">
                  ({Math.round(s.coverage * 100)}% — statistics above use valid values only)
                </span>
              )}
            </dd>
          </div>
        </dl>

        <p className="mt-3 font-stencil text-[8.5px] uppercase leading-relaxed tracking-[0.16em] text-parchment/75">
          {variable.name} · {kindLabel} · {SOURCE.name} {SOURCE.dataset} · record {YEAR_MIN}–{YEAR_MAX}
        </p>

        {s.normal === null && (
          <p className="mt-2 font-ui text-[12px] leading-relaxed text-cream/60">
            The {BASELINE.start}–{BASELINE.end} comparison needs at least 75% baseline coverage at this scope, so it is
            not shown rather than guessed.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, decimals, unit }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ivory/8 py-2.5">
      <dt className="font-stencil text-[9.5px] uppercase tracking-[0.18em] text-parchment">{label}</dt>
      <dd className="font-data text-[13px] text-cream/90">
        {value !== null ? `${fmtValue(value, decimals)} ${unit}` : '—'}
      </dd>
    </div>
  )
}

export function MappingPanel() {
  const { variable, mappingRange } = usePreview()
  const m = variable.mapping

  return (
    <section aria-label="Data to sound mapping">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">
          07 · How {variable.name.toLowerCase()} becomes sound
        </p>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-parchment">
          live mapping · this is what the engine actually does
        </span>
      </div>

      <div className="mt-4 border border-ivory/10 bg-coal/40 p-4 md:p-5">
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MappingStep n="a" title="measurement">
            {m.input}
          </MappingStep>
          <MappingStep n="b" title="normalise">
            {m.normalize}{' '}
            <span className="mt-1 block font-data text-[10px] tracking-[0.08em] text-ember/90">
              current scale {fmtValue(mappingRange.lo, variable.decimals)}–{fmtValue(mappingRange.hi, variable.decimals)} {variable.unit}
            </span>
          </MappingStep>
          <MappingStep n="c" title="audio parameter">
            <span className="text-ivory">{m.parameter}.</span> {m.direction}
          </MappingStep>
          <MappingStep n="d" title="missing data">
            {m.missing}
          </MappingStep>
        </ol>

        <div className="mt-4 border-t border-ivory/8 pt-3">
          <p className="font-stencil text-[9px] uppercase tracking-[0.2em] text-parchment">layers</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
            {m.layers.map(([name, desc]) => (
              <li key={name} className="font-ui text-[12px] text-cream/80">
                <span className="font-stencil text-[10px] uppercase tracking-[0.14em] text-beige">{name}</span>
                <span className="text-parchment"> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function MappingStep({ n, title, children }) {
  return (
    <li className="relative border-l border-ivory/15 pl-3.5">
      <span className="font-stencil text-[9px] uppercase tracking-[0.22em] text-ember/90">{n}</span>
      <p className="font-stencil text-[10px] uppercase tracking-[0.2em] text-beige">{title}</p>
      <p className="mt-1 font-ui text-[12px] leading-relaxed text-cream/80">{children}</p>
    </li>
  )
}

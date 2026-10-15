/**
 * Page chrome — hero, status banner, source bar.
 */

import { usePreview } from '../state/PreviewContext'
import { YEAR_MIN, YEAR_MAX, SOURCE } from '../data/datasets'
import { fmtTime } from '../lib/format'

export function PreviewHero() {
  const { state, dispatch } = usePreview()
  const ok = state.data.status === 'ready'
  const okCount = Object.values(state.data.outcomes || {}).filter((o) => o.ok).length

  return (
    <header className="border-b border-ivory/10 pb-8 md:pb-10">
      <div className="flex items-center gap-3">
        <span
          className="font-meno text-[11px] md:text-[12px] uppercase tracking-[0.26em] text-beige"
          style={{ fontFamily: '"Meno Banner", "Source Serif 4", Georgia, serif' }}
        >
          Preview · Bangladesh
        </span>
        <span className="h-px w-14 bg-ivory/25 md:w-20" aria-hidden="true" />
        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-parchment">
          {YEAR_MIN}–{YEAR_MAX}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end">
        <h1
          className="font-meno font-light leading-[0.95] tracking-[-0.015em] text-ivory text-[clamp(2.2rem,4.6vw,4.4rem)] lg:col-span-8"
          style={{ fontFamily: 'Meno Banner' }}
        >
          Listen to Bangladesh.
        </h1>
        <div className="lg:col-span-4">
          <p className="max-w-md font-elegant text-[15px] leading-relaxed text-cream/85 md:text-[16px]">
            Forty-five years of NASA Earth observation for the eight divisions — temperature, rainfall and
            wind, retrieved live, explored on the map, and turned into sound by a documented, data-driven
            mapping. What cannot be sourced honestly is labelled unavailable.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'GUIDE', open: true })}
              className="border border-ivory/25 px-4 py-2 font-stencil text-[10px] uppercase tracking-[0.24em] text-ivory transition-colors duration-200 hover:bg-ivory/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70"
            >
              Open guide
            </button>
            <span className="flex items-center gap-2 font-stencil text-[9px] uppercase tracking-[0.18em] text-parchment" role="status">
              <span
                className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-sage' : state.data.status === 'error' ? 'bg-ember' : 'bg-ember animate-pulse'}`}
                aria-hidden="true"
              />
              {ok
                ? `${SOURCE.name} connected — ${okCount}/8 divisions`
                : state.data.status === 'error'
                  ? 'data retrieval failed'
                  : 'contacting NASA POWER…'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export function StatusBanner() {
  const { state, dispatch } = usePreview()
  const { data, geo } = state

  if (data.status === 'loading' || data.status === 'idle') {
    return (
      <div className="border border-ivory/12 bg-coal/40 px-4 py-3 md:px-5" role="status">
        <p className="font-stencil text-[10px] uppercase tracking-[0.22em] text-cream/85">
          Retrieving the NASA POWER monthly record — 8 division point-samples, {YEAR_MIN}–{YEAR_MAX}…
        </p>
        <p className="mt-1 font-ui text-[12px] text-cream/60">
          First load takes a few seconds; responses are cached for the session. The page is usable as soon
          as the first divisions land.
        </p>
      </div>
    )
  }

  if (data.status === 'error') {
    const firstErr = Object.values(data.outcomes || {}).find((o) => o.error)
    const kind = firstErr ? firstErr.error.kind : 'unknown'
    const hint =
      kind === 'offline'
        ? 'The browser reports it is offline. Reconnect and retry.'
        : kind === 'timeout'
          ? 'The NASA POWER service did not answer in time — it may be busy. Retry in a moment.'
          : 'The NASA POWER service could not be reached. Retry, or check whether a network filter blocks power.larc.nasa.gov.'
    return (
      <div className="border border-ember/40 bg-ember/5 px-4 py-3 md:px-5" role="alert">
        <p className="font-stencil text-[10px] uppercase tracking-[0.22em] text-ember">
          Live data unavailable ({kind})
        </p>
        <p className="mt-1 font-ui text-[12.5px] leading-relaxed text-cream/80">{hint}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'DATA_RETRY' })}
          className="mt-2.5 border border-ivory/30 px-4 py-1.5 font-stencil text-[9.5px] uppercase tracking-[0.22em] text-ivory transition-colors duration-200 hover:bg-ivory/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70"
        >
          Retry
        </button>
      </div>
    )
  }

  const failed = Object.entries(data.outcomes)
    .filter(([, o]) => !o.ok)
    .map(([id]) => id)

  return (
    <>
      {failed.length > 0 && (
        <div className="border border-ember/30 bg-ember/5 px-4 py-2.5 md:px-5" role="status">
          <p className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-ember/95">
            Partial retrieval — {failed.join(', ')} failed; the national mean uses the remaining division
            samples and the affected region is marked on the map.
          </p>
        </div>
      )}
      {geo.status === 'error' && (
        <div className="border border-ivory/15 bg-coal/40 px-4 py-2.5 md:px-5" role="status">
          <p className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-parchment">
            Division boundaries failed to load — the region list below remains fully usable.
          </p>
        </div>
      )}
    </>
  )
}

export function SourceBar() {
  const { state } = usePreview()
  const { meta } = state.data
  return (
    <footer className="border-t border-ivory/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 font-stencil text-[9px] uppercase tracking-[0.18em] text-parchment/85">
        <span>
          {SOURCE.name} — {SOURCE.dataset}
          {meta && meta.apiVersion ? ` — API ${meta.apiVersion}` : ''}
        </span>
        <span>retrieved {meta && meta.fetchedAt ? fmtTime(meta.fetchedAt) : '—'} · session cache</span>
        <span>boundaries — GADM 4.1 (gadm.org)</span>
        <span>no value on this page is simulated</span>
      </div>
    </footer>
  )
}

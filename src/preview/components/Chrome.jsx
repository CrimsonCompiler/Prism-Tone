/**
 * Page chrome — hero, status banner, source bar.
 */

import { usePreview } from '../state/PreviewContext'
import { SOURCE } from '../data/datasets'
import { fmtTime } from '../lib/format'

export function PreviewHero() {
  return (
    <header className="border-b border-ivory/10 pt-4 sm:pt-6 md:pt-7 pb-5 md:pb-6">
      <h1
        className="font-meno font-light leading-[1.05] tracking-[-0.015em] text-ivory text-[clamp(1.75rem,3vw,2.75rem)] pl-0.5 sm:pl-1"
        style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
      >
        Listen to Bangladesh.
      </h1>
    </header>
  )
}

export function StatusBanner() {
  const { state, dispatch } = usePreview()
  const { data, geo } = state

  if (data.status === 'loading' || data.status === 'idle') {
    return null
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

/**
 * Page chrome — hero, status banner, source bar.
 */

import { usePreview } from '../state/PreviewContext'
import { SOURCE } from '../data/datasets'
import { REGION_BY_ID, DIVISION_BY_ID } from '../data/world'
import { fmtTime } from '../lib/format'
import CountrySearchBar from './CountrySearchBar'

function regionName(id) {
  const entry = REGION_BY_ID[id] || DIVISION_BY_ID[id]
  return entry ? entry.name : id
}

export function PreviewHero() {
  const { dispatch } = usePreview()

  return (
    <header className="relative z-40 border-b border-ivory/10 pt-4 sm:pt-6 md:pt-7 pb-5 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1
          className="font-meno font-light leading-[1.05] tracking-[-0.015em] text-ivory text-[clamp(1.75rem,3vw,2.75rem)] pl-0.5 sm:pl-1 shrink-0"
          style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
        >
          Listen to the World.
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <CountrySearchBar />
          <button
            id="global-continents-hero-btn"
            type="button"
            onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: true })}
            className="group flex items-center justify-center rounded border border-ivory/25 bg-[#141617] px-4 py-2 transition-all hover:border-ivory/60 hover:bg-ivory/10 hover:shadow-lg hover:shadow-black/50 cursor-pointer shrink-0"
            title="Open Continent Selection Popup"
          >
            <span className="font-stencil text-[11px] uppercase tracking-[0.24em] text-ivory group-hover:text-white font-medium">
              Select Continent ▾
            </span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', open: true })}
            className="flex items-center justify-center rounded border border-ivory/25 bg-[#141617] px-3 py-2 text-ivory transition-all hover:border-ivory/60 hover:bg-ivory/10 hover:shadow-lg hover:shadow-black/50 cursor-pointer shrink-0"
            title="Display & Accessibility Settings"
            aria-label="Display & Accessibility Settings"
          >
            <span className="font-data text-[12px] font-semibold text-cream">Aa</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'GUIDE', open: true })}
            className="flex h-[35px] w-[35px] items-center justify-center rounded-full border border-ivory/25 bg-[#141617] text-ivory transition-all hover:border-ivory/60 hover:bg-ivory/10 hover:shadow-lg hover:shadow-black/50 cursor-pointer shrink-0"
            title="How to use this page"
            aria-label="How to use this page"
          >
            <span className="font-meno text-[15px] italic text-cream">?</span>
          </button>
        </div>
      </div>
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
      <div className="mt-6 border-l-2 border-l-ember bg-ember/[0.05] px-4 py-3 md:pl-5" role="alert">
        <p className="font-ui text-[14px] text-ember">
          Live data unavailable ({kind})
        </p>
        <p className="mt-1 font-ui text-[14px] leading-relaxed text-ivory">{hint}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'DATA_RETRY' })}
          className="mt-2.5 border border-ivory/30 px-4 py-2 font-ui text-[14px] text-ivory transition-colors duration-200 hover:bg-ivory/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
        >
          Retry
        </button>
      </div>
    )
  }

  const failed = Object.entries(data.outcomes)
    .filter(([, o]) => !o.ok)
    .map(([id]) => regionName(id))

  return (
    <>
      {failed.length > 0 && (
        <div className="mt-6 border-l-2 border-l-ember bg-ember/[0.05] px-4 py-3 md:pl-5" role="status">
          <p className="font-ui text-[14px] leading-relaxed text-ivory">
            Partial retrieval — {failed.join(', ')} failed; the national mean uses the remaining division
            samples and the affected region is marked on the map.
          </p>
        </div>
      )}
      {geo.status === 'error' && (
        <div className="mt-6 border-l-2 border-l-ivory/40 bg-white/[0.02] px-4 py-3 md:pl-5" role="status">
          <p className="font-ui text-[14px] leading-relaxed text-ivory">
            Division boundaries failed to load — the region list below remains fully usable.
          </p>
        </div>
      )}
    </>
  )
}

const RETRIEVAL_LABEL = {
  backend: 'via project API',
  mixed: 'via project API + direct NASA POWER',
  direct: 'direct from NASA POWER',
  session: 'from this session’s cache',
}

function retrievalLabel(meta) {
  if (!meta || !meta.via) return 'bundled baseline'
  return RETRIEVAL_LABEL[meta.via] || 'bundled baseline'
}

export function SourceBar() {
  const { state } = usePreview()
  const { meta } = state.data
  return (
    <footer className="border-t border-ivory/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 font-ui text-[14px] leading-relaxed text-cream">
        <span>
          {SOURCE.name} — {SOURCE.dataset}
          {meta && meta.apiVersion ? ` — API ${meta.apiVersion}` : ''}
        </span>
        <span>
          retrieved {meta && meta.fetchedAt ? fmtTime(meta.fetchedAt) : '—'} · {retrievalLabel(meta)}
        </span>
        <span>boundaries — Natural Earth 1:50m (naturalearthdata.com)</span>
        <span>no value on this page is simulated</span>
      </div>
    </footer>
  )
}

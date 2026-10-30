/**
 * “Now sounding” caption bar, docked to the bottom edge of the map section.
 *
 * It follows the map grid in normal flow rather than pinning to the viewport:
 * the locked Timeline / transport dock sits at the bottom of the map screen
 * (z-20), so a viewport-sticky bar would cover those controls. Docking keeps
 * the caption attached to the map section without hiding any locked control.
 *
 * It never depends on volume: captions describe the data whether sound is
 * muted, unavailable or switched off. Announcements are handled by a single
 * hidden live region at the page root (see Accessibility.jsx), so this bar
 * can update as often as the timeline moves without re-announcing.
 */

import { usePreview } from '../state/PreviewContext'
import { displayKey } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { fmtValue, fmtDelta } from '../lib/format'
import { anomalyTone, anomalyWord } from '../lib/selectors'
import { VARIABLE_BY_ID } from '../data/datasets'

const toneClass = {
  warm: 'text-ember border-ember/60 bg-ember/10',
  cool: 'text-ice border-ice/60 bg-ice/10',
  near: 'text-cream border-cream/40 bg-cream/5',
  none: 'text-beige border-ivory/20 bg-white/[0.03]',
}

export default function NowSounding() {
  const { state, steps, variable } = usePreview()
  const caption = state.caption || {}
  const plan = state.soundPlan || caption.plan || null
  const key = displayKey(state, steps, state.position, state.playState)
  const tone = anomalyTone(variable, caption.delta, caption.normal)
  const captionsOn = state.settings.captionsVisible !== false

  const currentText = caption.text || 'Nothing selected yet.'
  const history = (state.transcript || [])
    .filter((entry) => entry.text !== currentText)
    .slice(-3)
  const activeLayers = (state.selectedVariableIds || [state.variableId])
    .map((id) => VARIABLE_BY_ID[id])
    .filter((v) => v && v.status === 'live')

  const label = caption.label || (state.timeMode === 'range'
    ? `${state.range.startYear}–${state.range.endYear}`
    : key
      ? keyToLabel(key)
      : 'Selected period')

  const kind = caption.cls === 'derived' || state.scope.type === 'national' ? 'derived' : 'measured'

  return (
    <section
      aria-label="Now sounding captions"
      className="relative z-30 -mt-px border-x border-b border-ivory/15 bg-[#161819] shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
    >
      <div className="grid gap-4 px-4 py-4 md:grid-cols-[190px_minmax(0,1fr)_240px] md:gap-6 md:px-6 md:py-5">
        {/* time */}
        <div className="min-w-0">
          <p className="font-stencil text-[12px] uppercase tracking-[0.22em] text-beige">Now sounding</p>
          <p className="mt-1.5 font-ui text-[22px] leading-tight text-ivory font-semibold">
            {label}
          </p>
          <p className="mt-1 font-ui text-[13px] leading-relaxed text-beige">
            {state.playState === 'playing' ? 'playing' : state.playState === 'paused' ? 'paused' : 'ready to play'}
            {state.timeMode === 'range' ? ` · ${steps.length} months` : ''}
          </p>
        </div>

        {/* captions */}
        <div className="min-w-0">
          {history.length > 0 && (
            <ol className="mb-2 space-y-0.5" aria-label="Recent captions">
              {history.map((entry) => (
                <li key={entry.id} className="truncate font-ui text-[15px] leading-snug text-beige">
                  {entry.shortText || entry.text}
                </li>
              ))}
            </ol>
          )}
          {captionsOn ? (
            <p
              className="max-w-[65ch] font-ui leading-[1.5] text-ivory"
              style={{ fontSize: 'var(--pt-caption-size, 23px)' }}
            >
              {currentText}
            </p>
          ) : (
            <p className="max-w-[65ch] font-ui text-[17px] leading-[1.5] text-cream">
              Captions are off. Press <kbd className="rounded border border-ivory/30 px-1.5 py-0.5 font-data text-[13px]">C</kbd> or open
              <span className="text-ivory"> Display &amp; access</span> to show them again. The data and sound continue unchanged.
            </p>
          )}
          {state.volume === 0 && (
            <p className="mt-2 inline-flex items-center gap-2 border border-ivory/25 bg-white/[0.04] px-2.5 py-1 font-ui text-[13px] text-cream">
              <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />
              Sound is muted — captions continue.
            </p>
          )}
          {activeLayers.length > 1 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[13px] text-beige">
              <span className="font-stencil text-[12px] uppercase tracking-[0.16em]">Mix</span>
              {activeLayers.map((layer, index) => (
                <span key={layer.id} className="inline-flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true">+</span>}
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: layer.accent }}
                    aria-hidden="true"
                  />
                  <span className="text-cream">
                    {layer.name}
                    {layer.id === state.variableId ? ' (lead)' : ''}
                  </span>
                </span>
              ))}
            </p>
          )}
        </div>

        {/* value and comparison */}
        <div className="flex flex-col items-start gap-2 border-t border-ivory/10 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-data text-[32px] leading-none text-ivory font-semibold tracking-tight">
              {caption.value !== null && caption.value !== undefined ? fmtValue(caption.value, variable.decimals) : '—'}
            </span>
            <span className="font-ui text-[14px] text-cream">{variable.unit}</span>
          </div>
          <span className={`inline-flex items-center border px-2 py-1 font-ui text-[13px] ${toneClass[tone]}`}>
            {caption.delta !== null && caption.delta !== undefined
              ? `${fmtDelta(caption.delta, variable.decimals, variable.unit)} · ${anomalyWord(variable, caption.delta, caption.normal)}`
              : 'no baseline comparison'}
          </span>
          {plan && !plan.missing && (
            <span className="font-ui text-[13px] leading-snug text-beige">
              {plan.mode} · {plan.note}
            </span>
          )}
          <span className="font-stencil text-[12px] uppercase tracking-[0.16em] text-beige">
            {kind === 'derived' ? 'derived value' : 'measured value'} · NASA POWER
          </span>
        </div>
      </div>
    </section>
  )
}

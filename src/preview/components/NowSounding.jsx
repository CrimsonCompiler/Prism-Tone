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
import { useDescribeView } from '../hooks/useDescribeView'
import { displayKey } from '../lib/selectors'
import { keyToLabel } from '../lib/processing'
import { fmtValue, fmtDelta } from '../lib/format'
import { anomalyTone, anomalyWord } from '../lib/selectors'
import { VARIABLE_BY_ID } from '../data/datasets'

const toneClass = {
  warm: 'text-ember',
  cool: 'text-ice',
  near: 'text-cream',
  none: 'text-beige',
}

function cleanHistoryText(text) {
  if (!text) return ''
  return text.replace(/\s*vs\s+\d{4}[–-]\d{4}/gi, '').trim()
}

function stripDatePrefix(text, label) {
  if (!text) return ''
  if (label && text.startsWith(label)) {
    const rest = text.slice(label.length).trim()
    return rest.replace(/^(?:[—–-]|at)\s+/i, '').trim()
  }
  return text.replace(/^(?:(?:[A-Za-z]{3,9}\s+)?\d{4}(?:\s*[–-]\s*\d{4})?)\s*(?:[—–-]|at)\s+/i, '').trim()
}

export default function NowSounding() {
  const { state, variable } = usePreview()
  const caption = state.caption || {}
  const tone = anomalyTone(variable, caption.delta, caption.normal)
  const captionsOn = state.settings.captionsVisible !== false

  const rawText = caption.text || 'Nothing selected yet.'
  const currentText = stripDatePrefix(rawText, caption.label)
  const history = (state.transcript || [])
    .filter((entry) => entry.text !== rawText && entry.text !== currentText)
    .slice(-2)
  const activeLayers = (state.selectedVariableIds || [state.variableId])
    .map((id) => VARIABLE_BY_ID[id])
    .filter((v) => v && v.status === 'live')

  return (
    <section
      aria-label="Now sounding captions"
      className="relative z-30 border border-ivory/10 bg-coal/40 p-4 md:p-5"
    >
      {/* Value and comparison bar at the top of the card */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ivory/10 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-data text-[28px] leading-none text-ivory font-semibold tracking-tight">
            {caption.value !== null && caption.value !== undefined ? fmtValue(caption.value, variable.decimals) : '—'}
          </span>
          <span className="font-ui text-[14px] text-cream">{variable.unit}</span>
        </div>

        <div className="flex items-center">
          <span className={`font-ui text-[12.5px] font-medium tracking-wide ${toneClass[tone]}`}>
            {caption.delta !== null && caption.delta !== undefined
              ? `${fmtDelta(caption.delta, variable.decimals, variable.unit)} · ${anomalyWord(variable, caption.delta, caption.normal)}`
              : 'no baseline comparison'}
          </span>
        </div>
      </div>

      {/* Captions narrative */}
      <div className="mt-3 min-w-0">
        {history.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-ui text-[12.5px] leading-snug text-beige" aria-label="Recent captions">
            {history.map((entry, idx) => (
              <span key={entry.id || idx} className="inline-flex items-center gap-2">
                {idx > 0 && <span aria-hidden="true" className="text-cream/40">·</span>}
                <span>{cleanHistoryText(entry.shortText || entry.text)}</span>
              </span>
            ))}
          </div>
        )}

        {captionsOn ? (
          <p className="font-ui text-[14.5px] leading-relaxed text-ivory">
            {currentText}
          </p>
        ) : (
          <p className="font-ui text-[13.5px] leading-relaxed text-cream">
            Captions are off. Open <span className="text-ivory">Display &amp; access</span> to show them again.
          </p>
        )}

        {state.volume === 0 && (
          <p className="mt-2.5 inline-flex items-center gap-2 border border-ivory/25 bg-white/[0.04] px-2.5 py-1 font-ui text-[12px] text-cream">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />
            Sound is muted — captions continue.
          </p>
        )}

        {state.imagePlaying && (
          <p className="mt-2.5 inline-flex items-center gap-2 border border-ember/40 bg-ember/10 px-2.5 py-1 font-ui text-[12px] text-cream">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" aria-hidden="true" />
            An image score is sounding — data playback is paused until it stops.
          </p>
        )}

        {activeLayers.length > 1 && (
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[12px] text-cream">
            <span className="text-beige">Mix</span>
            {activeLayers.map((layer, index) => (
              <span key={layer.id} className="inline-flex items-center gap-1.5">
                {index > 0 && <span aria-hidden="true" className="text-beige">+</span>}
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: layer.accent }}
                  aria-hidden="true"
                />
                <span>
                  {layer.name}
                  {layer.id === state.variableId ? ' (lead)' : ''}
                </span>
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}

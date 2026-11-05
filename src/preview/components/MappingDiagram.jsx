/**
 * How the selected variable becomes sound.
 *
 * The diagram reads left to right and is driven by the same pure mapping
 * function as the audio engine (lib/music.js), so it can never describe a
 * mapping the engine is not actually performing. Full prose is available
 * in the expandable technical notes inside the same panel.
 */

import { memo } from 'react'
import { usePreview } from '../state/PreviewContext'
import { displayKey } from '../lib/selectors'
import { getMonthly, normalize, parseMonthKey } from '../lib/processing'
import { fmtValue } from '../lib/format'
import { planForStep, layerPlan, midiToName } from '../lib/music'
import { VARIABLE_BY_ID } from '../data/datasets'
import Panel from './Panel'

/* One sentence per variable, matching scaleFor() in lib/music.js. */
function scaleRule(variable, score) {
  if (variable.id === 'T2M') {
    if (score > 3) return 'More than 0.9 °C warmer than the 1991–2020 normal → D minor. Warmth also brightens the filter.'
    if (score < -2) return 'More than 0.6 °C cooler than the 1991–2020 normal → D major. The cool month keeps the usual register.'
    return 'Between −0.6 and +0.9 °C of the 1991–2020 normal → D Dorian.'
  }
  if (variable.id === 'PRECTOTCORR') {
    return 'G major pentatonic in every month; heavier rain adds marimba notes and brightens the wash.'
  }
  return 'D minor pentatonic in every month; stronger wind weighs the drone and opens the filter.'
}

function MappingPanel() {
  const { state, seriesMap, variable, mappingRange, steps, normalByMonth } = usePreview()
  const selectedLayers = (state.selectedVariableIds || [state.variableId])
    .map((id) => VARIABLE_BY_ID[id])
    .filter((v) => v && v.status === 'live')
  const layerCount = selectedLayers.length
  const key = displayKey(state, steps, state.position, state.playState)
  const point = key ? parseMonthKey(key) : null
  const value = point ? getMonthly(seriesMap, point.year, point.month) : (state.caption.value ?? null)
  const normal = point && normalByMonth ? normalByMonth[point.month] ?? null : null
  const range = mappingRange
  const plan = state.soundPlan || planForStep({
    variable,
    step: { key, value },
    normal,
    range,
    prevValue: null,
  })

  /* A backend score chooses one key/scale for the whole selection. When such
     a score is loaded (or sounding), the diagram must not claim the local
     per-month mode changes: it shows that one mode instead. */
  const score = state.score || {}
  const scoreSounding = state.playState !== 'idle' && score.source === 'score'
  const scorePlanned = state.playState === 'idle' && score.status === 'ready'
  const scoreMode = (scoreSounding || scorePlanned) && score.scaleLabel ? score.scaleLabel : null
  const scoreTempo = scoreMode && Number.isFinite(score.tempo) ? Math.round(score.tempo) : null
  const rule = scoreMode
    ? `Project score mode: ${scoreMode}${scoreTempo ? ` at ${scoreTempo} bpm` : ''}. The key and scale are chosen once for the whole selection; the chord does not change mode month to month.`
    : scaleRule(variable, plan.score)

  const norm = value !== null && range && range.hi !== range.lo
    ? normalize(value, range.lo, range.hi)
    : null
  const scaleNotes = plan.scaleMidi || []
  const layers = layerPlan(plan, variable)
  const m = variable.mapping

  return (
    <Panel
      title={`How ${variable.name.toLowerCase()} becomes sound`}
      meta={scoreMode
        ? 'project score · one key and scale for the whole walk'
        : layerCount > 1
          ? `${layerCount} layers · this diagram describes the lead`
          : 'live mapping · the engine and this diagram share one function'}
      className="scroll-mt-24"
    >
      <div className="grid divide-y divide-ivory/10 md:grid-cols-4 md:divide-x md:divide-y-0">
        {/* 1 — measurement */}
        <div className="pb-4 md:pb-0 md:pr-4">
          <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
            <span className="font-data text-[12px] text-beige">01</span>
            Measured
          </p>
          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="font-data text-[20px] leading-none text-ivory font-semibold">
              {value !== null ? fmtValue(value, variable.decimals) : '—'}
            </span>
            <span className="font-ui text-[14px] text-cream">{variable.unit}</span>
          </p>
          <div className="relative mt-3 h-2 w-full bg-white/[0.07]">
            {norm !== null && (
              <span
                className="absolute -top-1 h-4 w-1 bg-ember"
                style={{ left: `${Math.max(0, Math.min(100, norm * 100))}%` }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="mt-1.5 flex justify-between font-data text-[12px] text-beige">
            <span>{fmtValue(range.lo, variable.decimals)}</span>
            <span>{fmtValue(range.hi, variable.decimals)}</span>
          </div>
          <p className="mt-2 font-ui text-[13px] leading-snug text-cream">Observed range of the loaded record.</p>
        </div>

        {/* 2 — normalise */}
        <div className="py-4 md:px-4 md:py-0">
          <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
            <span className="font-data text-[12px] text-beige">02</span>
            Normalised
          </p>
          <p className="mt-2 font-data text-[20px] leading-none text-ivory font-semibold">
            {norm !== null ? norm.toFixed(2) : '—'}
          </p>
          <div className="mt-3 h-2 w-full bg-white/[0.07]">
            <div
              className="h-2 bg-cream/70"
              style={{ width: `${norm === null ? 0 : Math.max(0, Math.min(100, norm * 100))}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-data text-[12px] text-beige">
            <span>0.00</span>
            <span>1.00</span>
          </div>
          <p className="mt-2 font-ui text-[13px] leading-snug text-cream">
            Linear position inside the record — not a rank or a probability.
          </p>
        </div>

        {/* 3 — pitch + mode */}
        <div className="py-4 md:px-4 md:py-0">
          <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
            <span className="font-data text-[12px] text-beige">03</span>
            Pitch &amp; scale
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-data text-[20px] leading-none text-ivory font-semibold">{plan.note || 'rest'}</span>
            <span className="font-ui text-[13px] text-cream">{scoreMode || plan.mode}</span>
          </p>
          {scoreMode ? (
            <p className="mt-3 border border-ivory/15 px-2 py-1.5 font-ui text-[13px] leading-snug text-cream">
              Score mode: <span className="text-ivory">{scoreMode}</span>
              {scoreTempo ? ` · ${scoreTempo} bpm` : ''} — one colour for the whole walk.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1" role="img" aria-label={`${plan.mode} scale; active note ${plan.note || 'none'}`}>
              {scaleNotes.map((midi) => {
                const active = plan.midi === midi || plan.midi === midi + 12 || plan.midi === midi - 12
                return (
                  <span
                    key={midi}
                    className={`inline-flex min-w-[34px] items-center justify-center border px-1 py-1 font-data text-[12px] ${
                      active ? 'border-ember bg-ember/20 text-ivory' : 'border-ivory/15 text-beige'
                    }`}
                    title={midiToName(midi)}
                  >
                    {midiToName(midi)}
                  </span>
                )
              })}
            </div>
          )}
          <p className="mt-2 font-ui text-[13px] leading-snug text-cream">{rule}</p>
        </div>

        {/* 4 — layers */}
        <div className="pt-4 md:pl-4 md:pt-0">
          <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
            <span className="font-data text-[12px] text-beige">04</span>
            Layers
          </p>
          <ul className="mt-2 space-y-2">
            {layers.map((layer) => (
              <li key={layer.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-ui text-[13px] text-ivory">{layer.label}</span>
                  <span className="font-data text-[12px] text-beige">{layer.detail}</span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-white/[0.07]">
                  <div className="h-1.5 bg-ember/80" style={{ width: `${Math.round(layer.level * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {plan.missing ? (
        <p className="mt-4 border-t border-ivory/10 pt-3 font-ui text-[14px] leading-relaxed text-cream">
          No valid observation for this month. The mix adds no new note for this layer; the pad
          keeps its chord and nothing is invented.
        </p>
      ) : scoreMode ? (
        <p className="mt-4 border-t border-ivory/10 pt-3 font-ui text-[14px] leading-relaxed text-cream">
          Score tempo {scoreTempo ?? '—'} bpm — one month is {score.beatsPerStep || 2} beats, and
          the project score keeps one key and scale for the whole selection.
          {layerCount > 1
            ? ` ${selectedLayers.map((v) => v.name).join(', ')} are scored together; ${variable.name} leads.`
            : ''}
          {' '}A month with no valid value has no note in the score.
        </p>
      ) : (
        <p className="mt-4 border-t border-ivory/10 pt-3 font-ui text-[14px] leading-relaxed text-cream">
          {plan.density > 1 && variable.id === 'PRECTOTCORR'
            ? `Rain density: ${plan.density} notes across the month. `
            : ''}
          Tempo {plan.tempo} bpm — one month is two beats, and two months make one bar.
          {layerCount > 1
            ? ` ${selectedLayers.map((v) => v.name).join(', ')} sound together; ${variable.name} leads and sets the tempo.`
            : ''}
          {' '}A month with no valid value adds no note to any layer.
        </p>
      )}

      <details className="mt-4 border-t border-ivory/10">
        <summary className="cursor-pointer py-3 font-ui text-[15px] text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory">
          Technical notes — full mapping and data handling
        </summary>
        <div className="grid gap-3 pt-3 md:grid-cols-2">
          <Note title="Input">{m.input}</Note>
          <Note title="Normalise">{m.normalize}</Note>
          <Note title="Audio parameter">{m.parameter}. {m.direction}</Note>
          <Note title="Missing data">{m.missing}</Note>
          <Note title="Layers">
            {m.layers.map(([name, desc]) => `${name}: ${desc}`).join(' · ')}
          </Note>
          <Note title="Scale rule">
            {rule} Pitch sits inside a two-octave scale from the variable's root; the chord is built from scale degrees 1, 3 and 5 and holds until the mode changes.
          </Note>
        </div>
      </details>
    </Panel>
  )
}

function Note({ title, children }) {
  return (
    <div>
      <p className="font-ui text-[14px] text-cream">{title}</p>
      <p className="mt-1 font-ui text-[14px] leading-relaxed text-ivory">{children}</p>
    </div>
  )
}

export default memo(MappingPanel)

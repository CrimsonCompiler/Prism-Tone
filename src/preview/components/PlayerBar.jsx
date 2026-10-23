/**
 * Climatological playback progress readout & timeline scrubber
 * for the right sidebar panel underneath Environmental Variable.
 */

import { usePreview } from '../state/PreviewContext'
import { keyToLabel } from '../lib/processing'

export default function PlayerBar() {
  const { state, actions, steps, variable } = usePreview()
  const { playState, position } = state

  const idle = playState === 'idle'
  const step = steps[position]

  return (
    <section aria-label="Timeline progress">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-stencil text-[12px] md:text-[13px] uppercase tracking-[0.24em] text-ivory font-medium">
          Listen
        </p>
        <span className="font-stencil text-[10px] uppercase tracking-[0.16em] text-beige font-normal">
          {variable.name} · {variable.unit}
        </span>
      </div>

      <div className="mt-3 border border-white/15 bg-coal/60 p-4 md:p-5">
        <div>
          <div className="flex justify-between font-data text-[11px] uppercase tracking-[0.14em] text-beige mb-2">
            <span>step {steps.length ? Math.min(position + 1, steps.length) : 0} / {steps.length}</span>
            <span className="text-ivory font-semibold">{step ? keyToLabel(step.key) : '—'}</span>
          </div>
          <label htmlFor="pt-progress" className="sr-only">
            Playback progress
          </label>
          <input
            id="pt-progress"
            type="range"
            className="pt-range w-full cursor-pointer"
            min={0}
            max={Math.max(steps.length - 1, 0)}
            value={Math.min(position, Math.max(steps.length - 1, 0))}
            disabled={idle || !steps.length}
            onChange={(e) => actions.seek(Number(e.target.value))}
          />
        </div>

        {steps.length === 0 && (
          <p className="mt-3 border-t border-white/10 pt-2.5 font-ui text-[12px] text-cream/70" role="status">
            Waiting for data — playback becomes available once the climate record loads.
          </p>
        )}
      </div>
    </section>
  )
}

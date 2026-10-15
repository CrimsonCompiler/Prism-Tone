/**
 * Playback controls — play / pause / resume / stop, volume, playback speed,
 * and the time-pulse layer toggle. All controls are labelled native inputs;
 * volume drives the real master gain of the Web Audio graph.
 */

import { usePreview } from '../state/PreviewContext'
import { keyToLabel } from '../lib/processing'

const RATES = [
  [0.5, '0.5×'],
  [1, '1×'],
  [2, '2×'],
]

export default function PlayerBar() {
  const { state, dispatch, actions, steps, variable } = usePreview()
  const { playState, position, volume, rate, layers } = state

  const playing = playState === 'playing'
  const paused = playState === 'paused'
  const idle = playState === 'idle'
  const step = steps[position]

  const playPauseLabel = playing ? `Pause — ${keyToLabel(step ? step.key : '')}` : paused ? 'Resume playback' : 'Play the selected time as sound'

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-stencil text-[11px] md:text-[12px] uppercase tracking-[0.28em] text-beige">
          04 · Listen
        </p>
        <span className="font-data text-[10px] uppercase tracking-[0.16em] text-parchment">
          {variable.name} · {variable.unit}
        </span>
      </div>

      <div className="mt-4 border border-ivory/10 bg-coal/40 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {/* transport */}
          <div className="flex items-center gap-2">
            {idle || paused ? (
              <button
                type="button"
                onClick={idle ? actions.play : actions.resume}
                aria-label={playPauseLabel}
                className="flex items-center gap-2.5 border border-ivory/40 bg-ivory/10 px-5 py-2.5 font-stencil text-[11px] uppercase tracking-[0.26em] text-ivory transition-colors duration-200 hover:bg-ivory hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory"
              >
                <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                  <path d="M0 0 L10 6 L0 12 Z" fill="currentColor" />
                </svg>
                {idle ? 'Play' : 'Resume'}
              </button>
            ) : (
              <button
                type="button"
                onClick={actions.pause}
                aria-label={playPauseLabel}
                className="flex items-center gap-2.5 border border-ivory/40 bg-ivory/10 px-5 py-2.5 font-stencil text-[11px] uppercase tracking-[0.26em] text-ivory transition-colors duration-200 hover:bg-ivory hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory"
              >
                <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                  <rect width="3.5" height="12" fill="currentColor" />
                  <rect x="6.5" width="3.5" height="12" fill="currentColor" />
                </svg>
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={actions.stop}
              disabled={idle}
              aria-label="Stop playback and return to the start"
              className="flex items-center gap-2 border border-ivory/25 px-4 py-2.5 font-stencil text-[11px] uppercase tracking-[0.26em] text-ivory/85 transition-colors duration-200 hover:bg-ivory/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                <rect width="10" height="12" fill="currentColor" />
              </svg>
              Stop
            </button>
          </div>

          {/* progress */}
          <div className="min-w-40 flex-1">
            <label htmlFor="pt-progress" className="sr-only">
              Playback progress
            </label>
            <input
              id="pt-progress"
              type="range"
              className="pt-range w-full"
              min={0}
              max={Math.max(steps.length - 1, 0)}
              value={Math.min(position, Math.max(steps.length - 1, 0))}
              disabled={idle || !steps.length}
              onChange={(e) => actions.seek(Number(e.target.value))}
            />
            <div className="mt-1 flex justify-between font-data text-[10px] uppercase tracking-[0.12em] text-parchment">
              <span>
                step {steps.length ? Math.min(position + 1, steps.length) : 0} / {steps.length}
              </span>
              <span>{step ? keyToLabel(step.key) : '—'}</span>
            </div>
          </div>

          {/* volume */}
          <div className="flex items-center gap-2.5">
            <label htmlFor="pt-volume" className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-parchment">
              Volume
            </label>
            <input
              id="pt-volume"
              type="range"
              className="pt-range w-24 md:w-28"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => dispatch({ type: 'SET_VOLUME', volume: Number(e.target.value) })}
            />
            <span className="w-9 font-data text-[10.5px] tracking-[0.08em] text-cream/85" aria-hidden="true">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* speed */}
          <div className="flex items-center gap-2">
            <span className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-parchment">Speed</span>
            <div className="flex gap-1" role="group" aria-label="Playback speed">
              {RATES.map(([r, label]) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={rate === r}
                  onClick={() => dispatch({ type: 'SET_RATE', rate: r })}
                  className={`border px-2.5 py-1 font-data text-[11px] tracking-[0.06em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ivory/70 ${
                    rate === r ? 'border-ivory/50 bg-ivory/10 text-ivory' : 'border-ivory/12 text-parchment hover:border-ivory/30 hover:text-cream'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* layers */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={layers.pulse}
              onChange={() => dispatch({ type: 'TOGGLE_LAYER', layer: 'pulse' })}
              className="h-3.5 w-3.5 accent-[#c19a5b]"
            />
            <span className="font-stencil text-[9.5px] uppercase tracking-[0.2em] text-parchment">
              time pulse layer
            </span>
          </label>
        </div>

        {steps.length === 0 && (
          <p className="mt-3 border-t border-ivory/8 pt-2.5 font-ui text-[12.5px] text-cream/70" role="status">
            Waiting for data — playback becomes available once the NASA POWER record loads.
          </p>
        )}
      </div>
    </div>
  )
}

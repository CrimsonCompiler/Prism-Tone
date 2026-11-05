/**
 * Session transcript content.
 *
 * Every caption the page has spoken this visit, in order, with the moment it
 * was generated. Rendered inside the graph panel’s Transcript tab; copy and
 * download produce a plain-text file of exactly what is listed — nothing is
 * reconstructed or invented.
 */

import { memo, useState } from 'react'
import { usePreview } from '../state/PreviewContext'
import { fmtValue, fmtDelta } from '../lib/format'
import { BASELINE } from '../data/datasets'

function clock(ms) {
  try {
    return new Date(ms).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

function lineFor(entry) {
  const decimals = Number.isFinite(entry.decimals) ? entry.decimals : 1
  const value = entry.value !== null && entry.value !== undefined
    ? ` · ${fmtValue(entry.value, decimals)} ${entry.unit || ''}`.trimEnd()
    : ''
  const delta = entry.delta !== null && entry.delta !== undefined
    ? ` · ${fmtDelta(entry.delta, decimals, entry.unit || '')} vs ${BASELINE.start}–${BASELINE.end}`
    : ''
  return `[${clock(entry.at)}] ${entry.variable}${entry.label ? ` — ${entry.label}` : ''}${value}${delta}\n${entry.text}\n`
}

function Transcript() {
  const { state, dispatch, actions } = usePreview()
  const entries = state.transcript || []
  const [copied, setCopied] = useState('')

  const plain = () => entries.map(lineFor).join('\n')

  const copy = async () => {
    const text = plain()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied('Copied')
      actions.announce('Transcript copied to the clipboard.')
    } catch {
      setCopied('Copy failed — use download')
      actions.announce('Clipboard access was blocked. Use the download button instead.')
    }
    window.setTimeout(() => setCopied(''), 4000)
  }

  const download = () => {
    const text = plain()
    if (!text) return
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prism-tone-captions-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      actions.announce('Transcript downloaded as a text file.')
    } catch {
      actions.announce('The download could not be created in this browser.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-[14px] text-cream">
          {entries.length === 0
            ? 'No captions yet this session'
            : `${entries.length} caption${entries.length === 1 ? '' : 's'} this session`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {copied && (
            <span className="font-ui text-[13px] text-cream">{copied}</span>
          )}
          <button
            type="button"
            onClick={copy}
            disabled={entries.length === 0}
            className="min-h-[36px] border border-ivory/25 px-3 py-1.5 font-ui text-[13px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-ivory/10 disabled:text-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
          >
            Copy text
          </button>
          <button
            type="button"
            onClick={download}
            disabled={entries.length === 0}
            className="min-h-[36px] border border-ivory/25 px-3 py-1.5 font-ui text-[13px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-ivory/10 disabled:text-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
          >
            Download .txt
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'CLEAR_TRANSCRIPT' })
                actions.announce('Transcript cleared.')
              }}
              className="min-h-[36px] border border-transparent px-2 py-1.5 font-ui text-[13px] text-cream transition-colors hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 border-t border-ivory/10 pt-4 font-ui text-[15px] leading-relaxed text-cream">
          Captions appear here as the record is explored — one entry per sounding month or selected period.
          Press play, move through the timeline, or change the selection to begin.
        </p>
      ) : (
        <ol className="mt-4 max-h-[28rem] overflow-y-auto border-t border-ivory/10" aria-label="Captions in chronological order">
          {entries.map((entry) => (
            <li key={entry.id} className="border-b border-ivory/10 py-3 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time dateTime={new Date(entry.at).toISOString()} className="font-data text-[13px] text-beige">
                  {clock(entry.at)}
                </time>
                <span className="font-ui text-[14px] font-semibold text-ivory">
                  {entry.variable}
                  {entry.label ? ` · ${entry.label}` : ''}
                </span>
                {entry.value !== null && entry.value !== undefined && (
                  <span className="font-data text-[14px] text-cream">
                    {fmtValue(entry.value, Number.isFinite(entry.decimals) ? entry.decimals : 1)} {entry.unit || ''}
                    {entry.delta !== null && entry.delta !== undefined
                      ? ` (${fmtDelta(entry.delta, Number.isFinite(entry.decimals) ? entry.decimals : 1, entry.unit || '')})`
                      : ''}
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-[75ch] font-ui text-[15px] leading-relaxed text-cream">{entry.text}</p>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 border-t border-ivory/10 pt-3 font-ui text-[13px] leading-relaxed text-cream">
        Generated from the loaded NASA POWER record during this visit only. Nothing is stored on a server and
        nothing is added after the fact.
      </p>
    </div>
  )
}

export default memo(Transcript)

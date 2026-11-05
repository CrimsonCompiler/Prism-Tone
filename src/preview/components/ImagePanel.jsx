/**
 * “Listen to an image” — a small, honest side door into the same score player.
 *
 * It sends one PNG/JPEG (or an https image URL) to /api/sonify/image, shows the
 * backend's own analysis and captions, and plays the returned MusicalScore
 * through the exact same ScorePlayer, master chain and analyser as the data
 * view. It never invents a mapping and never touches the loaded NASA series.
 *
 * While an image score sounds, the data transport is refused with a visible
 * reason (enforced in PreviewContext.actions). Status changes go through the
 * one existing live region; this panel adds no second one.
 */

import { useEffect, useRef, useState } from 'react'
import { usePreview } from '../state/PreviewContext'
import { fetchImageScore } from '../api/sonify'
import { engine } from '../lib/sonify'
import Panel from './Panel'

const SCAN_MODES = [
  { id: 'columns', label: 'Columns', hint: 'left → right' },
  { id: 'radial', label: 'Radial', hint: 'centre → edge' },
  { id: 'regions', label: 'Regions', hint: 'grid tiles' },
]

const fmt = (value, digits = 3) => (
  Number.isFinite(value) ? Number(value).toFixed(digits) : '—'
)

export default function ImagePanel() {
  const { state, dispatch, actions } = usePreview()
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [scan, setScan] = useState('columns')
  const [status, setStatus] = useState('idle') // idle | loading | ready | playing | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [currentCaption, setCurrentCaption] = useState('')
  const abortRef = useRef(null)
  const [previewSrc, setPreviewSrc] = useState('')

  /* Preview: an object URL for a local file, the given URL otherwise. */
  const previewUrl = file ? previewSrc : /^https:\/\//i.test(url.trim()) ? url.trim() : ''

  useEffect(() => {
    if (!file) {
      setPreviewSrc('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewSrc(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    if (!state.imagePlaying && status === 'playing') setStatus('ready')
  }, [state.imagePlaying, status])

  useEffect(() => () => {
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const playing = state.imagePlaying
  const canListen = Boolean(file || /^https:\/\//i.test(url.trim())) && status !== 'loading'

  async function handleListen() {
    if (playing) {
      engine.stopImage()
      dispatch({ type: 'IMAGE_PLAYBACK', active: false })
      setStatus('ready')
      actions.announce('Image score stopped. Data playback is available again.')
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError('')
    setCurrentCaption('')

    const response = await fetchImageScore({
      file: file || undefined,
      imageUrl: file ? undefined : url.trim(),
      options: { scan },
      signal: controller.signal,
    })
    if (controller.signal.aborted) return
    if (!response.ok) {
      setStatus('error')
      setError(response.message || 'The image could not be scored.')
      return
    }

    setResult(response)
    setStatus('playing')
    dispatch({ type: 'IMAGE_PLAYBACK', active: true })
    actions.announce('Image score started. Data playback is paused until it stops.')

    const ok = await engine.playImage(
      { score: response.score },
      {
        oncaption: (text) => {
          setCurrentCaption(text)
          dispatch({ type: 'CAPTION', caption: { text, cls: 'interpretation' } })
        },
        onend: () => {
          setStatus('ready')
          dispatch({ type: 'IMAGE_PLAYBACK', active: false })
          actions.announce('Image score finished. The loaded data view is unchanged.')
          /* END is dispatched by the shared engine callback after this one;
             restate the image outcome so the bar does not claim a data walk. */
          setTimeout(() => {
            dispatch({
              type: 'CAPTION',
              caption: {
                text: 'Image score finished. The loaded data view and its timeline are unchanged.',
                cls: 'interpretation',
              },
            })
          }, 0)
        },
      },
    )

    if (!ok && !controller.signal.aborted) {
      setStatus('error')
      setError('The image score could not start in this browser.')
      dispatch({ type: 'IMAGE_PLAYBACK', active: false })
    }
  }

  const analysis = result && result.analysis
  const captions = (result && result.score && result.score.captions) || []

  return (
    <Panel
      title="Listen to an image"
      meta="same score engine · same analyser"
      className="scroll-mt-24"
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <p className="max-w-[70ch] font-ui text-[14px] leading-relaxed text-cream">
            Score a picture with the project backend and hear it through the same voices
            as the data view. Colour drives the approximation;
            <span className="text-ivory"> brightness is used when no colour legend is supplied.</span>
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="image-file" className="font-ui text-[13px] text-beige">
                PNG or JPEG · up to 10 MB
              </label>
              <input
                id="image-file"
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => {
                  const next = event.target.files && event.target.files[0]
                  setFile(next || null)
                  setError('')
                }}
                className="mt-1 block w-full border border-ivory/20 bg-coal/40 px-2 py-2 font-ui text-[13px] text-ivory file:mr-3 file:border-0 file:bg-ivory/10 file:px-2 file:py-1 file:font-ui file:text-[13px] file:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
              />
            </div>
            <div>
              <label htmlFor="image-url" className="font-ui text-[13px] text-beige">
                …or an https image URL
              </label>
              <input
                id="image-url"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  if (event.target.value) setFile(null)
                  setError('')
                }}
                className="mt-1 block w-full border border-ivory/20 bg-coal/40 px-2 py-2 font-ui text-[13px] text-ivory placeholder:text-beige/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
              />
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="font-ui text-[13px] text-beige">Scan</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SCAN_MODES.map((mode) => (
                <label
                  key={mode.id}
                  className={`inline-flex cursor-pointer items-center gap-2 border px-2.5 py-1.5 font-ui text-[13px] transition-colors ${
                    scan === mode.id
                      ? 'border-ember bg-ember/15 text-ivory'
                      : 'border-ivory/20 text-cream hover:border-ivory/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="image-scan"
                    value={mode.id}
                    checked={scan === mode.id}
                    onChange={() => setScan(mode.id)}
                    className="h-3 w-3 accent-[#d98c5f]"
                  />
                  <span>{mode.label}</span>
                  <span className="text-beige">{mode.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleListen}
              disabled={!playing && !canListen}
              className="min-h-[44px] border border-ivory/30 bg-ivory/10 px-4 font-ui text-[14px] text-ivory transition-colors hover:border-ivory/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
            >
              {playing ? 'Stop image score' : status === 'loading' ? 'Scoring…' : 'Listen'}
            </button>
            {result && !playing && status !== 'loading' && (
              <span className="font-ui text-[13px] text-cream">
                Score loaded — press Listen to hear it again.
              </span>
            )}
          </div>

          {playing && (
            <p className="mt-3 border border-ember/40 bg-ember/10 px-2.5 py-1.5 font-ui text-[13px] text-cream">
              Data playback is paused while this image score sounds. Stop it to return to the
              timeline.
            </p>
          )}

          {error && (
            <p className="mt-3 border border-ember/50 bg-ember/10 px-2.5 py-1.5 font-ui text-[13px] text-cream">
              {error}
            </p>
          )}

          {currentCaption && (
            <p className="mt-3 max-w-[65ch] font-ui text-[15px] leading-relaxed text-ivory">
              {currentCaption}
            </p>
          )}
        </div>

        {/* Preview + the backend's own analysis */}
        <div className="min-w-0 border-t border-ivory/10 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview of the image being scored"
              className="max-h-[170px] w-full border border-ivory/15 object-contain"
            />
          ) : (
            <div className="flex h-[120px] items-center justify-center border border-ivory/10 font-ui text-[13px] text-beige">
              No image selected
            </div>
          )}

          {analysis ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-ui text-[13px] text-cream">
              <div className="col-span-2 flex justify-between gap-2 border-b border-ivory/10 pb-1">
                <dt className="text-beige">Source</dt>
                <dd className="text-ivory">
                  {analysis.width} × {analysis.height} · {analysis.scan}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-beige">Mean hue</dt>
                <dd>{fmt(analysis.mean_hue_deg, 1)}°</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-beige">Saturation</dt>
                <dd>{fmt(analysis.mean_saturation)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-beige">Value</dt>
                <dd>{fmt(analysis.mean_value)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-beige">Edge</dt>
                <dd>{fmt(analysis.mean_edge)}</dd>
              </div>
              <div className="col-span-2 mt-1 text-[12px] leading-snug text-beige">
                {analysis.color_source === 'legend'
                  ? 'Colour legend supplied by the image; hue drives the mapping.'
                  : 'Brightness-based approximation unless a colour legend is supplied.'}
              </div>
            </dl>
          ) : (
            <p className="mt-3 font-ui text-[13px] leading-snug text-beige">
              The returned summary appears here: mean hue, saturation, value and edge.
            </p>
          )}
        </div>
      </div>

      {captions.length > 0 && (
        <div className="mt-4 border-t border-ivory/10 pt-3">
          <p className="font-ui text-[13px] text-beige">Score captions</p>
          <ol className="mt-1 max-h-[150px] space-y-1 overflow-y-auto pr-1">
            {captions.map((caption, index) => (
              <li key={`${caption.t_beats}-${index}`} className="font-ui text-[13px] leading-snug text-cream">
                <span className="font-data text-[12px] text-beige">
                  {Number(caption.t_beats).toFixed(0)}b
                </span>{' '}
                {caption.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Panel>
  )
}
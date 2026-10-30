# Prism Tone — Preview page notes

Scope: only `preview.html` / `src/preview/**` was redesigned. The map screen
(`SubcontinentMap.jsx`), `CountrySearchBar.jsx`, `MapControls.jsx`,
`ContinentModal` and the hero header were left untouched (`git diff` is empty
for those files). `VariableSelector.jsx` is owned by this page: at the user's
explicit request its old single-variable flyout was replaced by the track-list
“Data tracks” panel, in the same right-hand slot. The context API was extended
with layered selection, not broken: every original action still behaves as
before.

## Data → sound mapping

One month = two beats; two months make a 4/4 bar. The mapping lives in
`src/preview/lib/music.js` and is shared by the engine (`lib/sonify.js`), the
caption bar, the graph and the “How it becomes sound” diagram, so the screen
and the audio cannot drift.

The musical language follows the **qoder V2** pattern: a fixed root per
variable, track-led scales, a three-note chord held under the lead, a phrase
buffer sampled from the surrounding months, and a data-led tempo. Normalisation
is linear across the observed range of the loaded record for the current scope;
the normalised value is quantised onto two octaves of the variable's scale.

| Variable | Root / lead root | Scale | Anomaly rule | Rack |
| --- | --- | --- | --- | --- |
| Temperature (T2M) | D3 / D4 | D Dorian | ≥ +0.9 °C above normal → minor; ≤ −0.6 °C below → major | sine pad, FM arpeggio, bass, air texture |
| Rainfall (PRECTOTCORR) | G3 / G4 | G major pentatonic | fixed scale; the rate sets marimba density | marimba plucks, bass, shaker, rain wash |
| Wind (WS10M) | D2 / D3 | D minor pentatonic | fixed scale; the speed weighs the drone | drone pair, sine ripple, wind wash |

Scale intervals are qoder V2's exact sets (major, minor, Dorian, Phrygian,
major and minor pentatonic). Every scale is built from the root over two
octaves; pitch is the quantised value, so the coldest month of the loaded
record sounds the lowest note and the warmest the highest.

- **Bar and tempo** — two months make one bar. The pad holds its chord (scale
  degrees 1, 3 and 5) until the mode changes and glides to the new voicing,
  while the bass restates the root on every bar line. Holding a fixed
  three-voice pad avoids re-allocating voices during long runs. Tempo starts
  from the rack's base (66 / 76 / 58 bpm) and moves with the normalised value
  and the rhythmic density, bounded to 52–96 bpm. One month is always two
  beats, so the timeline stays legible.
- **Temperature** — lead pitch, scale, filter brightness and air texture all
  follow the value and its 1991–2020 anomaly; the FM arpeggio adds a neighbour
  note from the phrase buffer on some beats.
- **Rainfall** — the rate sets 1–5 marimba plucks across the month plus the
  brightness and loudness of the rain wash. A bar-line bass root and a shaker
  hold the figure together. No tempo change beyond the shared tempo formula.
- **Wind** — the speed sets the weight and cutoff of a two-oscillator drone,
  the register of a sine ripple and the brightness of the wind wash; faster
  wind also raises the tempo, so the months move more briskly.

Missing values never invent a note: the month is a rest for that layer while
the others keep their figure, and the caption says the value is unavailable.
There is no metronomic tick and no thud on gaps: events are sparse and
probability-driven, as in qoder V2. The audible layers are the rack's
pad/drone/bass, its lead voice (FM arpeggio, marimba figure or ripple), its
texture, and the shared chord bed.

## Layered mix (2–3 datasets)

The right-hand “Data tracks” panel lists every live dataset with its accent
colour, short title, unit and a legend. Up to three can be selected at once:

- Each selected dataset owns a full `VoiceRack` in `lib/sonify.js` (its own
  gain, panner, filter and voices), and every rack feeds one shared bus →
  Freeverb → compressor → limiter → master gain. The lead dataset sets tempo,
  the captions, the map and the graphs; the other racks are mixed under it.
- Gains rebalance by layer count (1 layer 1.0, 2 layers 0.72, 3 layers 0.58,
  with the lead slightly forward). Adding or removing a layer while playing
  rebalances live without restarting; changing the lead, scope or time does
  restart, because the analysis changes.
- A new lead is chosen with “Make lead” (or by activating a track that is not
  yet in the mix). Planned variables (fire, water, vegetation) stay in a
  separate section and only reveal why they are unavailable — they can never
  join the mix, and nothing is simulated.

Audio graph: voices → rack gain → panner → lowpass → bus → Freeverb →
compressor (−20 / 3.5) → limiter (−2 dB) → volume gain → destination, with a
native `AnalyserNode` tapped after the master volume stage and 0.52 headroom.
Tone.js is imported dynamically on the first Play gesture, so it is a separate
chunk that is not loaded until needed. Rate 0.5× / 1× / 2× only changes event
timing.

## Captions, transcript and live announcements

- The “Now sounding” bar states the value, its comparison with the same
  calendar month of the 1991–2020 normal, what the sound is doing, and the
  context (national vs derived planetary mean). It is rendered from
  `planForStep` and `describeSound`, never from fabricated text.
- Captions ignore volume: at 0% the text stays, with a muted notice.
  Captions can be switched off in Display & access; the setting is on by
  default.
- One polite live region at the page root announces at most once per step
  (on playback step changes and explicit keyboard time changes), never while
  dragging the timeline. The caption bar itself updates without announcing.
- Transcript entries are timestamped, copyable and downloadable as `.txt`;
  entries store the variable’s decimals so units are never mis-formatted.

## Accessibility

- Caption size S/M/L/XL (20/23/26/28 px) applies to the caption bar; body copy
  is at least 15 px and no editable text is below 12 px. The locked map chrome
  and hero keep their original 9.5–11.5 px labels — a documented exception for
  files that could not be changed.
- Display & access drawer: captions on/off, caption size with live sample,
  high-contrast theme, reduced motion, hover sonification, haptics, “Describe
  this view” (writes a plain-language description to the live region) and the
  keyboard list. Focus is trapped, Escape closes, body scroll is locked and
  focus returns to the trigger.
- High contrast raises muted text to ivory and strengthens borders without
  changing layout; reduced motion disables transitions/animations and slows
  the waveform to 15 fps.
- The Series view has an annual-means data table fallback and a labelled
  inspection slider. Charts carry text alternatives; the waveform is
  `aria-hidden` decoration and pauses when offscreen or when the tab is
  hidden.
- Keyboard: `Space` play/pause/resume · `←`/`→` step time · `↑`/`↓` volume
  ±10% · `C` captions · `T` transcript · `?` guide · `Esc` close
  guide/drawer/transcript. Shortcuts are ignored while typing in the search
  field or a select.

## Data honesty

- Annual values are derived as the mean of ≥10 valid months when the API does
  not return a `YYYY13` slot; the graph and table say “annual means”.
- National values are a derived mean of seven continental samples and are
  labelled “derived”.
- Coverage is shown for the current window; the baseline row only appears
  when ≥75% of the baseline months exist.
- Hotspots were not integrated: the file covers only 12 months of 2025 and has
  no continent attribution, so any map layer would have been misleading.

## Backend

The `backend/` service was rebuilt by merging the two companion projects
(`qoder V2` and `gravity V2`) into the existing FastAPI app, keeping the NDVI
route intact. `qoder V2` was used as the base: it validates every value, turns
fill values into `null` instead of `0`, caches with TTL + LRU and persists the
cache on disk; `gravity V2` was rejected as a base because it zero-fills missing
values and reduces anomalies over a whole series rather than per calendar month.

Layout:

```
backend/
  main.py                 CORS, GZip, routers, / service info
  api/
    preview_routes.py     /api/preview/series, /api/power/series
    earth_routes.py       /api/health, /layers, /series, /hotspots, /describe, /cache/clear
    ndvi_routes.py        existing POST /api/data (Bangladesh divisions)
  services/
    preview_power.py      validated POWER reader + persistent cache
    divisions.py          seven continental centroids (mirrors src/preview/data/world.js)
    cache.py, datasets.py, live.py, ndvi_service.py
  data/cache/             manifest/grids/hotspots/power_grid + power/div-*.json
  scripts/warm_power_cache.py
  tests/test_api.py       11 tests
```

`/api/preview/series` returns all seven 1981–2025 series (T2M, PRECTOTCORR,
WS10M) in one response; the browser therefore makes one request instead of
seven. Each file under `data/cache/power/` is ~26 KB and is refreshed after 24 h;
when NASA POWER cannot be reached, a stale copy is served with `stale: true`
rather than failing. Missing months are `null`, never 0, and a parameter with
fewer than 12 valid months is rejected. The annual `YYYY13` slot is dropped on
both server and client because the app works in months.

Frontend integration (`src/preview/api/power.js`):

1. One request to `${VITE_PREVIEW_API || '/api'}/preview/series` (Vite proxies
   `/api` to `127.0.0.1:8000` in `dev` and `preview`). Successful division
   series are written to `sessionStorage`, exactly like the direct path.
2. Divisions the backend did not supply are read from the session cache.
3. Anything still missing is fetched directly from NASA POWER (staggered, one
   retry), so the static GitHub Pages build keeps working with no backend.

The page paints from the bundled baseline immediately. After ~1.2 s it asks the
project API for a complete seven-division refresh and swaps it in only while the
transport is idle; if playback is running the payload waits until it stops, so
audio never changes under the listener. A session stamp (`pt-power-backend-at`)
suppresses repeat requests for ten minutes. `SourceBar` names the path that
actually supplied the data: “bundled baseline”, “via project API”, “direct from
NASA POWER”, “via project API + direct NASA POWER”, or “from this session’s
cache”.

Fire, water storage and vegetation remain unavailable in the UI. The backend
exposes cached GIBS hotspots and the optional FIRMS proxy, but the hot spot file
still covers only 12 months of 2025 with no continent attribution, so no new
layer was drawn. Nothing on the page is simulated.



## Layout decision

The caption bar is docked to the bottom edge of the map section in normal
flow. It is intentionally **not** viewport-sticky: the locked Timeline /
transport dock sits at the bottom of the map screen (`z-20`), and a sticky
caption would cover those controls. On small screens the bar follows the map
immediately (before the variable/session tools); on `lg+` it spans the full
section width below both columns.

## Verification

- `npm run build` passes (Vite 6, ~12 s). Tone.js is still emitted as a separate
  ~340 KB lazy chunk fetched on the first Play gesture; the remaining >500 KB
  chunks (MapLibre, preview shell) predate this work.
- Mapping checks through Vite `ssrLoadModule`: a −1.2 °C January produces
  D major (D3–F#3–A3), a normal month D Dorian (D3–F3–A3) and a warm anomaly
  D minor; rainfall stays G major pentatonic, wind D minor pentatonic; every
  tempo lands inside 54–112 bpm. Note names use ASCII accidentals (`F#3`)
  because Tone's note parser only accepts `#`/`b`; the string shown in the UI is
  the string handed to the engine.
- `python -m pytest -q` in `backend/`: **11 passed**. The suite covers health,
  layers/dates, normalized series, fire-index scale, cached hotspots, describe
  text, 404/422 handling, all seven preview divisions, and the NDVI route.
- `GET /api/preview/series` answered 7/7 divisions from the warmed disk cache in
  ~30 ms (164 KB, 540 months each). A value-by-value comparison of the backend
  response against the bundled baseline found **0 differences in 11,340
  values**, so the swap cannot alter a reading.
- With the backend stopped, the preview reloaded cleanly on the bundled
  baseline (“bundled baseline” in the source bar) with no error banner and no
  JavaScript exceptions. With it running, the source bar reported
  “via project API”, API v2.10.0, and seven session caches were written.
- The production build (`npm run preview`, which also proxies `/api`) loaded the
  same seven-division backend response with no console messages, so the wiring
  is not limited to the dev server.
- `git diff` is empty for all locked files; the only `Modals.jsx` change is the
  guide content (ContinentModal body untouched).
- Rendered-page scan: every text node below 12 px is inside locked map/hero
  chrome; the caption defaults to 23 px.
- Runtime snapshot: no console errors; captions, summary, graph and diagram
  agree. A full 2010 temperature run, a 2010 rainfall run and a 2010 wind run
  each produced **no Tone.js warnings**: the pad is three fixed voices that
  glide between chords, the marimba pool is 24 and returned every voice after
  the run. The wind drone held 73.4 Hz + 110.1 Hz and its gain followed speed.
- Dec 2010 reads the same everywhere: the diagram, Notes panel and caption say
  D major, E4 over D3–F#3–A3, 73 bpm. After playback ends the Notes panel
  derives the selected month's plan (with its real normal and previous-month
  change) instead of falling back to a rest.
- Limitations: the in-app test browser reports a 0×0 viewport, so full-page
  screenshots, Lighthouse and pixel-level sticky/overlap checks could not be
  captured there. Layout behaviour was verified from the DOM/class structure
  and CSS. Cached backend copies are only as fresh as their last warm (24 h
  TTL); the UI reports the timestamp it actually received.

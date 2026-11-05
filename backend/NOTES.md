# PRISM TONE sonification backend — formulas, limits and examples

This document describes the two-stage sonification service added to the existing
FastAPI backend. It is written for whoever maintains the mapping or builds the
browser player, so it records the exact arithmetic, the deliberate deviations
from the original brief, and the places where the service refuses to guess.

The backend returns **JSON scores only**. It never renders, mixes or masters
audio. Tone.js in the browser owns synthesis and playback.

```
NASA POWER monthly series ──► DataSonifier ──┐
                                             ├──► RawSoundScore ──► Simplifier ──► MusicalScore ──► Tone.js
image / sampled video frame ─► ImageSonifier ┘
```

Everything is deterministic: no random numbers, seeds or sampling are used.
Given the same bytes, series and options, the same score comes back byte for
byte (the tests assert this).

---

## 1. Running and testing

From the repository root:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

```bash
cd backend
python -m pytest -q          # 42 passed, 1 third-party deprecation warning
python tests/make_golden.py  # regenerate the two golden snapshots
```

The existing routes (`/api/health`, `/api/layers`, `/api/series`,
`/api/hotspots`, `/api/describe`, `/api/preview/series`, `/api/data`) are
unchanged. `tests/test_api.py` and the final regression test in
`tests/test_sonify_api.py` keep them covered.

Dependencies added for this feature: `pillow`, `opencv-python-headless`,
`python-multipart` (`fastapi`, `pydantic`, `numpy`, `pandas`, `httpx`, `pytest`
were already present). `scipy` and `scikit-image` are not used.

---

## 2. Endpoints

| Method | Path | Input | Result |
|---|---|---|---|
| `POST` | `/api/sonify/data` | JSON: inline `series`, `csv_id`, or `location` | data score |
| `POST` | `/api/sonify/data/csv` | multipart CSV (`file`, optional `variables`, `options`) | data score + `csv_id` |
| `POST` | `/api/sonify/image` | multipart `file`, or JSON `{image_url, options}` | image score + `analysis` |
| `POST` | `/api/sonify/video` | multipart `file`, or JSON `{video_url, options}` | video-derived score + `analysis` |
| `GET` | `/api/sonify/schema` | – | exported JSON Schemas |
| `GET` | `/api/sonify/health` | – | capabilities, limits, cache status |

Every successful response has this envelope:

```json
{
  "version": "1.0",
  "source": { "kind": "data", "id": "...", "meta": {} },
  "musical_score": { "...": "..." },
  "cache": { "hit": false, "key": "sha256..." }
}
```

With `?debug=1` (or `"debug": true` in the JSON body) the intermediate
`raw_score` is added. Image and video responses also carry an `analysis`
object (the image summary, or the frame-sampling metadata). CSV responses carry
the `csv_id`.

The stored cache entry always contains both scores; the `debug` flag only
controls what is returned. A cache hit is a validated `MusicalScore` from disk,
so it cannot silently drift from the schema.

Errors are JSON objects in `detail`:

```json
{ "error": "invalid_series", "detail": "...", "hint": "..." }
```

Status codes used: `413` (file too large), `415` (wrong content type), `422`
(bad request, bad data, bad image, refused URL), `503` (upstream POWER down or
compute timeout), `504` (remote download timeout).

### Request examples

Inline series (a three-month excerpt; the committed sample uses twelve):

```bash
curl -X POST http://localhost:8000/api/sonify/data \
  -H 'content-type: application/json' \
  -d '{
    "series": {"T2M": {"201601": 18.0, "201602": 19.5, "201603": 23.0}},
    "variables": ["T2M"],
    "options": {"key": "D", "scale": "D dorian", "tempo": 60}
  }'
```

NASA POWER by division or coordinate:

```bash
curl -X POST http://localhost:8000/api/sonify/data \
  -H 'content-type: application/json' \
  -d '{
    "location": "asia",
    "variables": ["T2M", "PRECTOTCORR"],
    "start": 1981,
    "end": 2025,
    "options": {"smooth": 0.35}
  }'

curl -X POST http://localhost:8000/api/sonify/data \
  -H 'content-type: application/json' \
  -d '{"location": "37.39,-5.99", "variables": ["T2M"]}'
```

CSV upload and reuse:

```bash
curl -X POST http://localhost:8000/api/sonify/data/csv \
  -F 'file=@monthly.csv' \
  -F 'variables=T2M,PRECTOTCORR' \
  -F 'options={"key":"D","tempo":64}'

curl -X POST http://localhost:8000/api/sonify/data \
  -H 'content-type: application/json' \
  -d '{"csv_id":"<id from the upload>","variables":["T2M"]}'
```

Image by upload or NASA URL:

```bash
curl -X POST http://localhost:8000/api/sonify/image \
  -F 'file=@frame.png' \
  -F 'options={"scan":"columns","key":"D","scale":"D dorian","tempo":64}'

curl -X POST http://localhost:8000/api/sonify/image \
  -H 'content-type: application/json' \
  -d '{
    "image_url": "https://eoimages.gsfc.nasa.gov/images/imagerecords/.../frame.jpg",
    "options": {"scan": "radial"}
  }'
```

Video (optional; 12 frames maximum):

```bash
curl -X POST http://localhost:8000/api/sonify/video \
  -F 'file=@clip.mp4' \
  -F 'options={"frames":8,"scan":"columns"}'
```

Options fields: `key` (default `D`), `scale` (scale name or `"D dorian"`),
`tempo` (52–96, otherwise inferred), `density` (0.25–2), `smooth` (0.05–0.95,
EMA alpha), `monophonic` (accepted for contract compatibility), `time_sig`
(default `[4,4]`). Image adds `scan` (`columns`|`radial`|`regions`), `grid`
(2–12 for `regions`), `legend` (up to 12 `#rrggbb` stops) and `rotate`, which
is reserved and must be `0`.

---

## 3. Score schemas

Both models use `extra="forbid"`, so unknown fields are rejected rather than
silently ignored. The complete schemas are served by `GET /api/sonify/schema`.

### RawSoundScore (stage 1)

```json
{
  "version": "1.0",
  "source": { "kind": "data" | "image", "id": "...", "meta": {} },
  "duration_s": 24.0,
  "events": [
    {
      "t": 0.0, "dur": 1.8, "freq_hz": 130.813,
      "amp": 0.42, "pan": 0.0, "brightness": 0.5, "voice": "T2M"
    }
  ]
}
```

Constraints: `t >= 0`, `0 < dur <= 30`, `16 <= freq_hz <= 20000`,
`amp` and `brightness` in `[0,1]`, `pan` in `[-1,1]`, non-empty `voice`.
`amp` is **pre-mastering headroom**, not dBFS; the player should treat it as a
relative gain and apply its own limiter.

Video uses `source.kind = "image"` because the schema has only `data` and
`image`; the video nature is recorded in `source.meta.media = "video"` and the
sampling metadata.

### MusicalScore (stage 2)

```json
{
  "version": "1.0",
  "key": "D",
  "scale": "Dorian",
  "tempo_bpm": 60,
  "time_sig": [4, 4],
  "tracks": [
    {
      "id": "lead:T2M",
      "role": "pad" | "lead" | "bass" | "texture" | "perc",
      "notes": [
        { "t_beats": 0.0, "dur_beats": 1.6, "midi": 58, "vel": 0.41, "pan": 0.0 }
      ],
      "params": {
        "cutoff_hz": 1763.1,
        "reverb_send": 0.18,
        "detune_cents": 0.0,
        "density": 0.402
      }
    }
  ],
  "captions": [{ "t_beats": 0.0, "text": "Jan 2016 — ..." }],
  "provenance": { "stats": {}, "mapping": {}, "missing_policy": "..." }
}
```

`tempo_bpm` is always 52–96, `time_sig` is two positive integers, notes carry
MIDI 0–127 and velocities 0–1. The simplifier produces velocities in
**0.25–0.8** and keeps lead, bass and perc tracks monophonic (a new note never
starts before the previous one ends). Pad tracks are intentionally polyphonic.

---

## 4. Data mapping

### 4.1 Cleaning

`_clean_series` accepts only `YYYYMM` keys, drops `YYYY13`, ignores malformed
keys, and converts `NaN`, infinities and the NASA POWER fill flag `-999` to
`null`. A series with no valid keys is an error; more than 2,400 months is an
error. Nothing is imputed.

Index alignment is preserved by enumerating every month from `start` to `end`
and looking each key up. A month absent from the input becomes `null`, then a
rest in the score. A missing month never borrows a neighbour's value.

### 4.2 Observed range

For the requested range:

```
lo, hi = percentile(values, 1), percentile(values, 99)
n = clip((smoothed - lo) / (hi - lo), 0, 1)
```

If the percentiles are non-finite or equal, the range falls back to
`min/max` and records `"method": "min/max (degenerate percentiles)"`. If the
series is constant, it becomes `lo - 0.5` / `hi + 0.5` and records
`"unit fallback (constant series)"`. The actual `lo`, `hi` and method are in
`provenance.stats.range_by_variable`.

The 1st/99th percentile deliberately ignores a single wildfire spike or a bad
sensor reading that would otherwise flatten the whole melody.

### 4.3 Monthly normal, sigma and anomaly

For each calendar month, the preferred normal is the mean of that month over
**1991–2020**. A baseline month is accepted only when at least 75 % of the 30
expected values are present (at least 23 of 30 values). Otherwise:

1. if the whole record has at least five values for that calendar month, use
   their mean and standard deviation and label the source
   `"all-years fallback (baseline coverage below 75%)"`;
2. otherwise use the record-wide mean and sigma and label it
   `"record fallback (too few samples for this calendar month)"`.

Sigma is floored to avoid dividing by a near-zero seasonal spread:

| variable | floor |
|---|---:|
| `T2M` | 0.4 °C |
| `PRECTOTCORR` | 0.2 mm/day |
| `WS10M` | 0.3 m/s |
| anything else | 0.25 |

```
z = (value - normal_month) / sigma_month
```

`normal_source`, `baseline_coverage` and per-month sources are stored. Captions
say "labelled record normal" or "<month> record normal" whenever a fallback was
used; they never claim a 1991–2020 normal that the data does not support.

### 4.4 Smoothing (EMA)

```
s_0 = x_0
s_i = alpha * x_i + (1 - alpha) * s_{i-1}
```

`alpha` is `options.smooth` (default 0.35). A missing value produces `null` and
leaves the carried state unchanged, so the next valid value still smooths from
the last real observation. Pitch is mapped from `s_i`, while anomaly and
captions use the raw `x_i`; smoothing removes jitter without hiding a real
anomaly.

### 4.5 Change and tempo

For consecutive valid observations:

```
change_i = |x_i - x_{i-1}| / (hi - lo)
```

The lead variable is the first one requested. Its mean normalised position `p`
and mean change `c` set the tempo:

```
rhythm = clip(0.18 + 0.82*p + 0.22*c, 0, 1)
tempo  = clamp(round(base_bpm + 6*p + 14*rhythm), 52, 96)
```

| variable | `base_bpm` |
|---|---:|
| `T2M` | 66 |
| `PRECTOTCORR` | 76 |
| `WS10M` | 58 |
| other | 72 |

An explicit `options.tempo` wins; otherwise the tempo is inferred and written
to `source.meta.tempo_bpm`, `musical_score.tempo_bpm` and provenance.

### 4.6 Raw event mapping

One month is **2 beats** (`MONTH_BEATS = 2`), so with a 60 BPM tempo one month
is 2 seconds and a 4/4 bar holds two months.

| property | formula |
|---|---|
| time | `t = month_index * 2 * 60 / tempo` |
| duration | `0.9 * month_seconds` |
| pitch | `midi = 48 + 24*n` |
| frequency | `freq = 440 * 2^((midi - 69)/12)` |
| amplitude | `amp = 0.16 + 0.55 * n^1.6`, capped at 0.78 |
| pan | `clip(lon/180 * 0.8, -0.8, 0.8)` when a longitude is known, otherwise spread `-0.6 … 0.6` across variables |
| voice | the variable id (`T2M`, `PRECTOTCORR`, `WS10M`) |

Brightness uses the anomaly or rate, depending on the variable:

| variable | brightness |
|---|---|
| `T2M` | `0.5 + 0.2 * tanh(z/2)` |
| `PRECTOTCORR` | `0.3 + 0.55*n` |
| `WS10M` | `0.35 + 0.45*n` |
| other | `0.4 + 0.4*n` |

All values are clamped to `[0,1]`. No randomness is used.

### 4.7 Per-variable musical character

These constants mirror `src/preview/lib/music.js` so the backend score sounds
like the live preview:

| variable | root | default scale | treatment |
|---|---:|---|---|
| `T2M` | D3 (MIDI 50), lead root 62 | Dorian / minor / major | pad + one note per month, neighbour arpeggios on change |
| `PRECTOTCORR` | G3 (MIDI 55), lead root 67 | major pentatonic | 1–5 marimba notes per month, percussion |
| `WS10M` | D2 (MIDI 38), lead root 50 | minor pentatonic | one long ripple note per month, filter/texture |

A `MusicalScore` has **one** `key` and `scale` field. The lead variable sets
them. Each variable still keeps its own default scale internally; the actual
scale used for every variable is recorded in
`provenance.stats.scale_by_variable`. An explicit `options.scale` applies to
all variables and overrides those defaults.

Because the schema has one scale, the anomaly mode is chosen **once** from the
lead variable's mean `z` rather than modulated month by month. For `T2M`:

```
mean z > 2   → Phrygian
mean z > 1   → minor
mean z < -1  → major
otherwise    → Dorian
```

Rain and wind keep their pentatonic defaults unless a scale is requested. The
computed detune reflects the same choice: mean `z > 1` gives `-7` cents,
mean `z < -1` gives `+7` cents, otherwise `0`.

---

## 5. Data simplifier

The simplifier is where the musical constraints live. It never invents a
month, a note or a caption.

### 5.1 Pitch

1. Take the median of `n` over a three-month window (the month and its
   neighbours, skipping missing values). This is the median filter.
2. `target = lead_root + 24 * median_n`.
3. Quantise to the nearest MIDI note whose pitch class belongs to the scale;
   exact ties resolve downwards. Clamp to `[lead_root, lead_root + 24]`.
4. **Hysteresis:** if the quantised note is within one semitone of the previous
   note, keep the previous note. This prevents one-semitone flutter.
5. **Leap cap:** fold by octaves until the leap is at most 12 semitones.
6. **Dissonance guard:** if the lead note is a minor second from any pitch class
   in the pad chord sounding at that beat, move it up the scale, at most three
   attempts.

### 5.2 Rhythm

All times are in beats.

| variable | figure |
|---|---|
| `T2M` | one note on the month grid (every 2 beats), duration 1.6 beats; add a neighbour at +0.5 beat when `change >= 0.1`; if `density > 1`, add a second neighbour at +1.0 beat |
| `WS10M` | one note every 2 beats, duration 1.4 beats, plus the same +0.5 neighbour rule |
| `PRECTOTCORR` | `count = clamp(round((1 + 4*n) * density), 1, 5)` notes per month |

Rain onsets within the two-beat month:

| count | onsets (beats) |
|---:|---|
| 1 | 0 |
| 2 | 0, 1.0 |
| 3 | 0, 0.75, 1.5 |
| 4 | 0, 0.5, 1.0, 1.5 |
| 5 | 0, 0.5, 1.0, 1.25, 1.75 |

The fifth onset is a sixteenth-note offset; the rest sit on eighth-note
boundaries. Duration is 0.55 beat for fewer than five notes, 0.45 beat for
five. Each subsequent note is lifted by a small contour
`[0, 0.11, 0.05, 0.17, 0.09]` so a heavy month shimmers instead of repeating
one pitch.

Generic images use a 0.5-beat (eighth-note) grid. There is no arbitrary
sixteenth-note quantiser for every scan; the rain figure is the only place a
sixteenth offset appears.

### 5.3 Pad, bass, percussion and texture

| role | rule |
|---|---|
| pad | first variable only. A three-note chord on scale degrees 0, 2 and 4, every 8 beats. The degree is the median `n` of the months covered by that block. Velocity `0.27 + 0.06 * median_n`, smoothed; duration up to 8 beats. |
| bass | first variable only. Scale root one octave below the variable root, quantised, on every 4-beat bar line, duration 1.5 beats, velocity 0.3. |
| perc | rain only. MIDI 42 on every bar line with velocity `0.25 + 0.08 * mean_n`; an extra off-beat hit at +2 beats when `mean_n > 0.55` with velocity 0.26. |
| texture | one empty-note track per variable, carrying filter/reverb/density parameters for the browser's noise or drone layer. |

Track order is deterministic: pad, lead, bass, texture, perc; ties sort by id.

### 5.4 Velocity and timing safety

- Velocity is clamped to **[0.25, 0.8]**.
- Consecutive velocity changes are capped at **0.3**.
- Notes shorter than **80 ms** are repaired: data notes are lengthened to 80 ms,
  then truncated at the next onset; image lead notes closer than 80 ms are
  merged into the previous note. The merge count is reported in provenance.
- Lead, bass and perc are monophonic. Pad chords are not.

### 5.5 Captions

Data captions are emitted **once per sounding month**, at
`t_beats = month_index * 2`. This is a deliberate deviation from "one caption
per bar": at two beats per month a 4/4 bar contains two months, and aligning a
caption with the value that made the note is more useful than aligning it with
the bar. The cadence is recorded in provenance.

Captions describe the **lead variable only** (the first variable requested).
Companion variables contribute notes and tracks, not duplicate captions.
These are real examples from the sample requests:

```
Jan 2016 — 18.0 °C, -6.2 °C vs the labelled record normal (z -1.4); Dorian colour.
Jul 2016 — 22.00 mm/day, 3.5× the Jul record normal; 3 marimba notes.
Mar 2016 — 3.0 m/s, -0.6 vs the Mar record normal (z -0.5); minor pentatonic ripple.
```

The first line comes from the committed two-variable sample; the rain and wind
lines come from rain-only and wind-only requests. The comparison phrase changes
when the normal came from a fallback; the number and unit always come from the
observation, never from a guess. When a rain value is less than a tenth of its
normal, the caption uses a percentage ("0% of the Jan record normal") instead
of a misleading "0.0×". Missing months produce no caption at all.

### 5.6 Provenance

`provenance.stats` includes input/sounding/missing months, raw events in,
notes out, dropped events, merged short notes, per-variable ranges and methods,
normal source and coverage, anomaly mean/min/max, tempo, grid, beats per month,
months per bar, caption cadence, variables and scale per variable.

`provenance.mapping` documents the formulas in short form.
`provenance.missing_policy` states that missing months are rests and nothing is
imputed.

---

## 6. Image mapping

### 6.1 Decode and features

- The payload is capped at **10 MB** and **40 million pixels** before decode.
- Decode with OpenCV, convert BGR → RGB.
- Resize to **96 × 54** with `INTER_AREA` (area averaging, so a thumbnail is a
  fair summary rather than a nearest-neighbour sample).
- HSV: OpenCV hue `0–179` is doubled to `0–360°`; saturation and value are
  divided by 255.
- Luminance: `L = 0.2126 R + 0.7152 G + 0.0722 B` (all channels 0–1).
- Sobel `gx`, `gy` with kernel 3; `magnitude = hypot(gx, gy)`;
  `edge = clip(magnitude / percentile(magnitude, 99), 0, 1)`. Edge is therefore
  relative to each image, not an absolute physical unit.

### 6.2 Scans

| scan | steps | order | pan | time |
|---|---|---|---|---|
| `columns` | 96 | left → right | `x/(W-1) * 1.6 - 0.8` | 0.5 beat per column |
| `radial` | 64 elliptical rings | centre → edge | `-0.7 … 0.7` by ring | 0.5 beat per ring |
| `regions` | `grid` tiles × 8 sub-steps | tile order, left → right within a row | tile centre | 0.25 beat per sub-step |

A region tile has voice `region-<n>`, so each tile becomes a separate lead
voice. There is no colour averaging across tiles; empty masks are skipped.

### 6.3 Pitch, octave and register

```
pitch_norm = legend ramp position, if a legend was supplied
           = hue / 360,             if the step's mean saturation >= 0.15
           = luminance,             otherwise (labelled luminance proxy)

midi = 48 + 24 * pitch_norm + octave_shift
```

`octave_shift` is `+12` when value > 0.75, `-12` when value < 0.25; another
`+12` when the register height > 0.72 and `-12` when < 0.28, so a bright
high-region pixel can be two octaves above the base note.

"Register height" is `1 - row/(H-1)` where `row` is the row of maximum absolute
vertical gradient. For columns it is the strongest gradient row in that column;
for regions it is the strongest row in the tile; for rings it is the mean ring
row. It is a vertical register proxy, not an object centroid or a segmentation.

### 6.4 Amplitude, brightness, density

| property | formula |
|---|---|
| amplitude | `0.12 + 0.55 * value^1.5`, capped at 0.78 |
| brightness | `0.55 * saturation + 0.45 * edge` |
| note density | driven by edge: percussion enters at `edge >= 0.55`; bars are thinned |
| tempo | `clamp(58 + 26 * mean(0.55*S + 0.45*edge) + 8 * mean(V), 52, 96)` |

`options.tempo` overrides the inferred tempo. The image lead is quantised to
the score scale in `[40, 100]`, with the same one-semitone hysteresis and
12-semitone leap cap as data. Velocities start at `0.3 + 0.65 * amp`, are
clamped to `[0.25, 0.8]`, and step by at most 0.3.

Dense passages are thinned to at most **four lead notes per bar**, preferring
the highest velocities and then the earliest times. Percussion is also capped
at four hits per bar, with velocity `0.25 + 0.11 * edge`.

The image accompaniment is deliberately static: a pad chord every 16 beats,
rotating through scale degrees; a bass root every 4 beats; a texture track with
no notes. Images do not have months, so there is no month grid.

### 6.5 Colour source honesty

`analysis.color_source` is one of:

- `legend` — a ramp was supplied and its closest point on the RGB polyline
  (arc-length 0–1) overrides hue and luminance;
- `hue` — no legend, and the mean saturation of the scan is at least 0.15;
- `luminance_proxy` — no legend, and the mean saturation is below 0.15.

The per-step decision uses that step's saturation, so a mostly-saturated image
can contain a few low-saturation steps mapped by luminance. The summary label
reports the dominant path. The service never claims a semantic colour ramp
exists when one was not supplied: hue is an absolute colour coordinate, not a
temperature or vegetation index.

### 6.6 Image captions

One caption per 4/4 bar, using only measured values:

```
Bar 1 — hue 107°, value 41%, edge 4%; 4 notes.
```

`notes` counts the **audible** lead and perc notes in that bar after thinning
and merging, not the raw scan steps.

---

## 7. Video (optional)

- Maximum **50 MB**, at most **12 frames**, evenly spaced across the reported
  frame count (or read sequentially if the container does not report one).
- Each frame is scanned like an image, capped at 240 steps, and its steps are
  spread over **12 beats**. The lead voice is `video`; the image simplifier
  then quantises, thins and merges as usual.
- Video is decoded through OpenCV. If the codec or container is unavailable,
  the route returns a clear `422 invalid_video` instead of pretending frames
  existed. No audio track is read.

This is a frame sampler, not motion analysis. There is no optical flow and no
inter-frame interpolation.

---

## 8. Cache, CSV storage and URL safety

### Score cache

- Location: `backend/data/cache/sonify/<sha256>.json` (ignored by git).
- Key: canonical JSON SHA-256 over the endpoint, the *actual* series or image
  bytes, and the full options object. A hit can never belong to different data.
- Entries are `{"v":2,"at":..., "payload":{"musical_score":...,"raw_score":...}}`.
  Bump `CACHE_VERSION` after any intentional mapping change so old scores are
  ignored rather than served.
- There is no TTL. Delete the JSON files (or bump `CACHE_VERSION` in
  `sonify/repository.py`) to force recomputation.
- Writes are atomic (`tmp` + `os.replace`); a read-only deployment still serves
  requests, it just recomputes.
- `GET /api/sonify/health` reports the number of cached scores and the newest
  timestamp.

### CSV

- 5 MB and 100,000 rows maximum.
- Wide format with a `date`, `month`, `time`, `yyyy-mm` or `year_month` column.
- Numeric measurement columns become variables. `division`, `region`,
  `location`, `name`, `id`, `year`, `month_num` and `index` are ignored.
- Dates are parsed with pandas; `YYYYMM` and `YYYY-MM` are accepted explicitly.
  Unparseable dates are dropped and counted.
- Duplicate month rows keep the first value and are counted.
- `-999`, `NaN` and infinities become missing values downstream.
- Units are **not** converted. The CSV is treated as already carrying the units
  the caller expects; the score's captions therefore use the units implied by
  the variable name, which is only safe for POWER-shaped data.
- The upload is stored under `backend/data/sonify/uploads/<id>.csv` and can be
  reused by `csv_id` (id is 24 hex characters, validated by regex).

### Remote URLs (SSRF guard)

- HTTPS only, port 443 only, no embedded credentials.
- Host must equal or be a subdomain of `nasa.gov` or one of the default NASA
  hosts (`power.larc.nasa.gov`, `earthdata.nasa.gov`,
  `earthobservatory.nasa.gov`, `eoimages.gsfc.nasa.gov`,
  `visibleearth.nasa.gov`). `SONIFY_URL_HOSTS` can add comma-separated
  suffixes on the server.
- The hostname is resolved and every address must be globally routable; private,
  loopback, link-local and reserved addresses are refused.
- Redirects are followed at most three times and **each hop is validated again**.
- The download is streamed and aborted as soon as it exceeds the image/video
  size cap, even if `Content-Length` lies.

---

## 9. Limits, deviations and uncertainties

- **No audio is rendered.** Loudness, instrument design, effects and limiting
  belong to Tone.js. The backend's `amp` and `brightness` are mapping signals.
- **One scale per score.** The schema has a single `key`/`scale`, so the
  anomaly mode is chosen from the lead variable's mean `z`; per-month mode
  changes are not represented. Per-variable defaults remain audible and are
  recorded in provenance.
- **Data captions are per month, not per bar.** Two months share a 4/4 bar at
  the chosen two-beats-per-month tempo.
- **Generic grids are eighth-note.** Only the five-note rain figure contains a
  sixteenth-note offset.
- **Image register uses the strongest vertical gradient row**, not a centroid.
- **Hue is not semantic.** Saturated images map absolute hue to scale degrees;
  low-saturation images use a luminance proxy and say so. A supplied legend
  overrides both. There is no learned colour classifier.
- **POWER normals need 24 of 30 baseline years.** Outside 1991–2020, or when
  coverage is thin, the normal and sigma fall back and are labelled. The score
  may sound "less anomalous" for a short record because the fallback normal is
  the record itself.
- **CSV units are trusted.** The service does not inspect headers for units or
  convert them.
- **Video depends on an OpenCV codec.** Some containers cannot be decoded in a
  minimal install; that is reported, not hidden.
- **Long records are capped at 2,400 months** (200 years) and three variables
  per request. Images are capped at 10 MB / 40 MP; video at 50 MB / 12 frames.
- **Timeouts:** 20 s for data/image/power fetch, 40 s for video. A timeout is a
  `503`/`504`, never a partial score.
- **Cache invalidation is manual** (delete files or bump the cache version).
- **Only NASA POWER is supported for live locations.** The model accepts a
  `dataset` field but rejects anything other than POWER/MERRA-2 aliases.
- **Pan uses longitude only** for location-based data; latitude is not mapped.

---

## 10. Worked examples

The committed samples were produced by the real endpoints in this worktree:

- `samples/data_response_12m.json` — twelve months of `T2M` and
  `PRECTOTCORR` inline, `D dorian`, 60 BPM.
- `samples/image_response_columns.json` — a deterministic 96×54 test image,
  `columns` scan, `D dorian`, 64 BPM.

### Data response excerpt

One track, one note and two captions are shown. The full response contains
seven tracks and twelve captions; note arrays and mapping are abbreviated here
but the full file is valid JSON.

```json
{
  "version": "1.0",
  "source": {
    "kind": "data",
    "id": "inline-85d270e5dbd6",
    "meta": {"input": "inline series", "months": 12, "tempo_bpm": 60}
  },
  "musical_score": {
    "key": "D",
    "scale": "Dorian",
    "tempo_bpm": 60,
    "time_sig": [4, 4],
    "tracks": [
      {
        "id": "lead:T2M",
        "role": "lead",
        "notes": [
          {"t_beats": 0.0, "dur_beats": 1.6, "midi": 64, "vel": 0.3235, "pan": -0.6}
        ],
        "params": {
          "cutoff_hz": 1763.1, "reverb_send": 0.18,
          "detune_cents": 0.0, "density": 0.402
        }
      }
    ],
    "captions": [
      {"t_beats": 0.0, "text": "Jan 2016 — 18.0 °C, -6.2 °C vs the labelled record normal (z -1.4); Dorian colour."},
      {"t_beats": 2.0, "text": "Feb 2016 — 19.5 °C, -4.7 °C vs the labelled record normal (z -1.1); Dorian colour."}
    ],
    "provenance": {
      "stats": {
        "input_months": 12, "sounding_months": 12, "missing_months": 0,
        "events_in": 24, "notes_out": 55, "tempo_bpm": 60,
        "beats_per_month": 2, "months_per_bar": 2,
        "normal_source": "fallback (record outside the 1991–2020 baseline)",
        "baseline_coverage": 0.033
      },
      "mapping": {},
      "missing_policy": "Missing months are rests: they add no note, no caption and no imputed value. The score says how many months were missing; nothing is filled in."
    }
  },
  "cache": {"hit": false, "key": "a44712dc5144126e..."}
}
```

The complete score is in `samples/data_response_12m.json`. Its tracks are
`pad:T2M` (9 notes), `lead:PRECTOTCORR` (24), `lead:T2M` (19), `bass:T2M` (6),
`texture:T2M`, `texture:PRECTOTCORR` and `perc:PRECTOTCORR` (6).

### Image response excerpt

Again one lead note is shown; the full score has 48 lead notes, 9 pad, 12 bass
and 12 captions.

```json
{
  "version": "1.0",
  "source": {
    "kind": "image",
    "id": "d7343983bcf36a5e",
    "meta": {"width": 96, "height": 54, "scan": "columns"}
  },
  "musical_score": {
    "key": "D", "scale": "Dorian", "tempo_bpm": 64,
    "tracks": [
      {
        "id": "lead:image",
        "role": "lead",
        "notes": [
          {"t_beats": 0.0, "dur_beats": 0.425, "midi": 55, "vel": 0.4732, "pan": -0.8}
        ],
        "params": {
          "cutoff_hz": 2510.7, "reverb_send": 0.2,
          "detune_cents": 0.0, "density": 0.059
        }
      }
    ],
    "captions": [
      {"t_beats": 0.0, "text": "Bar 1 — hue 107°, value 41%, edge 4%; 4 notes."}
    ]
  },
  "analysis": {
    "width": 96, "height": 54, "grid": [96, 54], "scan": "columns",
    "color_source": "hue", "legend": null,
    "mean_hue_deg": 197.81, "mean_saturation": 0.6369,
    "mean_value": 0.618, "mean_luminance": 0.3938,
    "mean_edge": 0.0593, "tempo_bpm": 64, "steps": 96
  },
  "cache": {"hit": false, "key": "11d9892277290435..."}
}
```

Full response: `samples/image_response_columns.json`.

---

## 11. Tests and golden snapshots

`python -m pytest -q` → **42 passed**, 1 warning (Starlette's
`anyio.abc.BlockingPortal` deprecation, not our code).

`tests/test_sonify_units.py` covers: MIDI/frequency, scale parsing (including
`"G major pentatonic"`), quantisation, EMA with gaps, normalisation and missing
counts, percentile outlier resistance, `-999`/`NaN` cleaning, circular hue,
legend ramp position, data score invariants, missing-month rests, determinism,
rain density spread, image invariants, scan determinism/differences, legend
override, 1920×1080 timing, and the two golden snapshots.

`tests/test_sonify_api.py` covers: health/schema, data/cache/debug, missing
months, request validation, CSV upload/reuse/default-column fallback, all three
image scans, determinism/cache, oversize/broken/missing uploads, SSRF refusals,
a generated video clip (skipped if the codec is unavailable), and the existing
`/api/preview/series` regression.

Measured on this machine: **1920×1080 image analysis ≈ 105 ms**, well under the
1 s target. With the POWER series already cached, scoring the full 1981–2025
record (540 months) took ≈ 0.20 s for one variable and ≈ 0.54 s for three
variables; a replay from the score cache took ≈ 0.1 s. These timings exclude a
cold POWER download.

The golden files are `tests/golden/data_12m.json` (twelve T2M months, D
Dorian, 60 BPM) and `tests/golden/image_96x54.json` (the fixed synthetic image,
columns, D Dorian, 64 BPM). Regenerate them with `python tests/make_golden.py`
after any intentional mapping change; the tests compare exact dictionaries.

---

## 12. Browser handoff

- Call the endpoints, take `musical_score`, and schedule notes with Tone.js at
  `t_beats * 60 / tempo_bpm`.
- Map roles to instrument families: pad → slow polyphonic synth; lead →
  marimba/pluck for rain, soft sine/triangle for temperature, filtered noise
  drone for wind; bass → low sine/triangle; perc → short noise or woodblock.
- Use `params.cutoff_hz`, `reverb_send`, `detune_cents` and `density` per track.
- Render captions by comparing `t_beats` with the transport position; data
  captions are two per bar, image captions one per bar.
- `cache.key` is stable for identical input and options and can be used as a
  client-side memo key.
- Request `?debug=1` only for inspection; the raw score is not needed for
  playback.
- The backend does not set tempo automation, swing, humanisation or mastering;
  those are browser decisions.

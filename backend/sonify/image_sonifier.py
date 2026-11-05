"""Image → raw sound score.

A deterministic, explainable mapping, with no ML:

  * decode → area-average resize to 96×54 (INTER_AREA);
  * HSV plus luminance ``L = 0.2126R + 0.7152G + 0.0722B``;
  * scan ``columns`` (left → right), ``radial`` (centre → edge) or
    ``regions`` (tiles become voices, each read in eight sub-steps);
  * hue (or a supplied colour ramp) picks the scale degree;
  * value picks octave and amplitude; saturation picks brightness;
  * Sobel edge density picks note density and velocity;
  * the dominant luminance-gradient row picks the register.

When no legend is supplied the response says ``color_source:
"luminance_proxy"`` (low saturation) or ``"hue"`` — it never pretends a
colour ramp exists. The same bytes and options always produce the same score.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np

from .models import (
    Caption,
    ImageOptions,
    MusicalNote,
    MusicalScore,
    MusicalTrack,
    Provenance,
    RawSoundScore,
    ScoreEvent,
    ScoreSource,
    TrackParams,
)
from .scales import (
    SCALE_LABELS,
    freq_to_midi,
    midi_to_freq,
    midi_to_name,
    quantize_midi,
    scale_notes_for_variable,
)

GRID_W = 96
GRID_H = 54
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000
MAX_EVENTS = 1200
STEP_BEATS = 0.5
REGION_SUBSTEPS = 8


@dataclass
class StepInfo:
    voice: str
    hue_deg: float
    saturation: float
    value: float
    luminance: float
    edge: float
    height: float
    pan: float
    amp: float
    midi: float
    t_beats: float


# ---------------------------------------------------------------------------
# decoding and features
# ---------------------------------------------------------------------------


def decode_image(data: bytes) -> tuple[np.ndarray, int, int]:
    if not data:
        raise ValueError("Image payload is empty.")
    if len(data) > MAX_BYTES:
        raise ValueError(f"Image exceeds the {MAX_BYTES // (1024 * 1024)} MB limit.")
    buffer = np.frombuffer(data, dtype=np.uint8)
    bgr = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("The image could not be decoded (unsupported or corrupt file).")
    height, width = bgr.shape[:2]
    if width * height > MAX_PIXELS:
        raise ValueError("Image dimensions exceed the 40-million-pixel safety limit.")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), width, height


def _resize(rgb: np.ndarray) -> np.ndarray:
    return cv2.resize(rgb, (GRID_W, GRID_H), interpolation=cv2.INTER_AREA)


def _features(small: np.ndarray) -> dict[str, np.ndarray]:
    rgb = small.astype(np.float32) / 255.0
    hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV)
    hue = hsv[..., 0].astype(np.float32) * 2.0
    sat = hsv[..., 1].astype(np.float32) / 255.0
    val = hsv[..., 2].astype(np.float32) / 255.0
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = np.hypot(gx, gy)
    denominator = float(np.percentile(magnitude, 99)) if magnitude.size else 0.0
    edge = np.clip(magnitude / denominator, 0.0, 1.0) if denominator > 1e-9 else np.zeros_like(magnitude)
    return {"rgb": rgb, "hue": hue, "sat": sat, "val": val, "lum": lum, "gy": gy, "edge": edge}


def _circular_mean_deg(hues: np.ndarray, weights: np.ndarray | None = None) -> float:
    if hues.size == 0:
        return 0.0
    if weights is None:
        weights = np.ones_like(hues)
    radians = np.deg2rad(hues)
    x = float((np.cos(radians) * weights).sum())
    y = float((np.sin(radians) * weights).sum())
    if abs(x) < 1e-9 and abs(y) < 1e-9:
        return 0.0
    return float(math.degrees(math.atan2(y, x)) % 360.0)


def _legend_stops(colors: list[str]) -> np.ndarray:
    return np.array(
        [[int(stop[1:3], 16) / 255.0, int(stop[3:5], 16) / 255.0, int(stop[5:7], 16) / 255.0] for stop in colors],
        dtype=np.float32,
    )


def _ramp_position(rgb: np.ndarray, stops: np.ndarray) -> float:
    """Closest point on the colour polyline, as a 0–1 arc-length position."""
    if stops.shape[0] == 1:
        return 0.0
    best_distance = float("inf")
    best_position = 0.0
    segments = stops.shape[0] - 1
    for index in range(segments):
        start = stops[index]
        end = stops[index + 1]
        vector = end - start
        length_sq = float(vector @ vector)
        if length_sq < 1e-9:
            continue
        t = float((rgb - start) @ vector / length_sq)
        t = max(0.0, min(1.0, t))
        closest = start + t * vector
        distance = float(np.linalg.norm(rgb - closest))
        if distance < best_distance:
            best_distance = distance
            best_position = (index + t) / segments
    return best_position


def _dominant_row(gy: np.ndarray, x: int) -> int:
    column = np.abs(gy[:, x])
    if column.size == 0 or float(column.max()) < 1e-9:
        return gy.shape[0] // 2
    return int(np.argmax(column))


def _hue_weighted(features: dict[str, np.ndarray], columns: slice | np.ndarray, rows: slice | np.ndarray) -> float:
    hues = features["hue"][rows, columns]
    weights = features["sat"][rows, columns] + 1e-6
    return _circular_mean_deg(np.asarray(hues).reshape(-1), np.asarray(weights).reshape(-1))


def _mean(features: dict[str, np.ndarray], key: str, columns: slice | np.ndarray, rows: slice | np.ndarray) -> float:
    return float(np.asarray(features[key][rows, columns]).mean())


# ---------------------------------------------------------------------------
# scans
# ---------------------------------------------------------------------------


def _pitch_norm(
    hue: float,
    sat: float,
    value: float,
    lum: float,
    ramp: float | None,
) -> tuple[float, str]:
    if ramp is not None:
        return ramp, "legend"
    if sat >= 0.15:
        return (hue % 360.0) / 360.0, "hue"
    return max(0.0, min(1.0, lum)), "luminance_proxy"


def _scan_columns(features: dict[str, np.ndarray], stops: np.ndarray | None) -> list[StepInfo]:
    steps: list[StepInfo] = []
    rows = slice(0, GRID_H)
    for x in range(GRID_W):
        column = slice(x, x + 1)
        hue = _hue_weighted(features, column, rows)
        sat = _mean(features, "sat", column, rows)
        val = _mean(features, "val", column, rows)
        lum = _mean(features, "lum", column, rows)
        edge = _mean(features, "edge", column, rows)
        row = _dominant_row(features["gy"], x)
        height = 1.0 - row / max(1, GRID_H - 1)
        mean_rgb = np.array(
            [
                float(features["rgb"][..., 0][:, x].mean()),
                float(features["rgb"][..., 1][:, x].mean()),
                float(features["rgb"][..., 2][:, x].mean()),
            ],
            dtype=np.float32,
        )
        ramp = _ramp_position(mean_rgb, stops) if stops is not None else None
        pitch, _source = _pitch_norm(hue, sat, val, lum, ramp)
        amp = 0.12 + 0.55 * (val ** 1.5)
        midi = 48.0 + pitch * 24.0 + _octave_shift(val, height)
        steps.append(
            StepInfo(
                voice="image",
                hue_deg=hue,
                saturation=sat,
                value=val,
                luminance=lum,
                edge=edge,
                height=height,
                pan=round((x / max(1, GRID_W - 1)) * 1.6 - 0.8, 3),
                amp=amp,
                midi=midi,
                t_beats=round(len(steps) * STEP_BEATS, 4),
            )
        )
    return steps


def _octave_shift(value: float, height: float) -> float:
    shift = 0.0
    if value > 0.75:
        shift += 12.0
    elif value < 0.25:
        shift -= 12.0
    if height > 0.72:
        shift += 12.0
    elif height < 0.28:
        shift -= 12.0
    return shift


def _scan_radial(features: dict[str, np.ndarray], stops: np.ndarray | None, rings: int = 64) -> list[StepInfo]:
    yy, xx = np.mgrid[0:GRID_H, 0:GRID_W]
    cx = (GRID_W - 1) / 2.0
    cy = (GRID_H - 1) / 2.0
    radius = np.sqrt(((xx - cx) / max(1e-6, cx)) ** 2 + ((yy - cy) / max(1e-6, cy)) ** 2)
    radius = radius / max(1e-6, float(radius.max()))
    bins = np.minimum(rings - 1, (radius * rings).astype(int))
    steps: list[StepInfo] = []
    for ring in range(rings):
        mask = bins == ring
        if not mask.any():
            continue
        hue = _circular_mean_deg(
            features["hue"][mask], features["sat"][mask] + 1e-6
        )
        sat = float(features["sat"][mask].mean())
        val = float(features["val"][mask].mean())
        lum = float(features["lum"][mask].mean())
        edge = float(features["edge"][mask].mean())
        rows = np.argwhere(mask)[:, 0]
        height = 1.0 - float(rows.mean()) / max(1, GRID_H - 1)
        mean_rgb = np.array(
            [float(features["rgb"][..., channel][mask].mean()) for channel in range(3)],
            dtype=np.float32,
        )
        ramp = _ramp_position(mean_rgb, stops) if stops is not None else None
        pitch, _source = _pitch_norm(hue, sat, val, lum, ramp)
        midi = 48.0 + pitch * 24.0 + _octave_shift(val, height)
        steps.append(
            StepInfo(
                voice="image",
                hue_deg=hue,
                saturation=sat,
                value=val,
                luminance=lum,
                edge=edge,
                height=height,
                pan=round(-0.7 + 1.4 * ring / max(1, rings - 1), 3),
                amp=0.12 + 0.55 * (val ** 1.5),
                midi=midi,
                t_beats=round(len(steps) * STEP_BEATS, 4),
            )
        )
    return steps


def _scan_regions(features: dict[str, np.ndarray], stops: np.ndarray | None, grid: int) -> list[StepInfo]:
    cols = int(math.ceil(math.sqrt(grid)))
    rows = int(math.ceil(grid / cols))
    tile_h = GRID_H // rows
    tile_w = GRID_W // cols
    steps: list[StepInfo] = []
    tile_index = 0
    for ty in range(rows):
        for tx in range(cols):
            if tile_index >= grid:
                break
            y0 = ty * tile_h
            y1 = GRID_H if ty == rows - 1 else (ty + 1) * tile_h
            x0 = tx * tile_w
            x1 = GRID_W if tx == cols - 1 else (tx + 1) * tile_w
            sub_width = max(1, (x1 - x0) // REGION_SUBSTEPS)
            pan = round((((x0 + x1) / 2.0) / max(1, GRID_W - 1)) * 1.6 - 0.8, 3)
            for sub in range(REGION_SUBSTEPS):
                sx0 = x0 + sub * sub_width
                sx1 = x1 if sub == REGION_SUBSTEPS - 1 else min(x1, sx0 + sub_width)
                if sx1 <= sx0:
                    continue
                hs = slice(y0, y1)
                ws = slice(sx0, sx1)
                hue = _hue_weighted(features, ws, hs)
                sat = _mean(features, "sat", ws, hs)
                val = _mean(features, "val", ws, hs)
                lum = _mean(features, "lum", ws, hs)
                edge = _mean(features, "edge", ws, hs)
                rows_slice = np.abs(features["gy"][hs, ws])
                if float(rows_slice.max()) > 1e-9:
                    relative_row = int(np.argmax(rows_slice.mean(axis=1)))
                else:
                    relative_row = (y1 - y0) // 2
                height = 1.0 - (y0 + relative_row) / max(1, GRID_H - 1)
                mean_rgb = np.array(
                    [float(features["rgb"][..., channel][hs, ws].mean()) for channel in range(3)],
                    dtype=np.float32,
                )
                ramp = _ramp_position(mean_rgb, stops) if stops is not None else None
                pitch, _source = _pitch_norm(hue, sat, val, lum, ramp)
                midi = 48.0 + pitch * 24.0 + _octave_shift(val, height)
                steps.append(
                    StepInfo(
                        voice=f"region-{tile_index}",
                        hue_deg=hue,
                        saturation=sat,
                        value=val,
                        luminance=lum,
                        edge=edge,
                        height=height,
                        pan=pan,
                        amp=0.12 + 0.55 * (val ** 1.5),
                        midi=midi,
                        t_beats=round(len(steps) * (STEP_BEATS / 2.0), 4),
                    )
                )
            tile_index += 1
        if tile_index >= grid:
            break
    return steps


# ---------------------------------------------------------------------------
# score assembly
# ---------------------------------------------------------------------------


def steps_from_rgb(rgb: np.ndarray, options: ImageOptions) -> list[StepInfo]:
    """Scan an in-memory RGB frame (already decoded) into timed steps."""
    small = _resize(rgb)
    features = _features(small)
    stops = _legend_stops(options.legend) if options.legend else None
    if options.scan == "radial":
        steps = _scan_radial(features, stops)
    elif options.scan == "regions":
        steps = _scan_regions(features, stops, options.grid)
    else:
        steps = _scan_columns(features, stops)
    if not steps:
        raise ValueError("The scan produced no steps; try a different image or scan mode.")
    if len(steps) > MAX_EVENTS:
        stride = int(math.ceil(len(steps) / MAX_EVENTS))
        steps = steps[::stride]
    return steps


def build_image_score(
    data: bytes,
    options: ImageOptions,
    *,
    source_id: str | None = None,
    source_meta: dict[str, Any] | None = None,
) -> tuple[RawSoundScore, MusicalScore, dict[str, Any]]:
    rgb, width, height = decode_image(data)
    steps = steps_from_rgb(rgb, options)
    stops = _legend_stops(options.legend) if options.legend else None

    mean_brightness = float(
        np.mean([0.55 * step.saturation + 0.45 * step.edge for step in steps])
    )
    mean_value = float(np.mean([step.value for step in steps]))
    tempo = options.tempo or int(round(max(52, min(96, 58 + mean_brightness * 26 + mean_value * 8))))
    spb = 60.0 / tempo

    events: list[ScoreEvent] = []
    for step in steps:
        midi = max(12.0, min(120.0, step.midi))
        events.append(
            ScoreEvent(
                t=round(step.t_beats * spb, 6),
                dur=round((STEP_BEATS if step.voice == "image" else STEP_BEATS / 2.0) * spb * 0.85, 6),
                freq_hz=round(float(midi_to_freq(midi)), 3),
                amp=round(float(min(0.78, step.amp)), 4),
                pan=step.pan,
                brightness=round(float(max(0.0, min(1.0, 0.55 * step.saturation + 0.45 * step.edge))), 4),
                voice=step.voice,
            )
        )

    duration = max(event.t + event.dur for event in events) if events else 0.0
    color_source = "legend" if stops is not None else (
        "hue" if float(np.mean([s.saturation for s in steps])) >= 0.15 else "luminance_proxy"
    )
    summary = {
        "width": width,
        "height": height,
        "grid": [GRID_W, GRID_H],
        "scan": options.scan,
        "grid_tiles": options.grid if options.scan == "regions" else None,
        "color_source": color_source,
        "legend": list(options.legend) if options.legend else None,
        "mean_hue_deg": round(_circular_mean_deg(
            np.array([step.hue_deg for step in steps]),
            np.array([step.saturation + 1e-6 for step in steps]),
        ), 2),
        "mean_saturation": round(float(np.mean([step.saturation for step in steps])), 4),
        "mean_value": round(mean_value, 4),
        "mean_luminance": round(float(np.mean([step.luminance for step in steps])), 4),
        "mean_edge": round(float(np.mean([step.edge for step in steps])), 4),
        "mean_height": round(float(np.mean([step.height for step in steps])), 4),
        "tempo_bpm": tempo,
        "steps": len(steps),
        "pixels": [width, height],
    }
    if source_meta:
        summary.update(source_meta)

    score_id = source_id or hashlib.sha256(data).hexdigest()[:16]
    raw = RawSoundScore(
        source=ScoreSource(kind="image", id=score_id, meta=summary),
        duration_s=round(duration, 6),
        events=events,
    )
    musical = _simplify_image(raw, steps, options, summary, tempo, spb)
    return raw, musical, summary


def _bar_stats(steps: list[StepInfo], tempo: int) -> list[dict[str, Any]]:
    spb = 60.0 / tempo
    bars: dict[int, list[StepInfo]] = {}
    for step in steps:
        bar = int((step.t_beats * spb) // (4 * spb))
        bars.setdefault(bar, []).append(step)
    out: list[dict[str, Any]] = []
    for bar in sorted(bars):
        group = bars[bar]
        out.append(
            {
                "bar": bar,
                "hue": round(_circular_mean_deg(
                    np.array([item.hue_deg for item in group]),
                    np.array([item.saturation + 1e-6 for item in group]),
                ), 1),
                "value": round(float(np.mean([item.value for item in group])), 3),
                "edge": round(float(np.mean([item.edge for item in group])), 3),
                "notes": len(group),
            }
        )
    return out


def _fit_lead_notes(notes: list[MusicalNote], bps: float) -> list[MusicalNote]:
    """Keep a voice monophonic: merge events closer than 80 ms, then fit gaps."""
    min_beats = 0.08 * bps
    notes.sort(key=lambda note: note.t_beats)
    merged: list[MusicalNote] = []
    for note in notes:
        if merged and note.t_beats - merged[-1].t_beats < min_beats - 1e-9:
            previous = merged[-1]
            previous.dur_beats = max(
                previous.dur_beats, note.t_beats - previous.t_beats + note.dur_beats
            )
            previous.vel = max(previous.vel, note.vel)
        else:
            merged.append(note)
    for index, note in enumerate(merged):
        if index + 1 < len(merged):
            gap = merged[index + 1].t_beats - note.t_beats
            note.dur_beats = min(note.dur_beats, max(0.01, gap))
        note.dur_beats = round(max(0.01, note.dur_beats), 4)
    return merged


def _simplify_image(
    raw: RawSoundScore,
    steps: list[StepInfo],
    options: ImageOptions,
    summary: dict[str, Any],
    tempo: int,
    spb: float,
) -> MusicalScore:
    spec = scale_notes_for_variable("image", options.scale, options.key)
    lead_root = 62
    bps = tempo / 60.0
    duration_beats = max(4.0, raw.duration_s * bps)

    by_voice: dict[str, list[tuple[StepInfo, ScoreEvent]]] = {}
    for step, event in zip(steps, raw.events):
        by_voice.setdefault(step.voice, []).append((step, event))

    tracks: list[MusicalTrack] = []
    notes_out = 0
    for voice, pairs in by_voice.items():
        notes: list[MusicalNote] = []
        previous_midi: int | None = None
        previous_vel: float | None = None
        for step, event in pairs:
            midi = quantize_midi(freq_to_midi(event.freq_hz), spec, 40, 100)
            if previous_midi is not None:
                if abs(midi - previous_midi) <= 1:
                    midi = previous_midi
                while midi - previous_midi > 12:
                    midi -= 12
                while previous_midi - midi > 12:
                    midi += 12
            velocity = max(0.25, min(0.8, 0.3 + event.amp * 0.65))
            if previous_vel is not None and abs(velocity - previous_vel) > 0.3:
                velocity = previous_vel + math.copysign(0.3, velocity - previous_vel)
            velocity = round(max(0.25, min(0.8, velocity)), 4)
            notes.append(
                MusicalNote(
                    t_beats=round(event.t * bps, 4),
                    dur_beats=max(0.02, round(event.dur * bps, 4)),
                    midi=int(midi),
                    vel=velocity,
                    pan=event.pan,
                )
            )
            previous_midi = midi
            previous_vel = velocity

        # Thin dense passages to at most four notes per bar, preferring peaks.
        thinned: list[MusicalNote] = []
        bars: dict[int, list[MusicalNote]] = {}
        for note in notes:
            bars.setdefault(int(note.t_beats // 4), []).append(note)
        for bar in sorted(bars):
            group = bars[bar]
            if len(group) > 4:
                strongest = sorted(group, key=lambda item: (-item.vel, item.t_beats))[:4]
                group = sorted(strongest, key=lambda item: item.t_beats)
            thinned.extend(group)
        thinned.sort(key=lambda item: item.t_beats)
        thinned = _fit_lead_notes(thinned, bps)
        notes_out += len(thinned)
        tracks.append(
            MusicalTrack(
                id=f"lead:{voice}",
                role="lead",
                notes=thinned,
                params=TrackParams(
                    cutoff_hz=round(600 + summary["mean_saturation"] * 3000, 1),
                    reverb_send=0.2,
                    detune_cents=0,
                    density=round(min(1.0, summary["mean_edge"]), 3),
                ),
            )
        )

    # Pad: a slow chord every four bars, rotated through scale degrees.
    pad_notes: list[MusicalNote] = []
    block = 0
    while block * 16 < duration_beats:
        degree = block % len(spec.intervals)
        chord = [
            lead_root - 12 + ((degree + step) // len(spec.intervals)) * 12
            + spec.intervals[(degree + step) % len(spec.intervals)]
            for step in (0, 2, 4)
        ]
        remaining = max(0.5, duration_beats - block * 16)
        for midi in chord:
            pad_notes.append(
                MusicalNote(
                    t_beats=round(block * 16, 4),
                    dur_beats=round(min(16.0, remaining), 4),
                    midi=int(midi),
                    vel=0.27,
                    pan=0.0,
                )
            )
        block += 1
    tracks.append(
        MusicalTrack(
            id="pad:image",
            role="pad",
            notes=pad_notes,
            params=TrackParams(
                cutoff_hz=round(700 + summary["mean_luminance"] * 1600, 1),
                reverb_send=0.36,
                detune_cents=0,
                density=0.0,
            ),
        )
    )

    # Bass root on every bar line.
    bass_notes: list[MusicalNote] = []
    bar = 0.0
    bass_root = quantize_midi(38, spec, 24, 50)
    while bar < duration_beats:
        bass_notes.append(
            MusicalNote(t_beats=round(bar, 4), dur_beats=1.5, midi=int(bass_root), vel=0.3, pan=0.0)
        )
        bar += 4.0
    tracks.append(
        MusicalTrack(
            id="bass:image",
            role="bass",
            notes=bass_notes,
            params=TrackParams(cutoff_hz=400, reverb_send=0.12, detune_cents=0, density=0.0),
        )
    )

    # Sharp, bright regions add percussion hits (max four per bar).
    perc_notes: list[MusicalNote] = []
    for step in steps:
        if step.edge >= 0.55:
            perc_notes.append(
                MusicalNote(
                    t_beats=round(step.t_beats, 4),
                    dur_beats=0.25,
                    midi=42,
                    vel=round(0.25 + step.edge * 0.11, 3),
                    pan=step.pan,
                )
            )
    perc_notes.sort(key=lambda item: item.t_beats)
    perc_by_bar: dict[int, list[MusicalNote]] = {}
    for note in perc_notes:
        perc_by_bar.setdefault(int(note.t_beats // 4), []).append(note)
    perc_notes = [note for bar_index in sorted(perc_by_bar) for note in perc_by_bar[bar_index][:4]]
    tracks.append(
        MusicalTrack(
            id="perc:image",
            role="perc",
            notes=perc_notes,
            params=TrackParams(cutoff_hz=4200, reverb_send=0.16, detune_cents=0, density=0.3),
        )
    )

    tracks.append(
        MusicalTrack(
            id="texture:image",
            role="texture",
            notes=[],
            params=TrackParams(
                cutoff_hz=round(600 + summary["mean_saturation"] * 3200, 1),
                reverb_send=0.24,
                detune_cents=0,
                density=round(summary["mean_edge"], 3),
            ),
        )
    )

    role_order = {"pad": 0, "lead": 1, "bass": 2, "texture": 3, "perc": 4}
    tracks.sort(key=lambda track: (role_order.get(track.role, 9), track.id))

    bars = _bar_stats(steps, tempo)
    audible: dict[int, int] = {}
    for track in tracks:
        if track.role in {"lead", "perc"}:
            for note in track.notes:
                bar_index = int(note.t_beats // 4)
                audible[bar_index] = audible.get(bar_index, 0) + 1
    for bar in bars:
        bar["notes"] = audible.get(bar["bar"], 0)
    captions = [
        Caption(
            t_beats=round(bar["bar"] * 4, 4),
            text=(
                f"Bar {bar['bar'] + 1} — hue {bar['hue']:.0f}°, value {bar['value'] * 100:.0f}%, "
                f"edge {bar['edge'] * 100:.0f}%; {bar['notes']} "
                f"{'note' if bar['notes'] == 1 else 'notes'}."
            ),
        )
        for bar in bars
    ]

    stats = {
        "events_in": len(raw.events),
        "notes_out": notes_out,
        "bars": len(bars),
        "tempo_bpm": tempo,
        "grid": "eighth-note grid (0.5 beat)",
        "caption_cadence": "one per 4/4 bar",
        "width": summary["width"],
        "height": summary["height"],
        "analysis_grid": summary["grid"],
        "scan": summary["scan"],
        "color_source": summary["color_source"],
        "legend_supplied": bool(summary["legend"]),
        "mean_hue_deg": summary["mean_hue_deg"],
        "mean_saturation": summary["mean_saturation"],
        "mean_value": summary["mean_value"],
        "mean_edge": summary["mean_edge"],
        "mean_height": summary["mean_height"],
    }
    mapping = {
        "pitch": "hue → scale degree; a supplied legend overrides hue with colour-ramp position.",
        "luminance_proxy": "when saturation is below 0.15 and no legend is supplied, luminance stands in for hue and is labelled.",
        "octave": "value > 0.75 adds an octave; value < 0.25 removes one.",
        "register": "dominant luminance-gradient row: high in frame adds an octave, low removes one.",
        "amplitude": "value^1.5, scaled 0.12–0.67 before velocity compression.",
        "brightness": "0.55 × saturation + 0.45 × Sobel edge density.",
        "pan": "horizontal position in the frame or region centroid.",
        "density": "edge density and brightness raise velocity; bars are thinned to four notes.",
        "scan": {"columns": "left → right", "radial": "centre → edge", "regions": "tiles are voices"}[options.scan],
    }
    provenance = Provenance(
        stats=stats,
        mapping=mapping,
        missing_policy=(
            "An image has no missing values. Any region with no pixels is skipped rather "
            "than assigned a colour; no value is invented."
        ),
    )
    return MusicalScore(
        key=spec.key,
        scale=SCALE_LABELS[spec.scale_id],
        tempo_bpm=tempo,
        time_sig=list(options.time_sig),
        tracks=tracks,
        captions=captions,
        provenance=provenance,
    )


__all__ = [
    "GRID_H",
    "GRID_W",
    "MAX_BYTES",
    "build_image_score",
    "decode_image",
]

"""Raw sound score → musical score.

The simplifier is where the "musical" constraints live: a slow tempo, a scale,
a grid, monophonic lead lines, smooth velocities, slow pad chords, a bass root
on bar lines and captions built only from real numbers.

Timing note (deliberate, documented): one month is two beats, so a 4/4 bar holds
two months. Captions therefore appear once per sounding month (two per bar)
rather than once per bar, which keeps each caption aligned with the value that
created its note.
"""

from __future__ import annotations

import math

import numpy as np

from .data_sonifier import MONTH_BEATS, VariablePlan, month_label
from .models import (
    Caption,
    MusicalNote,
    MusicalScore,
    MusicalTrack,
    Provenance,
    RawSoundScore,
    SonifyOptions,
    TrackParams,
)
from .scales import (
    DEFAULT_VOICE,
    SCALE_LABELS,
    VOICE_CONFIG,
    ScaleSpec,
    quantize_midi,
    scale_pitch_classes,
    scale_notes_for_variable,
)

PAD_STEPS = (0, 2, 4)
PAD_BLOCK_BEATS = 8          # four months / two bars
BASS_EVERY_BEATS = 4         # one bass note per bar
MIN_NOTE_MS = 80.0
VEL_MIN = 0.25
VEL_MAX = 0.8
MAX_VEL_STEP = 0.3
CAPTION_LIMIT = 600


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _median_norm(points: list, index: int, radius: int = 1) -> float | None:
    values = [
        point.norm
        for point in points[max(0, index - radius): index + radius + 1]
        if point.norm is not None
    ]
    if not values:
        return None
    return float(np.median(values))


def _scale_mode(plan: VariablePlan, options: SonifyOptions) -> ScaleSpec:
    if options.scale:
        return scale_notes_for_variable(plan.id, options.scale, options.key)
    if plan.id == "T2M":
        z = plan.mean_z or 0.0
        if z > 2.0:
            default = "phrygian"
        elif z > 1.0:
            default = "minor"
        elif z < -1.0:
            default = "major"
        else:
            default = "dorian"
        return scale_notes_for_variable(plan.id, default, options.key)
    return scale_notes_for_variable(plan.id, None, options.key)


def _next_scale_above(midi: int, spec: ScaleSpec) -> int:
    classes = scale_pitch_classes(spec)
    for candidate in range(midi + 1, min(128, midi + 13)):
        if candidate % 12 in classes:
            return candidate
    return midi + 1


def _shape_pitch(candidate: int, previous: int | None, spec: ScaleSpec, lo: int, hi: int) -> int:
    """1-semitone hysteresis, then cap leaps at one octave."""
    if not (lo <= candidate <= hi):
        candidate = int(_clamp(candidate, lo, hi))
        candidate = quantize_midi(candidate, spec, lo, hi)
    if previous is None:
        return candidate
    if abs(candidate - previous) <= 1:
        candidate = previous
    while candidate - previous > 12:
        candidate -= 12
    while previous - candidate > 12:
        candidate += 12
    if not (lo <= candidate <= hi):
        candidate = quantize_midi(candidate, spec, lo, hi)
    return candidate


def _resolve_dissonance(midi: int, pad_pcs: set[int], spec: ScaleSpec) -> int:
    """Nudge a lead note that sits a minor second from a sustained pad tone."""
    for _ in range(3):
        if not any(min((midi - pc) % 12, (pc - midi) % 12) == 1 for pc in pad_pcs):
            return midi
        midi = _next_scale_above(midi, spec)
    return midi


def _pad_chord(root: int, spec: ScaleSpec, degree: int) -> list[int]:
    size = len(spec.intervals)
    return [
        root + ((degree + step) // size) * 12 + spec.intervals[(degree + step) % size]
        for step in PAD_STEPS
    ]


def _smooth_velocity(value: float, previous: float | None) -> float:
    value = _clamp(value, VEL_MIN, VEL_MAX)
    if previous is not None and abs(value - previous) > MAX_VEL_STEP:
        value = previous + math.copysign(MAX_VEL_STEP, value - previous)
    return round(_clamp(value, VEL_MIN, VEL_MAX), 4)


def _merge_short(notes: list[MusicalNote], beats_per_second: float) -> tuple[list[MusicalNote], int]:
    min_beats = MIN_NOTE_MS / 1000.0 * beats_per_second
    merged = 0
    notes.sort(key=lambda note: note.t_beats)
    for index, note in enumerate(notes):
        if note.dur_beats < min_beats:
            note.dur_beats = round(min_beats, 4)
            merged += 1
        if index + 1 < len(notes):
            gap = notes[index + 1].t_beats - note.t_beats
            if gap > 0 and note.dur_beats > gap:
                note.dur_beats = round(gap, 4)
    return notes, merged


def _rain_onsets(count: int) -> list[float]:
    table = {
        1: [0.0],
        2: [0.0, 1.0],
        3: [0.0, 0.75, 1.5],
        4: [0.0, 0.5, 1.0, 1.5],
        5: [0.0, 0.5, 1.0, 1.25, 1.75],
    }
    return table[max(1, min(5, count))]


def _caption_for(plan: VariablePlan, point, scale: ScaleSpec, notes_in_month: int) -> str:
    label = month_label(point.year, point.month)
    month_name = label.split()[0]
    normal = point.normal if point.normal is not None else 0.0
    z = point.z if point.z is not None else 0.0
    baseline = plan.normal_source == "1991-2020 baseline"
    normal_phrase = "the 1991–2020 normal" if baseline else "the labelled record normal"
    month_normal = f"the {month_name} normal" if baseline else f"the {month_name} record normal"
    if plan.id == "T2M":
        delta = point.value - normal
        return (
            f"{label} — {point.value:.1f} °C, {delta:+.1f} °C vs {normal_phrase} "
            f"(z {z:+.1f}); {scale.scale_label} colour."
        )
    if plan.id == "PRECTOTCORR":
        if normal > 0.05:
            ratio = point.value / normal
            comparison = (
                f"{ratio * 100:.0f}% of {month_normal}"
                if ratio < 0.1
                else f"{ratio:.1f}× {month_normal}"
            )
        else:
            comparison = f"{month_normal} is {normal:.2f} mm/day"
        return (
            f"{label} — {point.value:.2f} mm/day, {comparison}; "
            f"{notes_in_month} marimba {'note' if notes_in_month == 1 else 'notes'}."
        )
    if plan.id == "WS10M":
        delta = point.value - normal
        return (
            f"{label} — {point.value:.1f} m/s, {delta:+.1f} vs {month_normal} "
            f"(z {z:+.1f}); {scale.scale_label} ripple."
        )
    return f"{label} — {point.value:.3f}, z {z:+.1f}."


def simplify_data(
    raw: RawSoundScore,
    plans: list[VariablePlan],
    options: SonifyOptions,
) -> MusicalScore:
    if not plans:
        raise ValueError("simplify_data needs at least one variable plan")
    lead = plans[0]
    lead_spec = _scale_mode(lead, options)
    tempo = int(raw.source.meta.get("tempo_bpm") or options.tempo or 66)
    tempo = int(_clamp(tempo, 52, 96))
    bps = tempo / 60.0

    duration_beats = max(4.0, raw.duration_s * bps)
    tracks: list[MusicalTrack] = []
    captions: list[Caption] = []
    events_in = len(raw.events)
    notes_out = 0
    merged_total = 0
    dropped = 0
    pad_blocks: dict[int, list[int]] = {}

    def ensure_pad(plan: VariablePlan, spec: ScaleSpec) -> list[MusicalNote]:
        nonlocal merged_total
        voice = VOICE_CONFIG.get(plan.id, DEFAULT_VOICE)
        root = int(voice["root_midi"])
        notes: list[MusicalNote] = []
        block_count = int(math.ceil(duration_beats / PAD_BLOCK_BEATS))
        previous_vel: float | None = None
        for block in range(block_count):
            start = block * PAD_BLOCK_BEATS
            lo = int(start / MONTH_BEATS)
            hi = int(min(len(plan.points), (start + PAD_BLOCK_BEATS) / MONTH_BEATS) + 1)
            norms = [p.norm for p in plan.points[lo:hi] if p.norm is not None]
            median_norm = float(np.median(norms)) if norms else 0.5
            degree = int(round(median_norm * (len(spec.intervals) - 1)))
            chord = _pad_chord(root, spec, degree)
            pad_blocks[block] = [value % 12 for value in chord]
            velocity = _smooth_velocity(0.27 + median_norm * 0.06, previous_vel)
            previous_vel = velocity
            remaining = max(0.5, duration_beats - start)
            for midi in chord:
                notes.append(
                    MusicalNote(
                        t_beats=round(start, 4),
                        dur_beats=round(min(PAD_BLOCK_BEATS, remaining), 4),
                        midi=int(midi),
                        vel=velocity,
                        pan=0.0,
                    )
                )
        notes, merged = _merge_short(notes, bps)
        merged_total += merged
        return notes

    def pad_pcs_at(t_beats: float) -> set[int]:
        block = int(t_beats // PAD_BLOCK_BEATS)
        if block in pad_blocks:
            return set(pad_blocks[block])
        if pad_blocks:
            return set(pad_blocks[max(pad_blocks)])
        return set()

    for plan_index, plan in enumerate(plans):
        spec = _scale_mode(plan, options)
        voice = VOICE_CONFIG.get(plan.id, DEFAULT_VOICE)
        lead_root = int(voice["root_midi"]) + 12
        voice_pan = next((event.pan for event in raw.events if event.voice == plan.id), None)
        pan = (
            voice_pan
            if voice_pan is not None
            else round(-0.4 + (0.8 * plan_index / max(1, len(plans) - 1)), 3)
        )

        if plan_index == 0:
            tracks.append(
                MusicalTrack(
                    id=f"pad:{plan.id}",
                    role="pad",
                    notes=ensure_pad(plan, spec),
                    params=TrackParams(
                        cutoff_hz=round(700 + (plan.mean_norm or 0.5) * 1400, 1),
                        reverb_send=0.34,
                        detune_cents=-7 if (plan.mean_z or 0) > 1 else 7 if (plan.mean_z or 0) < -1 else 0,
                        density=0.0,
                    ),
                )
            )

        lead_notes: list[MusicalNote] = []
        previous_midi: int | None = None
        previous_vel: float | None = None
        note_count_by_month: dict[str, int] = {}

        for index, point in enumerate(plan.points):
            if point.missing or point.norm is None:
                dropped += 1
                continue
            base_norm = _median_norm(plan.points, index, radius=1)
            if base_norm is None:
                base_norm = point.norm
            target = lead_root + base_norm * 24.0
            candidate = quantize_midi(target, spec, lead_root, lead_root + 24)
            candidate = _shape_pitch(candidate, previous_midi, spec, lead_root, lead_root + 24)
            candidate = _resolve_dissonance(candidate, pad_pcs_at(index * MONTH_BEATS), spec)

            if plan.id == "PRECTOTCORR":
                count = int(round((1 + point.norm * 4) * options.density))
                count = max(1, min(5, count))
                offsets = _rain_onsets(count)
                contour = [0.0, 0.11, 0.05, 0.17, 0.09]
                for k, offset in enumerate(offsets):
                    pitch_norm = _clamp(base_norm + contour[k] * (1.0 - base_norm * 0.4), 0.0, 1.0)
                    midi = quantize_midi(lead_root + pitch_norm * 24.0, spec, lead_root, lead_root + 24)
                    midi = _shape_pitch(midi, previous_midi, spec, lead_root, lead_root + 24)
                    midi = _resolve_dissonance(midi, pad_pcs_at(index * MONTH_BEATS + offset), spec)
                    velocity = _smooth_velocity(
                        0.28 + point.norm * 0.34 + (0.02 if k % 2 else 0.0), previous_vel
                    )
                    previous_vel = velocity
                    previous_midi = midi
                    lead_notes.append(
                        MusicalNote(
                            t_beats=round(index * MONTH_BEATS + offset, 4),
                            dur_beats=0.55 if count < 5 else 0.45,
                            midi=int(midi),
                            vel=velocity,
                            pan=round(_clamp(pan + (k - count / 2) * 0.04, -1, 1), 3),
                        )
                    )
                note_count_by_month[point.key] = count
            else:
                velocity = _smooth_velocity(0.3 + point.norm * 0.42, previous_vel)
                lead_notes.append(
                    MusicalNote(
                        t_beats=round(index * MONTH_BEATS, 4),
                        dur_beats=1.4 if plan.id == "WS10M" else 1.6,
                        midi=int(candidate),
                        vel=velocity,
                        pan=pan,
                    )
                )
                note_count_by_month[point.key] = 1
                previous_vel = velocity
                previous_midi = candidate

                extra = 1 if point.change >= 0.1 else 0
                if plan.id == "T2M" and options.density > 1.0:
                    extra += 1
                for step in range(extra):
                    neighbour_index = index + (1 if step == 0 else -1)
                    if not (0 <= neighbour_index < len(plan.points)):
                        continue
                    neighbour = plan.points[neighbour_index]
                    if neighbour.missing or neighbour.norm is None:
                        continue
                    midi = quantize_midi(lead_root + neighbour.norm * 24.0, spec, lead_root, lead_root + 24)
                    midi = _shape_pitch(midi, previous_midi, spec, lead_root, lead_root + 24)
                    midi = _resolve_dissonance(midi, pad_pcs_at(index * MONTH_BEATS + 0.5), spec)
                    offset = 0.5 if step == 0 else 1.0
                    lead_notes.append(
                        MusicalNote(
                            t_beats=round(index * MONTH_BEATS + offset, 4),
                            dur_beats=0.45,
                            midi=int(midi),
                            vel=_smooth_velocity(previous_vel - 0.06, previous_vel),
                            pan=pan,
                        )
                    )
                    previous_midi = midi
                    note_count_by_month[point.key] = note_count_by_month.get(point.key, 1) + 1

            if plan_index == 0 and len(captions) < CAPTION_LIMIT:
                captions.append(
                    Caption(
                        t_beats=round(index * MONTH_BEATS, 4),
                        text=_caption_for(plan, point, spec, note_count_by_month.get(point.key, 1)),
                    )
                )

        lead_notes, merged = _merge_short(lead_notes, bps)
        merged_total += merged
        notes_out += len(lead_notes)
        lead_cutoff = (
            420 + (plan.mean_norm or 0.5) * 2700
            if plan.id == "T2M"
            else 900 + (plan.mean_norm or 0.5) * 2400
            if plan.id == "PRECTOTCORR"
            else 500 + (plan.mean_norm or 0.5) * 1900
        )
        tracks.append(
            MusicalTrack(
                id=f"lead:{plan.id}",
                role="lead",
                notes=lead_notes,
                params=TrackParams(
                    cutoff_hz=round(lead_cutoff, 1),
                    reverb_send=0.18 if plan.id == "T2M" else 0.2,
                    detune_cents=-7 if (plan.mean_z or 0) > 1 else 7 if (plan.mean_z or 0) < -1 else 0,
                    density=round(
                        min(1.0, (plan.mean_norm or 0.5) * 0.7 + plan.mean_change * 0.3), 3
                    ),
                ),
            )
        )

        texture_cutoff = (
            380 + (plan.mean_norm or 0.5) * 700
            if plan.id == "T2M"
            else 900 + (plan.mean_norm or 0.5) * 2400
            if plan.id == "PRECTOTCORR"
            else 320 + (plan.mean_norm or 0.5) * 1500
        )
        tracks.append(
            MusicalTrack(
                id=f"texture:{plan.id}",
                role="texture",
                notes=[],
                params=TrackParams(
                    cutoff_hz=round(texture_cutoff, 1),
                    reverb_send=0.22,
                    detune_cents=0,
                    density=round(plan.mean_norm or 0.5, 3),
                ),
            )
        )

        if plan.id == "PRECTOTCORR":
            perc_notes: list[MusicalNote] = []
            bar = 0.0
            while bar < duration_beats:
                perc_notes.append(
                    MusicalNote(
                        t_beats=round(bar, 4),
                        dur_beats=0.25,
                        midi=42,
                        vel=round(0.25 + (plan.mean_norm or 0.5) * 0.08, 3),
                        pan=round(pan * 0.5, 3),
                    )
                )
                if (plan.mean_norm or 0.0) > 0.55:
                    perc_notes.append(
                        MusicalNote(
                            t_beats=round(bar + 2.0, 4),
                            dur_beats=0.25,
                            midi=42,
                            vel=0.26,
                            pan=round(pan * 0.5, 3),
                        )
                    )
                bar += 4.0
            perc_notes, merged = _merge_short(perc_notes, bps)
            merged_total += merged
            notes_out += len(perc_notes)
            tracks.append(
                MusicalTrack(
                    id=f"perc:{plan.id}",
                    role="perc",
                    notes=perc_notes,
                    params=TrackParams(cutoff_hz=4200, reverb_send=0.16, detune_cents=0, density=0.3),
                )
            )

        if plan_index == 0:
            bass_lo = max(24, int(voice["root_midi"]) - 12)
            bass_root = quantize_midi(int(voice["root_midi"]) - 12, spec, bass_lo, int(voice["root_midi"]))
            bass_notes: list[MusicalNote] = []
            bar = 0.0
            while bar < duration_beats:
                bass_notes.append(
                    MusicalNote(
                        t_beats=round(bar, 4),
                        dur_beats=1.5,
                        midi=int(bass_root),
                        vel=0.3,
                        pan=0.0,
                    )
                )
                bar += BASS_EVERY_BEATS
            bass_notes, merged = _merge_short(bass_notes, bps)
            merged_total += merged
            notes_out += len(bass_notes)
            tracks.append(
                MusicalTrack(
                    id=f"bass:{plan.id}",
                    role="bass",
                    notes=bass_notes,
                    params=TrackParams(
                        cutoff_hz=round(320 + (plan.mean_norm or 0.5) * 500, 1),
                        reverb_send=0.12,
                        detune_cents=0,
                        density=0.0,
                    ),
                )
            )

    role_order = {"pad": 0, "lead": 1, "bass": 2, "texture": 3, "perc": 4}
    tracks.sort(key=lambda track: (role_order.get(track.role, 9), track.id))

    scale_by_variable = {
        plan.id: _scale_mode(plan, options).name for plan in plans
    }
    stats = {
        "input_months": lead.valid + lead.missing,
        "sounding_months": lead.valid,
        "missing_months": lead.missing,
        "events_in": events_in,
        "notes_out": notes_out,
        "dropped_events": dropped,
        "merged_short_notes": merged_total,
        "range_by_variable": {
            plan.id: {
                "lo": round(plan.lo, 6),
                "hi": round(plan.hi, 6),
                "method": plan.range_method,
                "valid": plan.valid,
                "missing": plan.missing,
            }
            for plan in plans
        },
        "normal_baseline": "1991-2020",
        "normal_source": lead.normal_source,
        "baseline_coverage": round(lead.coverage, 3),
        "anomaly_z": {
            "mean": round(lead.mean_z, 3) if lead.mean_z is not None else None,
            "min": round(min((p.z for p in lead.points if p.z is not None), default=0.0), 3),
            "max": round(max((p.z for p in lead.points if p.z is not None), default=0.0), 3),
        },
        "tempo_bpm": tempo,
        "grid": "eighth-note grid (0.5 beat); five-note rain figures add a sixteenth-note offset",
        "beats_per_month": MONTH_BEATS,
        "months_per_bar": max(1, options.time_sig[0] // MONTH_BEATS),
        "caption_cadence": "one per sounding month (two months per 4/4 bar)",
        "variables": [plan.id for plan in plans],
        "scale_by_variable": scale_by_variable,
    }
    mapping = {
        "value_to_pitch": "midi = 48 + n*24, quantised to the score scale; an EMA smooths n before mapping.",
        "range": "1st–99th percentile of the loaded record (min/max only when degenerate).",
        "normal": "per-calendar-month mean over 1991–2020; a month needs 75% baseline coverage.",
        "anomaly": "z = (value - monthly normal) / monthly sigma; z>2 Phrygian, z>1 minor, z<-1 major for temperature.",
        "tempo": f"{tempo} bpm, bounded 52–96; one month is {MONTH_BEATS} beats.",
        "velocity": f"compressed to {VEL_MIN}–{VEL_MAX}; consecutive change capped at {MAX_VEL_STEP}.",
        "pad": "three-note chords on scale degrees 0-2-4, held for two bars.",
        "bass": "scale root on every bar line.",
        "rain_figure": "1–5 marimba notes per month, from the precipitation rate and density option.",
        "wind": "one ripple note per month over a two-oscillator drone.",
    }
    provenance = Provenance(
        stats=stats,
        mapping=mapping,
        missing_policy=(
            "Missing months are rests: they add no note, no caption and no imputed value. "
            "The score says how many months were missing; nothing is filled in."
        ),
    )
    return MusicalScore(
        key=lead_spec.key,
        scale=SCALE_LABELS[lead_spec.scale_id],
        tempo_bpm=tempo,
        time_sig=list(options.time_sig),
        tracks=tracks,
        captions=captions,
        provenance=provenance,
    )


__all__ = [
    "CAPTION_LIMIT",
    "MIN_NOTE_MS",
    "PAD_BLOCK_BEATS",
    "PAD_STEPS",
    "VEL_MAX",
    "VEL_MIN",
    "simplify_data",
]

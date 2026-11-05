"""Unit and property tests for the sonification pipeline.

Run from backend/:  python -m pytest -q
"""

from __future__ import annotations

import json
import math
import time
from pathlib import Path

import cv2
import numpy as np
import pytest

from sonify.data_sonifier import (
    VariablePlan,
    _ema,
    build_raw_score,
    month_key,
    plan_variable,
)
from sonify.image_sonifier import (
    _circular_mean_deg,
    _legend_stops,
    _ramp_position,
    build_image_score,
)
from sonify.models import ImageOptions, MusicalScore, SonifyOptions
from sonify.scales import (
    midi_to_freq,
    midi_to_name,
    parse_scale,
    quantize_midi,
    scale_pitch_classes,
)
from sonify.simplifier import MIN_NOTE_MS, simplify_data

GOLDEN = Path(__file__).resolve().parent / "golden"


def _series(values: list[float | None], year: int = 2016) -> dict[str, float | None]:
    return {month_key(year, month): value for month, value in enumerate(values, start=1)}


def _fixed_image(width: int = 96, height: int = 54) -> np.ndarray:
    yy, xx = np.mgrid[0:height, 0:width]
    red = (40 + xx / width * 190).astype(np.uint8)
    green = (30 + yy / height * 150).astype(np.uint8)
    blue = np.full_like(red, 55)
    image = np.dstack([red, green, blue])
    image[8:20, 24:48] = (235, 190, 50)
    image[30:38, 60:84] = (40, 90, 210)
    return image


def _png(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


def _assert_monophonic(track) -> None:
    notes = sorted(track.notes, key=lambda note: note.t_beats)
    for first, second in zip(notes, notes[1:]):
        assert second.t_beats >= first.t_beats + first.dur_beats - 1e-6, track.id


def _check_score(score: MusicalScore) -> None:
    assert 52 <= score.tempo_bpm <= 96
    assert score.time_sig == [4, 4]
    assert score.captions
    for track in score.tracks:
        for note in track.notes:
            assert 0 <= note.midi <= 127
            assert 0.25 <= note.vel <= 0.8
            assert note.dur_beats > 0
            assert note.t_beats >= 0
        if track.role in {"lead", "bass", "perc"}:
            _assert_monophonic(track)


def test_midi_and_frequency_table() -> None:
    assert midi_to_freq(69) == pytest.approx(440.0)
    assert midi_to_freq(81) == pytest.approx(880.0)
    assert midi_to_name(60) == "C4"
    assert midi_to_name(69) == "A4"
    assert midi_to_name(61) == "C#4"


def test_parse_scale_variants() -> None:
    dorian = parse_scale("D dorian")
    assert dorian.key == "D" and dorian.scale_id == "dorian"
    assert dorian.intervals == (0, 2, 3, 5, 7, 9, 10)
    assert parse_scale("minor", default_key="D").key_pc == 2
    assert parse_scale("G major pentatonic").scale_id == "majorPentatonic"
    with pytest.raises(ValueError):
        parse_scale("loud")


def test_quantize_stays_in_scale_and_range() -> None:
    spec = parse_scale("D dorian")
    classes = scale_pitch_classes(spec)
    for value in np.linspace(30, 90, 61):
        midi = quantize_midi(float(value), spec, 40, 100)
        assert 40 <= midi <= 100
        assert midi % 12 in classes


def test_ema_skips_missing_values() -> None:
    assert _ema([10.0, None, 20.0], 0.5) == [10.0, None, 15.0]


def test_plan_normalises_and_counts_missing() -> None:
    values = [10.0, 11.0, None, 14.0] + [12.0] * 8
    plan = plan_variable("T2M", _series(values), SonifyOptions())
    assert plan.valid == 11 and plan.missing == 1
    assert plan.lo <= plan.hi
    assert all(0.0 <= point.norm <= 1.0 for point in plan.points if point.norm is not None)
    missing = [point for point in plan.points if point.missing][0]
    assert missing.value is None and missing.norm is None and missing.z is None


def test_fill_values_become_missing() -> None:
    values = [18.0] * 12
    values[3] = -999.0
    values[7] = float("nan")
    options = SonifyOptions()
    raw, plans = build_raw_score(
        {"T2M": _series(values)}, ["T2M"], options, source_id="fills"
    )
    score = simplify_data(raw, plans, options)
    assert plans[0].missing == 2
    assert len(raw.events) == 10
    assert score.provenance.stats["missing_months"] == 2
    assert not any("Apr 2016" in caption.text or "Aug 2016" in caption.text for caption in score.captions)


def test_percentile_range_ignores_extreme_outlier() -> None:
    values = [20.0] * 10 + [99.0]
    plan = plan_variable("T2M", _series(values), SonifyOptions())
    assert plan.hi < 99.0


def test_circular_hue_mean_crosses_zero() -> None:
    hues = np.array([350.0, 10.0])
    mean = _circular_mean_deg(hues)
    assert mean < 1.0 or mean > 359.0


def test_legend_ramp_position() -> None:
    stops = _legend_stops(["#0000ff", "#ffffff", "#ff0000"])
    assert _ramp_position(np.array([0.0, 0.0, 1.0], dtype=np.float32), stops) == pytest.approx(0.0, abs=0.02)
    assert _ramp_position(np.array([1.0, 1.0, 1.0], dtype=np.float32), stops) == pytest.approx(0.5, abs=0.02)
    assert _ramp_position(np.array([1.0, 0.0, 0.0], dtype=np.float32), stops) == pytest.approx(1.0, abs=0.02)


def _golden_data_score() -> MusicalScore:
    values = [18.0, 19.5, 23.0, 27.2, 30.1, 29.4, 27.0, 26.6, 27.8, 24.0, 20.5, 17.2]
    options = SonifyOptions(key="D", scale="D dorian", tempo=60, smooth=0.35)
    raw, plans = build_raw_score(
        {"T2M": _series(values)},
        ["T2M"],
        options,
        source_id="golden-12m",
        source_meta={"input": "golden"},
    )
    return simplify_data(raw, plans, options)


def test_data_score_invariants_and_captions() -> None:
    score = _golden_data_score()
    _check_score(score)
    assert score.key == "D" and score.scale == "Dorian"
    assert len(score.captions) == 12
    assert "Jan 2016" in score.captions[0].text and "°C" in score.captions[0].text
    assert score.provenance.stats["sounding_months"] == 12
    assert score.provenance.stats["missing_months"] == 0
    for track in score.tracks:
        if track.role in {"lead", "bass"}:
            for note in track.notes:
                assert note.dur_beats * (60.0 / score.tempo_bpm) >= MIN_NOTE_MS / 1000.0 - 1e-6


def test_missing_month_is_a_rest_not_a_note() -> None:
    values = [18.0] * 12
    values[2] = None
    options = SonifyOptions()
    raw, plans = build_raw_score({"T2M": _series(values)}, ["T2M"], options, source_id="gap")
    score = simplify_data(raw, plans, options)
    assert len(raw.events) == 11
    assert len(score.captions) == 11
    assert not any("Mar 2016" in caption.text for caption in score.captions)
    assert score.provenance.stats["missing_months"] == 1


def test_data_score_is_deterministic() -> None:
    first = _golden_data_score().model_dump()
    second = _golden_data_score().model_dump()
    assert first == second


def test_rain_density_follows_rate() -> None:
    options = SonifyOptions(tempo=70)
    rain = [0.0, 0.0, 0.2, 2.0, 6.0, 14.0, 22.0, 18.0, 9.0, 3.0, 0.5, 0.0]
    raw, plans = build_raw_score(
        {"PRECTOTCORR": _series(rain)}, ["PRECTOTCORR"], options, source_id="rain-spread"
    )
    score = simplify_data(raw, plans, options)
    lead = next(track for track in score.tracks if track.role == "lead")
    counts: dict[int, int] = {}
    for note in lead.notes:
        month_index = int(note.t_beats // 2)
        counts[month_index] = counts.get(month_index, 0) + 1
    assert max(counts.values()) >= 4
    assert min(counts.values()) <= 2
    assert len(counts) == 12
    assert any("% of the" in caption.text for caption in score.captions)
    _check_score(score)


def _image_score(scan: str = "columns", **overrides):
    options = ImageOptions(scan=scan, key="D", scale="D dorian", tempo=64, **overrides)
    return build_image_score(_png(_fixed_image()), options, source_id="golden-image")


def test_image_score_invariants() -> None:
    raw, score, summary = _image_score()
    assert raw.source.kind == "image"
    assert raw.source.meta["pixels"] == [96, 54]
    assert summary["color_source"] in {"hue", "luminance_proxy", "legend"}
    _check_score(score)
    spec = parse_scale(f"{score.key} {score.scale}")
    classes = scale_pitch_classes(spec)
    for track in score.tracks:
        if track.role == "lead":
            for note in track.notes:
                assert note.midi % 12 in classes
    assert len(score.captions) == score.provenance.stats["bars"]


def test_image_scans_differ_but_are_deterministic() -> None:
    columns_a = _image_score("columns")[1].model_dump()
    columns_b = _image_score("columns")[1].model_dump()
    radial = _image_score("radial")[1].model_dump()
    regions = _image_score("regions")[1].model_dump()
    assert columns_a == columns_b
    assert columns_a != radial
    assert len([t for t in regions["tracks"] if t["role"] == "lead"]) == 6


def test_image_legend_overrides_hue() -> None:
    _, score, summary = _image_score(legend=["#0000ff", "#ffffff", "#ff0000"])
    assert summary["color_source"] == "legend"
    _check_score(score)


def test_hd_image_analysis_under_one_second() -> None:
    height, width = 1080, 1920
    yy, xx = np.mgrid[0:height, 0:width]
    image = np.dstack([
        (40 + xx / width * 180).astype(np.uint8),
        (30 + yy / height * 140).astype(np.uint8),
        np.full((height, width), 60, dtype=np.uint8),
    ])
    data = _png(image)
    started = time.perf_counter()
    build_image_score(data, ImageOptions(scan="columns", tempo=72))
    elapsed = time.perf_counter() - started
    print(f"1920x1080 analysis: {elapsed * 1000:.0f} ms")
    assert elapsed < 1.0


def test_golden_data_snapshot() -> None:
    path = GOLDEN / "data_12m.json"
    assert path.exists(), "Run python tests/make_golden.py to create golden snapshots."
    expected = json.loads(path.read_text(encoding="utf-8"))
    assert _golden_data_score().model_dump() == expected


def test_golden_image_snapshot() -> None:
    path = GOLDEN / "image_96x54.json"
    assert path.exists(), "Run python tests/make_golden.py to create golden snapshots."
    expected = json.loads(path.read_text(encoding="utf-8"))
    assert _image_score("columns")[1].model_dump() == expected

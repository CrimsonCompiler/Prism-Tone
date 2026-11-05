"""Optional video sonification by sampling frames.

A video is treated as a sequence of still frames: up to ``options.frames`` (12)
evenly spaced frames are decoded, each is scanned like an image, and the frame
steps are placed on one timeline. Nothing is interpolated and no audio is
written; the result is still a JSON score.

If OpenCV cannot read the container, the route returns a clear 422 instead of
pretending frames existed.
"""

from __future__ import annotations

import hashlib
import math
import os
import tempfile
from typing import Any

import cv2
import numpy as np

from .image_sonifier import (
    MAX_BYTES,
    MAX_EVENTS,
    STEP_BEATS,
    _simplify_image,
    steps_from_rgb,
)
from .models import ImageOptions, RawSoundScore, ScoreEvent, ScoreSource, VideoOptions
from .scales import midi_to_freq

MAX_VIDEO_BYTES = 50 * 1024 * 1024
FRAME_SPAN_BEATS = 12.0


def _frame_indices(total: int, wanted: int) -> list[int]:
    if total <= 0:
        return []
    count = max(1, min(wanted, total))
    return [int(round(value)) for value in np.linspace(0, total - 1, num=count)]


def sample_video(data: bytes, options: VideoOptions) -> tuple[list[np.ndarray], dict[str, Any]]:
    if not data:
        raise ValueError("Video payload is empty.")
    if len(data) > MAX_VIDEO_BYTES:
        raise ValueError(f"Video exceeds the {MAX_VIDEO_BYTES // (1024 * 1024)} MB limit.")

    suffix = ".mp4"
    handle, path = tempfile.mkstemp(prefix="prism-tone-", suffix=suffix)
    try:
        with os.fdopen(handle, "wb") as stream:
            stream.write(data)
        capture = cv2.VideoCapture(path)
        if not capture.isOpened():
            raise ValueError("The video could not be opened (unsupported codec or container).")
        total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        indices = _frame_indices(total, options.frames)
        frames: list[np.ndarray] = []
        if indices:
            for index in indices:
                capture.set(cv2.CAP_PROP_POS_FRAMES, index)
                ok, bgr = capture.read()
                if ok and bgr is not None:
                    frames.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        else:
            # Some containers do not report a frame count; read sequentially.
            while len(frames) < options.frames:
                ok, bgr = capture.read()
                if not ok:
                    break
                frames.append(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        capture.release()
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass

    if not frames:
        raise ValueError("No frames could be decoded from the video.")
    meta = {
        "media": "video",
        "frames_sampled": len(frames),
        "frames_requested": options.frames,
        "source_fps": round(fps, 3) if fps else None,
        "source_duration_s": round(total / fps, 3) if total and fps else None,
        "source_size": [width, height],
    }
    return frames, meta


def build_video_score(
    data: bytes,
    options: VideoOptions,
    *,
    source_id: str | None = None,
) -> tuple[RawSoundScore, Any, dict[str, Any]]:
    frames, meta = sample_video(data, options)
    image_options = ImageOptions(
        key=options.key,
        scale=options.scale,
        tempo=options.tempo,
        density=options.density,
        smooth=options.smooth,
        monophonic=options.monophonic,
        time_sig=options.time_sig,
        scan=options.scan,
        grid=options.grid,
        legend=options.legend,
    )

    all_steps = []
    per_frame = max(1, min(MAX_EVENTS, 240))
    for frame_index, frame in enumerate(frames):
        frame_steps = steps_from_rgb(frame, image_options)
        if not frame_steps:
            continue
        if len(frame_steps) > per_frame:
            stride = int(math.ceil(len(frame_steps) / per_frame))
            frame_steps = frame_steps[::stride]
        span = FRAME_SPAN_BEATS
        for index, step in enumerate(frame_steps):
            step.t_beats = round(frame_index * span + index * (span / len(frame_steps)), 4)
            step.voice = "video"
            all_steps.append(step)

    if not all_steps:
        raise ValueError("No frame produced any scan steps.")

    mean_brightness = float(
        np.mean([0.55 * step.saturation + 0.45 * step.edge for step in all_steps])
    )
    mean_value = float(np.mean([step.value for step in all_steps]))
    tempo = options.tempo or int(
        round(max(52, min(96, 58 + mean_brightness * 26 + mean_value * 8)))
    )
    spb = 60.0 / tempo

    events: list[ScoreEvent] = []
    step_seconds = (FRAME_SPAN_BEATS / max(1, len(all_steps) // max(1, len(frames)))) * spb
    for step in all_steps:
        midi = max(12.0, min(120.0, step.midi))
        events.append(
            ScoreEvent(
                t=round(step.t_beats * spb, 6),
                dur=round(step_seconds * 0.8, 6),
                freq_hz=round(float(midi_to_freq(midi)), 3),
                amp=round(float(min(0.78, step.amp)), 4),
                pan=step.pan,
                brightness=round(float(max(0.0, min(1.0, 0.55 * step.saturation + 0.45 * step.edge))), 4),
                voice="video",
            )
        )

    duration = max(event.t + event.dur for event in events)
    summary = {
        "width": meta.get("source_size", [0, 0])[0],
        "height": meta.get("source_size", [0, 0])[1],
        "grid": [96, 54],
        "scan": options.scan,
        "grid_tiles": options.grid if options.scan == "regions" else None,
        "color_source": "legend" if options.legend else (
            "hue" if float(np.mean([s.saturation for s in all_steps])) >= 0.15 else "luminance_proxy"
        ),
        "legend": list(options.legend) if options.legend else None,
        "mean_hue_deg": float(np.mean([s.hue_deg for s in all_steps])),
        "mean_saturation": float(np.mean([s.saturation for s in all_steps])),
        "mean_value": mean_value,
        "mean_luminance": float(np.mean([s.luminance for s in all_steps])),
        "mean_edge": float(np.mean([s.edge for s in all_steps])),
        "mean_height": float(np.mean([s.height for s in all_steps])),
        "tempo_bpm": tempo,
        "steps": len(all_steps),
        **meta,
    }
    score_id = source_id or hashlib.sha256(data).hexdigest()[:16]
    raw = RawSoundScore(
        source=ScoreSource(kind="image", id=score_id, meta=summary),
        duration_s=round(duration, 6),
        events=events,
    )
    musical = _simplify_image(raw, all_steps, image_options, summary, tempo, spb)
    return raw, musical, summary


__all__ = [
    "FRAME_SPAN_BEATS",
    "MAX_VIDEO_BYTES",
    "build_video_score",
    "sample_video",
]

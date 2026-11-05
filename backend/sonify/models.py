"""Pydantic models for the two-stage sonification pipeline.

Stage 1 is the :class:`RawSoundScore` produced by a sonifier (data or image).
Stage 2 is the :class:`MusicalScore` produced by the simplifier and consumed by
the browser's Tone.js player. The backend never renders audio.

The JSON Schema exported by ``GET /api/sonify/schema`` is generated from these
models, so every field the frontend sees is validated on the way out.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

SourceKind = Literal["data", "image"]
TrackRole = Literal["pad", "lead", "bass", "texture", "perc"]
ScanMode = Literal["columns", "radial", "regions"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------------------------
# Stage 1 — raw sound score
# ---------------------------------------------------------------------------


class ScoreSource(StrictModel):
    kind: SourceKind
    id: str = Field(min_length=1, max_length=128)
    meta: dict[str, Any] = Field(default_factory=dict)


class ScoreEvent(StrictModel):
    """One raw note in seconds. Amp is pre-mastering headroom, not dBFS."""

    t: float = Field(ge=0)
    dur: float = Field(gt=0, le=30)
    freq_hz: float = Field(ge=16, le=20000)
    amp: float = Field(ge=0, le=1)
    pan: float = Field(ge=-1, le=1)
    brightness: float = Field(ge=0, le=1)
    voice: str = Field(min_length=1, max_length=48)


class RawSoundScore(StrictModel):
    version: str = "1.0"
    source: ScoreSource
    duration_s: float = Field(ge=0)
    events: list[ScoreEvent] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Stage 2 — musical score
# ---------------------------------------------------------------------------


class MusicalNote(StrictModel):
    t_beats: float = Field(ge=0)
    dur_beats: float = Field(gt=0, le=64)
    midi: int = Field(ge=0, le=127)
    vel: float = Field(ge=0, le=1)
    pan: float = Field(ge=-1, le=1)


class TrackParams(StrictModel):
    cutoff_hz: float = Field(default=2000, ge=20, le=20000)
    reverb_send: float = Field(default=0.2, ge=0, le=1)
    detune_cents: float = Field(default=0, ge=-100, le=100)
    density: float = Field(default=0, ge=0, le=1)


class MusicalTrack(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    role: TrackRole
    notes: list[MusicalNote] = Field(default_factory=list)
    params: TrackParams = Field(default_factory=TrackParams)


class Caption(StrictModel):
    t_beats: float = Field(ge=0)
    text: str = Field(min_length=1, max_length=320)


class Provenance(StrictModel):
    stats: dict[str, Any] = Field(default_factory=dict)
    mapping: dict[str, Any] = Field(default_factory=dict)
    missing_policy: str = Field(min_length=1)


class MusicalScore(StrictModel):
    version: str = "1.0"
    key: str = Field(min_length=1, max_length=3)
    scale: str = Field(min_length=1, max_length=32)
    tempo_bpm: int = Field(ge=52, le=96)
    time_sig: list[int] = Field(default_factory=lambda: [4, 4])
    tracks: list[MusicalTrack] = Field(default_factory=list)
    captions: list[Caption] = Field(default_factory=list)
    provenance: Provenance

    @model_validator(mode="after")
    def _check_time_sig(self) -> "MusicalScore":
        if len(self.time_sig) != 2 or min(self.time_sig) <= 0:
            raise ValueError("time_sig must be two positive integers, e.g. [4, 4]")
        return self


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------


class SonifyOptions(StrictModel):
    """Shared musical options. Values are clamped by validation, never guessed."""

    key: str = Field(default="D", min_length=1, max_length=3)
    scale: str | None = Field(
        default=None,
        description="Scale name (dorian, minor, major, phrygian, major pentatonic, "
        "minor pentatonic) or a key + scale such as 'D dorian'.",
    )
    tempo: int | None = Field(default=None, ge=52, le=96)
    density: float = Field(default=1.0, ge=0.25, le=2.0)
    smooth: float = Field(default=0.35, ge=0.05, le=0.95)
    monophonic: bool = True
    time_sig: list[int] = Field(default_factory=lambda: [4, 4])

    @model_validator(mode="after")
    def _check(self) -> "SonifyOptions":
        if len(self.time_sig) != 2 or min(self.time_sig) <= 0:
            raise ValueError("time_sig must be two positive integers")
        return self


class DataRequest(StrictModel):
    series: dict[str, dict[str, float | None]] | None = Field(
        default=None,
        description="Inline {variable: {'YYYYMM': value|null}} series.",
    )
    csv_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{8,64}$")
    dataset: str = Field(default="power")
    location: str | None = Field(
        default=None,
        description="Division id (asia, africa, ...) or 'lat,lon'.",
    )
    start: int | None = Field(default=None, ge=1981, le=2025)
    end: int | None = Field(default=None, ge=1981, le=2025)
    variables: list[str] = Field(default_factory=lambda: ["T2M"], max_length=3)
    options: SonifyOptions = Field(default_factory=SonifyOptions)
    debug: bool = False

    @model_validator(mode="after")
    def _check_source(self) -> "DataRequest":
        if self.series is None and self.csv_id is None and self.location is None:
            raise ValueError("Provide one of: series, csv_id, or location/dataset.")
        if self.start is not None and self.end is not None and self.start > self.end:
            raise ValueError("start must be <= end")
        if not self.variables:
            raise ValueError("variables must contain at least one parameter")
        if len(set(self.variables)) != len(self.variables):
            raise ValueError("variables must not contain duplicates")
        return self


class ImageOptions(SonifyOptions):
    scan: ScanMode = "columns"
    grid: int = Field(default=6, ge=2, le=12, description="Region count for scan='regions'.")
    legend: list[str] | None = Field(
        default=None,
        max_length=12,
        description="Optional colour ramp stops as #rrggbb, low → high.",
    )
    rotate: int = Field(default=0, description="Reserved; only 0 is accepted.")

    @model_validator(mode="after")
    def _check_image(self) -> "ImageOptions":
        if self.rotate != 0:
            raise ValueError("rotate is not supported")
        if self.legend:
            for stop in self.legend:
                if not (isinstance(stop, str) and len(stop) == 7 and stop.startswith("#")):
                    raise ValueError("legend entries must look like #rrggbb")
                int(stop[1:], 16)  # raises ValueError for bad hex
        return self


class ImageUrlRequest(StrictModel):
    image_url: str = Field(min_length=8, max_length=2048)
    options: ImageOptions = Field(default_factory=ImageOptions)
    debug: bool = False


class VideoOptions(ImageOptions):
    frames: int = Field(default=8, ge=1, le=12)


class VideoUrlRequest(StrictModel):
    video_url: str = Field(min_length=8, max_length=2048)
    options: VideoOptions = Field(default_factory=VideoOptions)
    debug: bool = False


__all__ = [
    "Caption",
    "DataRequest",
    "ImageOptions",
    "ImageUrlRequest",
    "MusicalNote",
    "MusicalScore",
    "MusicalTrack",
    "Provenance",
    "RawSoundScore",
    "ScoreEvent",
    "ScoreSource",
    "SonifyOptions",
    "TrackParams",
    "VideoOptions",
    "VideoUrlRequest",
]

"""Scales, note names and pitch maths shared by both sonifiers.

The scale sets and per-variable roots mirror ``src/preview/lib/music.js``
exactly, so a score produced here sounds like the frontend's live preview:

    T2M           D3  (MIDI 50)   Dorian / minor / major
    PRECTOTCORR   G3  (MIDI 55)   G major pentatonic
    WS10M         D2  (MIDI 38)   D minor pentatonic

Keys are spelled with ASCII accidentals because Tone.js only parses ``#`` and
``b``. ``midi_to_name`` therefore returns exactly the names the browser uses.
"""

from __future__ import annotations

import math

NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

PITCH_CLASSES = {
    "C": 0,
    "C#": 1,
    "DB": 1,
    "D": 2,
    "D#": 3,
    "EB": 3,
    "E": 4,
    "FB": 4,
    "F": 5,
    "E#": 5,
    "F#": 6,
    "GB": 6,
    "G": 7,
    "G#": 8,
    "AB": 8,
    "A": 9,
    "A#": 10,
    "BB": 10,
    "B": 11,
    "CB": 11,
    "B#": 0,
}

# Exact intervals from the frontend SCALES table.
SCALE_INTERVALS: dict[str, tuple[int, ...]] = {
    "major": (0, 2, 4, 5, 7, 9, 11),
    "minor": (0, 2, 3, 5, 7, 8, 10),
    "dorian": (0, 2, 3, 5, 7, 9, 10),
    "phrygian": (0, 1, 3, 5, 7, 8, 10),
    "majorPentatonic": (0, 2, 4, 7, 9),
    "minorPentatonic": (0, 3, 5, 7, 10),
}

SCALE_LABELS = {
    "major": "major",
    "minor": "minor",
    "dorian": "Dorian",
    "phrygian": "Phrygian",
    "majorPentatonic": "major pentatonic",
    "minorPentatonic": "minor pentatonic",
}

_ALIASES = {
    "ionian": "major",
    "aeolian": "minor",
    "maj": "major",
    "min": "minor",
    "major_pentatonic": "majorPentatonic",
    "major-pentatonic": "majorPentatonic",
    "majpent": "majorPentatonic",
    "minor_pentatonic": "minorPentatonic",
    "minor-pentatonic": "minorPentatonic",
    "minpent": "minorPentatonic",
    "dorianmode": "dorian",
    "phrygianmode": "phrygian",
}

VOICE_CONFIG: dict[str, dict] = {
    "T2M": {"root_midi": 50, "bpm": 66, "rack": "temperature", "default_scale": "dorian"},
    "PRECTOTCORR": {"root_midi": 55, "bpm": 76, "rack": "rain", "default_scale": "majorPentatonic"},
    "WS10M": {"root_midi": 38, "bpm": 58, "rack": "wind", "default_scale": "minorPentatonic"},
}

DEFAULT_VOICE = {"root_midi": 50, "bpm": 72, "rack": "temperature", "default_scale": "dorian"}


class ScaleSpec:
    __slots__ = ("key", "key_pc", "scale_id", "intervals")

    def __init__(self, key: str, scale_id: str) -> None:
        self.key = key.upper().replace("♯", "#").replace("♭", "b")
        self.key_pc = PITCH_CLASSES.get(self.key, 2)
        self.scale_id = scale_id
        self.intervals = SCALE_INTERVALS[scale_id]

    @property
    def name(self) -> str:
        return f"{NOTE_NAMES[self.key_pc]} {SCALE_LABELS[self.scale_id]}"

    @property
    def scale_label(self) -> str:
        return SCALE_LABELS[self.scale_id]


def _canonical_scale(token: str) -> str | None:
    cleaned = token.strip().replace(" ", "").replace("_", "").replace("-", "").lower()
    table = {
        "major": "major",
        "minor": "minor",
        "dorian": "dorian",
        "phrygian": "phrygian",
        "majorpentatonic": "majorPentatonic",
        "minorpentatonic": "minorPentatonic",
    }
    if cleaned in table:
        return table[cleaned]
    return _ALIASES.get(token.strip().lower())


def parse_scale(spec: str | None, default_key: str = "D", default_scale: str = "dorian") -> ScaleSpec:
    """Parse ``'D dorian'``, ``'dorian'`` or ``None``.

    The key is only read from the spec when a second token is present, so a
    bare ``'D'`` is treated as a key with the default scale rather than as an
    unknown scale name.
    """
    key = (default_key or "D").strip()
    scale_id = default_scale

    if spec:
        text = spec.strip()
        tokens = [token for token in text.replace(",", " ").split() if token]
        if len(tokens) == 1:
            found = _canonical_scale(tokens[0])
            if found:
                scale_id = found
            elif tokens[0].upper() in PITCH_CLASSES:
                key = tokens[0].upper()
            else:
                raise ValueError(
                    f"Unknown scale '{spec}'. Choose from {', '.join(SCALE_INTERVALS)}."
                )
        elif len(tokens) >= 2:
            candidate_key = tokens[0].upper()
            candidate_scale = _canonical_scale(" ".join(tokens[1:])) or _canonical_scale(tokens[1])
            if candidate_key in PITCH_CLASSES and candidate_scale:
                key = candidate_key
                scale_id = candidate_scale
            else:
                raise ValueError(
                    f"Unknown scale '{spec}'. Use a key plus a scale, e.g. 'D dorian'."
                )
        else:
            raise ValueError("scale must not be empty")

    key = key.upper()
    key_pc = PITCH_CLASSES.get(key)
    if key_pc is None:
        raise ValueError(f"Unknown key '{key}'.")
    return ScaleSpec(NOTE_NAMES[key_pc], scale_id)


def midi_to_name(midi: float | None) -> str:
    if midi is None or not math.isfinite(midi):
        return "—"
    value = int(round(midi))
    return f"{NOTE_NAMES[value % 12]}{value // 12 - 1}"


def midi_to_freq(midi: float) -> float:
    if not math.isfinite(midi):
        raise ValueError("midi must be finite")
    return 440.0 * (2.0 ** ((midi - 69.0) / 12.0))


def freq_to_midi(freq: float) -> float:
    if not math.isfinite(freq) or freq <= 0:
        raise ValueError("freq must be positive")
    return 69.0 + 12.0 * math.log2(freq / 440.0)


def scale_midi(root_midi: int, scale: ScaleSpec, octaves: int = 2) -> list[int]:
    notes: list[int] = []
    for octave in range(max(1, octaves)):
        for degree in scale.intervals:
            value = root_midi + octave * 12 + degree
            if 0 <= value <= 127:
                notes.append(value)
    return notes


def scale_pitch_classes(scale: ScaleSpec) -> set[int]:
    return {(scale.key_pc + interval) % 12 for interval in scale.intervals}


def quantize_midi(midi: float, scale: ScaleSpec, lo: int = 24, hi: int = 108) -> int:
    """Nearest MIDI note whose pitch class belongs to the scale.

    Ties resolve downwards, which keeps repeated values stable. The result is
    clamped into ``[lo, hi]``; a scale always contains a candidate there.
    """
    if not math.isfinite(midi):
        raise ValueError("midi must be finite")
    target = int(round(midi))
    classes = scale_pitch_classes(scale)
    for distance in range(0, 13):
        for candidate in (target - distance, target + distance):
            if lo <= candidate <= hi and candidate % 12 in classes:
                return candidate
    return max(lo, min(hi, target))


def degree_midi(root_midi: int, scale: ScaleSpec, degree: int) -> int:
    size = len(scale.intervals)
    octave, index = divmod(degree, size)
    return root_midi + octave * 12 + scale.intervals[index]


def chord_midis(root_midi: int, scale: ScaleSpec, degree: int = 0, steps: tuple[int, ...] = (0, 2, 4)) -> list[int]:
    return [degree_midi(root_midi, scale, degree + step) for step in steps]


def snap_beats(beats: float, grid: float = 0.5) -> float:
    if grid <= 0:
        return max(0.0, beats)
    return max(0.0, round(beats / grid) * grid)


def scale_notes_for_variable(variable_id: str, spec: str | None, key: str) -> ScaleSpec:
    voice = VOICE_CONFIG.get(variable_id, DEFAULT_VOICE)
    return parse_scale(spec, default_key=key, default_scale=voice["default_scale"])


__all__ = [
    "DEFAULT_VOICE",
    "NOTE_NAMES",
    "PITCH_CLASSES",
    "SCALE_INTERVALS",
    "SCALE_LABELS",
    "VOICE_CONFIG",
    "ScaleSpec",
    "chord_midis",
    "degree_midi",
    "freq_to_midi",
    "midi_to_freq",
    "midi_to_name",
    "parse_scale",
    "quantize_midi",
    "scale_midi",
    "scale_notes_for_variable",
    "scale_pitch_classes",
    "snap_beats",
]

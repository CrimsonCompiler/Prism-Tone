"""Tabular NASA series → raw sound score.

The stage is deliberately mechanical, so every musical decision can be traced
back to one number:

  * fill values are already ``null`` from ``preview_power``; nothing is imputed;
  * the observed range is the 1st–99th percentile of the loaded record;
  * a 1991–2020 monthly normal is used when that calendar month has at least
    75 % baseline coverage — otherwise a labelled fallback is recorded;
  * pitch comes from a min–max position and an EMA-smoothed value;
  * the anomaly ``z = (value - normal) / sigma`` sets brightness and colour;
  * the month-to-month change sets rhythmic density;
  * a missing month produces no event at all.

No random numbers are used. Given the same series and options, the score is
byte-for-byte reproducible.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from .models import RawSoundScore, ScoreEvent, ScoreSource, SonifyOptions
from .scales import DEFAULT_VOICE, VOICE_CONFIG, midi_to_freq, midi_to_name

BASELINE_START = 1991
BASELINE_END = 2020
MIN_BASELINE_COVERAGE = 0.75
PERCENTILES = (1.0, 99.0)
MONTH_BEATS = 2
SIGMA_FLOORS = {"T2M": 0.4, "PRECTOTCORR": 0.2, "WS10M": 0.3}
DEFAULT_SIGMA_FLOOR = 0.25
MAX_MONTHS = 2400


def month_key(year: int, month: int) -> str:
    return f"{year}{month:02d}"


def _parse_key(key: str) -> tuple[int, int] | None:
    if len(key) != 6 or not key.isdigit() or key.endswith("13"):
        return None
    year, month = int(key[:4]), int(key[4:])
    if not (1 <= month <= 12) or not (1800 <= year <= 2200):
        return None
    return year, month


def month_label(year: int, month: int) -> str:
    names = (
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    )
    return f"{names[month - 1]} {year}"


@dataclass
class Point:
    key: str
    year: int
    month: int
    value: float | None
    smoothed: float | None
    norm: float | None
    normal: float | None
    sigma: float | None
    z: float | None
    change: float
    missing: bool


@dataclass
class VariablePlan:
    id: str
    points: list[Point]
    lo: float
    hi: float
    valid: int
    missing: int
    normal_source: str
    coverage: float
    mean_z: float | None
    mean_norm: float | None
    mean_change: float
    tempo_base: int
    voice: str
    range_method: str = "p1/p99"
    warnings: list[str] = field(default_factory=list)

    @property
    def observed_range(self) -> tuple[float, float]:
        return self.lo, self.hi


def _clean_series(raw: dict[str, Any], limit: int = MAX_MONTHS) -> dict[str, float | None]:
    """Return ``{YYYYMM: float|None}`` for valid monthly keys only."""
    if not isinstance(raw, dict):
        raise ValueError("series for each variable must be a mapping of YYYYMM to number|null")
    cleaned: dict[str, float | None] = {}
    for key, value in raw.items():
        parsed = _parse_key(str(key))
        if parsed is None:
            continue
        if value is None:
            cleaned[str(key)] = None
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            cleaned[str(key)] = None
            continue
        # NASA POWER uses -999 as its fill flag; treat it exactly like NaN.
        cleaned[str(key)] = number if math.isfinite(number) and number != -999.0 else None
    if len(cleaned) > limit:
        raise ValueError(f"series exceeds the {limit}-month limit")
    if not cleaned:
        raise ValueError("series contains no valid YYYYMM keys")
    return cleaned


def _series_years(cleaned: dict[str, float | None]) -> tuple[int, int]:
    years = [int(key[:4]) for key in cleaned]
    return min(years), max(years)


def _percentile_range(values: np.ndarray) -> tuple[float, float, str]:
    if values.size == 0:
        raise ValueError("series has no numeric values")
    lo, hi = (float(v) for v in np.percentile(values, PERCENTILES))
    method = f"p{PERCENTILES[0]:g}/p{PERCENTILES[1]:g}"
    if not math.isfinite(lo) or not math.isfinite(hi) or hi - lo < 1e-9:
        lo, hi = float(values.min()), float(values.max())
        method = "min/max (degenerate percentiles)"
    if hi - lo < 1e-9:
        lo, hi = lo - 0.5, hi + 0.5
        method = "unit fallback (constant series)"
    return lo, hi, method


def _monthly_stats(
    cleaned: dict[str, float | None],
    variable_id: str,
) -> tuple[dict[int, float], dict[int, float], dict[int, str], float, dict[int, float]]:
    """Calendar-month normal and sigma with an explicit, labelled fallback."""
    all_values = np.array([v for v in cleaned.values() if v is not None], dtype=float)
    global_mean = float(all_values.mean())
    global_sigma = float(all_values.std())
    floor = SIGMA_FLOORS.get(variable_id, DEFAULT_SIGMA_FLOOR)
    if not math.isfinite(global_sigma) or global_sigma < floor:
        global_sigma = floor

    normals: dict[int, float] = {}
    sigmas: dict[int, float] = {}
    sources: dict[int, str] = {}
    coverage_by_month: dict[int, float] = {}

    for month in range(1, 13):
        baseline: list[float] = []
        every: list[float] = []
        for year in range(BASELINE_START, BASELINE_END + 1):
            value = cleaned.get(month_key(year, month))
            if value is not None:
                baseline.append(value)
        for key, value in cleaned.items():
            if value is not None and int(key[4:]) == month:
                every.append(value)

        expected = BASELINE_END - BASELINE_START + 1
        coverage = len(baseline) / expected
        coverage_by_month[month] = coverage

        if coverage >= MIN_BASELINE_COVERAGE:
            values = np.array(baseline, dtype=float)
            normals[month] = float(values.mean())
            sigma = float(values.std())
            sigmas[month] = sigma if sigma >= floor else floor
            sources[month] = "1991-2020 baseline"
        elif len(every) >= 5:
            values = np.array(every, dtype=float)
            normals[month] = float(values.mean())
            sigma = float(values.std())
            sigmas[month] = sigma if sigma >= floor else floor
            sources[month] = "all-years fallback (baseline coverage below 75%)"
        else:
            normals[month] = global_mean
            sigmas[month] = global_sigma
            sources[month] = "record fallback (too few samples for this calendar month)"

    return normals, sigmas, sources, global_mean, coverage_by_month


def _ema(values: list[float | None], alpha: float) -> list[float | None]:
    smoothed: list[float | None] = []
    carry: float | None = None
    for value in values:
        if value is None:
            smoothed.append(None)
            continue
        carry = value if carry is None else alpha * value + (1.0 - alpha) * carry
        smoothed.append(carry)
    return smoothed


def _pan_for(index: int, total: int, longitude: float | None) -> float:
    if longitude is not None and math.isfinite(longitude):
        return max(-0.8, min(0.8, (longitude / 180.0) * 0.8))
    if total <= 1:
        return 0.0
    return round(-0.6 + (1.2 * index / (total - 1)), 3)


def _brightness(variable_id: str, norm: float, z: float | None) -> float:
    if variable_id == "T2M":
        base = 0.5 + 0.2 * math.tanh((z or 0.0) / 2.0)
    elif variable_id == "PRECTOTCORR":
        base = 0.3 + 0.55 * norm
    elif variable_id == "WS10M":
        base = 0.35 + 0.45 * norm
    else:
        base = 0.4 + 0.4 * norm
    return float(max(0.0, min(1.0, base)))


def plan_variable(
    variable_id: str,
    raw_series: dict[str, Any],
    options: SonifyOptions,
    *,
    start: int | None = None,
    end: int | None = None,
    longitude: float | None = None,
    pan_index: int = 0,
    pan_total: int = 1,
) -> VariablePlan:
    cleaned = _clean_series(raw_series)
    inferred_start, inferred_end = _series_years(cleaned)
    first = start if start is not None else inferred_start
    last = end if end is not None else inferred_end
    if first > last:
        raise ValueError(f"{variable_id}: start must be <= end")
    if (last - first + 1) * 12 > MAX_MONTHS:
        raise ValueError(f"{variable_id}: requested range exceeds the {MAX_MONTHS}-month limit")

    keys = [month_key(y, m) for y in range(first, last + 1) for m in range(1, 13)]
    values = [cleaned.get(key) for key in keys]
    numeric = np.array([value for value in values if value is not None], dtype=float)
    if numeric.size == 0:
        raise ValueError(f"{variable_id}: no numeric values in the requested range")

    lo, hi, range_method = _percentile_range(numeric)
    normals, sigmas, normal_sources, _global_mean, coverage_by_month = _monthly_stats(cleaned, variable_id)
    smoothed = _ema(values, options.smooth)

    points: list[Point] = []
    prev_valid: float | None = None
    for key, value, smooth_value in zip(keys, values, smoothed):
        year, month = int(key[:4]), int(key[4:])
        normal = normals[month]
        sigma = sigmas[month]
        is_missing = value is None
        if is_missing:
            points.append(
                Point(key, year, month, None, None, None, normal, sigma, None, 0.0, True)
            )
            continue
        norm = max(0.0, min(1.0, (smooth_value - lo) / (hi - lo))) if smooth_value is not None else 0.5
        z = (value - normal) / sigma if sigma > 0 else 0.0
        change = 0.0
        if prev_valid is not None:
            change = abs(value - prev_valid) / (hi - lo)
        points.append(
            Point(key, year, month, value, smooth_value, norm, normal, sigma, z, change, False)
        )
        prev_valid = value

    valid_points = [point for point in points if not point.missing]
    mean_z = float(np.mean([point.z for point in valid_points])) if valid_points else None
    mean_norm = float(np.mean([point.norm for point in valid_points])) if valid_points else None
    mean_change = float(np.mean([point.change for point in valid_points])) if valid_points else 0.0
    coverage = (
        sum(coverage_by_month.values()) / 12.0 if coverage_by_month else 0.0
    )

    sources = set(normal_sources.values())
    if sources == {"1991-2020 baseline"}:
        normal_source = "1991-2020 baseline"
    elif "1991-2020 baseline" in sources:
        normal_source = "mixed: 1991-2020 where covered, labelled fallback otherwise"
    else:
        normal_source = "fallback (record outside the 1991-2020 baseline)"

    warnings: list[str] = []
    if normal_source != "1991-2020 baseline":
        warnings.append(
            "Baseline coverage below 75% for at least one calendar month; "
            "its normal uses a labelled fallback."
        )
    if range_method != "p1/p99":
        warnings.append(f"Range normalisation used {range_method}.")

    voice = VOICE_CONFIG.get(variable_id, DEFAULT_VOICE)
    return VariablePlan(
        id=variable_id,
        points=points,
        lo=lo,
        hi=hi,
        valid=len(valid_points),
        missing=len(points) - len(valid_points),
        normal_source=normal_source,
        coverage=coverage,
        mean_z=mean_z,
        mean_norm=mean_norm,
        mean_change=mean_change,
        tempo_base=int(voice["bpm"]),
        voice=str(voice["rack"]),
        range_method=range_method,
        warnings=warnings,
    )


def choose_tempo(plans: list[VariablePlan], options: SonifyOptions) -> int:
    if options.tempo is not None:
        return int(options.tempo)
    lead = plans[0]
    position = lead.mean_norm if lead.mean_norm is not None else 0.5
    rhythm = max(0.0, min(1.0, 0.18 + position * 0.82 + lead.mean_change * 0.22))
    tempo = lead.tempo_base + position * 6 + rhythm * 14
    return int(round(max(52, min(96, tempo))))


def build_raw_score(
    series_by_variable: dict[str, dict[str, Any]],
    variables: list[str],
    options: SonifyOptions,
    *,
    source_id: str,
    source_meta: dict[str, Any] | None = None,
    start: int | None = None,
    end: int | None = None,
    longitude: float | None = None,
) -> tuple[RawSoundScore, list[VariablePlan]]:
    """Build the raw score and the per-variable plans used by the simplifier."""
    if not variables:
        raise ValueError("At least one variable is required.")
    missing = [name for name in variables if name not in series_by_variable]
    if missing:
        raise ValueError(f"Missing series for: {', '.join(missing)}")

    plans: list[VariablePlan] = []
    for index, variable_id in enumerate(variables):
        plans.append(
            plan_variable(
                variable_id,
                series_by_variable[variable_id],
                options,
                start=start,
                end=end,
                longitude=longitude,
                pan_index=index,
                pan_total=len(variables),
            )
        )

    tempo = choose_tempo(plans, options)
    seconds_per_beat = 60.0 / tempo
    month_seconds = MONTH_BEATS * seconds_per_beat

    global_start = min(min(point.year for point in plan.points) for plan in plans)
    global_start_month = 1
    total_months = 0
    events: list[ScoreEvent] = []
    for index, plan in enumerate(plans):
        pan = _pan_for(index, len(plans), longitude)
        for point in plan.points:
            if point.missing or point.norm is None:
                continue
            offset_months = (point.year - global_start) * 12 + (point.month - global_start_month)
            total_months = max(total_months, offset_months + 1)
            midi = 48.0 + point.norm * 24.0
            amp = 0.16 + 0.55 * (point.norm ** 1.6)
            events.append(
                ScoreEvent(
                    t=round(offset_months * month_seconds, 6),
                    dur=round(month_seconds * 0.9, 6),
                    freq_hz=round(float(midi_to_freq(midi)), 3),
                    amp=round(float(min(0.78, amp)), 4),
                    pan=pan,
                    brightness=round(_brightness(plan.id, point.norm, point.z), 4),
                    voice=plan.id,
                )
            )

    events.sort(key=lambda event: (event.t, event.voice))
    duration = max(
        (event.t + event.dur for event in events),
        default=total_months * month_seconds,
    )
    meta = {
        "variables": variables,
        "months": total_months,
        "tempo_bpm": tempo,
        "beats_per_month": MONTH_BEATS,
        "range": {
            "method": "p1/p99",
            "by_variable": {
                plan.id: {
                    "lo": round(plan.lo, 6),
                    "hi": round(plan.hi, 6),
                    "method": plan.range_method,
                }
                for plan in plans
            },
        },
        "normal_baseline": "1991-2020",
        "normal_source": plans[0].normal_source,
    }
    if source_meta:
        meta.update(source_meta)
    raw = RawSoundScore(
        source=ScoreSource(kind="data", id=source_id, meta=meta),
        duration_s=round(duration, 6),
        events=events,
    )
    return raw, plans


def point_summary(plan: VariablePlan) -> str:
    """Small helper used by captions/tests to name a plan's range honestly."""
    return f"{plan.id}: {plan.valid} values, {plan.missing} missing, range {plan.lo:.3f}–{plan.hi:.3f}"


__all__ = [
    "BASELINE_END",
    "BASELINE_START",
    "MAX_MONTHS",
    "MONTH_BEATS",
    "Point",
    "VariablePlan",
    "build_raw_score",
    "choose_tempo",
    "month_key",
    "month_label",
    "plan_variable",
    "point_summary",
]

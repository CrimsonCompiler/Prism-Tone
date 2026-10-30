"""Full-record NASA POWER monthly series with a persistent cache.

The Preview page samples seven continental centroids and needs the complete
1981–2025 monthly record for T2M, PRECTOTCORR and WS10M. The companion app's
gridded cache only covers recent snapshots (and only one parameter), so this
module queries NASA POWER directly, validates every value and keeps a
persistent JSON copy under ``data/cache/power/``. A warmed cache means the
demo can run with no internet at all.

Integrity rules:
  * fill values (-999) become ``null`` — never 0
  * a parameter with fewer than 12 valid months is rejected
  * stale cache is served only when the upstream request fails, and the
    response says so (``stale: true``)
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from .cache import upstream_cache

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "cache" / "power"

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
PARAMETERS = ("T2M", "PRECTOTCORR", "WS10M")
DEFAULT_START = 1981
DEFAULT_END = 2025
FILL = -999.0
TIMEOUT = 25.0
DISK_TTL = 24 * 3600  # refresh the persisted copy once a day
MIN_VALID_MONTHS = 12

_memo: dict[str, tuple[float, dict[str, Any]]] = {}
_locks: dict[str, asyncio.Lock] = {}


class PowerUpstreamError(RuntimeError):
    """Raised when neither the upstream nor a cached copy can answer."""


def _clean_parameters(parameters: str | None) -> tuple[str, ...]:
    if not parameters:
        return PARAMETERS
    wanted = tuple(part.strip().upper() for part in parameters.split(",") if part.strip())
    unknown = [part for part in wanted if part not in PARAMETERS]
    if unknown:
        raise ValueError(f"Unknown POWER parameter(s): {', '.join(unknown)}. Choose from {', '.join(PARAMETERS)}.")
    if not wanted:
        raise ValueError("At least one POWER parameter is required.")
    return wanted


def _cache_key(cache_id: str | None, lat: float, lon: float, start: int, end: int, params: tuple[str, ...]) -> str:
    if cache_id:
        base = f"div-{cache_id}"
    else:
        base = f"{lat:.2f}_{lon:.2f}"
    return f"{base}_{start}-{end}_{'-'.join(params)}"


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key}.json"


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_disk(key: str) -> dict[str, Any] | None:
    path = _cache_path(key)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(payload, dict) or payload.get("v") != 1 or not isinstance(payload.get("series"), dict):
        return None
    return payload


def _write_disk(key: str, series: dict[str, Any], meta: dict[str, Any]) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path = _cache_path(key)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps({"v": 1, "at": time.time(), "series": series, "meta": meta}, ensure_ascii=False),
            encoding="utf-8",
        )
        os.replace(tmp, path)
    except OSError:
        # A read-only deployment can still answer from memory/upstream.
        pass


def _sanitize_parameter(raw: Any) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    if not isinstance(raw, dict):
        return out
    for key, value in raw.items():
        key = str(key)
        # Exclude the API's annual slot (YYYY13); the app works in months.
        if len(key) != 6 or not key.isdigit() or key.endswith("13"):
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            out[key] = None
            continue
        out[key] = number if math.isfinite(number) and number != FILL else None
    return out


def validate_power_payload(payload: Any, params: tuple[str, ...]) -> dict[str, Any]:
    """Validate a raw POWER Feature and return ``{series, meta}``.

    Raises ValueError when the response is unusable. A real response is
    required for every requested parameter; nothing is filled in.
    """
    if not isinstance(payload, dict):
        raise ValueError("POWER response was not a JSON object")
    parameter = (payload.get("properties") or {}).get("parameter")
    if not isinstance(parameter, dict):
        raise ValueError("POWER response is missing properties.parameter")

    series: dict[str, dict[str, float | None]] = {}
    for name in params:
        cleaned = _sanitize_parameter(parameter.get(name))
        if sum(1 for value in cleaned.values() if value is not None) < MIN_VALID_MONTHS:
            raise ValueError(f"POWER parameter {name} contained fewer than {MIN_VALID_MONTHS} valid months")
        series[name] = cleaned

    header = payload.get("header") or {}
    geometry = payload.get("geometry") or {}
    coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
    meta = {
        "apiVersion": (header.get("api") or {}).get("version") if isinstance(header.get("api"), dict) else None,
        "sources": header.get("sources") if isinstance(header.get("sources"), list) else [],
        "messages": header.get("messages") if isinstance(header.get("messages"), list) else [],
        "elevation": coordinates[2] if isinstance(coordinates, list) and len(coordinates) > 2 else None,
        "fetchedAt": _iso_now(),
        "upstream": "NASA POWER",
    }
    return {"series": series, "meta": meta}


async def _fetch_upstream(lat: float, lon: float, start: int, end: int, params: tuple[str, ...]) -> dict[str, Any]:
    query = {
        "parameters": ",".join(params),
        "community": "RE",
        "longitude": f"{lon:.4f}",
        "latitude": f"{lat:.4f}",
        "start": str(start),
        "end": str(end),
        "format": "JSON",
    }
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        response = await client.get(POWER_URL, params=query)
        response.raise_for_status()
        return validate_power_payload(response.json(), params)


def _public(raw: dict[str, Any], *, cached: bool, stale: bool = False) -> dict[str, Any]:
    return {
        "series": raw["series"],
        "meta": raw["meta"],
        "cached": cached,
        "stale": stale,
        "source": "NASA POWER / MERRA-2 monthly",
    }


async def fetch_point(
    lat: float,
    lon: float,
    start: int = DEFAULT_START,
    end: int = DEFAULT_END,
    parameters: str | None = None,
    *,
    refresh: bool = False,
    cache_id: str | None = None,
) -> dict[str, Any]:
    """Return a validated monthly series for one point, cache-first."""
    if not -90 <= lat <= 90:
        raise ValueError("Latitude must be between -90 and 90.")
    if not -180 <= lon <= 180:
        raise ValueError("Longitude must be between -180 and 180.")
    if not 1981 <= start <= end <= 2025:
        raise ValueError("Years must satisfy 1981 <= start <= end <= 2025.")
    params = _clean_parameters(parameters)
    key = _cache_key(cache_id, lat, lon, start, end, params)

    memory = upstream_cache.get(key)
    if memory is not None and not refresh:
        return {**memory, "cacheHit": True}

    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        memory = upstream_cache.get(key)
        if memory is not None and not refresh:
            return {**memory, "cacheHit": True}

        disk = _read_disk(key)
        disk_age = time.time() - disk["at"] if disk else None
        if disk and not refresh and disk_age is not None and disk_age < DISK_TTL:
            result = _public(disk, cached=True)
            upstream_cache.set(key, result)
            return {**result, "cacheHit": True}

        try:
            live = await _fetch_upstream(lat, lon, start, end, params)
            _write_disk(key, live["series"], live["meta"])
            result = _public(live, cached=False)
            upstream_cache.set(key, result)
            return result
        except Exception as exc:
            if disk:
                result = _public(disk, cached=True, stale=True)
                result["meta"] = {**result["meta"], "staleReason": str(exc)[:300]}
                upstream_cache.set(key, result)
                return result
            if isinstance(exc, ValueError):
                raise
            raise PowerUpstreamError(f"NASA POWER could not be reached: {exc}") from exc


async def fetch_divisions(
    start: int = DEFAULT_START,
    end: int = DEFAULT_END,
    parameters: str | None = None,
    *,
    refresh: bool = False,
) -> dict[str, Any]:
    """Fetch the seven continental samples concurrently and report each outcome."""
    from .divisions import DIVISIONS

    params = _clean_parameters(parameters)

    async def one(division: dict) -> tuple[str, dict[str, Any] | None, dict[str, Any]]:
        try:
            data = await fetch_point(
                division["lat"],
                division["lon"],
                start,
                end,
                parameters,
                refresh=refresh,
                cache_id=division["id"],
            )
            return division["id"], data, {"ok": True, "cached": data["cached"]}
        except Exception as exc:  # a single continent must not fail the request
            return division["id"], None, {"ok": False, "cached": False, "error": str(exc)[:300]}

    results = await asyncio.gather(*(one(division) for division in DIVISIONS))

    divisions: dict[str, Any] = {}
    outcomes: dict[str, Any] = {}
    fetched: list[str] = []
    for division_id, data, outcome in results:
        outcomes[division_id] = outcome
        if data is not None:
            divisions[division_id] = data
            fetched.append(data["meta"].get("fetchedAt", ""))
        else:
            divisions[division_id] = None

    ok = len(divisions)
    meta = {
        "apiVersion": next(
            (entry["meta"].get("apiVersion") for entry in divisions.values() if entry and entry["meta"].get("apiVersion")),
            None,
        ),
        "sources": next(
            (entry["meta"].get("sources") for entry in divisions.values() if entry and entry["meta"].get("sources")),
            [],
        ),
        "fetchedAt": max(fetched) if fetched else None,
        "parameters": list(params),
        "start": start,
        "end": end,
        "upstream": "NASA POWER",
    }
    return {
        "divisions": divisions,
        "outcomes": outcomes,
        "meta": meta,
        "count": ok,
        "total": len(DIVISIONS),
        "cached": all(outcome.get("cached") for outcome in outcomes.values()) if outcomes else False,
        "source": "NASA POWER / MERRA-2 monthly",
    }


def cache_status() -> dict[str, Any]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(CACHE_DIR.glob("div-*.json"))
    newest = None
    for path in files:
        try:
            newest = max(newest or 0, path.stat().st_mtime)
        except OSError:
            continue
    return {
        "ready": len(files) == 7,
        "files": len(files),
        "generatedAt": (
            datetime.fromtimestamp(newest, tz=timezone.utc).isoformat() if newest else None
        ),
    }

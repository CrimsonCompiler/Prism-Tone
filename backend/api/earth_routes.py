"""Cached Earth-observation routes carried over from the companion API.

These endpoints serve the prepared NASA cache in ``data/cache/`` and are
kept for parity with the companion apps:
  * /api/layers     four cached tracks (temperature, fires, vegetation, water)
  * /api/series     point series from the cached grids or live POWER
  * /api/hotspots   cached thermal anomalies for a date
  * /api/describe   plain-language description computed from real values

The Preview page itself uses /api/preview/series (full-record POWER), not the
12-frame grids, because it needs 1981–2025 and three parameters per point.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from services import datasets, live
from services.cache import upstream_cache
from services import preview_power

router = APIRouter(prefix="/api", tags=["earth observation"])

APP_VERSION = "2.0.0"
LAYERS = ("temperature", "fires", "vegetation", "water")


def _require_layer(layer: str) -> str:
    if layer not in LAYERS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown layer '{layer}'. Choose one of: {', '.join(LAYERS)}.",
        )
    return layer


@router.get("/health")
async def health() -> dict:
    status = datasets.cache_status()
    preview = preview_power.cache_status()
    return {
        "status": "ok" if status["ready"] else "degraded",
        "service": "prism-tone",
        "version": APP_VERSION,
        "time": datetime.now(timezone.utc).isoformat(),
        "cache": status,
        "preview": preview,
        "live": {
            "power": os.getenv("PRISM_TONE_LIVE", "1") != "0",
            "firms": bool(os.getenv("FIRMS_MAP_KEY", "").strip()),
        },
        "layers": list(LAYERS),
    }


@router.get("/layers")
async def layers() -> dict:
    data = datasets.layer_list()
    return {
        "layers": data,
        "count": len(data),
        "cached": True,
        "generatedAt": datasets.cache_status().get("generatedAt"),
    }


@router.get("/series")
async def series(
    layer: str = Query(..., description="temperature | fires | vegetation | water"),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start: str | None = Query(None, description="ISO date; filters the cached window"),
    end: str | None = Query(None, description="ISO date; filters the cached window"),
    cached: bool = Query(False, description="Set true to skip upstream and serve cache immediately"),
) -> dict:
    _require_layer(layer)
    key = f"series:{layer}:{lat:.2f}:{lon:.2f}:{'cache' if cached else 'live'}"
    hit = upstream_cache.get(key)
    if hit is not None:
        return {**hit, "cacheHit": True}

    payload = None
    if layer == "temperature" and cached is False and os.getenv("PRISM_TONE_LIVE", "1") != "0":
        payload = await live.power_series(lat, lon)
    if payload is None and layer == "temperature":
        # The default path stays fully offline; live POWER is opt-in with cached=false.
        payload = datasets.series_from_power(datasets.power_grid(), lat, lon)
    elif payload is None:
        payload = datasets.series_from_grid(layer, lat, lon)

    if start or end:
        dates = payload["dates"]
        mask = [
            i
            for i, date in enumerate(dates)
            if (not start or date >= start) and (not end or date <= end)
        ]
        if mask:
            for field in ("dates", "values", "normalized", "anomaly"):
                payload[field] = [payload[field][i] for i in mask]

    payload = {**payload, "cacheHit": False, "generatedAt": datetime.now(timezone.utc).isoformat()}
    upstream_cache.set(key, payload)
    return payload


@router.get("/hotspots")
async def hotspots(
    layer: str = Query("fires"),
    date: str = Query(..., description="ISO date, e.g. 2025-10-15"),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
) -> dict:
    _require_layer(layer)
    if layer != "fires":
        return {"layer": layer, "date": date, "points": [], "count": 0, "cached": True}

    cached_data = datasets.hotspots()
    entry = cached_data.get("fires") or {"dates": [], "frames": []}
    dates = entry.get("dates", [])
    index = datasets.nearest_index(dates, date)
    points = entry.get("frames", [])[index] if entry.get("frames") else []

    live_points = None
    if lat is not None and lon is not None:
        live_points = await live.firms_hotspots(date, lat, lon)
    if live_points:
        return {
            "layer": "fires",
            "date": date,
            "points": live_points,
            "count": len(live_points),
            "cached": False,
            "upstream": "NASA FIRMS",
        }
    return {
        "layer": "fires",
        "date": dates[index] if dates else date,
        "points": points,
        "count": len(points),
        "cached": True,
        "source": "MODIS/Terra thermal anomalies · cached GIBS aggregate",
    }


@router.get("/describe")
async def describe(
    layer: str = Query(...),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    date: str = Query(...),
) -> dict:
    _require_layer(layer)
    try:
        return datasets.describe_point(layer, lat, lon, date)
    except FileNotFoundError as exc:
        raise exc
    except Exception as exc:  # never let a bad date break the map
        raise HTTPException(status_code=422, detail=f"Could not describe this point: {exc}") from exc


@router.get("/cache/clear", include_in_schema=False)
async def clear_cache() -> dict:
    # Read-only public deployment: only allow clearing when explicitly enabled.
    if os.getenv("PRISM_TONE_ALLOW_CACHE_CLEAR", "0") != "1":
        raise HTTPException(status_code=403, detail="Cache clearing is disabled.")
    upstream_cache.clear()
    return {"status": "cleared"}

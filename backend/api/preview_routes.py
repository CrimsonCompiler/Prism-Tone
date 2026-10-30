"""Preview-specific POWER routes.

``/api/preview/series`` returns the complete 1981–2025 monthly record for the
seven continental sample points in one response, so the browser makes a single
request instead of seven. ``/api/power/series`` exposes the same validated
reader for any point.

Both are cache-first (persisted under ``data/cache/power/``) and never invent a
value: missing months are ``null`` and the response says whether it came from
disk, memory or a live upstream request.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from services import preview_power

router = APIRouter(prefix="/api", tags=["preview"])


@router.get("/preview/series")
async def preview_series(
    start: int = Query(preview_power.DEFAULT_START, ge=1981, le=2025),
    end: int = Query(preview_power.DEFAULT_END, ge=1981, le=2025),
    parameters: str | None = Query(None, description="Comma-separated POWER parameters"),
    refresh: bool = Query(False, description="Ignore fresh cache and ask NASA POWER again"),
) -> dict:
    if start > end:
        raise HTTPException(status_code=422, detail="start must be <= end")
    try:
        payload = await preview_power.fetch_divisions(start, end, parameters, refresh=refresh)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except preview_power.PowerUpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if payload["count"] == 0:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "upstream_unavailable",
                "message": "No continental series could be loaded and no warmed cache exists.",
                "outcomes": payload["outcomes"],
            },
        )
    return payload


@router.get("/power/series")
async def power_series(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start: int = Query(preview_power.DEFAULT_START, ge=1981, le=2025),
    end: int = Query(preview_power.DEFAULT_END, ge=1981, le=2025),
    parameters: str | None = Query(None),
    refresh: bool = Query(False),
) -> dict:
    if start > end:
        raise HTTPException(status_code=422, detail="start must be <= end")
    try:
        payload = await preview_power.fetch_point(lat, lon, start, end, parameters, refresh=refresh)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except preview_power.PowerUpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {**payload, "lat": round(lat, 3), "lon": round(lon, 3)}

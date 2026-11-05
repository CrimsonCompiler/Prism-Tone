"""Sonification routes.

    POST /api/sonify/data        inline series, stored csv_id, or a POWER location
    POST /api/sonify/data/csv    multipart CSV upload (returns a csv_id)
    POST /api/sonify/image       multipart file or JSON {image_url}
    POST /api/sonify/video       multipart file or JSON {video_url}
    GET  /api/sonify/schema      exported RawSoundScore / MusicalScore schemas
    GET  /api/sonify/health      capabilities, limits and cache state

Every route returns a validated MusicalScore. ``?debug=1`` (or ``debug: true``)
adds the intermediate RawSoundScore. Scores are cached by a hash of the actual
input and options; existing preview routes are untouched.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from starlette.concurrency import run_in_threadpool

from services import preview_power
from services.divisions import DIVISION_BY_ID

from sonify.data_sonifier import MAX_MONTHS, build_raw_score
from sonify.image_sonifier import MAX_BYTES, build_image_score
from sonify.models import (
    DataRequest,
    ImageOptions,
    ImageUrlRequest,
    MusicalScore,
    RawSoundScore,
    SonifyOptions,
    VideoOptions,
    VideoUrlRequest,
)
from sonify.repository import (
    CSV_MAX_BYTES,
    RemoteFetchError,
    build_key,
    cache_status,
    fetch_remote,
    load_csv_bytes,
    parse_monthly_csv,
    read_score,
    save_csv,
    write_score,
)
from sonify.simplifier import simplify_data
from sonify.video_source import MAX_VIDEO_BYTES, build_video_score

router = APIRouter(prefix="/api/sonify", tags=["sonify"])

VERSION = "1.0"
COMPUTE_TIMEOUT_S = 20.0
LIVE_VARIABLES = ("T2M", "PRECTOTCORR", "WS10M")
_LATLON = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$")


def _error(status: int, code: str, detail: str, hint: str | None = None) -> HTTPException:
    payload: dict[str, Any] = {"error": code, "detail": detail}
    if hint:
        payload["hint"] = hint
    return HTTPException(status_code=status, detail=payload)


def _canonical(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()


def _clean_variables(series: dict[str, Any], requested: list[str]) -> list[str]:
    keys = list(series.keys())
    # A default ["T2M"] applied to an inline series that has no T2M should use
    # the series it was given rather than inventing a missing parameter.
    if requested == ["T2M"] and "T2M" not in series and keys:
        requested = keys
    if not requested and keys:
        requested = keys[:3]
    if not requested:
        raise _error(422, "missing_variables", "variables must contain at least one parameter")
    if len(requested) > 3:
        raise _error(422, "too_many_variables", "At most three variables can be sonified together.")
    missing = [name for name in requested if name not in series]
    if missing:
        raise _error(
            422,
            "missing_series",
            f"No series supplied for: {', '.join(missing)}. Available: {', '.join(keys)}",
        )
    return requested


def _response(
    *,
    musical: MusicalScore,
    raw: RawSoundScore,
    key: str,
    debug: bool,
    cached: bool,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "version": VERSION,
        "source": raw.source.model_dump(),
        "musical_score": musical.model_dump(),
        "cache": {"hit": cached, "key": key},
    }
    if debug:
        payload["raw_score"] = raw.model_dump()
    if extra:
        payload.update(extra)
    return payload


async def _data_score(request: DataRequest) -> dict[str, Any]:
    series_meta: dict[str, Any] = {}
    source_id = ""
    descriptor: dict[str, Any]
    location_meta: dict[str, Any] = {}

    if request.series is not None:
        series = {
            str(name).strip().upper(): mapping
            for name, mapping in request.series.items()
        }
        variables = _clean_variables(series, list(request.variables))
        descriptor = {"kind": "inline", "series": _canonical(series), "variables": variables}
        source_id = f"inline-{_canonical(series)[:12]}"
        series_meta = {"input": "inline series"}
    elif request.csv_id is not None:
        raw_bytes = await run_in_threadpool(load_csv_bytes, request.csv_id)
        try:
            series, parsed_meta = await run_in_threadpool(
                parse_monthly_csv,
                raw_bytes,
                None if request.variables == ["T2M"] else list(request.variables),
            )
        except ValueError as exc:
            raise _error(422, "invalid_csv", str(exc)) from exc
        # Re-filter with the actual columns when the default variable list was used.
        variables = _clean_variables(series, list(request.variables))
        descriptor = {
            "kind": "csv",
            "csv_id": request.csv_id,
            "series": _canonical(series),
            "variables": variables,
        }
        source_id = f"csv-{request.csv_id[:12]}"
        series_meta = {"input": "csv", **parsed_meta}
    elif request.location is not None:
        dataset = (request.dataset or "power").strip().lower()
        if dataset not in {"power", "nasa_power", "nasa-power", "merra-2"}:
            raise _error(
                422,
                "unknown_dataset",
                f"Unsupported dataset '{request.dataset}'. This build supports NASA POWER only.",
            )
        variables = _clean_variables({name: True for name in LIVE_VARIABLES}, list(request.variables))
        start = request.start or preview_power.DEFAULT_START
        end = request.end or preview_power.DEFAULT_END
        location = request.location.strip()
        if location in DIVISION_BY_ID:
            division = DIVISION_BY_ID[location]
            lat, lon = division["lat"], division["lon"]
            cache_id = division["id"]
            location_meta = {"location": division["name"], "division": division["id"], "lat": lat, "lon": lon}
        else:
            match = _LATLON.match(location)
            if not match:
                raise _error(
                    422,
                    "bad_location",
                    "location must be a division id or 'lat,lon'.",
                    f"Divisions: {', '.join(sorted(DIVISION_BY_ID))}",
                )
            lat, lon = float(match.group(1)), float(match.group(2))
            cache_id = None
            location_meta = {"location": f"{lat:.2f},{lon:.2f}", "lat": lat, "lon": lon}
        try:
            payload = await preview_power.fetch_point(
                lat,
                lon,
                start,
                end,
                ",".join(variables),
                cache_id=cache_id,
            )
        except ValueError as exc:
            raise _error(422, "invalid_power_request", str(exc)) from exc
        except preview_power.PowerUpstreamError as exc:
            raise _error(
                503,
                "upstream_unavailable",
                str(exc),
                "Warm the POWER cache (scripts/warm_power_cache.py) or retry later.",
            ) from exc
        series = {name: payload["series"][name] for name in variables}
        descriptor = {
            "kind": "power",
            "series": _canonical(series),
            "variables": variables,
            "start": start,
            "end": end,
        }
        source_id = f"power-{location_meta['location']}"
        series_meta = {
            "input": "NASA POWER",
            "fetchedAt": payload["meta"].get("fetchedAt"),
            "location": location_meta,
        }

    else:  # pragma: no cover - guarded by DataRequest validation
        raise _error(422, "missing_source", "Provide series, csv_id or location.")

    options = request.options
    key = build_key(
        {
            "endpoint": "data",
            "source": descriptor,
            "options": options.model_dump(),
        }
    )
    cached = read_score(key)
    if cached:
        stored = cached["payload"]
        return _response(
            musical=MusicalScore.model_validate(stored["musical_score"]),
            raw=RawSoundScore.model_validate(stored["raw_score"]),
            key=key,
            debug=request.debug,
            cached=True,
            extra=({"csv_id": request.csv_id} if request.csv_id else None),
        )

    source_meta = {
        "input": series_meta.get("input", "series"),
        "variables": variables,
        **{k: v for k, v in series_meta.items() if k not in {"input", "variables"}},
        **location_meta,
    }
    try:
        raw, plans = await asyncio.wait_for(
            run_in_threadpool(
                build_raw_score,
                series,
                variables,
                options,
                source_id=source_id,
                source_meta=source_meta,
                start=request.start,
                end=request.end,
                longitude=location_meta.get("lon"),
            ),
            timeout=COMPUTE_TIMEOUT_S,
        )
        musical = await asyncio.wait_for(
            run_in_threadpool(simplify_data, raw, plans, options),
            timeout=COMPUTE_TIMEOUT_S,
        )
    except asyncio.TimeoutError as exc:
        raise _error(503, "compute_timeout", "Sonification exceeded the 20-second compute budget.") from exc
    except ValueError as exc:
        raise _error(422, "invalid_series", str(exc)) from exc

    write_score(key, {"musical_score": musical.model_dump(), "raw_score": raw.model_dump()})
    return _response(
        musical=musical,
        raw=raw,
        key=key,
        debug=request.debug,
        cached=False,
        extra=({"csv_id": request.csv_id} if request.csv_id else None),
    )


@router.post("/data")
async def sonify_data(request: DataRequest, debug: bool | None = Query(None)) -> dict:
    if debug is True:
        request.debug = True
    return await _data_score(request)


@router.post("/data/csv")
async def sonify_csv(
    request: Request,
    file: UploadFile = File(..., description="Wide CSV with a date/month column."),
    variables: str | None = Form(None, description="Comma-separated columns to use."),
    options: str | None = Form(None, description="JSON object matching SonifyOptions."),
    debug: bool = Form(False),
) -> dict:
    query_debug = request.query_params.get("debug", "").lower() in {"1", "true", "yes"}
    payload = await file.read(CSV_MAX_BYTES + 1)
    if len(payload) > CSV_MAX_BYTES:
        raise _error(413, "csv_too_large", f"CSV exceeds the {CSV_MAX_BYTES // (1024 * 1024)} MB limit.")
    try:
        csv_id = await run_in_threadpool(save_csv, payload, file.filename)
        parsed_options = SonifyOptions.model_validate_json(options) if options else SonifyOptions()
    except ValueError as exc:
        raise _error(422, "invalid_csv", str(exc)) from exc
    names = [name.strip() for name in variables.split(",") if name.strip()] if variables else ["T2M"]
    request_body = DataRequest(csv_id=csv_id, variables=names, options=parsed_options, debug=debug or query_debug)
    return await _data_score(request_body)


def _parse_options(raw: str | None, model: type[SonifyOptions]) -> SonifyOptions:
    if not raw:
        return model()
    try:
        return model.model_validate_json(raw)
    except ValueError as exc:
        raise _error(422, "invalid_options", f"options JSON is invalid: {exc}") from exc


def _multipart_file(form: Any, field: str = "file") -> UploadFile:
    upload = form.get(field)
    if upload is None:
        raise _error(422, "missing_file", f"multipart request needs a '{field}' part.")
    # ``request.form()`` returns Starlette's UploadFile, which is not the same
    # class as FastAPI's annotation alias; check the interface instead.
    if not hasattr(upload, "read"):
        raise _error(422, "missing_file", f"'{field}' must be a file upload.")
    return upload  # type: ignore[return-value]


async def _read_upload(upload: UploadFile, limit: int) -> bytes:
    payload = await upload.read(limit + 1)
    if len(payload) > limit:
        raise _error(413, "file_too_large", f"Upload exceeds the {limit // (1024 * 1024)} MB limit.")
    return payload


@router.post("/image")
async def sonify_image(
    request: Request,
    debug: bool | None = Query(None),
    options: str | None = Query(None),
) -> dict:
    content_type = request.headers.get("content-type", "")
    body_debug = False

    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = ImageUrlRequest.model_validate(body)
        except ValueError as exc:
            raise _error(422, "invalid_request", f"Invalid JSON body: {exc}") from exc
        image_options = payload.options
        body_debug = payload.debug
        try:
            data = await asyncio.wait_for(
                run_in_threadpool(fetch_remote, payload.image_url, max_bytes=MAX_BYTES),
                timeout=COMPUTE_TIMEOUT_S,
            )
        except RemoteFetchError as exc:
            raise _error(422, "remote_fetch_refused", str(exc)) from exc
        except asyncio.TimeoutError as exc:
            raise _error(504, "remote_timeout", "The image download exceeded the time budget.") from exc
    elif "multipart/form-data" in content_type:
        form = await request.form()
        upload = _multipart_file(form)
        image_options = _parse_options(form.get("options") or options, ImageOptions)
        body_debug = str(form.get("debug", "")).lower() in {"1", "true", "yes"}
        data = await _read_upload(upload, MAX_BYTES)
    else:
        raise _error(
            415,
            "unsupported_media_type",
            "Send multipart/form-data with a file, or application/json with image_url.",
        )

    effective_debug = bool(body_debug or debug)
    digest = hashlib.sha256(data).hexdigest()
    key = build_key(
        {
            "endpoint": "image",
            "sha256": digest,
            "options": image_options.model_dump(),
        }
    )
    cached = read_score(key)
    if cached:
        stored = cached["payload"]
        cached_raw = RawSoundScore.model_validate(stored["raw_score"])
        response = _response(
            musical=MusicalScore.model_validate(stored["musical_score"]),
            raw=cached_raw,
            key=key,
            debug=effective_debug,
            cached=True,
        )
        response["analysis"] = cached_raw.source.meta
        return response

    try:
        raw, musical, summary = await asyncio.wait_for(
            run_in_threadpool(build_image_score, data, image_options, source_id=digest[:16]),
            timeout=COMPUTE_TIMEOUT_S,
        )
    except asyncio.TimeoutError as exc:
        raise _error(503, "compute_timeout", "Image analysis exceeded the 20-second compute budget.") from exc
    except ValueError as exc:
        raise _error(422, "invalid_image", str(exc)) from exc

    write_score(key, {"musical_score": musical.model_dump(), "raw_score": raw.model_dump()})
    response = _response(musical=musical, raw=raw, key=key, debug=effective_debug, cached=False)
    response["analysis"] = summary
    return response


@router.post("/video")
async def sonify_video(
    request: Request,
    debug: bool | None = Query(None),
    options: str | None = Query(None),
) -> dict:
    content_type = request.headers.get("content-type", "")
    body_debug = False
    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = VideoUrlRequest.model_validate(body)
        except ValueError as exc:
            raise _error(422, "invalid_request", f"Invalid JSON body: {exc}") from exc
        video_options = payload.options
        body_debug = payload.debug
        try:
            data = await asyncio.wait_for(
                run_in_threadpool(fetch_remote, payload.video_url, max_bytes=MAX_VIDEO_BYTES, timeout=15.0),
                timeout=COMPUTE_TIMEOUT_S,
            )
        except RemoteFetchError as exc:
            raise _error(422, "remote_fetch_refused", str(exc)) from exc
        except asyncio.TimeoutError as exc:
            raise _error(504, "remote_timeout", "The video download exceeded the time budget.") from exc
    elif "multipart/form-data" in content_type:
        form = await request.form()
        upload = _multipart_file(form)
        video_options = _parse_options(form.get("options") or options, VideoOptions)
        body_debug = str(form.get("debug", "")).lower() in {"1", "true", "yes"}
        data = await _read_upload(upload, MAX_VIDEO_BYTES)
    else:
        raise _error(
            415,
            "unsupported_media_type",
            "Send multipart/form-data with a file, or application/json with video_url.",
        )

    effective_debug = bool(body_debug or debug)
    digest = hashlib.sha256(data).hexdigest()
    key = build_key(
        {"endpoint": "video", "sha256": digest, "options": video_options.model_dump()}
    )
    cached = read_score(key)
    if cached:
        stored = cached["payload"]
        cached_raw = RawSoundScore.model_validate(stored["raw_score"])
        response = _response(
            musical=MusicalScore.model_validate(stored["musical_score"]),
            raw=cached_raw,
            key=key,
            debug=effective_debug,
            cached=True,
        )
        response["analysis"] = cached_raw.source.meta
        return response

    try:
        raw, musical, summary = await asyncio.wait_for(
            run_in_threadpool(build_video_score, data, video_options, source_id=digest[:16]),
            timeout=COMPUTE_TIMEOUT_S * 2,
        )
    except asyncio.TimeoutError as exc:
        raise _error(503, "compute_timeout", "Video analysis exceeded the compute budget.") from exc
    except ValueError as exc:
        raise _error(422, "invalid_video", str(exc)) from exc

    write_score(key, {"musical_score": musical.model_dump(), "raw_score": raw.model_dump()})
    response = _response(musical=musical, raw=raw, key=key, debug=effective_debug, cached=False)
    response["analysis"] = summary
    return response


@router.get("/schema")
def sonify_schema() -> dict:
    return {
        "version": VERSION,
        "raw_score": RawSoundScore.model_json_schema(),
        "musical_score": MusicalScore.model_json_schema(),
        "data_request": DataRequest.model_json_schema(),
        "image_options": ImageOptions.model_json_schema(),
        "notes": {
            "timing": "Data scores use two beats per month; 4/4 bars therefore hold two months.",
            "captions": "One caption per sounding month for data, one per bar for images.",
            "missing": "Missing months are rests; no value is imputed.",
        },
    }


@router.get("/health")
def sonify_health() -> dict:
    return {
        "status": "ok",
        "service": "prism-tone-sonify",
        "version": VERSION,
        "capabilities": {
            "data": True,
            "image": True,
            "video": True,
            "scans": ["columns", "radial", "regions"],
        },
        "limits": {
            "image_bytes": MAX_BYTES,
            "video_bytes": MAX_VIDEO_BYTES,
            "csv_bytes": CSV_MAX_BYTES,
            "months": MAX_MONTHS,
            "variables": 3,
            "tempo_bpm": [52, 96],
            "video_frames": 12,
        },
        "cache": cache_status(),
        "source": "NASA POWER / MERRA-2 monthly (data); pixels (image/video)",
    }

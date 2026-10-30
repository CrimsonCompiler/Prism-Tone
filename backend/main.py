"""Prism Tone API.

Run from `backend/`:
    uvicorn main:app --reload --port 8000

Routes:
  * /api/preview/series, /api/power/series  full-record NASA POWER (Preview page)
  * /api/layers, /api/series, /api/hotspots, /api/describe  cached companion tracks
  * /api/data  NDVI records for the Bangladesh divisions
  * /api/health

Every endpoint degrades to the prepared cache in `data/cache/`; live NASA
requests are optional and never block a response for long.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / ".env")
load_dotenv(ROOT / ".env")

from api.earth_routes import router as earth_router  # noqa: E402
from api.ndvi_routes import router as ndvi_router  # noqa: E402
from api.preview_routes import router as preview_router  # noqa: E402

APP_VERSION = "2.0.0"

app = FastAPI(
    title="Prism Tone API",
    description=(
        "NASA Earth observation series, cached thermal hotspots and plain-language "
        "descriptions for the Prism Tone preview experience."
    ),
    version=APP_VERSION,
)

origins = [
    item.strip()
    for item in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if item.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.exception_handler(FileNotFoundError)
async def missing_cache_handler(_request: Request, exc: FileNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "error": "cache_missing",
            "detail": str(exc),
            "hint": "Warm the cache with `python scripts/warm_power_cache.py` and keep data/cache/ in the deployment.",
        },
    )


app.include_router(preview_router)
app.include_router(earth_router)
app.include_router(ndvi_router)


@app.get("/")
def home() -> dict:
    return {
        "service": "Prism Tone API",
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }

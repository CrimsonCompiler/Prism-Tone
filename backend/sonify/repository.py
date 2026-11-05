"""Disk cache, CSV storage and guarded remote fetches for the sonify routes.

Only JSON scores are cached, keyed by a hash of the *actual* input: the inline
series (or the fetched series), the options and the endpoint. A cache hit can
therefore never return a score for different data.

Remote URLs are limited to HTTPS NASA hosts, resolved to public addresses,
with redirects re-validated hop by hop. Downloads are capped before they are
read into memory. CSV uploads are capped, hashed and stored under
``data/sonify/uploads/`` so a later request can refer to them by id.
"""

from __future__ import annotations

import hashlib
import io
import ipaddress
import json
import os
import re
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "cache" / "sonify"
UPLOAD_DIR = ROOT / "data" / "sonify" / "uploads"

CACHE_VERSION = 2
TIMEOUT_S = 8.0
MAX_REDIRECTS = 3
DEFAULT_ALLOWED_HOSTS = (
    "nasa.gov",
    "earthdata.nasa.gov",
    "power.larc.nasa.gov",
    "earthobservatory.nasa.gov",
    "eoimages.gsfc.nasa.gov",
    "visibleearth.nasa.gov",
)
CSV_MAX_BYTES = 5 * 1024 * 1024
CSV_MAX_ROWS = 100_000
_CSV_ID = re.compile(r"^[a-f0-9]{8,64}$")


class RemoteFetchError(ValueError):
    """Raised when a remote asset is refused or cannot be fetched."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# score cache
# ---------------------------------------------------------------------------


def build_key(descriptor: dict[str, Any]) -> str:
    canonical = json.dumps(descriptor, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def read_score(key: str) -> dict[str, Any] | None:
    path = CACHE_DIR / f"{key}.json"
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(payload, dict) or payload.get("v") != CACHE_VERSION:
        return None
    return payload


def write_score(key: str, payload: dict[str, Any]) -> None:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path = CACHE_DIR / f"{key}.json"
        tmp = path.with_suffix(".tmp")
        tmp.write_text(
            json.dumps({"v": CACHE_VERSION, "at": time.time(), "payload": payload}, ensure_ascii=False),
            encoding="utf-8",
        )
        os.replace(tmp, path)
    except OSError:
        # A read-only deployment still answers; the cache is an optimisation.
        pass


def cache_status() -> dict[str, Any]:
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        files = list(CACHE_DIR.glob("*.json"))
    except OSError:
        files = []
    newest = max((path.stat().st_mtime for path in files), default=None)
    return {
        "scores": len(files),
        "newestAt": datetime.fromtimestamp(newest, tz=timezone.utc).isoformat() if newest else None,
    }


# ---------------------------------------------------------------------------
# remote fetches (SSRF guarded)
# ---------------------------------------------------------------------------


def _allowed_hosts() -> tuple[str, ...]:
    raw = os.getenv("SONIFY_URL_HOSTS", "")
    extra = tuple(host.strip().lower() for host in raw.split(",") if host.strip())
    return DEFAULT_ALLOWED_HOSTS + extra


def _host_allowed(host: str) -> bool:
    host = host.lower().rstrip(".")
    for suffix in _allowed_hosts():
        if host == suffix or host.endswith("." + suffix):
            return True
    return False


def validate_remote_url(url: str) -> str:
    try:
        parsed = urlparse(url)
    except ValueError as exc:
        raise RemoteFetchError("URL could not be parsed.") from exc
    if parsed.scheme != "https":
        raise RemoteFetchError("Only HTTPS URLs are accepted.")
    if parsed.username or parsed.password:
        raise RemoteFetchError("URLs with embedded credentials are refused.")
    host = parsed.hostname
    if not host:
        raise RemoteFetchError("URL has no host.")
    try:
        port = parsed.port
    except ValueError as exc:
        raise RemoteFetchError("URL has an invalid port.") from exc
    if port not in (None, 443):
        raise RemoteFetchError("Only port 443 is accepted.")
    if not _host_allowed(host):
        raise RemoteFetchError(
            "Host is not on the NASA allow-list. Set SONIFY_URL_HOSTS on the server to extend it."
        )
    try:
        addresses = {
            info[4][0]
            for info in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        }
    except OSError as exc:
        raise RemoteFetchError(f"Host could not be resolved: {host}") from exc
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError as exc:
            raise RemoteFetchError("Host resolved to an invalid address.") from exc
        if not ip.is_global:
            raise RemoteFetchError("Host resolves to a private, loopback or reserved address.")
    return url


def fetch_remote(url: str, *, max_bytes: int, timeout: float = TIMEOUT_S) -> bytes:
    """Fetch an allow-listed asset with a hard size cap and redirect checks."""
    current = validate_remote_url(url)
    with httpx.Client(timeout=httpx.Timeout(timeout, connect=min(5.0, timeout)), follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            try:
                with client.stream("GET", current) as response:
                    if response.status_code in (301, 302, 303, 307, 308):
                        location = response.headers.get("location")
                        if not location:
                            raise RemoteFetchError("Redirect without a location header.")
                        current = validate_remote_url(str(httpx.URL(str(response.url)).join(location)))
                        continue
                    if response.status_code != 200:
                        raise RemoteFetchError(f"Remote host returned HTTP {response.status_code}.")
                    declared = response.headers.get("content-length")
                    if declared and int(declared) > max_bytes:
                        raise RemoteFetchError("Remote asset is larger than the size limit.")
                    chunks: list[bytes] = []
                    total = 0
                    for chunk in response.iter_bytes():
                        total += len(chunk)
                        if total > max_bytes:
                            raise RemoteFetchError("Remote asset exceeded the size limit while downloading.")
                        chunks.append(chunk)
                    return b"".join(chunks)
            except httpx.HTTPError as exc:
                raise RemoteFetchError(f"Remote fetch failed: {exc}") from exc
    raise RemoteFetchError("Too many redirects.")


# ---------------------------------------------------------------------------
# CSV uploads
# ---------------------------------------------------------------------------


def _safe_csv_id(csv_id: str) -> str:
    if not _CSV_ID.match(csv_id or ""):
        raise ValueError("csv_id must be a hexadecimal id returned by /api/sonify/data/csv.")
    return csv_id


def save_csv(data: bytes, filename: str | None = None) -> str:
    if not data:
        raise ValueError("CSV payload is empty.")
    if len(data) > CSV_MAX_BYTES:
        raise ValueError(f"CSV exceeds the {CSV_MAX_BYTES // (1024 * 1024)} MB limit.")
    csv_id = hashlib.sha256(data).hexdigest()[:24]
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        (UPLOAD_DIR / f"{csv_id}.csv").write_bytes(data)
        (UPLOAD_DIR / f"{csv_id}.json").write_text(
            json.dumps({"id": csv_id, "filename": filename, "at": _now(), "bytes": len(data)}),
            encoding="utf-8",
        )
    except OSError as exc:
        raise ValueError("CSV could not be stored on the server.") from exc
    return csv_id


def load_csv_bytes(csv_id: str) -> bytes:
    csv_id = _safe_csv_id(csv_id)
    path = UPLOAD_DIR / f"{csv_id}.csv"
    if not path.exists():
        raise ValueError(f"Unknown csv_id: {csv_id}. Upload the file again.")
    return path.read_bytes()


def parse_monthly_csv(
    data: bytes,
    variables: list[str] | None = None,
) -> tuple[dict[str, dict[str, float | None]], dict[str, Any]]:
    """Parse a wide monthly CSV into the same shape as a POWER series."""
    try:
        frame = pd.read_csv(io.BytesIO(data))
    except Exception as exc:  # pandas raises several parser errors
        raise ValueError(f"CSV could not be parsed: {exc}") from exc
    if frame.empty:
        raise ValueError("CSV has no rows.")
    if len(frame) > CSV_MAX_ROWS:
        raise ValueError(f"CSV exceeds the {CSV_MAX_ROWS}-row limit.")

    frame.columns = [str(column).strip() for column in frame.columns]
    lowered = {column.lower(): column for column in frame.columns}
    date_column = next(
        (lowered[name] for name in ("date", "month", "time", "yyyy-mm", "year_month") if name in lowered),
        None,
    )
    if date_column is None:
        raise ValueError("CSV needs a date/month column (date, month, time, yyyy-mm or year_month).")

    numeric_columns = [
        column
        for column in frame.columns
        if column != date_column
        and column.lower() not in {
            "division", "region", "location", "name", "id",
            "year", "month_num", "index",
        }
        and pd.api.types.is_numeric_dtype(frame[column])
    ]
    if variables:
        wanted = {name.strip().upper(): name for name in variables}
        selected = []
        for column in numeric_columns:
            if column.strip().upper() in wanted:
                selected.append(column)
        missing = set(wanted) - {column.strip().upper() for column in selected}
        if missing:
            raise ValueError(f"CSV is missing requested column(s): {', '.join(sorted(missing))}")
    else:
        selected = numeric_columns
    if not selected:
        raise ValueError("CSV has no numeric measurement columns.")

    raw_dates = frame[date_column]
    dates = pd.to_datetime(raw_dates, errors="coerce")
    if dates.isna().mean() > 0.5:
        text = raw_dates.astype(str).str.strip()
        if text.str.fullmatch(r"\d{6}").all():
            dates = pd.to_datetime(text, format="%Y%m", errors="coerce")
        elif text.str.fullmatch(r"\d{4}-\d{2}").all():
            dates = pd.to_datetime(text, format="%Y-%m", errors="coerce")
    invalid_dates = int(dates.isna().sum())
    keep = dates.notna()
    frame = frame.loc[keep]
    dates = dates.loc[keep]
    if frame.empty:
        raise ValueError("CSV date column contained no parseable dates.")

    series: dict[str, dict[str, float | None]] = {column.strip().upper(): {} for column in selected}
    duplicates = 0
    for index, date in zip(frame.index, dates):
        key = f"{date.year}{date.month:02d}"
        for column in selected:
            target = series[column.strip().upper()]
            raw = frame.at[index, column]
            try:
                value = float(raw)
            except (TypeError, ValueError):
                value = None
            if value is not None and not np.isfinite(value):
                value = None
            if key in target:
                duplicates += 1
                continue
            target[key] = value

    meta = {
        "date_column": date_column,
        "variables": sorted(series),
        "rows": int(len(frame)),
        "invalid_dates_dropped": invalid_dates,
        "duplicate_month_rows_skipped": duplicates,
        "units": "as supplied in the CSV; the backend does not convert units",
    }
    return series, meta


__all__ = [
    "CACHE_DIR",
    "CSV_MAX_BYTES",
    "RemoteFetchError",
    "UPLOAD_DIR",
    "build_key",
    "cache_status",
    "fetch_remote",
    "load_csv_bytes",
    "parse_monthly_csv",
    "read_score",
    "save_csv",
    "validate_remote_url",
    "write_score",
]

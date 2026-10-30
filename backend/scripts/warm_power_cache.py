"""Warm the Preview POWER cache for all seven continental samples.

Run from `backend/`:
    python scripts/warm_power_cache.py
    python scripts/warm_power_cache.py --refresh

The generated files live in `data/cache/power/` and are part of the offline
demo: with them present the API answers instantly without network access.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from services import preview_power  # noqa: E402


async def main(refresh: bool) -> int:
    payload = await preview_power.fetch_divisions(1981, 2025, refresh=refresh)
    summary = {
        "count": payload["count"],
        "total": payload["total"],
        "cached": payload["cached"],
        "outcomes": payload["outcomes"],
    }
    print(json.dumps(summary, indent=2))
    return 0 if payload["count"] == payload["total"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="ignore fresh disk cache")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(main(args.refresh)))

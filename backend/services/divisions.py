"""Continental sample points used by the Preview experience.

These are the same seven representative centroids the frontend uses in
`src/preview/data/world.js`. Keeping them here lets the API pre-fetch and
cache the whole 1981–2025 record for every continent in one request.
"""

from __future__ import annotations

DIVISIONS: tuple[dict, ...] = (
    {"id": "asia", "name": "Asia", "lat": 34.04, "lon": 85.02},
    {"id": "africa", "name": "Africa", "lat": 7.18, "lon": 21.09},
    {"id": "europe", "name": "Europe", "lat": 50.85, "lon": 15.25},
    {"id": "north_america", "name": "North America", "lat": 45.10, "lon": -99.90},
    {"id": "south_america", "name": "South America", "lat": -14.60, "lon": -59.50},
    {"id": "oceania", "name": "Oceania", "lat": -25.27, "lon": 133.77},
    {"id": "antarctica", "name": "Antarctica", "lat": -78.15, "lon": 0.00},
)

DIVISION_BY_ID = {item["id"]: item for item in DIVISIONS}

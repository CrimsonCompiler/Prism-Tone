"""API contract tests. Run from backend/:  python -m pytest -q"""
from __future__ import annotations

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_reports_ready_cache() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["cache"]["ready"] is True
    assert data["service"] == "prism-tone"
    assert set(data["layers"]) == {"temperature", "fires", "vegetation", "water"}
    assert "preview" in data


def test_layers_expose_twelve_dates_each() -> None:
    response = client.get("/api/layers")
    assert response.status_code == 200
    layers = response.json()["layers"]
    assert len(layers) == 4
    for layer in layers:
        assert len(layer["dates"]) == 12
        assert layer["cached"] is True


def test_temperature_series_is_offline_and_normalised() -> None:
    response = client.get("/api/series", params={"layer": "temperature", "lat": 37.39, "lon": -5.99, "cached": "true"})
    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is True
    assert len(data["dates"]) == len(data["values"]) == len(data["normalized"])
    assert all(0 <= value <= 1 for value in data["normalized"] if value is not None)
    assert data["unit"] == "°C"


def test_fire_index_uses_a_hundred_point_scale() -> None:
    response = client.get("/api/series", params={"layer": "fires", "lat": -12.5, "lon": 18.5, "cached": "true"})
    data = response.json()
    values = [value for value in data["values"] if value is not None]
    assert values
    assert max(values) > 1
    assert max(values) <= 100


def test_hotspots_are_cached_and_bounded() -> None:
    response = client.get("/api/hotspots", params={"layer": "fires", "date": "2025-10-15"})
    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is True
    assert 0 < data["count"] <= 2000
    assert {"lat", "lon", "count", "intensity"} <= set(data["points"][0])


def test_describe_speaks_about_the_data() -> None:
    response = client.get(
        "/api/describe",
        params={"layer": "vegetation", "lat": -3.2, "lon": -60.0, "date": "2024-07-01"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "Amazon" not in data["text"]  # describes the value, not an inferred place name
    assert "green cover" in data["text"].lower()
    assert "aria" in data and "degrees" in data["aria"]


def test_unknown_layer_is_a_clear_404() -> None:
    response = client.get("/api/series", params={"layer": "gravity", "lat": 0, "lon": 0})
    assert response.status_code == 404
    assert "Unknown layer" in response.json()["detail"]


def test_coordinates_are_validated() -> None:
    response = client.get("/api/series", params={"layer": "water", "lat": 120, "lon": 0})
    assert response.status_code == 422


def test_preview_series_serves_all_seven_divisions() -> None:
    response = client.get("/api/preview/series", params={"parameters": "T2M,PRECTOTCORR,WS10M"})
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 7
    assert set(data["divisions"]) == {
        "asia", "africa", "europe", "north_america",
        "south_america", "oceania", "antarctica",
    }
    asia = data["divisions"]["asia"]
    assert set(asia["series"]) == {"T2M", "PRECTOTCORR", "WS10M"}
    assert len(asia["series"]["T2M"]) >= 500
    assert all(v is None or isinstance(v, (int, float)) for v in asia["series"]["T2M"].values())
    assert data["meta"]["start"] == 1981 and data["meta"]["end"] == 2025
    assert data["cached"] is True


def test_preview_series_rejects_bad_year_and_parameter() -> None:
    assert client.get("/api/preview/series", params={"start": 2026}).status_code == 422
    bad_param = client.get("/api/preview/series", params={"parameters": "NO2"})
    assert bad_param.status_code == 422
    assert "Unknown POWER parameter" in bad_param.json()["detail"]


def test_ndvi_route_still_answers() -> None:
    response = client.post("/api/data", json={"year": 2020, "division": "Dhaka"})
    assert response.status_code == 200
    data = response.json()
    assert data["variable"] == "vegetation"
    assert data["data"]["sample_count"] > 0

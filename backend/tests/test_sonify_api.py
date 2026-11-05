"""API contract tests for /api/sonify/*.

Run from backend/:  python -m pytest -q
"""

from __future__ import annotations

import json
import os
import tempfile

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

import sonify.repository as repository
from main import app

client = TestClient(app)


def _fixed_image(width: int = 96, height: int = 54) -> np.ndarray:
    yy, xx = np.mgrid[0:height, 0:width]
    red = (40 + xx / width * 190).astype(np.uint8)
    green = (30 + yy / height * 150).astype(np.uint8)
    blue = np.full_like(red, 55)
    image = np.dstack([red, green, blue])
    image[8:20, 24:48] = (235, 190, 50)
    image[30:38, 60:84] = (40, 90, 210)
    return image


def _png(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(repository, "CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(repository, "UPLOAD_DIR", tmp_path / "uploads")


def _series(values):
    return {f"2016{month:02d}": value for month, value in enumerate(values, start=1)}


def _score_invariants(score: dict) -> None:
    assert 52 <= score["tempo_bpm"] <= 96
    assert score["time_sig"] == [4, 4]
    assert score["key"] and score["scale"]
    for track in score["tracks"]:
        notes = sorted(track["notes"], key=lambda note: note["t_beats"])
        for note in notes:
            assert 0.25 <= note["vel"] <= 0.8
            assert note["dur_beats"] > 0
        if track["role"] in {"lead", "bass", "perc"}:
            for first, second in zip(notes, notes[1:]):
                assert second["t_beats"] >= first["t_beats"] + first["dur_beats"] - 1e-6


def test_health_and_schema() -> None:
    health = client.get("/api/sonify/health")
    assert health.status_code == 200
    body = health.json()
    assert body["status"] == "ok"
    assert body["capabilities"]["data"] is True
    assert body["limits"]["tempo_bpm"] == [52, 96]

    schema = client.get("/api/sonify/schema")
    assert schema.status_code == 200
    data = schema.json()
    assert "properties" in data["musical_score"]
    assert {"tracks", "captions", "provenance"} <= set(data["musical_score"]["properties"])
    assert {"events", "duration_s", "source"} <= set(data["raw_score"]["properties"])


def test_data_endpoint_returns_score_and_caches() -> None:
    payload = {
        "series": {"T2M": _series([18, 19, 23, 27, 30, 29, 27, 27, 28, 24, 20, 17])},
        "options": {"tempo": 60},
    }
    response = client.post("/api/sonify/data?debug=1", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["source"]["kind"] == "data"
    assert body["raw_score"]["events"]
    assert len(body["musical_score"]["captions"]) == 12
    assert body["cache"]["hit"] is False
    _score_invariants(body["musical_score"])

    again = client.post("/api/sonify/data", json=payload)
    assert again.status_code == 200
    assert again.json()["cache"]["hit"] is True
    assert "raw_score" not in again.json()


def test_data_missing_month_is_a_rest() -> None:
    values = [18.0] * 12
    values[2] = None
    response = client.post(
        "/api/sonify/data",
        json={"series": {"T2M": _series(values)}, "options": {}},
    )
    assert response.status_code == 200
    score = response.json()["musical_score"]
    assert score["provenance"]["stats"]["missing_months"] == 1
    assert len(score["captions"]) == 11
    assert not any("Mar 2016" in caption["text"] for caption in score["captions"])


def test_data_rejects_bad_requests() -> None:
    assert client.post("/api/sonify/data", json={}).status_code == 422
    assert client.post(
        "/api/sonify/data",
        json={"series": {"T2M": {"201601": 1}}, "variables": ["NO2"]},
    ).status_code == 422
    assert client.post(
        "/api/sonify/data",
        json={"series": {"T2M": {"201601": 1}}, "options": {"tempo": 120}},
    ).status_code == 422
    assert client.post(
        "/api/sonify/data",
        json={"series": {"T2M": {"201601": 1}}, "variables": ["T2M", "T2M"]},
    ).status_code == 422


def test_csv_upload_and_reuse() -> None:
    lines = ["date,T2M,PRECTOTCORR"]
    for month in range(1, 13):
        lines.append(f"2016-{month:02d},{20 + month * 0.5},{month * 1.2}")
    csv = ("\n".join(lines) + "\n").encode("utf-8")
    upload = client.post(
        "/api/sonify/data/csv?debug=1",
        files={"file": ("sample.csv", csv, "text/csv")},
        data={"variables": "T2M,PRECTOTCORR", "options": json.dumps({"tempo": 64})},
    )
    assert upload.status_code == 200
    body = upload.json()
    csv_id = body["csv_id"]
    assert len(csv_id) == 24
    assert body["raw_score"]["events"]
    _score_invariants(body["musical_score"])

    reuse = client.post(
        "/api/sonify/data",
        json={"csv_id": csv_id, "variables": ["T2M"], "options": {"tempo": 64}},
    )
    assert reuse.status_code == 200
    assert reuse.json()["musical_score"]["tempo_bpm"] == 64


def test_csv_defaults_to_the_available_column() -> None:
    lines = ["date,PRECTOTCORR"]
    for month in range(1, 13):
        lines.append(f"2016-{month:02d},{month * 1.2}")
    csv = ("\n".join(lines) + "\n").encode("utf-8")
    response = client.post(
        "/api/sonify/data/csv",
        files={"file": ("rain.csv", csv, "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source"]["meta"]["variables"] == ["PRECTOTCORR"]
    _score_invariants(body["musical_score"])


def test_image_multipart_all_scans() -> None:
    data = _png(_fixed_image())
    for scan in ("columns", "radial", "regions"):
        response = client.post(
            "/api/sonify/image?debug=1",
            files={"file": ("scene.png", data, "image/png")},
            data={"options": json.dumps({"scan": scan, "tempo": 64})},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["source"]["kind"] == "image"
        assert body["raw_score"]["events"]
        assert body["analysis"]["scan"] == scan
        _score_invariants(body["musical_score"])


def test_image_is_deterministic() -> None:
    data = _png(_fixed_image())
    first = client.post(
        "/api/sonify/image",
        files={"file": ("scene.png", data, "image/png")},
        data={"options": json.dumps({"scan": "columns"})},
    )
    second = client.post(
        "/api/sonify/image",
        files={"file": ("scene.png", data, "image/png")},
        data={"options": json.dumps({"scan": "columns"})},
    )
    assert first.json()["musical_score"] == second.json()["musical_score"]
    assert second.json()["cache"]["hit"] is True


def test_image_rejects_oversize_and_bad_uploads() -> None:
    oversize = client.post(
        "/api/sonify/image",
        files={"file": ("big.png", b"x" * (10 * 1024 * 1024 + 1), "image/png")},
    )
    assert oversize.status_code == 413

    broken = client.post(
        "/api/sonify/image",
        files={"file": ("broken.png", b"not an image", "image/png")},
    )
    assert broken.status_code == 422

    missing = client.post("/api/sonify/image", data={"options": "{}"})
    assert missing.status_code in {415, 422}


def test_image_url_is_ssrf_guarded() -> None:
    for url in (
        "http://nasa.gov/image.png",
        "https://example.com/image.png",
        "https://user:pass@nasa.gov/image.png",
        "https://nasa.gov:8443/image.png",
        "https://127.0.0.1/image.png",
    ):
        response = client.post("/api/sonify/image", json={"image_url": url})
        assert response.status_code == 422, url
        assert response.json()["detail"]["error"] == "remote_fetch_refused"


def test_video_endpoint_with_generated_clip() -> None:
    path = os.path.join(tempfile.gettempdir(), "prism-tone-test.mp4")
    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), 10.0, (160, 90))
    if not writer.isOpened():
        writer.release()
        pytest.skip("Video codec is unavailable in this environment")
    try:
        for index in range(16):
            frame = np.zeros((90, 160, 3), np.uint8)
            frame[..., 0] = 30 + index * 8
            frame[..., 1] = 60
            frame[..., 2] = 40 + index * 5
            cv2.circle(frame, (30 + index * 6, 45), 18, (40, 190, 220), -1)
            writer.write(frame)
    finally:
        writer.release()
    try:
        data = open(path, "rb").read()
        response = client.post(
            "/api/sonify/video?debug=1",
            files={"file": ("clip.mp4", data, "video/mp4")},
            data={"options": json.dumps({"frames": 4, "scan": "columns"})},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["analysis"]["media"] == "video"
        assert body["analysis"]["frames_sampled"] == 4
        _score_invariants(body["musical_score"])
    finally:
        os.unlink(path)


def test_existing_preview_route_still_answers() -> None:
    response = client.get("/api/preview/series", params={"parameters": "T2M"})
    assert response.status_code == 200
    assert "divisions" in response.json()

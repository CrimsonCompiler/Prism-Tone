"""Regenerate the golden MusicalScore snapshots.

Run from backend/:
    python tests/make_golden.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sonify.data_sonifier import build_raw_score
from sonify.image_sonifier import build_image_score
from sonify.models import ImageOptions, SonifyOptions
from sonify.simplifier import simplify_data

GOLDEN = Path(__file__).resolve().parent / "golden"


def _series(values, year=2016):
    return {f"{year}{month:02d}": value for month, value in enumerate(values, start=1)}


def _fixed_image(width=96, height=54):
    yy, xx = np.mgrid[0:height, 0:width]
    image = np.dstack([
        (40 + xx / width * 190).astype(np.uint8),
        (30 + yy / height * 150).astype(np.uint8),
        np.full((height, width), 55, dtype=np.uint8),
    ])
    image[8:20, 24:48] = (235, 190, 50)
    image[30:38, 60:84] = (40, 90, 210)
    return image


def main() -> None:
    GOLDEN.mkdir(parents=True, exist_ok=True)

    values = [18.0, 19.5, 23.0, 27.2, 30.1, 29.4, 27.0, 26.6, 27.8, 24.0, 20.5, 17.2]
    options = SonifyOptions(key="D", scale="D dorian", tempo=60, smooth=0.35)
    raw, plans = build_raw_score(
        {"T2M": _series(values)},
        ["T2M"],
        options,
        source_id="golden-12m",
        source_meta={"input": "golden"},
    )
    data_score = simplify_data(raw, plans, options)
    (GOLDEN / "data_12m.json").write_text(
        json.dumps(data_score.model_dump(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    ok, buffer = cv2.imencode(".png", _fixed_image())
    assert ok
    image_options = ImageOptions(scan="columns", key="D", scale="D dorian", tempo=64)
    _, image_score, _ = build_image_score(buffer.tobytes(), image_options, source_id="golden-image")
    (GOLDEN / "image_96x54.json").write_text(
        json.dumps(image_score.model_dump(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("wrote", GOLDEN / "data_12m.json")
    print("wrote", GOLDEN / "image_96x54.json")


if __name__ == "__main__":
    main()

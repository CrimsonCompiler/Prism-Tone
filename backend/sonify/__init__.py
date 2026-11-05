"""Two-stage sonification (data or image → raw score → musical score).

The backend returns JSON scores only; the browser renders audio with Tone.js.
"""

from .data_sonifier import build_raw_score, plan_variable
from .image_sonifier import build_image_score
from .models import MusicalScore, RawSoundScore
from .simplifier import simplify_data

__all__ = [
    "MusicalScore",
    "RawSoundScore",
    "build_image_score",
    "build_raw_score",
    "plan_variable",
    "simplify_data",
]

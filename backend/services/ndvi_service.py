
from pathlib import Path

import numpy as np
import pandas as pd


# Project root/data/
DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "NDVI"


# Division name -> corresponding CSV file
DIVISION_FILES = {
    "dhaka": "Dhaka_NDVI.csv",
    "rangpur": "Rangpur_NDVI.csv",
    "rajshahi": "Rajshahi_NDVI.csv",
    "mymensingh": "Mymensingh_NDVI.csv",
    "sylhet": "Sylhet_NDVI.csv",
    "chattogram": "Chattogram_NDVI.csv",
    "barishal": "Barishal_NDVI.csv",
    "khulna": "Khulna_NDVI.csv",
}


def load_ndvi_data(division):
    """
    Load NDVI data from the selected division's CSV.
    Supports CSVs with or without a division column.
    """
    key = division.strip().casefold()

    if key not in DIVISION_FILES:
        raise ValueError(
            f"Unsupported division: {division}. "
            f"Available divisions: {list(DIVISION_FILES)}"
        )

    csv_path = DATA_DIR / DIVISION_FILES[key]

    if not csv_path.exists():
        raise FileNotFoundError(
            f"CSV file not found: {csv_path}"
        )

    df = pd.read_csv(csv_path)

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    required = {"date", "ndvi"}
    missing = required - set(df.columns)

    if missing:
        raise ValueError(
            f"{csv_path.name} is missing columns: "
            f"{sorted(missing)}"
        )

    # Clean values
    df["date"] = pd.to_datetime(
        df["date"], errors="coerce"
    )
    df["ndvi"] = pd.to_numeric(
        df["ndvi"], errors="coerce"
    )

    df = df.dropna(subset=["date"])
    df = df[
        df["ndvi"].between(-1, 1) | df["ndvi"].isna()
    ]

    # If a division column exists, verify/filter it
    if "division" in df.columns:
        df["division"] = (
            df["division"].astype(str).str.strip()
        )
        df = df[
            df["division"].str.casefold() == key
        ]

    return df.sort_values("date").reset_index(drop=True)


def normalize_ndvi(values):
    """Normalize NDVI to [0, 1] using min-max normalization."""
    arr = np.asarray(values, dtype=float)
    result = np.full(arr.shape, np.nan)

    valid = np.isfinite(arr)

    if not np.any(valid):
        return result

    x_min = np.min(arr[valid])
    x_max = np.max(arr[valid])

    if x_max == x_min:
        result[valid] = 0.0
    else:
        result[valid] = (
            (arr[valid] - x_min) / (x_max - x_min)
        )

    return result


def build_synthesis_tracks(normalized_values):
    frequencies = []
    cutoffs = []
    amplitudes = []

    for value in normalized_values:
        if not np.isfinite(value):
            frequencies.append(None)
            cutoffs.append(None)
            amplitudes.append(0.0)
            continue

        value = float(np.clip(value, 0, 1))

        frequencies.append(round(220 + value * 660, 2))
        cutoffs.append(round(400 + value * 3600, 2))
        amplitudes.append(round(0.15 + value * 0.45, 3))

    return {
        "frequencies_hz": frequencies,
        "filter_cutoffs_hz": cutoffs,
        "amplitudes": amplitudes,
    }


def get_ndvi_data(division, year):
    """
    Return selected division's NDVI observations for a year.
    """
    if not isinstance(year, int) or isinstance(year, bool):
        raise ValueError("Year must be an integer.")

    if not 2012 <= year <= 2025:
        raise ValueError("Year must be between 2012 and 2025.")

    df = load_ndvi_data(division)

    selected = df[df["date"].dt.year == year].copy()

    if selected.empty:
        available_years = sorted(
            df["date"].dt.year.unique().tolist()
        )
        raise ValueError(
            f"No NDVI data for {division} in {year}. "
            f"Available years: {available_years}"
        )

    raw_values = selected["ndvi"].to_numpy(dtype=float)
    normalized = normalize_ndvi(raw_values)

    def clean_number(value):
        if not np.isfinite(value):
            return None
        return round(float(value), 6)

    raw_series = [clean_number(x) for x in raw_values]
    normalized_series = [clean_number(x) for x in normalized]

    observations = []

    for date, ndvi in zip(selected["date"], raw_series):
        observations.append({
            "date": date.strftime("%Y-%m-%d"),
            "ndvi": ndvi,
        })

    return {
        "variable": "vegetation",
        "division": division.strip(),
        "year": year,
        "sample_count": len(observations),
        "observations": observations,
        "normalized_series": normalized_series,
        "normalization": {
            "method": "fixed_ndvi_range",
            "source_range": [-1, 1],
            "target_range": [0, 1],
        },
        "synthesis_tracks": build_synthesis_tracks(normalized),
    }

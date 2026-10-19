from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.ndvi_service import get_ndvi_data


router = APIRouter(prefix="/api", tags=["Earth Data"])


class DataRequest(BaseModel):
    year: int = Field(ge=2012, le=2025)
    division: str = Field(min_length=1)


@router.post("/data")
def get_data(request: DataRequest):
    try:
        ndvi_data = get_ndvi_data(
            division=request.division.strip(),
            year=request.year,
        )

        return {
            "year": request.year,
            "division": request.division.strip(),
            "variable": "vegetation",
            "data": ndvi_data,
        }

    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc
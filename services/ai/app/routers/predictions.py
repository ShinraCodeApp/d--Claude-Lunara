from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from app.config import settings

router = APIRouter()


class CycleInput(BaseModel):
    startDate: str
    endDate: str | None = None
    cycleLength: int | None = None


class PredictionRequest(BaseModel):
    userId: str
    cycles: list[CycleInput]
    averagePeriodLength: int = 5


async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="API key inválida")


@router.post("/calculate")
async def calculate_prediction(
    request: PredictionRequest,
    _=Depends(verify_api_key),
):
    """Enhanced ML-based prediction (future: custom model)"""
    # For now, delegate to the TypeScript prediction engine via API
    # In future: use scikit-learn / TensorFlow for enhanced predictions
    return {"message": "Delegating to prediction engine", "status": "ok"}

from fastapi import APIRouter, Depends, Header, HTTPException
from app.config import settings
from app.services.chat_service import chat_service

router = APIRouter()


async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="API key inválida")


@router.post("/generate-summary")
async def generate_report_summary(
    data: dict,
    _=Depends(verify_api_key),
):
    """Generate AI-powered report summary for PDF export"""
    insight = await chat_service.generate_monthly_insight(data)
    patterns = await chat_service.analyze_cycle_patterns(data.get("cycles", []))

    return {
        "summary": insight,
        "patterns": patterns,
        "disclaimer": "Los datos presentados son informativos. Consulta a tu médica para interpretación profesional.",
    }

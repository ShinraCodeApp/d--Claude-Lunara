"""AI Chat Router — Luna Health Assistant"""
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app.config import settings
from app.services.chat_service import chat_service
from app.services.redis_service import check_rate_limit

router = APIRouter()


class Message(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    userId: str
    isPremium: bool = False
    cycleContext: dict | None = None


class ChatResponse(BaseModel):
    content: str
    tokens: int
    remainingToday: int


async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="API key inválida")
    return x_api_key


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    _: str = Depends(verify_api_key),
):
    # Rate limiting
    is_allowed, remaining = await check_rate_limit(request.userId, request.isPremium)

    if not is_allowed:
        limit = settings.ai_rate_limit_premium if request.isPremium else settings.ai_rate_limit_free
        raise HTTPException(
            status_code=429,
            detail={
                "message": f"Has alcanzado el límite de {limit} mensajes por día.",
                "isPremium": request.isPremium,
                "upgradeMessage": "Actualiza a Premium para mensajes ilimitados." if not request.isPremium else None,
            }
        )

    # Validate messages
    if len(request.messages) > 20:
        request.messages = request.messages[-20:]  # Keep last 20 messages for context

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    response = await chat_service.generate_response(
        messages=messages,
        cycle_context=request.cycleContext,
        is_premium=request.isPremium,
    )

    return ChatResponse(
        content=response["content"],
        tokens=response["tokens"],
        remainingToday=remaining,
    )


@router.post("/analyze-patterns")
async def analyze_patterns(
    data: dict,
    _: str = Depends(verify_api_key),
):
    """Analyze cycle patterns — Premium feature"""
    cycles = data.get("cycles", [])
    result = await chat_service.analyze_cycle_patterns(cycles)
    return result


@router.post("/monthly-insight")
async def monthly_insight(
    data: dict,
    _: str = Depends(verify_api_key),
):
    """Generate monthly insight text — Premium feature"""
    insight = await chat_service.generate_monthly_insight(data)
    return {"insight": insight}

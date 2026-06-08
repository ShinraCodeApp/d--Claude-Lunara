"""Lunara AI Service — FastAPI + OpenAI GPT-4o"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.routers import chat, predictions, reports
from app.config import settings
from app.services.redis_service import redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.ping()
    print(f"Lunara AI Service started [{settings.environment}]")
    yield
    # Shutdown
    await redis_client.close()


app = FastAPI(
    title="Lunara AI Service",
    description="Lunara by ShinraCode — Women Health AI Service",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# Security middlewares
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Routers
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["predictions"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])


@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "service": "lunara-ai",
        "version": "1.0.0",
    }

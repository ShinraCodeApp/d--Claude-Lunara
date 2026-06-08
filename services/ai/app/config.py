from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    openai_model: str = "gpt-4o"
    redis_url: str = "redis://localhost:6379"
    api_key: str
    environment: str = "development"
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Rate limits
    ai_rate_limit_free: int = 20        # messages/day for free users
    ai_rate_limit_premium: int = 200    # messages/day for premium users

    class Config:
        env_file = ".env"


settings = Settings()

import redis.asyncio as aioredis
from app.config import settings

redis_client = aioredis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
    max_connections=10,
)


async def check_rate_limit(user_id: str, is_premium: bool) -> tuple[bool, int]:
    """Returns (is_allowed, remaining_today)"""
    key = f"ai:rl:{user_id}"
    limit = settings.ai_rate_limit_premium if is_premium else settings.ai_rate_limit_free

    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400)  # 24 hours TTL
    results = await pipe.execute()

    current_count = results[0]
    is_allowed = current_count <= limit
    remaining = max(0, limit - current_count)

    return is_allowed, remaining

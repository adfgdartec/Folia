import json
import hashlib
import logging
from typing import Any, Optional
import redis.asyncio as redis
from core.config import get_settings
 
settings = get_settings()
logger   = logging.getLogger(__name__)
 
_redis: Optional[redis.Redis] = None

async def get_redis() -> Optional[redis.Redis]:
    global _redis
    if not settings.redis_url:
        return None
    try:
        if _redis is None:
            _redis = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        return _redis
    except Exception as e:
        logger.warning("Redis unavailable: %s", e)
        return None

async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    if not r:
        return None
    try:
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None
    
async def cache_invalidate_user(user_id: str) -> None:
    r = await get_redis()
    if not r:
        return
    try:
        pattern = f"*:{user_id}*"
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except Exception as e:
        logger.warning("Cache invalidation failed for user %s: %s", user_id, e)
 
 
def make_key(*parts: str) -> str:
    return ":".join(str(p) for p in parts)

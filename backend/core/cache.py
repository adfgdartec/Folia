import json
import hashlib
import time
import logging
from typing import Any, Optional
 
import redis.asyncio as aioredis
 
from core.config import get_settings
 
settings = get_settings()
logger   = logging.getLogger(__name__)
 
_client: Optional[aioredis.Redis] = None
_last_connect_attempt: float = 0.0
_RECONNECT_INTERVAL = 30.0   # try reconnecting at most once per 30s
 
 
async def _get_client() -> Optional[aioredis.Redis]:
    global _client, _last_connect_attempt
 
    if _client is not None:
        return _client
 
    if not settings.redis_url:
        return None
 
    now = time.monotonic()
    if now - _last_connect_attempt < _RECONNECT_INTERVAL:
        return None 
 
    _last_connect_attempt = now
    try:
        c = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=False,
        )
        await c.ping()
        _client = c
        logger.info("Redis connected: %s", settings.redis_url[:30])
        return _client
    except Exception as e:
        logger.warning("Redis unavailable (%s) — running without cache", e)
        return None
 
 
 
def _key(*parts: str) -> str:
    return "folia:" + ":".join(str(p) for p in parts)
 
 
def user_data_fingerprint(user_id: str, extra: str = "") -> str:
    minute_bucket = int(time.time() / 300)  # changes every 5 minutes
    raw = f"{user_id}:{extra}:{minute_bucket}"
    return hashlib.md5(raw.encode()).hexdigest()[:8]
 
 
 
async def cache_get(key: str) -> Optional[Any]:
    c = await _get_client()
    if not c:
        return None
    try:
        val = await c.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None
 
 
async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    c = await _get_client()
    if not c:
        return
    try:
        await c.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.debug("cache_set failed for %s: %s", key, e)
 
 
async def cache_delete(key: str) -> None:
    c = await _get_client()
    if not c:
        return
    try:
        await c.delete(key)
    except Exception:
        pass
 
 
async def cache_invalidate_user(user_id: str) -> None:
    c = await _get_client()
    if not c:
        return
    try:
        pattern = _key("*", user_id, "*")
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = await c.scan(cursor, match=pattern, count=100)
            if keys:
                await c.delete(*keys)
                deleted += len(keys)
            if cursor == 0:
                break
        if deleted:
            logger.debug("Invalidated %d cache keys for user %s", deleted, user_id[:8])
    except Exception as e:
        logger.debug("cache_invalidate_user failed: %s", e)
 
 
async def cache_health_check() -> str:
    if not settings.redis_url:
        return "not configured"
    try:
        c = await _get_client()
        if not c:
            return "unreachable"
        await c.ping()
        info = await c.info("memory")
        used_mb = info.get("used_memory_human", "?")
        return f"ok ({used_mb} used)"
    except Exception as e:
        return f"error: {e}"
 
 
 
TTL = {
    "dashboard":     300,
    "health_score":  300,
    "assets":        120,
    "debts":         120,
    "goals":         120,
    "bills":         300,
    "net_worth":     300,
    "transactions":  60,
    "glossary":      3600,   
    "tax":           600,    
    "narrate":       600,
    "stock":         300,    
    "macro":         3600, 
    "yields":        3600,
    "mortgage_rate": 3600,
    "fed_rate":      3600,
    "portfolio":     60,
    "education":     600,
}
 
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

def _get_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if user_id: 
        return user_id
    return get_remote_address(request)

limiter = Limiter(key_func=_get_user_id)

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down.",
            "retry_after": str(exc.limit.limit),
        },
        headers={"Retry-After": "60"},
    )

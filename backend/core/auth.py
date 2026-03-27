"""
Clerk JWT authentication for FastAPI.

Every protected endpoint calls `get_current_user_id(request)` as a dependency.
Clerk signs JWTs with RS256 — we fetch the JWKS and verify locally (no round-trip).

Setup:
  1. Install: pip install python-jose[cryptography] httpx
  2. Set CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY in .env
  3. (Optional) Set CLERK_WEBHOOK_SECRET for webhook verification

The middleware caches the JWKS for 1 hour to avoid hammering Clerk's endpoint.
"""

import time
import httpx
from functools import lru_cache
from typing import Optional

from fastapi import HTTPException, Request, status
from jose import jwt, JWTError

from core.config import get_settings

settings = get_settings()

# ─── JWKS cache ───────────────────────────────────────────────────────────────

_jwks_cache: dict = {}
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600  # 1 hour


def _get_jwks_url() -> str:
    """Derive JWKS URL from Clerk publishable key."""
    pk = settings.clerk_publishable_key
    if not pk:
        raise ValueError("CLERK_PUBLISHABLE_KEY is not set")
    # pk_live_xxxx or pk_test_xxxx → extract domain
    # Format: pk_[live|test]_<base64(domain)>
    # The JWKS endpoint is: https://<your-clerk-domain>/.well-known/jwks.json
    # For production: https://api.clerk.dev/v1/jwks  (uses secret key header)
    # Easiest: use https://clerk.<yourdomain>.com/.well-known/jwks.json
    # OR: derive from pk by base64-decoding the suffix
    import base64
    try:
        parts = pk.split("_")
        if len(parts) >= 3:
            b64_domain = parts[2]
            # Pad to multiple of 4
            b64_domain += "=" * (-len(b64_domain) % 4)
            domain = base64.b64decode(b64_domain).decode().strip("$")
            return f"https://{domain}/.well-known/jwks.json"
    except Exception:
        pass
    # Fallback: use Clerk API with secret key
    return "https://api.clerk.com/v1/jwks"


async def _fetch_jwks() -> dict:
    """Fetch and cache Clerk's JWKS (public keys for JWT verification)."""
    global _jwks_cache, _jwks_fetched_at

    if _jwks_cache and (time.time() - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache

    url = _get_jwks_url()
    headers = {}
    if "api.clerk.com" in url:
        headers["Authorization"] = f"Bearer {settings.clerk_secret_key}"

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    _jwks_cache = data
    _jwks_fetched_at = time.time()
    return data


# ─── Token verification ───────────────────────────────────────────────────────

async def verify_clerk_token(token: str) -> dict:
    """
    Verify a Clerk-issued JWT and return its claims.
    Raises HTTPException 401 if invalid.
    """
    try:
        jwks = await _fetch_jwks()

        # Decode header to get kid
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")

        # Find matching key
        key = next(
            (k for k in jwks.get("keys", []) if k.get("kid") == kid),
            None
        )
        if key is None:
            # Refresh cache and retry once
            _jwks_fetched_at = 0
            jwks = await _fetch_jwks()
            key = next(
                (k for k in jwks.get("keys", []) if k.get("kid") == kid),
                None
            )
        if key is None:
            raise HTTPException(status_code=401, detail="Unknown signing key")

        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},   # Clerk doesn't set aud by default
        )
        return claims

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── FastAPI dependency ───────────────────────────────────────────────────────

async def get_current_user_id(request: Request) -> str:
    """
    FastAPI dependency — extracts and verifies the Clerk JWT from the
    Authorization header, returns the Clerk user ID (sub claim).

    Usage:
        @router.get("/protected")
        async def endpoint(user_id: str = Depends(get_current_user_id)):
            ...
    """
    if not settings.clerk_secret_key:
        # Dev mode: accept X-User-Id header directly (no auth check)
        dev_user = request.headers.get("X-User-Id")
        if dev_user:
            return dev_user
        raise HTTPException(
            status_code=401,
            detail="Clerk auth not configured. Set CLERK_SECRET_KEY in .env"
        )

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization: Bearer <token> header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    claims = await verify_clerk_token(token)

    user_id: Optional[str] = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing 'sub' claim")

    return user_id


# ─── Optional auth (returns None if no token) ─────────────────────────────────

async def get_optional_user_id(request: Request) -> Optional[str]:
    """Like get_current_user_id but returns None instead of 401 for public routes."""
    try:
        return await get_current_user_id(request)
    except HTTPException:
        return None


# ─── Clerk webhook verification ───────────────────────────────────────────────

def verify_clerk_webhook(payload: bytes, svix_id: str, svix_ts: str, svix_sig: str) -> dict:
    """
    Verify a Clerk webhook using the svix signing library.
    Returns parsed payload dict if valid, raises HTTPException if invalid.

    Install: pip install svix
    """
    try:
        from svix.webhooks import Webhook, WebhookVerificationError
        wh = Webhook(settings.clerk_webhook_secret)
        return wh.verify(payload, {
            "svix-id":        svix_id,
            "svix-timestamp": svix_ts,
            "svix-signature": svix_sig,
        })
    except ImportError:
        # svix not installed — verify manually using HMAC-SHA256
        import hmac, hashlib, json
        msg = f"{svix_id}.{svix_ts}.{payload.decode()}"
        secret = settings.clerk_webhook_secret.removeprefix("whsec_")
        import base64
        key = base64.b64decode(secret)
        sig = hmac.new(key, msg.encode(), hashlib.sha256).digest()
        expected = "v1," + base64.b64encode(sig).decode()
        if not hmac.compare_digest(expected, svix_sig.split(" ")[0]):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        return json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook verification failed: {e}")

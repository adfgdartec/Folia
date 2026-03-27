from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
import time
import traceback
from core.config import get_settings
from core.database import get_supabase
from services.vector_store import get_index_stats
from core.rate_limit import limiter, rate_limit_exceeded_handler
from routers import advisor, simulate, tax, documents, stocks, narrate, glossary, health, budget, macro, users, assets, debts, goals, transactions, alerts, paper_trading, education, journal, community, bills, webhooks


settings = get_settings()

# Base Setup
app = FastAPI(
    title="Folia API",
    description="Financial intelligence backend — RAG advisor, simulators, tax engine, and market data.",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url=None, 
)

# Rate Limiter
app.state.limiter = limiter
app.add_execption_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=[
        "http://localhost:3000",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type", 
        "Authorization", 
        "Accept", 
        "Origin", 
        "X-Requested-With"
    ],
)

@app.middleware("http")
async def security_and_timing(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elasped = round((time.time() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(elasped)
    
    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()" 
    
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
 
    return response

# Error Handler for All Backend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.debug:
        detail = traceback.format_exc()
    else:
        detail = "An internal error occurred."
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "type": type(exc).__name__},
    )

# Extends all routes for backend
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(advisor.router, prefix="/api/advisor", tags=["Advisor"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["Simulator"])
app.include_router(tax.router, prefix="/api/tax", tags=["Tax"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stocks"])
app.include_router(narrate.router, prefix="/api/narrate", tags=["Narrate"])
app.include_router(glossary.router, prefix="/api/glossary", tags=["Glossary"])
app.include_router(health.router, prefix="/api/health", tags=["Health"])
app.include_router(budget.router, prefix="/api/budget", tags=["Budget"])
app.include_router(macro.router, prefix="/api/macro", tags=["Macro"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(debts.router, prefix="/api/debts", tags=["Debts"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(paper_trading.router, prefix="/api/paper-trading", tags=["Paper Trading"])
app.include_router(education.router, prefix="/api/education", tags=["Education"])
app.include_router(journal.router, prefix="/api/journal", tags=["Decision Journal"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(bills.router, prefix="/api/bills", tags=["Bills"])


# Route for Health Checking
@app.get("/", tags=["System"])
async def root():
    return {
        "name":    settings.app_name,
        "version": settings.app_version,
        "status":  "running",
        "docs":    "/docs",
    }


@app.get("/health", tags=["System"])
async def health_check():
    checks = {}
 
    try:
        get_supabase().table("profiles").select("id").limit(1).execute()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
 
    try:
        from core.cache import get_redis
        r = await get_redis()
        if r:
            await r.ping()
            checks["redis"] = "ok"
        else:
            checks["redis"] = "not configured"
    except Exception as e:
        checks["redis"] = f"error: {e}"
 
    if settings.pinecone_api_key:
        try:
            stats = await get_index_stats()
            checks["pinecone"] = f"ok ({stats.get('total_vectors', 0)} vectors)"
        except Exception as e:
            checks["pinecone"] = f"error: {e}"
 
    checks["sendgrid"] = "configured" if settings.sendgrid_api_key else "not configured"
    checks["clerk"]    = "configured" if settings.clerk_secret_key else "dev_mode"
 
    return {"status": "ok", "version": settings.app_version, "checks": checks}

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import time
from core.config import get_settings
from routers import advisor, simulate, tax, documents, stocks, narrate, glossary, health, budget, macro

settings = get_settings()

# Base Setup
app = FastAPI(
    title="Folia API",
    description="Financial intelligence backend — RAG advisor, simulators, tax engine, and market data.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc", 
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware, 
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = round((time.time() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    return response


# Error Handler for All Backend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred.", "type": type(exc).__name__},
    )

# Extends all routes for backend
app.include_router(advisor.router, prefix="/api/advisor", tage=["Advisor"])
app.include_router(simulate.router, prefix="/api/simulate", tage=["Simulator"])
app.include_router(tax.router, prefix="/api/tax", tage=["Tax"])
app.include_router(documents.router, prefix="/api/documents", tage=["Documents"])
app.include_router(stocks.router, prefix="/api/stocks", tage=["Stocks"])
app.include_router(narrate.router, prefix="/api/narrate", tage=["Narrate"])
app.include_router(glossary.router, prefix="/api/glossary", tage=["Glossary"])
app.include_router(health.router, prefix="/api/health", tage=["Health"])
app.include_router(budget.router, prefix="/api/budget", tage=["Budget"])
app.include_router(macro.router, prefix="/api/macro", tage=["Macro"])

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
    from core.database import get_supabase
    db_ok = False
    try:
        supabase = get_supabase()
        supabase.table("knowledge_base").select("id").limit(1).execute()
        db_ok = True
    except Exception:
        pass

    return {
        "status":   "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "version":  settings.app_version,
    }

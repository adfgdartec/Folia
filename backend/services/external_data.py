import httpx
import time
from core.config import get_settings

settings = get_settings()


_cache: dict[str, tuple] = {}


def _cache_get(key: str):
    if key in _cache:
        data, expires_at = _cache[key]
        if time.time() < expires_at:
            return data
        del _cache[key]
    return None


def _cache_set(key: str, data, ttl_seconds: int):
    _cache[key] = (data, time.time() + ttl_seconds)


async def get_stock_quote(ticker: str) -> dict:
    key = f"quote:{ticker.upper()}"
    cached = _cache_get(key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": ticker.upper(), "token": settings.finnhub_api_key}
        )
        resp.raise_for_status()
        data = resp.json()

    result = {
        "ticker": ticker.upper(),
        "price": data.get("c", 0),
        "change": data.get("d", 0),
        "change_pct": data.get("dp", 0),
        "high": data.get("h", 0),
        "low": data.get("l", 0),
        "open": data.get("o", 0),
        "prev_close": data.get("pc", 0),
    }
    _cache_set(key, result, ttl_seconds=30)
    return result


async def get_company_profile(ticker: str) -> dict:
    key = f"profile:{ticker.upper()}"
    cached = _cache_get(key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://finnhub.io/api/v1/stock/profile2",
            params={"symbol": ticker.upper(), "token": settings.finnhub_api_key}
        )
        resp.raise_for_status()
        data = resp.json()

    result = {
        "name": data.get("name", ticker),
        "exchange": data.get("exchange", ""),
        "industry": data.get("finnhubIndustry", ""),
        "market_cap": data.get("marketCapitalization", 0) * 1_000_000,
        "shares_out": data.get("shareOutstanding", 0) * 1_000_000,
        "website": data.get("weburl", ""),
        "logo": data.get("logo", ""),
    }
    _cache_set(key, result, ttl_seconds=86400)
    return result


async def get_basic_financials(ticker: str) -> dict:
    key = f"fin:{ticker.upper()}"
    cached = _cache_get(key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://finnhub.io/api/v1/stock/metric",
            params={
                "symbol": ticker.upper(),
                "metric": "all",
                "token":  settings.finnhub_api_key
            }
        )
        resp.raise_for_status()
        data = resp.json().get("metric", {})

    result = {
        "pe_ratio": data.get("peBasicExclExtraTTM"),
        "eps": data.get("epsBasicExclExtraAnnual"),
        "revenue": data.get("revenuePerShareAnnual"),
        "debt_equity": data.get("totalDebt/totalEquityAnnual"),
        "dividend_yield": data.get("dividendYieldIndicatedAnnual"),
        "week_52_high": data.get("52WeekHigh"),
        "week_52_low": data.get("52WeekLow"),
        "beta": data.get("beta"),
        "roe":  data.get("roeRfy"),
        "profit_margin": data.get("netProfitMarginAnnual"),
    }
    _cache_set(key, result, ttl_seconds=86400)
    return result


async def get_fred_series(series_id: str, limit: int = 12) -> list[dict]:
    key = f"fred:{series_id}:{limit}"
    cached = _cache_get(key)
    if cached:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.stlouisfed.org/fred/series/observations",
            params={
                "series_id": series_id,
                "api_key": settings.fred_api_key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": limit,
            }
        )
        resp.raise_for_status()
        observations = resp.json().get("observations", [])

    result = [
        {"date": o["date"], "value": float(o["value"]) if o["value"] != "." else None}
        for o in observations
    ]
    _cache_set(key, result, ttl_seconds=86400 * 7)
    return result


async def get_current_mortgage_rate() -> float:
    key = "fred:MORTGAGE30US:latest"
    cached = _cache_get(key)
    if cached:
        return cached

    data = await get_fred_series("MORTGAGE30US", limit=1)
    rate = data[0]["value"] if data and data[0]["value"] is not None else 7.0
    _cache_set(key, rate, ttl_seconds=86400)
    return rate


async def get_current_fed_funds_rate() -> float:
    data = await get_fred_series("FEDFUNDS", limit=1)
    return data[0]["value"] if data and data[0]["value"] is not None else 5.25


async def get_cpi_data(months: int = 24) -> list[dict]:
    return await get_fred_series("CPIAUCSL", limit=months)


async def get_treasury_yields() -> dict:
    key = "treasury:yields"
    cached = _cache_get(key)
    if cached:
        return cached

    series_map = {
        "3_month": "DTB3",
        "2_year":  "DGS2",
        "10_year": "DGS10",
        "30_year": "DGS30",
    }
    results = {}
    for label, series_id in series_map.items():
        data = await get_fred_series(series_id, limit=1)
        results[label] = data[0]["value"] if data and data[0]["value"] is not None else None

    _cache_set(key, results, ttl_seconds=3600)
    return results

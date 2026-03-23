from fastapi import APIRouter, HTTPException
from services.external_data import (get_fred_series, get_current_mortgage_rate, get_current_fed_funds_rate, get_cpi_data, get_treasury_yields,)
import asyncio

router = APIRouter()

FRED_SERIES_MAP = {
    "cpi": ("CPIAUCSL", "Consumer Price Index (CPI)", 24),
    "fed_funds": ("FEDFUNDS", "Federal Funds Rate", 24),
    "unemployment": ("UNRATE", "Unemployment Rate", 24),
    "gdp": ("GDP", "Gross Domestic Product", 12),
    "mortgage_30": ("MORTGAGE30US", "30-Year Fixed Mortgage Rate", 24),
    "sp500": ("SP500", "S&P 500 Index", 24),
    "inflation": ("T10YIE", "10-Year Brakeven Inflation Rate", 12),
    "consumer_sent": ("UMCSENT", "Consumer Sentiment", 12),
    "m2": ("M2SL", "M2 Money Supply", 24),
    "housing_starts": ("HOUST", "Housing Starts", 24),
    "retail_sales": ("RSAFS", "Retail Sales", 12),
    "yield_spread": ("T10Y2Y", "10Y-2Y Treasury Yield Spread", 24)
}

@router.get("/indicators")
async def get_all_indicators():
    async def fetch_latest(key: str, series_id: str, label: str, months: int):
        try:
            data = await get_fred_series(series_id, limit=2)
            latest =  next((d for d in data if d["value"] is not None), None)
            prev = next((d for d in data[1:] if d["value"] is not None), None)
            change = None
            if latest and prev and prev["value"]:
                change = round(latest["value"] - prev["value"], 3)
            
            return {
                "key": key,
                "label": label,
                "value": latest["value"] if latest else None,
                "date": latest["date"] if latest else None,
                "change": change,
            }
        except Exception:
            return {"key": key, "label": label, "value": None, "date": None, "change": None}
        
    tasks = [fetch_latest(k, v[0], v[1], v[2]) for k, v in FRED_SERIES_MAP.items()]
    results = await asyncio.gather(*tasks)
    return {"indicators": results}

@router.get("/series/{series_key}")
async def get_series(series_key: str, months: int = 24):
    if series_key not in FRED_SERIES_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown series '{series_key}'. "f"Valid keys: {list(FRED_SERIES_MAP.keys())}")
    series_id, label, default_months = FRED_SERIES_MAP[series_key]
    data = await get_fred_series(series_id, limit=min(months, 120))
    return {"key": series_key, "label": label, "series_id": series_id, "data": data}

@router.get("/yields")
async def get_yield_curve():
    yields = await get_treasury_yields()
    return {"yields": yields}


@router.get("/mortgage-rate")
async def get_mortgage_rate():
    rate = await get_current_mortgage_rate()
    return {"rate": rate, "label": "30-Year Fixed Mortgage Rate (%)"}


@router.get("/fed-rate")
async def get_fed_rate():
    rate = await get_current_fed_funds_rate()
    return {"rate": rate, "label": "Federal Funds Rate (%)"}
from fastapi import APIRouter, HTTPException
from models.schemas import StockRequest, StockData, FinancialMetadata
from services.external_data import ( get_stock_quote, get_company_profile, get_basic_financials,)
from core.clients import groq_client
from core.config import get_settings
import asyncio

router = APIRouter()
settings = get_settings()

async def _ai_stock_summary(ticker: str, profile: dict, financials: dict, quote: dict, metadata: FinancialMetadata) -> str:
    pe = financials.get("pe_ratio")
    div = financials.get("dividend_yield")
    beta = financials.get("beta")
    
    context = (
        f"{profile.get('name', ticker)} ({ticker}) — {profile.get('industry', 'Unknown sector')}\n"
        f"Price: ${quote.get('price', 0):.2f} ({quote.get('change_pct', 0):+.2f}%)\n"
        f"P/E ratio: {pe or 'N/A'}\n"
        f"52-week range: ${financials.get('week_52_low', 0):.2f} – ${financials.get('week_52_high', 0):.2f}\n"
        f"Beta: {beta or 'N/A'}\n"
        f"Dividend yield: {div or 0:.2f}%\n"
        f"Profit margin: {financials.get('profit_margin') or 'N/A'}"
    )
    
    age_context = ""
    if metadata:
        age_context = (
            f"\nThe user is {metadata.age} years old with a {metadata.life_stage.value} financial profile. "
            f"Literacy level: {metadata.literacy_level.value}."
        )
    
    response = await groq_client.chat.completions.create(
        model=settings.narration_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a financial educator summarizing stock data. "
                    "In 3 sentences: (1) what the company does, "
                    "(2) one key thing the numbers tell you, "
                    "(3) one risk to be aware of. "
                    "Never say 'buy' or 'sell'. Educational only."
                    + age_context
                ),
            },
            {"role": "user", "content": context},
        ],
        temperature=0.3,
        max_tokens=200,
    )
    return response.choices[0].message.content or ""

@router.post("", response_model=StockData)
async def get_stock(req: StockRequest):
    ticker = req.ticker.upper().strip()
    try:
        quote, profile, financials = await asyncio.gather(
            get_stock_quote(ticker),
            get_company_profile(ticker),
            get_basic_financials(ticker),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch stock data: {str(e)}")
    
    if not quote.get("price"):
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found.")
    
    ai_summary = ""
    if req.include_ai_summary:
        try:
            ai_summary = await _ai_stock_summary(ticker, profile, financials, quote, req.metadata)
        except Exception:
            ai_summary = "Unable to generate summary at this time."
    
    return StockData(
        ticker=ticker,
        company_name=profile.get("name", ticker),
        current_price=round(quote.get("price", 0), 2),
        change_pct=round(quote.get("change_pct", 0), 2),
        market_cap=profile.get("market_cap"),
        pe_ratio=financials.get("pe_ratio"),
        eps=financials.get("eps"),
        revenue=financials.get("revenue"),
        debt_to_equity=financials.get("debt_equity"),
        dividend_yield=financials.get("dividend_yield"),
        week_52_high=financials.get("week_52_high"),
        week_52_low=financials.get("week_52_low"),
        ai_summary=ai_summary,
    )
    

@router.get("/search/{query}")
async def search_stocks(query: str):
    import httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://finnhub.io/api/v1/search",
            params={"q": query, "token": settings.finnhub_api_key}
        )
        resp.raise_for_status()
        data = resp.json()

    results = [
        {"symbol": r["symbol"], "name": r["description"]}
        for r in data.get("result", [])[:10]
        if r.get("type") == "Common Stock"
    ]
    return {"results": results}
    

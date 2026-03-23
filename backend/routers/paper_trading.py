from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from core.database import get_supabase
from services.external_data import get_stock_quote
import uuid

router = APIRouter()

class TradeOrder(BaseModel):
    portfolio_id: str
    user_id: str
    ticker: str
    order_type: str = "market" 
    side: str
    shares: float = Field(gt=0)
    limit_price: Optional[float] = None
    reasoning: Optional[str] = None

class PortfolioCreate(BaseModel):
    user_id: str
    starting_cash: float = Field(default=100000.00, gt=0)
    
@router.post("/portfolio")
async def create_portfolio(body: PortfolioCreate):
    supabase = get_supabase()
    existing = supabase.table("paper_portfolios").select("id").eq("user_id", body.user_id).execute()
    if existing.data:
        return existing.data[0]
    payload = {
        "id": str(uuid.uuid4()),
        "user_id": body.user_id,
        "cash_balanace": body.starting_cash,
        "total_value": body.starting_cash,
    }
    result = supabase.table("paper_portfolios").insert(payload).execute()
    return result.data[0]

@router.get("/portfolio/{user_id}")
async def get_portfolio(user_id: str):
    supabase = get_supabase()
    port = supabase.table("paper_portfolios").select("*").eq("user_id", user_id).single().execute()
    if not port.data:
       raise HTTPException(status_code=404, detail="No portfolio found. Create one first.")
    
    # Fetches all holdings
    holdings = supabase.table("paper_holdings").select("*").eq("portfolio_id", port.data["id"]).execute()
    
    # Saves enriched holdings based on current market price
    enriched = []
    total_market_value = 0.0
    for h in (holdings.data or []):
        try:
            quote = await get_stock_quote(h["ticker"])
            current_price = quote.get("price", h["avg_cost"])
            market_value = round(current_price * h["shares"], 2)
            cost_basis = round(h["avg_cost"] * h["shares"], 2)
            unrealized_pnl = round(market_value - cost_basis, 2)
            pnl_percent = round((market_value - cost_basis) / cost_basis * 100, 2) if cost_basis else 0
        except Exception:
            current_price  = h["avg_cost"]
            market_value   = round(h["avg_cost"] * h["shares"], 2)
            unrealized_pnl = 0.0
            pnl_percent        = 0.0
        
        total_market_value += market_value
        enriched.append({
            **h, 
            "current_price": current_price,
            "market_value": market_value,
            "unrealized_pnl": unrealized_pnl,
            "pnl_percent": pnl_percent,
        })
    total_value = round(port.data["cash_balance"] + total_market_value, 2)
    
    # Updates total_value in Supabase
    supabase.table("paper_portfolios").update({"total_value": total_value}).eq("id", port.data["id"]).execute()
    
    # Sets Starting Value as 100k 
    starting_value = 100000.0
    total_return = round((total_value - starting_value) / starting_value * 100, 2)
    
    return {
        "portfolio": {**port.data, "total_value": total_value},
        "holdings": enriched,
        "cash_balance": round(port.data["cash_balance"], 2),
        "holdings_value": round(total_market_value, 2),
        "total_value": total_value,
        "total_return_percent": total_return,
        "holding_count": len(enriched),
    }

@router.post("/order")
async def place_order(body: TradeOrder):
    supabase = get_supabase()
    
    # Validates if users portfolio exists
    port = supabase.table("paper_portfolios").select("*").eq("id", body.portfolio_id).single().execute()
    if not port.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Gets the real time price
    try:
        quote = await get_stock_quote(body.ticker.upper())
        execution_price = body.limit_price if body.order_type == "limit" and body.limit_price else quote.get("price", 0)
    except Exception:
        raise HTTPException(status_code=502, detail=f"Cannot fetch price for {body.ticker}")
    
    if execution_price <= 0:
        raise HTTPException(status_code=400, detail="Invalid execution price")
    
    total_value = round(execution_price * body.shares, 2)
    cash_amount = port.data["cash_balance"]
    if body.side == "buy":
        if total_value > cash_amount:
            raise HTTPException(status_code=400, detail=f"Insufficient cash. Need ${total_value:,.2f}, have ${cash_amount:,.2f}")

        # Updates Users Debit Cash
        new_cash = round(cash_amount - total_value, 2)
        supabase.table("paper_portfolios").update({"cash_balance": new_cash}).eq("id", body.portfolio_id).execute()
        
        # Upserts Holding into Supabase
        existing_holding = supabase.table("paper_holdings").select("*").eq("portfolio_id", body.portfolio_id).eq("ticker", body.ticker.upper()).execute()
        if existing_holding.data:
            h = existing_holding.data[0]
            old_value = h["avg_cost"] * h["shares"]
            new_shares = h["shares"] + body.shares
            new_avg = round((old_value + total_value) / new_shares, 4)
            supabase.table("paper_holdings").insert({
                "id": str(uuid.uuid4()),
                "portfolio_id": body.portfolio_id,
                "user_id": body.user_id,
                "ticker": body.ticker.upper(),
                "shares": body.shares,
                "average_cost": execution_price,
            }).execute()
    
    elif body.side == "sell":
        existing_holding = supabase.table("paper_holdings").select("*").eq("portfolio_id", body.portfolio_id).eq("ticker", body.ticker.upper()).execute()
        
        if not existing_holding.data:
            raise HTTPException(status_code=400, detail=f"You don't hold any {body.ticker}")
        
        h = existing_holding.data[0]
        if body.shares > h["shares"]:
            raise HTTPException(status_code=400,detail=f"Cannot sell {body.shares} shares — you only hold {h['shares']}")
        
        # Sets up Credit Cash for User
        new_cash = round(cash_amount + total_value, 2)
        supabase.table("paper_portfolios").update({"cash_balance": new_cash}).eq("id", body.portfolio_id).execute()
        new_shares = round(h["shares"] - body.shares, 6)
        if new_shares < 0.000001:
            supabase.table("paper_holdings").delete().eq("id", h["id"]).execute()
        else:
            supabase.table("paper_holdings").update({"shares": new_shares}).eq("id", h["id"]).execute()
        
    # Sets the Trade as a Record
    trade_record = {
        "id": str(uuid.uuid4()),
        "portfolio_id": body.portfolio_id,
        "user_id": body.user_id,
        "ticker": body.ticker.upper(),
        "order_type": body.order_type,
        "side": body.side,
        "shares": body.shares,
        "price": execution_price,
        "total_value": total_value,
        "status": "filled",
        "reasoning": body.reasoning,
    }
    result = supabase.table("paper_trades").insert(trade_record).execute()
    return {"trade": result.data[0], "execution_price": execution_price}

@router.get("/trades/{user_id}")
async def get_trade_history(user_id: str, limit: int = 50):
    supabase = get_supabase()
    result = supabase.table("paper_trades").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    trades = result.data or []
    
    # Sets all Summary Stats
    buys  = [t for t in trades if t["side"] == "buy"]
    sells = [t for t in trades if t["side"] == "sell"]
    realized_pnl = round(sum(s["total_price"] - next((b["price"] * s["shares"] for b in buys if b["ticker"] == s["ticker"]), s["total_value"]) for s in sells), 2)
    
    return {
        "trades": trades,
        "total_trades": len(trades),
        "buy_count": len(buys),
        "sell_count": len(sells),
        "realized_pnl": realized_pnl,
    }
    
@router.post("/portfolio/{portfolio_id}/reset")
async def reset_portfolio(portfolio_id: str):
    supabase = get_supabase()
    supabase.table("paper_holdings").delete().eq("portfolio_id", portfolio_id).execute()
    supabase.table("paper_portfolios").update({
        "cash_balance": 100000.00,
        "total_value":  100000.00,
    }).eq("id", portfolio_id).execute()
    return {"status": "reset", "starting_cash": 100000.00}  

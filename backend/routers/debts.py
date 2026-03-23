from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from core.database import get_supabase
import uuid
import math
import copy

router = APIRouter()


class DebtCreate(BaseModel):
    user_id: str
    name: str
    balance: float = Field(ge=0)
    interest_rate: float = Field(ge=0, le=100)
    minimum_payment: float = Field(ge=0)
    type: str
    lender: Optional[str] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)


class DebtUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = Field(default=None, ge=0)
    interest_rate: Optional[float] = Field(default=None, ge=0, le=100)
    minimum_payment: Optional[float] = Field(default=None, ge=0)
    type: Optional[str] = None
    lender: Optional[str] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)


class DebtPaymentUpdate(BaseModel):
    payment_amount: float = Field(gt=0)


VALID_TYPES = {
    "student", "credit_card", "mortgage", "auto",
    "medical", "personal", "business", "other"
}

def _months_to_payoff(balance: float, rate: float, payment: float) -> int:
    if balance <= 0:
        return 0
    monthly_rate = rate / 100 / 12
    if monthly_rate == 0:
        return int(balance / payment) if payment > 0 else 9999
    if payment <= balance * monthly_rate:
        return 9999
    months = math.log(payment / (payment - balance * monthly_rate)) / math.log(1 + monthly_rate)
    return int(math.ceil(months))

def _total_interest(balance: float, rate: float, payment: float) -> float:
    months = _months_to_payoff(balance, rate, payment)
    if months >= 9999:
        return float("inf")
    return round(payment * months - balance, 2)

@router.get("/{user_id}")
async def list_debts(user_id: str):
    supabase = get_supabase()
    result = supabase.table("debts").select("*").eq("user_id", user_id).eq("is_paid_off", False).order("interest_rate", desc=True).execute()
    debts = result.data or []

    total_balance = sum(d["balance"] for d in debts)
    total_min_payment = sum(d["minimum_payment"] for d in debts)
    monthly_interest = sum(d["balance"] * d["interest_rate"] / 100 / 12 for d in debts)

    # Annotates each debt with payoff metadata
    for d in debts:
        d["months_to_payoff"] = _months_to_payoff(d["balance"], d["interest_rate"], d["minimum_payment"])
        d["total_interest"]   = _total_interest(d["balance"], d["interest_rate"], d["minimum_payment"])

    return {
        "debts": debts,
        "total_balance": round(total_balance, 2),
        "total_min_payment": round(total_min_payment, 2),
        "monthly_interest":  round(monthly_interest, 2),
        "count": len(debts),
    }


@router.get("/{user_id}/strategies")
async def list_debts(user_id: str, extra_payment: float = 0.0):
    supabase = get_supabase()
    result = supabase.table("debts").select("*").eq("user_id", user_id).eq("is_paid_off", False).execute()
    debts = result.data or []
    if not debts:
        return {"message": "No active debts", "strategies": {}}
    
    def simulate_strategy(debts_sorted: list, extra: float):
        active = copy.deepcopy(debts_sorted)
        total_interest = 0.0
        month = 0
        max_months = 600
        
        while any(d["balance"] > 0 for d in active) and month < max_months:
            month += 1
            remaining_extra = extra
            
            for d in active:
                if d["balance"] <= 0:
                    continue
                interest = d["balance"] * d["interest_rate"] / 100 / 12
                total_interest += interest
                payment = d["minimum_payment"]
                d["balance"] += interest - payment

            for d in active:
                if d["balance"] > 0 and remaining_extra > 0:
                    applied = min(remaining_extra, d["balance"])
                    d["balance"] -= applied
                    remaining_extra -= applied
                    break
            
            for d in active:
                d["balance"] = max(0, d["balance"])
                
        return month, round(total_interest, 2)

    avalanche = sorted(debts, key=lambda d: d["interest_rate"], reverse=True)
    snowball = sorted(debts, key=lambda d: d["balance"])
    
    av_months, av_interest = simulate_strategy(avalanche, extra_payment)
    sb_months, sb_interest = simulate_strategy(snowball, extra_payment)
    
    return {
        "avalanche": {
            "months_to_payoff": av_months,
            "total_interest": av_interest,
            "order": [d["name"] for d in avalanche],
            "description": "Pay highest interest rate first — minimizes total interest paid",
        }, 
        "snowball": {
            "months_to_payoff": sb_months,
            "total_interest": sb_interest,
            "order": [d["name"] for d in snowball],
            "description": "Pay smallest balance first — maximizes psychological wins",
        }, 
        "interest_savings_with_avalanche": round(sb_interest - av_interest, 2),
        "time_savings_months": sb_months - av_months,
        "extra_payment_applied": extra_payment,
    }
                
 
@router.post("")
async def create_debt(body: DebtCreate):
    if body.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid debt type. Must be one of: {VALID_TYPES}")
    supabase = get_supabase()
    payload = {**body.model_dump(), "id": str(uuid.uuid4())}
    result = supabase.table("debts").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create debt")
    return result.data[0]


@router.patch("/{debt_id}")
async def update_debt(debt_id: str, body: DebtUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    supabase = get_supabase()
    result = supabase.table("debts").update(updates).eq("id", debt_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Debt not found")
    return result.data[0]


@router.post("/{debt_id}/payment")
async def apply_payment(debt_id: str, body: DebtPaymentUpdate):
    supabase = get_supabase()
    current = supabase.table("debts").select("balance").eq("id", debt_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Debt not found")

    new_balance = max(0.0, round(current.data["balance"] - body.payment_amount, 2))
    result = supabase.table("debts").update({"balance": new_balance}).eq("id", debt_id).execute()
    return result.data[0]


@router.delete("/{debt_id}")
async def delete_debt(debt_id: str):
    supabase = get_supabase()
    supabase.table("debts").delete().eq("id", debt_id).execute()
    return {"deleted": debt_id}              
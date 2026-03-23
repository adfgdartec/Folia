from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from core.database import get_supabase
from core.config import get_settings

router = APIRouter()
settings = get_settings()

# Models
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_done: Optional[bool] = None

class MetadataUpsert(BaseModel):
    user_id: str
    age: int
    life_stage: int
    annual_income: float
    income_type: str
    filing_status: str = "single"
    state: Optional[str] = None
    monthly_expenses: float = 0.0
    emergency_fund_months: float = 0.0
    literacy_level: str = "beginner"
    goals: list = []
    

# Profile Endpoints
@router.get("/{user_id}")
async def get_profile(user_id: str):
    supabase = get_supabase()
    result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data

@router.patch("/{user_id}")
async def update_profile(user_id: str, body: ProfileUpdate):
    supabase = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = supabase.table("profiles").update(updates).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data[0]

# Metadata Endpoints
@router.get("/{user_id}/metadata")
async def get_metadata(user_id: str):
    supabase = get_supabase()
    result = supabase.table("financial_metadata").select("*").eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Financial metadata not found")
    return result.data

@router.put("/{user_id}/metadata")
async def upsert_metadata(user_id: str, body: MetadataUpsert):
    supabase = get_supabase()
    body.user_id = user_id
    payload = body.model_dump()
    
    result = supabase.table("financial_metadata").upsert(payload, on_conflict="user_id").execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save metadata")
    return result.data[0]

@router.get("/{user_id}/net-worth")
async def get_net_worth(user_id: str, months: int = 12):
    supabase = get_supabase()
    result = (
        supabase.table("net_worth_snapshots")
        .select("snapshot_date, total_assets, total_debts, net_worth")
        .eq("user_id", user_id)
        .order("snapshot_date", desc=True)
        .limit(months)
        .execute()
    )
    snapshots = list(reversed(result.data or []))
    return {"snapshots": snapshots}

@router.get("/{user_id}/dashboard")
async def get_dashboard_summary(user_id: str):
    supabase = get_supabase()
    net_worth = supabase.table("net_worth_snapshots").select("total_assets, total_debts, net_worth, snapshot_date").eq("user_id", user_id).order("snapshot_date", desc=True).limit(1).execute()
    alerts = supabase.table("alerts").select("id, type, title, message, priority, created_at").eq("user_id", user_id).eq("is_read", False).eq("is_dismissed", False).order("created_at", desc=True).limit(10).execute()
    goals = supabase.table("goals").select("id, name, target_amount, current_amount, target_date, category, is_achieved").eq("user_id", user_id).eq("is_achieved", False).order("priority", desc=True).execute()
    health = supabase.table("health_score_history").select("total_score, scored_at").eq("user_id", user_id).order("scored_at", desc=True).limit(1).execute()
    debts = supabase.table("debts").select("id, name, balance, interest_rate, minimum_payment, type").eq("user_id", user_id).eq("is_paid_off", False).order("interest_rate", desc=True).execute()
    
    return {
        "net_worth": net_worth.data[0] if net_worth.data else None,
        "alerts": alerts.data or [],
        "goals": goals.data or [],
        "health_score": health.data[0] if health.data else None,
        "debts": debts.data or [],
    }
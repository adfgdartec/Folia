from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from core.database import get_supabase
import uuid

router = APIRouter()


class GoalCreate(BaseModel):
    user_id: str
    name: str
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0, default=0)
    target_date: str
    category: str = "general"
    priority: int = Field(ge=1, le=5, default=3)
    notes: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    target_date: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None


class GoalContribution(BaseModel):
    amount: float = Field(gt=0)


def _months_remaining(target_date_str: str) -> int:
    try:
        td = date.fromisoformat(target_date_str)
        today = date.today()
        return max(0, (td.year - today.year) * 12 + (td.month - today.month))
    except Exception:
        return 0


def _required_monthly(target: float, current: float, months: int) -> float:
    if months <= 0:
        return float("inf")
    return round(max(0, (target - current) / months), 2)

@router.get("/{user_id}")
async def list_goals(user_id: str, include_achieved: bool = False):
    supabase = get_supabase()
    query = supabase.table("goals").select("*").eq("user_id", user_id)
    if not include_achieved:
        query = query.eq("is_achieved", False)
    result = query.order("priority", desc=True).execute()
    goals = result.data or []
    
    for g in goals:
        months = _months_remaining(g["target_date"])
        percent = round(g["current_amount"] / g["target_amount"] * 100, 1) if g["target_amount"] > 0 else 0
        g["progress_percent"] = percent
        g["months_remaining"] = months
        g["required_monthly"] = _required_monthly(g["target_amount"], g["current_amount"], months)
        g["on_track"] = percent >= (100 - months / max(months + 1, 1) * 100)
    
    total_target = sum(g["target_amount"] for g in goals if not g["is_achieved"])
    total_saved = sum(g["current_amount"] for g in goals if not g["is_achieved"])
    overall_percent = round(total_saved / total_target * 100, 1) if total_target > 0 else 0
    
    return{
        "goals": goals,
        "total_target": round(total_target, 2),
        "total_saved": round(total_saved, 2),
        "overall_percent": overall_percent,
        "count": len(goals)
    }
@router.post("")
async def create_goal(body: GoalCreate):
    supabase = get_supabase()
    payload = {**body.model_dump(), "id": str(uuid.uuid4())}
    result = supabase.table("goals").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create goal")
    return result.data[0]


@router.patch("/{goal_id}")
async def update_goal(goal_id: str, body: GoalUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    supabase = get_supabase()
    result = supabase.table("goals").update(updates).eq("id", goal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result.data[0]


@router.post("/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, body: GoalContribution):
    """Add a contribution to a goal — triggers achieved check via DB trigger."""
    supabase = get_supabase()
    current = supabase.table("goals").select("current_amount, target_amount, name").eq(
        "id", goal_id
    ).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    new_amount = round(current.data["current_amount"] + body.amount, 2)
    result = supabase.table("goals").update({"current_amount": new_amount}).eq("id", goal_id).execute()
    return result.data[0]


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str):
    supabase = get_supabase()
    supabase.table("goals").delete().eq("id", goal_id).execute()
    return {"deleted": goal_id}
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.database import get_supabase
import uuid

router = APIRouter()


class AlertCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    action_url: Optional[str] = None
    priority: str = "medium"
    expires_at: Optional[str] = None
    
@router.get("/{user_id}")
async def list_alerts(user_id: str, include_read: bool=False, limit: int = 50):
    supabase = get_supabase()
    query = supabase.table("alerts").select("*").eq("user_id", user_id).eq("is_dismissed", False)
    if not include_read:
        query = query.eq("is_read", False)
    result = query.order("created_at", desc=True).limit(limit).execute()
    alerts = result.data or []
    
    urgent = [a for a in alerts if a["priority"] == "urgent"]
    high = [a for a in alerts if a["priority"] == "high"]
    others = [a for a in alerts if a["priority"] not in ("urgent", "high")]
    
    return {
        "alerts": urgent + high + others,
        "unread_count": sum(1 for a in alerts if not a["is_read"]),
        "urgent_count": len(urgent),
    }

@router.post("/{alert_id}/read")
async def mark_read(alert_id: str):
    supabase = get_supabase()
    result = supabase.table("alerts").update({"is_read": True}).eq("id", alert_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result.data[0]


@router.post("/{user_id}/read-all")
async def mark_all_read(user_id: str):
    supabase = get_supabase()
    supabase.table("alerts").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    return {"status": "all marked read"}


@router.post("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str):
    supabase = get_supabase()
    result = supabase.table("alerts").update({"is_dismissed": True}).eq("id", alert_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result.data[0]


@router.post("")
async def create_alert(body: AlertCreate):
    if body.priority not in ("low", "medium", "high", "urgent"):
        raise HTTPException(status_code=400, detail="Invalid priority")
    supabase = get_supabase()
    payload = {**body.model_dump(), "id": str(uuid.uuid4())}
    result = supabase.table("alerts").insert(payload).execute()
    return result.data[0]
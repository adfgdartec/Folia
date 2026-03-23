from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta, datetime
from core.database import get_supabase
import uuid

router = APIRouter()


class JournalCreate(BaseModel):
    user_id: str
    decision: str
    reasoning: Optional[str] = None
    predicted_outcome: Optional[str] = None
    simulation_id: Optional[str] = None
    decision_date: Optional[str] = None


class JournalUpdate(BaseModel):
    decision: Optional[str] = None
    reasoning: Optional[str] = None
    predicted_outcome: Optional[str] = None


class OutcomeLog(BaseModel):
    actual_outcome: str

@router.get("/{user_id}")
async def list_journal(user_id: str, limit: int = 50):
    supabase = get_supabase()
    result = supabase.table("decision_journal").select("*, simulation_history(label_a, label_b, simulation_type)").eq("user_id", user_id).order("decision_date", desc=True).limit(limit).execute()
    
    entries = result.data or []
    pending = [e for e in entries if not e.get("actual_outcome")]
    resolved = [e for e in entries if e.get("actual_outcome")]
    
    # Flags listings older than 3 months without outcome
    today = date.today()
    three_months = (today - timedelta(days=90)).isoformat()
    awaiting_followup = [
        e for e in pending
        if e["decision_date"] <= three_months
    ]
    
    return {
        "entries": entries,
        "pending_count": len(pending),
        "resolved_count": len(resolved),
        "awaiting_followup": awaiting_followup,
        
    }

@router.post("")
async def create_entry(body: JournalCreate):
    supabase = get_supabase()
    payload = {
        **body.model_dump(),
        "id":            str(uuid.uuid4()),
        "decision_date": body.decision_date or date.today().isoformat(),
    }
    result = supabase.table("decision_journal").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create journal entry")
    return result.data[0]

@router.patch("/{entry_id}")
async def update_entry(entry_id: str, body: JournalUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    supabase = get_supabase()
    result = supabase.table("decision_journal").update(updates).eq("id", entry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result.data[0]

@router.post("/{entry_id}/outcome")
async def log_outcome(entry_id: str, body: OutcomeLog):
    supabase = get_supabase()
    result = supabase.table("decision_journal").update({
        "actual_outcome": body.actual_outcome,
        "outcome_logged_at": datetime.timezone.utc.isoformat(),
    }).eq("id", entry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return result.data[0]

@router.delete("/{entry_id}")
async def delete_entry(entry_id: str):
    supabase = get_supabase()
    supabase.table("decision_journal").delete().eq("id", entry_id).execute()
    return {"deleted": entry_id}
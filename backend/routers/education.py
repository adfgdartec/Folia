from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta, timezone
from core.database import get_supabase
import uuid

router = APIRouter()

TRACKS = [
    "personal_finance", "credit_debt", "investing",
    "taxes", "career_income", "advanced_finance"
]

REVIEW_INTERVALS = {
    "not_started":  None,
    "in_progress":  1,
    "completed":    7,
    "mastered":     30,
}


class ProgressUpdate(BaseModel):
    user_id: str
    track: str
    concept_id: str
    concept_title: str
    status: str
    quiz_score: Optional[int] = Field(default=None, ge=0, le=100)


class QuizResult(BaseModel):
    user_id: str
    concept_id: str
    score: int = Field(ge=0, le=100)

@router.get("/{user_id}")
async def get_progress(user_id: str, track: Optional[str] = None):
    supabase = get_supabase()
    query = supabase.table("education_progress").select("*").eq("user_id", user_id)
    if track: 
        if track not in TRACKS:
            raise HTTPException(status_code=400, detail=f"Invalid track. Must be one of: {TRACKS}")
        query = query.eq("track", track)
    result = query.order("last_seen_at", desc=True).execute()
    progress = result.data or []
    
    by_track: dict[str, dict] = {}
    for item in progress:
        t = item["track"]
        if t not in by_track:
            by_track[t] = {"total": 0, "completed": 0, "mastered": 0, "percent": 0}
        by_track[t]["total"] += 1
        if item["status"] in ("completed", "mastered"):
            by_track[t]["completed"] += 1
        if item["status"] == "mastered":
            by_track[t]["mastered"] += 1
    
    for t in by_track:
        total = by_track[t]["total"]
        by_track[t]["percent"] = round(by_track[t]["completed"] / total * 100, 1) if total else 0
    
    now = datetime.now(timezone.utc).isoformat()
    due_review = [p for p in progress if p.get("next_review_at") and p["next_review_at"] <= now]
    
    return {
        "progress": progress,
        "by_track": by_track,
        "due_review": due_review,
        "total_mastered": sum(1 for p in progress if p["status"] == "mastered"),
    }

@router.post("/update")
async def update_progress(body: ProgressUpdate):
    if body.track not in TRACKS:
        raise HTTPException(status_code=400, detail=f"Invalid track: {body.track}")
    if body.status not in REVIEW_INTERVALS:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    interval = REVIEW_INTERVALS[body.status]
    next_review = (now + timedelta(days=interval)).isoformat() if interval else None

    payload = {
        "user_id": body.user_id,
        "track": body.track,
        "concept_id": body.concept_id,
        "concept_title": body.concept_title,
        "status": body.status,
        "quiz_score": body.quiz_score,
        "last_seen_at": now.isoformat(),
        "next_review_at": next_review,
    }
    
    # Checks to see if user is viewing it for first time
    existing = supabase.table("education_progress").select("id, first_seen_at, attempts").eq("user_id", body.user_id).eq("concept_id", body.concept_id).execute()
    if existing.data:
        attempts = (existing.data[0].get("attempts") or 0) + 1
        payload["attempts"] = attempts
        if not existing.data[0].get("first_seen_at"):
            payload["first_seen_at"] = now.isoformat()
        result = supabase.table("education_progress").update(payload).eq("user_id", body.user_id).eq("concept_id", body.concept_id).execute()
    else:
        payload["id"] = str(uuid.uuid4())
        payload["first_seen_at"] = now.isoformat()
        payload["attempts"] = 1
        result = supabase.table("education_progress").insert(payload).execute()
    
    return result.data[0] if result.data else payload

@router.post("/quiz-result")
async def record_quiz_result(body: QuizResult):
    supabase = get_supabase()
    existing = supabase.table("education_progress").select("*").eq("user_id", body.user_id).eq("concept_id", body.concept_id).execute()
    
    if not existing.data:
        raise HTTPException(status_code=404, detail="Concept not found in progress")
    
    current = existing.data[0]
    new_status = current["status"]
    
    # Auto Advances based on score >= 80 completes, if >= 95 is mastered
    if body.score >= 95:
        new_status = "mastered"
    elif body.score >= 80:
        new_status = "completed"
    elif body.score >= 50:
        new_status = "in_progress"
    
    interval = REVIEW_INTERVALS[new_status]
    now = datetime.now(timezone.utc)
    next_review = (now + timedelta(days=interval)).isoformat() if interval else None
    
    result = supabase.table("education_progress").update({
        "status": new_status,
        "quiz_score": body.score,
        "last_seen_at": now.isoformat(),
        "next_review_at": next_review,
        "attempts": (current.get("attempts") or 0) + 1,
    }).eq("user_id", body.user_id).eq("concept_id", body.concept_id).execute()
    
    return {
        "updated": result.data[0] if result.data else {},
        "new_status": new_status,
        "mastered": new_status == "mastered",
    }

@router.get("/{user_id}/due-review")
async def get_due_for_review(user_id: str):
    """Return all concepts due for spaced-repetition review today."""
    sb = get_supabase()
    now = datetime.now(timezone.utc).isoformat()
    result = sb.table("education_progress").select("*").eq("user_id", user_id).lte(
        "next_review_at", now
    ).execute()
    return {"due": result.data or [], "count": len(result.data or [])}


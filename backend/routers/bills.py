from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, timedelta
from core.database import get_supabase
import uuid
import calendar
router = APIRouter()


class BillCreate(BaseModel):
    user_id: str
    name: str
    amount: float = Field(gt=0)
    category: str
    due_day: int = Field(ge=1, le=31)
    frequency: str = "monthly"
    autopay: bool = False


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    frequency: Optional[str] = None
    is_active: Optional[bool] = None
    autopay: Optional[bool] = None

def _next_due_date(due_day: int, frequency: str) -> str:
    today = date.today()
    try:
        next_due = today.replace(day=due_day)
    except ValueError:
        last_day = calendar.monthrange(today.year, today.month)[1]
        next_due = today.replace(day=min(due_day, last_day))
        
    if next_due <= today:
        if frequency == "monthly":
            m = today.month + 1 if today.month < 12 else 1
            y = today.year if today.month < 12 else today.year + 1
            import calendar
            last_day = calendar.monthrange(y, m)[1]
            next_due = date(y, m, min(due_day, last_day))
        elif frequency == "annual":
            next_due = next_due.replace(year=today.year + 1)
        elif frequency in ("weekly", "biweekly"):
            days = 7 if frequency == "weekly" else 14
            while next_due <= today:
                next_due += timedelta(days=days)
    
    return next_due.isoformat()

@router.get("/{user_id}")
async def list_bills(user_id: str):
    supabase = get_supabase()
    result = supabase.table("recurring_bills").select("*").eq("user_id", user_id).eq("is_active", True).order("due_day").execute()
    bills = result.data or []
    total_monthly = 0.0
    
    for b in bills:
        if b["frequency"] == "monthly":
            monthly = b["amount"]
        elif b["frequency"] == "annual":
            monthly = b["amount"] / 12
        elif b["frequency"] == "quarterly":
            monthly = b["amount"] / 3
        elif b["frequency"] == "biweekly":
            monthly = b["amount"] * 26 / 12
        elif b["frequency"] == "weekly":
            monthly = b["amount"] * 52 / 12
        else:
            monthly = b["amount"]
        
        b["monthly_equivalent"] = round(monthly, 2)
        total_monthly += monthly
        
        today = date.today()
        end_date = today + timedelta(days=30)
        calendar_items = []
        for b in bills:
            due = date.fromisoformat(b["next_due_date"]) if b.get("next_due_date") else None
            if due and today <= due <= end_date:
                calendar_items.append({
                    "bill_id": b["id"],
                    "name": b["name"],
                    "amount": b["amount"],
                    "due_date": due.isoformat(),
                    "days_away": (due - today).days,
                    "autopay":  b["autopay"],
                })
        
        calendar_items.sort(key=lambda x: x["due_date"])
        
        return {
            "bills": bills,
            "total_monthly": round(total_monthly, 2),
            "annual_total": round(total_monthly * 12, 2),
            "upcoming_30_days": calendar_items,
            "count": len(bills),
        }

@router.post("")
async def create_bill(body: BillCreate):
    if body.frequency not in ("weekly", "biweekly", "monthly", "quarterly", "annual"):
        raise HTTPException(status_code=400, detail="Invalid frequency")
    supabase = get_supabase()
    payload = {
        **body.model_dump(),
        "id":            str(uuid.uuid4()),
        "is_active":     True,
        "next_due_date": _next_due_date(body.due_day, body.frequency),
    }
    result = supabase.table("recurring_bills").insert(payload).execute()
    return result.data[0]


@router.patch("/{bill_id}")
async def update_bill(bill_id: str, body: BillUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    supabase = get_supabase()
    result = supabase.table("recurring_bills").update(updates).eq("id", bill_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Bill not found")
    return result.data[0]


@router.delete("/{bill_id}")
async def delete_bill(bill_id: str):
    supabase = get_supabase()
    supabase.table("recurring_bills").delete().eq("id", bill_id).execute()
    return {"deleted": bill_id}
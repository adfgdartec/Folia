from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
from core.database import get_supabase
from collections import defaultdict
import uuid
import csv
import io

router = APIRouter()

CATEGORIES = [
    "housing", "utilities", "groceries", "dining", "transport", "fuel",
    "insurance", "healthcare", "subscriptions", "entertainment", "clothing",
    "education", "childcare", "pets", "travel", "gifts", "savings",
    "investments", "debt_payment", "salary", "freelance", "side_hustle",
    "rental_income", "dividends", "tax_refund", "other"
]

class TransactionCreate(BaseModel):
    user_id: str
    date: str
    description: str
    amount: float = Field(gt=0)
    category: str
    subcategory: Optional[str] = None
    type: str 
    is_recurring: bool = False
    recurrence: Optional[str] = None
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = None
    subcategory: Optional[str] = None
    type: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None
    notes: Optional[str] = None

@router.get("/{user_id}")
async def list_transactions(user_id: str, month: Optional[str] = None, category: Optional[str] = None, type: Optional[str] = None, search: Optional[str] = None, limit: int = Query(default=100, le=500), offset: int = 0):
    supabase = get_supabase()
    query = supabase.table("transactions").select("*").eq("user_id", user_id)
    if month:
        try:
            year, m = month.split("-")
            start = f"{year}-{m}-01"
            next_month = int(m) + 1
            next_year = year
            if next_month > 12:
                next_month = 1
                next_year = str(int(year) + 1)
            end = f"{next_year}-{next_month:02d}-01"
            query = query.gte("date", start).lt("date", end)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    if category:
        query = query.eq("category", category)
    if type:
        query = query.eq("type", type)
    
    result = query.order("date", desc=True).range(offset, offset + limit - 1).execute()
    transactions = result.data or []
    
    if search:
        search_lower = search.lower()
        transactions = [
            t for t in transactions
            if search_lower in t.get("description", "").lower()
            or search_lower in t.get("category", "").lower()
        ]

    # Summaries
    income = sum(t["amount"] for t in transactions if t["type"] == "income")
    expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    by_cat: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t["type"] == "expense":
            by_cat[t["category"]] += t["amount"]
    
    
    return {
        "transactions": transactions,
        "count": len(transactions),
        "total_income": round(income, 2),
        "total_expenses": round(expenses, 2),
        "surplus_deficit": round(income - expenses, 2),
        "spending_by_category": {k: round(v, 2) for k, v in sorted(by_cat.items(), key=lambda x: x[1], reverse=True)},
    }

@router.post("")
async def create_transaction(body: TransactionCreate):
    if body.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="type must be 'income' or 'expense'")
    supabase = get_supabase()
    payload = {**body.model_dump(), "id": str(uuid.uuid4())}
    result = supabase.table("transactions").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create transaction")
    return result.data[0]

@router.post("/batch")
async def create_transactions_batch(transactions: list[TransactionCreate]):
    if len(transactions) > 1000:
        raise HTTPException(status_code=400, detail="Max 1000 transactions per batch")
    supabase = get_supabase()
    rows = [{**t.model_dump(), "id": str(uuid.uuid4())} for t in transactions]
    result = supabase.table("transactions").insert(rows).execute()
    return {"inserted": len(result.data or []), "transactions": result.data}


@router.post("/{user_id}/import-csv")
async def import_csv(user_id: str, file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")
    contents = await file.read()
    text = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    
    rows = []
    errors = []
    for i, row in enumerate(reader):
        try:
            keys = {k.lower().strip() for k in row.keys()}
            date_value = (row.get("date") or row.get("Date") or row.get("Transaction Date", "")).strip()
            desc_value = (row.get("description") or row.get("Description") or row.get("Memo", "")).strip()
            
            amount_string = (
                row.get("amount") or row.get("Amount") or 
                row.get("debit") or row.get("Debit") or 
                row.get("credit") or row.get("Credit") or "0"
            ).strip().replace("$", "").replace(",", "")
            amount = abs(float(amount_string))
            
            if "type" in keys or "Type" in row:
                type_value = (row.get("type") or row.get("Type", "expense")).lower()
                type_value = "income" if "income" in type_value or "credit" in type_value else "expense"
            elif float(amount_string) > 0 and "credit" in keys:
                type_value = "income"
            else:
                type_value = "expense"
            
            category = (row.get("category") or row.get("Category") or "other").strip().lower()
            if category not in CATEGORIES:
                category = "other"
                
            if amount > 0 and date_value and desc_value:
                rows.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "date": date_value,
                    "description": desc_value,
                    "amount": amount,
                    "category": category,
                    "type": type_value,
                    "source": "csv_import",
                })
                
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})
    
    if not rows:
        raise HTTPException(status_code=400, detail="No valid transactions found in CSV")
    
    supabase = get_supabase()
    inserted = 0
    for i in range(0, len(rows), 200):
        batch = rows[i:i + 200]
        result = supabase.table("transactions").insert(batch).execute()
        inserted += len(result.data or [])
        
    return {
        "imported": inserted,
        "skipped":  len(rows) - inserted,
        "errors":   errors[:10],
    }
    

@router.patch("/{transaction_id}")
async def update_transaction(transaction_id: str, body: TransactionUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    supabase = get_supabase()
    result = supabase.table("transactions").update(updates).eq("id", transaction_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return result.data[0]


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: str):
    supabase = get_supabase()
    supabase.table("transactions").delete().eq("id", transaction_id).execute()
    return {"deleted": transaction_id}


@router.get("/{user_id}/recurring")
async def list_recurring(user_id: str):
    """All recurring transactions for the bill calendar."""
    supabase = get_supabase()
    result = supabase.table("transactions").select("*").eq("user_id", user_id).eq(
        "is_recurring", True
    ).order("amount", desc=True).execute()
    return {"recurring": result.data or []}


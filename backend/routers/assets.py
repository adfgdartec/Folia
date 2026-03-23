from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from core.database import get_supabase
import uuid

router = APIRouter()


class AssetCreate(BaseModel):
    user_id: str
    name: str
    value: float = Field(ge=0)
    type: str
    institution: Optional[str] = None
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = Field(default=None, ge=0)
    type: Optional[str] = None
    institution: Optional[str] = None
    notes: Optional[str] = None

VALID_TYPES = {
    "checking", "savings", "retirement_401k", "retirement_ira",
    "brokerage", "real_estate", "crypto", "hsa", "pension", "other"
}

@router.get("/{user_id}")
async def list_assets(user_id: str):
    supabase = get_supabase()
    result = supabase.table("assets").select("*").eq("user_id", user_id).order("value", desc=True).execute()
    assets = result.data or []
    total = sum(a["value"] for a in assets)
    by_type: dict[str, float] = {}
    
    for a in assets:
        by_type[a["type"]] = by_type.get(a["type"], 0) + a["value"]
    
    return {
        "assets": assets,
        "total": round(total, 2),
        "by_type": {k: round(v, 2) for k, v in by_type.items()},
        "count": len(assets),
    }

@router.post("")
async def create_asset(body: AssetCreate):
    if body.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid asset type. Must be one of: {VALID_TYPES}")
    supabase = get_supabase()
    payload = {**body.model_dump(), "id": str(uuid.uuid4())}
    result = supabase.table("assets").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create asset")
    return result.data[0]

@router.patch("/{asset_id}")
async def update_asset(asset_id: str, body: AssetUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "type" in updates and updates["type"] not in VALID_TYPES:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    supabase = get_supabase()
    result = supabase.table("assets").update(updates).eq("id", asset_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    return result.data[0]
    

@router.delete("/{asset_id}")
async def delete_asset(asset_id: str):
    supabase = get_supabase()
    result = supabase.table("assets").delete().eq("id", asset_id).execute()
    return {"deleted": asset_id}
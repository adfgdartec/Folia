from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from typing import Optional
import re, uuid
from core.database import get_supabase
from core.auth import get_current_user_id
from core.cache import cache_get, cache_set, cache_delete, _key, TTL
 
router = APIRouter()
 
def _san(v, n=200):
    v = re.sub(r'<[^>]+>', '', v).strip()
    if len(v) > n: raise ValueError(f"Max {n} chars")
    return v
 
class AssetCreate(BaseModel):
    user_id: str; name: str; value: float; type: str
    institution: Optional[str] = None; notes: Optional[str] = None

    @field_validator("name")
    def cn(cls, v):
        return _san(v)

    @field_validator("value")
    def nn(cls, v):
        if v < 0:
            raise ValueError("non-negative")
        return round(v, 2)
 
class AssetUpdate(BaseModel):
    name: Optional[str]=None; value: Optional[float]=None
    institution: Optional[str]=None; notes: Optional[str]=None
 
def _group(assets):
    r = {}
    for a in assets:
        t = a.get("type","other"); r[t] = r.get(t,0) + a.get("value",0)
    return r
 
@router.get("/{user_id}")
async def list_assets(user_id: str):
    ck = _key("assets", user_id)
    cached = await cache_get(ck)
    if cached: return cached
    sb = get_supabase()
    r  = sb.table("assets").select("id,name,type,value,institution,notes,created_at,updated_at").eq("user_id",user_id).order("value",desc=True).execute()
    assets = r.data or []
    data = {"assets": assets, "total": round(sum(a["value"] for a in assets),2), "by_type": _group(assets)}
    await cache_set(ck, data, ttl=TTL["assets"])
    return data
 
@router.post("")
async def create_asset(body: AssetCreate, cu: str = Depends(get_current_user_id)):
    if body.user_id != cu: raise HTTPException(403,"Forbidden")
    sb = get_supabase()
    r  = sb.table("assets").insert({"id":str(uuid.uuid4()),"user_id":body.user_id,"name":body.name,"value":body.value,"type":body.type,"institution":body.institution,"notes":body.notes}).execute()
    if not r.data: raise HTTPException(500,"Failed")
    await cache_delete(_key("assets", body.user_id))
    await cache_delete(_key("dashboard", body.user_id))
    return r.data[0]
 
@router.patch("/{asset_id}")
async def update_asset(asset_id: str, body: AssetUpdate, cu: str = Depends(get_current_user_id)):
    sb = get_supabase()
    chk = sb.table("assets").select("user_id").eq("id",asset_id).single().execute()
    if not chk.data: raise HTTPException(404,"Not found")
    if chk.data["user_id"] != cu: raise HTTPException(403,"Forbidden")
    upd = {k:v for k,v in body.model_dump().items() if v is not None}
    if not upd: raise HTTPException(400,"Nothing to update")
    r = sb.table("assets").update(upd).eq("id",asset_id).execute()
    await cache_delete(_key("assets", cu))
    await cache_delete(_key("dashboard", cu))
    return r.data[0]
 
@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, cu: str = Depends(get_current_user_id)):
    sb = get_supabase()
    chk = sb.table("assets").select("user_id").eq("id",asset_id).single().execute()
    if not chk.data: raise HTTPException(404,"Not found")
    if chk.data["user_id"] != cu: raise HTTPException(403,"Forbidden")
    sb.table("assets").delete().eq("id",asset_id).execute()
    await cache_delete(_key("assets", cu))
    await cache_delete(_key("dashboard", cu))
    return {"deleted": asset_id}
 
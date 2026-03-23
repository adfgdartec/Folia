from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from core.database import get_supabase
import uuid

router = APIRouter()

class ScenarioContribute(BaseModel):
    life_stage: str
    age_bucket: str          
    income_bucket: str      
    simulation_type: str
    scenario_data: dict      
    outcome_data: dict       
    is_template: bool = False
    template_title: Optional[str] = None
    template_desc: Optional[str] = None

AGE_BUCKETS    = {"13-17", "18-24", "25-34", "35-49", "50-64", "65+"}
INCOME_BUCKETS = {"<30k", "30-60k", "60-100k", "100-200k", "200k+"}
LIFE_STAGES    = {"foundations", "launch", "build", "accelerate", "preserve", "retire"}

def _bucket_income(annual_income: float) -> str:
    if annual_income < 30000:   return "<30k"
    if annual_income < 60000:   return "30-60k"
    if annual_income < 100000:  return "60-100k"
    if annual_income < 200000:  return "100-200k"
    return "200k+"


def _bucket_age(age: int) -> str:
    if age <= 17:  return "13-17"
    if age <= 24:  return "18-24"
    if age <= 34:  return "25-34"
    if age <= 49:  return "35-49"
    if age <= 64:  return "50-64"
    return "65+"


@router.get("/templates")
async def list_templates(life_stage: Optional[str] = None, simulation_type: Optional[str] = None, limit: int = Query(default=20, le=50),):
    supabase = get_supabase()
    query = supabase.table("community_scenarios").select("*").eq("is_template", True)
    if life_stage:
        query = query.eq("life_stage", life_stage)
    if simulation_type:
        query = query.eq("simulation_type", simulation_type)
    result = query.order("upvotes", desc=True).limit(limit).execute()
    return {"templates": result.data or []}

@router.get("/benchmarks")
async def get_benchmarks(life_stage: str, simulation_type: Optional[str] = None, limit: int = 100,):
    supabase = get_supabase()
    query = supabase.table("community_scenarios").select("outcome_data, scenario_data, simulation_type, income_bucket").eq("life_stage", life_stage)
    if simulation_type:
        query = query.eq("simulation_type", simulation_type)
    result = query.limit(limit).execute()
    rows = result.data or []
    
    if not rows:
        return {"benchmarks": {}, "sample_size": 0}
    
    # Gets net worth outcomes when possible
    net_worths = []
    savings_rates = []
    for r in rows:
        od = r.get("outcome_data", {})
        sd = r.get("scenario_data", {})
        if "net_worth" in od:
            net_worths.append(od["net_worth"])
        if "savings_rate" in sd:
            savings_rates.append(sd["savings_rate"])
    
    def percentile(data: list, percent: float):
        if not data:
            return None
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percent / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    return {
        "benchmarks": {
            "net_worth": {
                "p25": percentile(net_worths, 25),
                "p50": percentile(net_worths, 50),
                "p75": percentile(net_worths, 75),
            } if net_worths else None,
            "savings_rate": {
                "p25": percentile(savings_rates, 25),
                "p50": percentile(savings_rates, 50),
                "p75": percentile(savings_rates, 75),
            } if savings_rates else None,
        },
        "sample_size": len(rows),
        "life_stage":  life_stage,
    }

@router.post("/contribute")
async def contribute_scenario(body: ScenarioContribute):
    if body.life_stage not in LIFE_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid life_stage")
    if body.age_bucket not in AGE_BUCKETS:
        raise HTTPException(status_code=400, detail=f"Invalid age_bucket")
    if body.income_bucket not in INCOME_BUCKETS:
        raise HTTPException(status_code=400, detail=f"Invalid income_bucket")
    
    # Strips fields that identify users
    safe_scenario = { k: v for k, v in body.scenario_data.items() if k not in ("user_id", "name", "email")}
    safe_outcome = {k: v for k, v in body.outcome_data.items() if k not in ("user_id", "name", "email")}
    
    supabase = get_supabase()
    payload = {
        "id": str(uuid.uuid4()),
        "life_stage": body.life_stage,
        "age_bucket": body.age_bucket,
        "income_bucket": body.income_bucket,
        "simulation_type": body.simulation_type,
        "scenario_data": safe_scenario,
        "outcome_data": safe_outcome,
        "is_template": body.is_template,
        "template_title": body.template_title,
        "template_desc": body.template_desc,
    }
    result = supabase.table("community_scenarios").insert(payload).execute()
    return result.data[0]

@router.post("/{scenario_id}/upvote")
async def upvote_scenario(scenario_id: str):
    supabase = get_supabase()
    current = supabase.table("community_scenarios").select("upvotes").eq("id", scenario_id).single().execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Scenario not found")
    new_votes = current.data["upvotes"] + 1
    supabase.table("community_scenarios").update({"upvotes": new_votes}).eq("id", scenario_id).execute()
    return {"upvotes": new_votes}
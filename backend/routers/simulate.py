from fastapi import APIRouter, HTTPException
from models.schemas import SimulationRequest, SimulationResult, NarrationRequest
from services.simulator import run_simulation
from core.clients import groq_client
from rag.prompt_builder import build_narration_prompt
from core.config import get_settings
import json

router = APIRouter()
settings = get_settings()

async def _narrate_simulation(result: SimulationResult, req: SimulationRequest) -> str:
    net_worth_a = result.scenario_a[-1].net_worth if result.scenario_a else 0
    net_worth_b = result.scenario_b[-1].net_worth if result.scenario_b else 0
    
    context_parts = [
        f"Scenario A ({req.scenario_a.label}): Net worth in {req.horizon_years} years = ${net_worth_a:,.0f}",
        f"Total interest paid (A): ${result.total_interest_a:,.0f}",
    ]
    
    if result.debt_free_year_a:
        context_parts.append(f"Debt-free year (A): Year {result.debt_free_year_a}")
    
    if net_worth_b is not None and req.scenario_b:
        context_parts.append(f"Scenario B ({req.scenario_b.label}): Net worth in {req.horizon_years} years = ${net_worth_b:,.0f}")
        context_parts.append(f"Total Interest paid (B): ${result.total_interest_b:,.0f}")
        if result.debt_free_year_b:
            context_parts.append(f"Debt-free year (B): Year {result.debt_free_year_b}")
        if result.divergence_at_horizon is not None:
            context_parts.append(f"Difference between scenarios: ${result.divergence_at_horizon:,.0f}")
    
    context = "\n".join(context_parts)
    messages = build_narration_prompt(context, req.metadata, "simulation")
    response = await groq_client.chat.completions.create(
        model=settings.narration_model,
        messages=messages,
        temperature=settings.narration_temperature,
        max_tokens=settings.max_tokens_narration,
    )
    return response.choices[0].message.content or ""

@router.post("", response_model=SimulationResult)
async def simulate(req: SimulationRequest):
    try:
        result = run_simulation(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

    # Attaches AI narration
    try:
        result.narration = await _narrate_simulation(result, req)
    except Exception:
        result.narration = "Simulation complete. Review the chart for your projected outcomes."

    return result
    
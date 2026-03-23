from fastapi import APIRouter
from models.schemas import TaxRequest, TaxResult, NarrationRequest
from services.tax_engine import compute_taxes
from core.clients import groq_client
from rag.prompt_builder import build_narration_prompt
from core.config import get_settings

router = APIRouter()
settings = get_settings()

async def _narrate_tax(result: TaxResult, req: TaxRequest) -> str:
    context = (
        f"Gross income: ${result.gross_income:,.0f}\n"
        f"AGI: ${result.agi:,.0f}\n"
        f"Taxable income: ${result.taxable_income:,.0f}\n"
        f"Federal tax: ${result.federal_tax:,.0f}\n"
        f"State tax: ${result.state_tax:,.0f}\n"
        f"FICA tax: ${result.fica_tax:,.0f}\n"
        f"Self-employment tax: ${result.se_tax:,.0f}\n"
        f"Total tax: ${result.total_tax:,.0f}\n"
        f"Effective rate: {result.effective_rate:.1f}%\n"
        f"Marginal rate: {result.marginal_rate:.1f}%\n"
        f"{'Refund' if result.estimated_refund_or_owed >= 0 else 'Owed'}: "
        f"${abs(result.estimated_refund_or_owed):,.0f}"
    )
    messages = build_narration_prompt(context, req.metadata, "tax")
    response = await groq_client.chat.completions.create(
        model=settings.narration_model,
        messages=messages,
        temperature=settings.narration_temperature,
        max_tokens=settings.max_tokens_narration,
    )
    return response.choices[0].message.content or ""

@router.post("", response_model=TaxResult)
async def calculate_tax(req: TaxRequest):
    result = compute_taxes(req)
    try:
        result_dict = result.model_dump()
        narration = await _narrate_tax(result, req)
        result_dict["narration"] = narration
    except Exception:
        pass
    return result

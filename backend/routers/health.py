from fastapi import APIRouter
from models.schemas import FinancialMetadata, HealthScoreResult
from services.health_score import compute_health_score
from core.clients import groq_client
from rag.prompt_builder import build_narration_prompt
from core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("", response_model=HealthScoreResult)
async def get_health_score(metadata: FinancialMetadata):
    result = compute_health_score(metadata)

    try:
        messages = build_narration_prompt(result.summary, metadata, "health_score")
        response = await groq_client.chat.completions.create(
            model=settings.narration_model,
            messages=messages,
            temperature=0.4,
            max_tokens=200,
        )
        result.summary = response.choices[0].message.content or result.summary
    except Exception:
        pass

    return result
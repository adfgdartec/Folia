from fastapi import APIRouter
from models.schemas import NarrationRequest, NarrationResponse
from core.clients import groq_client
from rag.prompt_builder import build_narration_prompt
from core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("", response_model=NarrationResponse)
async def narrate(req: NarrationRequest):
    messages = build_narration_prompt(
        context=req.context,
        metadata=req.metadata,
        narration_type=req.narration_type,
    )

    response = await groq_client.chat.completions.create(
        model=settings.narration_model,
        messages=messages,
        temperature=settings.narration_temperature,
        max_tokens=settings.max_tokens_narration,
    )

    return NarrationResponse(
        narration=response.choices[0].message.content or ""
    )
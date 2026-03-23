from fastapi import APIRouter
from models.schemas import GlossaryRequest, GlossaryResponse, LiteracyLevel
from rag.retriever import retrieve_knowledge
from core.clients import openai_client
from core.config import get_settings
import json
router = APIRouter()
settings = get_settings()

LITERACY_TONE = {
    LiteracyLevel.beginner: (
        "Use simple everyday language. One short paragraph. "
        "Include a relatable real-life analogy. No jargon."
    ),
    LiteracyLevel.intermediate: (
        "Use standard financial language with brief clarification. "
        "Two short paragraphs. Include the formula or calculation if relevant."
    ),
    LiteracyLevel.advanced: (
        "Use precise financial terminology. Be concise and technical. "
        "Include edge cases, limitations, or professional nuances."
    ),
}

@router.post("", response_model=GlossaryResponse)
async def define_term(req: GlossaryRequest):
    query = f"define {req.term} financial definition"
    chunks, _ = await retrieve_knowledge(query, match_count=3)

    context = "\n\n".join(c.get("content", "") for c in chunks)
    tone = LITERACY_TONE.get(req.literacy_level, LITERACY_TONE[LiteracyLevel.beginner])

    user_context = ""
    if req.context:
        user_context = f"\nThe user encountered this term in the context of: {req.context}"

    response = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are Folia's financial educator. Define the term clearly. {tone} "
                    "Return a JSON object with keys: "
                    "definition (string), example (string, 1 sentence using real numbers), "
                    "related_terms (array of 3-5 related term strings), source (string, cite the document). "
                    "Return ONLY the JSON object, no markdown."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Define: {req.term}{user_context}\n\n"
                    f"Knowledge base context:\n{context[:2000]}"
                ),
            },
        ],
        temperature=0.2,
        max_tokens=400,
        response_format={"type": "json_object"},
    )

    try:
        data = json.loads(response.choices[0].message.content or "{}")
    except Exception:
        data = {}

    return GlossaryResponse(
        term=req.term,
        definition=data.get("definition", "Definition not available."),
        example=data.get("example", ""),
        related_terms=data.get("related_terms", [])[:5],
        source=data.get("source", "Folia Knowledge Base"),
    )
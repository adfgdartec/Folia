from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import AdvisorRequest, AdvisorResponse, Citation
from rag.retriever import retrieve_knowledge, retrieve_user_docs
from rag.prompt_builder import build_advisor_prompt
from core.clients import openai_client
from core.config import get_settings
from core.database import upsert_rows
import json
import uuid

router = APIRouter()
settings = get_settings()

async def _stream_advisor(req: AdvisorRequest):
    # Fetches from KB
    chunks, citations = await retrieve_knowledge(req.message)
    
    # Fetches docs based on user
    user_doc_chunks = []
    if req.metadata.user_id:
        user_doc_chunks = await retrieve_user_docs(req.message, req.metadata.user_id)
        chunks = user_doc_chunks + chunks
        
    # Builds prompt
    messages = build_advisor_prompt(
        query=req.message,
        chunks=chunks,
        metadata=req.metadata,
        history=req.history,
    )
    
    # Streams from OpenAI
    stream = await openai_client.chat.completions.create(
        model=settings.advisor_model,
        messages=messages,
        stream=True,
        temperature=settings.advisor_temperature,
        max_tokens=settings.max_tokens_advisor,
    )
    
    # Yields Citations as JSON Header Chunk
    citation_data = [c.model_dump() for c in citations[:3]]
    yield f"__CITATIONS__:{json.dumps(citation_data)}\n"
    
    # Streams content tokens
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
    
    # Saves session to supabase
    session_id = req.session_id or str(uuid.uuid4())
    try:
        await upsert_rows("advisor_sessions", [{
            "session_id": session_id,
            "user_id": req.dna.user_id,
            "last_message": req.message[:500],
            "dna_snapshot": req.dna.model_dump(),
        }], on_conflict="session_id")
    except Exception:
        pass  
    
@router.post("/stream")
async def advisor_stream(req: AdvisorRequest):
    return StreamingResponse(
        _stream_advisor(req),
        media_type="text/plain; charset=utf-8",
        headers={"X-Accel-Buffering": "no"},
    )

@router.post("", response_model=AdvisorResponse)
async def advisor_chat(req: AdvisorRequest):
    chunks, citations = await retrieve_knowledge(req.message)
    
    if req.metadata.user_id:
        user_chunks = await retrieve_user_docs(req.message, req.metadata.user_id)
        chunks = user_chunks + chunks
        
    messages = build_advisor_prompt(
        query=req.message,
        chunks=chunks,
        metadata=req.metadata,
        history=req.history,
    )
    
    response = await openai_client.chat.completions.create(
        model=settings.advisor_model,
        messages=messages,
        temperature=settings.advisor_temperature,
        max_tokens=settings.max_tokens_advisor,
    )
    
    content = response.choices[0].message.content or ""
    
    session_id = req.session_id or str(uuid.uuid4())
    try:
        await upsert_rows("advisor_sessions", [{
            "session_id": session_id,
            "user_id": req.metadata.user_id,
            "last_message": req.message[:500],
            "metadata_snapshot": req.metadata.model_dump(),
        }], on_conflict="session_id")
    except Exception:
        pass
    
    return AdvisorResponse(
        content=content,
        citations=citations[:3],
        session_id=session_id,
    )
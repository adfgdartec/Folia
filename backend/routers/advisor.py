from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal
import json
import uuid

from models.schemas import AdvisorRequest, AdvisorResponse
from rag.retriever import retrieve_knowledge, retrieve_user_docs
from rag.prompt_builder import build_advisor_prompt
from core.clients import openai_client
from core.config import get_settings
from core.auth import get_current_user_id
from core.database import get_supabase

router = APIRouter()
settings = get_settings()


class CreateAdvisorChatRequest(BaseModel):
    title: str
    session_id: str | None = None


class AdvisorChatResponse(BaseModel):
    id: str
    title: str
    session_id: str | None = None


class CreateAdvisorMessageRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: str


async def _save_session_snapshot(
    session_id: str,
    user_id: str,
    last_message: str,
    metadata_snapshot: dict | None = None,
):
    supabase = get_supabase()

    try:
        (
            supabase
            .table("advisor_sessions")
            .upsert(
                [{
                    "id": session_id,
                    "user_id": user_id,
                    "last_message": last_message[:500],
                    "metadata_snapshot": metadata_snapshot or {},
                }],
                on_conflict="id",
            )
            .execute()
        )
    except Exception:
        pass


async def _stream_advisor(req: AdvisorRequest, user_id: str):
    chunks, citations = await retrieve_knowledge(req.message)

    if user_id:
        user_doc_chunks = await retrieve_user_docs(req.message, user_id)
        chunks = user_doc_chunks + chunks

    metadata = req.metadata.model_copy(deep=True)
    if hasattr(metadata, "user_id"):
        metadata.user_id = user_id

    messages, model = build_advisor_prompt(
        query=req.message,
        chunks=chunks,
        metadata=metadata,
        history=req.history,
    )

    stream = await openai_client.chat.completions.create(
        model=settings.advisor_model,
        messages=messages,
        stream=True,
        temperature=settings.advisor_temperature,
        max_tokens=settings.max_tokens_advisor,
    )

    citation_data = [c.model_dump() for c in citations[:3]]
    yield f"__CITATIONS__:{json.dumps(citation_data)}\n"

    full_text = ""

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_text += delta
            yield delta

    session_id = req.session_id or str(uuid.uuid4())

    await _save_session_snapshot(
        session_id=session_id,
        user_id=user_id,
        last_message=req.message,
        metadata_snapshot=metadata.model_dump() if hasattr(metadata, "model_dump") else {},
    )


@router.post("/stream")
async def advisor_stream(
    req: AdvisorRequest,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    return StreamingResponse(
        _stream_advisor(req, user_id),
        media_type="text/plain; charset=utf-8",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


@router.post("", response_model=AdvisorResponse)
async def advisor_chat(
    req: AdvisorRequest,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    chunks, citations = await retrieve_knowledge(req.message)

    if user_id:
        user_chunks = await retrieve_user_docs(req.message, user_id)
        chunks = user_chunks + chunks

    metadata = req.metadata.model_copy(deep=True)
    if hasattr(metadata, "user_id"):
        metadata.user_id = user_id

    messages, model = build_advisor_prompt(
        query=req.message,
        chunks=chunks,
        metadata=metadata,
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

    await _save_session_snapshot(
        session_id=session_id,
        user_id=user_id,
        last_message=req.message,
        metadata_snapshot=metadata.model_dump() if hasattr(metadata, "model_dump") else {},
    )

    return AdvisorResponse(
        content=content,
        citations=citations[:3],
        session_id=session_id,
    )


@router.get("/chats")
async def list_advisor_chats(
    user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase()

    result = (
        supabase
        .table("advisor_sessions")
        .select("id, title, last_message, message_count, created_at, updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .limit(50)
        .execute()
    )

    return result.data or []


@router.get("/chats/{chat_id}/messages")
async def get_advisor_messages(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase()

    session_result = (
        supabase
        .table("advisor_sessions")
        .select("id")
        .eq("id", chat_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    if not (session_result.data or []):
        raise HTTPException(status_code=404, detail="Chat not found")

    result = (
        supabase
        .table("advisor_messages")
        .select("id, role, content, citations, created_at")
        .eq("session_id", chat_id)
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )

    return result.data or []


@router.post("/chats", response_model=AdvisorChatResponse)
async def create_advisor_chat(
    req: CreateAdvisorChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase()
    title = (req.title or "").strip() or "New chat"

    result = (
        supabase
        .table("advisor_sessions")
        .insert([{
            "user_id": user_id,
            "title": title[:120],
        }])
        .execute()
    )

    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="Failed to create chat")

    row = rows[0]
    return AdvisorChatResponse(
        id=row["id"],
        title=row["title"],
    )


@router.post("/chats/{chat_id}/messages")
async def create_advisor_message(
    chat_id: str,
    req: CreateAdvisorMessageRequest,
    user_id: str = Depends(get_current_user_id),
):
    supabase = get_supabase()

    chat_result = (
        supabase
        .table("advisor_sessions")
        .select("*")
        .eq("id", chat_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )

    chats = chat_result.data or []
    if not chats:
        raise HTTPException(status_code=404, detail="Chat not found")

    msg_result = (
        supabase
        .table("advisor_messages")
        .insert([{
            "session_id": chat_id,
            "user_id": user_id,
            "role": req.role,
            "content": req.content,
        }])
        .execute()
    )

    rows = msg_result.data or []

    (
        supabase
        .table("advisor_sessions")
        .update({"updated_at": "now()"})
        .eq("id", chat_id)
        .eq("user_id", user_id)
        .execute()
    )

    return {
        "ok": True,
        "message_id": rows[0]["id"] if rows else None,
    }
from core.database import execute_rpc
from rag.embedder import embed_text
from core.config import get_settings
from models.schemas import Citation

settings = get_settings()

async def retrieve_knowledge(query: str, match_count: int = None) -> tuple[list[dict], list[Citation]]:
    match_count = match_count or settings.rag_match_count
    embedding = await embed_text(query)
    
    chunks = await execute_rpc(
        "match_knowledge_base",
        {
            "query_embedding": embedding,
            "match_count": match_count
        }
    )
    
    citations = [
        Citation(
            source=c.get("source", "Unknown"),
            excerpt=c.get("content", "")[:200] + "...",
            similarity=round(c.get("similarity", 0.0), 3)
        )
        for c in chunks
        if c.get("similarity", 0) > 0.5
    ]
    return chunks, citations

async def retrieve_user_docs(query: str, user_id: str, match_count: int = 3) -> list[dict]:
    embedding = await embed_text(query)
    chunks = await execute_rpc(
        "match_user_documents",
        {
            "query_embedding": embedding,
            "user_id_filter": user_id,
            "match_count": match_count
        }
    )
    return chunks
"""
Pinecone vector store — replaces Supabase pgvector for the knowledge base.

Why Pinecone over pgvector:
  - Dedicated vector index with ANN (approximate nearest neighbor) at scale
  - Sub-10ms p99 query latency vs 50-200ms for pgvector at large corpus sizes
  - Automatic index optimization, no manual VACUUM or reindex needed
  - Namespace isolation: separate knowledge_base from user_documents
  - Free tier: 1 index, 100k vectors — enough for all IRS/CFPB/SEC docs + users

Namespaces:
  - "knowledge_base"    → IRS/CFPB/SEC/DOL/SSA documents (global, shared)
  - "user_{user_id}"   → per-user uploaded documents (private)

Setup:
  1. Go to https://app.pinecone.io → Create Index
  2. Name: folia-knowledge
  3. Dimensions: 1536 (matches text-embedding-3-small)
  4. Metric: cosine
  5. Cloud: AWS us-east-1 (Starter tier is fine)
  6. Copy API key → PINECONE_API_KEY in .env
"""

from typing import Optional
from core.config import get_settings
import hashlib

settings = get_settings()

_pinecone_index = None


def get_pinecone_index():
    global _pinecone_index
    if _pinecone_index is not None:
        return _pinecone_index

    if not settings.pinecone_api_key:
        raise RuntimeError(
            "PINECONE_API_KEY not set. "
            "Either set it in .env or set VECTOR_BACKEND=supabase to use pgvector."
        )

    try:
        from pinecone import Pinecone
    except ImportError:
        raise ImportError(
            "pinecone not installed. Run: pip install pinecone-client"
        )

    pc = Pinecone(api_key=settings.pinecone_api_key)
    _pinecone_index = pc.Index(settings.pinecone_index_name)
    return _pinecone_index

# ─── Upsert ───────────────────────────────────────────────────────────────────
async def upsert_vectors(
    vectors: list[dict],
    namespace: str = "knowledge_base",
    batch_size: int = 100,
) -> int:
    index = get_pinecone_index()
    total = 0

    # Pinecone has a 2MB request limit — batch in chunks of batch_size
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i : i + batch_size]
        index.upsert(vectors=batch, namespace=namespace)
        total += len(batch)

    return total

#─── Query ────────────────────────────────────────────────────────────────────

async def query_vectors(
    embedding: list[float],
    namespace: str = "knowledge_base",
    top_k: int = 8,
    filter: Optional[dict] = None,
    min_score: float = 0.5,
) -> list[dict]:
    index = get_pinecone_index()

    kwargs = {
        "vector":          embedding,
        "top_k":           top_k,
        "namespace":       namespace,
        "include_metadata": True,
    }
    if filter:
        kwargs["filter"] = filter

    result = index.query(**kwargs)

    return [
        {
            "id": match["id"],
            "score": match["score"],
            "content": match.get("metadata", {}).get("content", ""),
            "source": match.get("metadata", {}).get("source", "Unknown"),
            "doc_type": match.get("metadata", {}).get("doc_type", ""),
            "chunk_index": match.get("metadata", {}).get("chunk_index", 0),
        }
        for match in result.get("matches", [])
        if match["score"] >= min_score
    ]


# ─── Delete ───────────────────────────────────────────────────────────────────
async def delete_vectors(
    ids: list[str] = None,
    namespace: str = "knowledge_base",
    delete_all: bool = False,
) -> None:
    index = get_pinecone_index()
    if delete_all:
        index.delete(delete_all=True, namespace=namespace)
    elif ids:
        index.delete(ids=ids, namespace=namespace)


async def delete_user_docs(user_id: str) -> None:
    await delete_vectors(namespace=f"user_{user_id}", delete_all=True)


async def get_index_stats() -> dict:
    """Get Pinecone index statistics (total vectors, namespaces, etc.)."""
    index = get_pinecone_index()
    stats = index.describe_index_stats()
    return {
        "total_vectors":     stats.get("total_vector_count", 0),
        "dimension":         stats.get("dimension", 0),
        "namespaces":        stats.get("namespaces", {}),
        "index_fullness":    stats.get("index_fullness", 0.0),
    }


async def ingest_knowledge_chunks(
    chunks: list[str],
    embeddings: list[list[float]],
    source: str,
    doc_type: str = "government",
    overwrite: bool = True,
) -> int:

    if overwrite:
        pass

    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        # Deterministic ID: sha256(source + chunk_index) for idempotent upserts
        chunk_id = hashlib.sha256(f"{source}:{i}".encode()).hexdigest()[:32]
        vectors.append({
            "id": chunk_id,
            "values": embedding,
            "metadata": {
                "source": source,
                "content": chunk[:1000],   
                "doc_type": doc_type,
                "chunk_index": i,
            },
        })

    return await upsert_vectors(vectors, namespace="knowledge_base")


# ─── User document helper ─────────────────────────────────────────────────────
async def ingest_user_doc_chunks(
    user_id: str,
    doc_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    source: str = "user_document",
) -> int:
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        chunk_id = hashlib.sha256(f"{user_id}:{doc_id}:{i}".encode()).hexdigest()[:32]
        vectors.append({
            "id": chunk_id,
            "values": embedding,
            "metadata": {
                "user_id": user_id,
                "doc_id": doc_id,
                "source": source,
                "content": chunk[:1000],
                "chunk_index": i,
            },
        })

    return await upsert_vectors(vectors, namespace=f"user_{user_id}")


async def query_user_docs(
    user_id: str,
    embedding: list[float],
    top_k: int = 4,
) -> list[dict]:
    """Query a user's private documents."""
    return await query_vectors(
        embedding,
        namespace=f"user_{user_id}",
        top_k=top_k,
    )



from core.config import get_settings
from rag.embedder import embed_text
from models.schemas import Citation
from services.external_data import (
    get_stock_quote, get_company_profile, get_basic_financials,
    get_fred_series, get_treasury_yields
)

settings = get_settings()

async def _api_fallback_knowledge(query: str) -> list[dict]:
    """Return a small knowledge chunk from Finnhub/FRED when docs are empty."""
    chunks = []

    # Stock query heuristic (ticker-like tokens e.g. AAPL, MSFT)
    symbol = None
    for token in query.split():
        if token.isupper() and 1 < len(token) <= 5 and token.isalpha():
            symbol = token
            break

    if symbol:
        try:
            quote = await get_stock_quote(symbol)
            profile = await get_company_profile(symbol)
            financials = await get_basic_financials(symbol)
            chunks.append({
                "source": f"Finnhub {symbol}",
                "content": (
                    f"{profile.get('name', symbol)} ({symbol}) - {profile.get('industry', 'industry unknown')}\n"
                    f"Price: ${quote.get('price'):.2f}, change {quote.get('change_pct'):.2f}%\n"
                    f"P/E: {financials.get('pe_ratio')} dividend yld: {financials.get('dividend_yield')}"
                ),
                "score": 0.9,
            })
        except Exception:
            pass

    # Macro query heuristic
    if any(k in query.lower() for k in ['fed funds', 'rate', 'inflation', 'cpi', 'mortgage', 'yield']):
        try:
            yields = await get_treasury_yields()
            cpi = await get_fred_series('CPIAUCSL', limit=12)
            chunks.append({
                "source": "FRED Macro Data",
                "content": (
                    f"Treasury yields: 3m {yields.get('3_month')}%, 2y {yields.get('2_year')}%, 10y {yields.get('10_year')}%, 30y {yields.get('30_year')}%.\n"
                    f"Latest CPI (monthly): {cpi[0].get('value') if cpi else 'N/A'}."
                ),
                "score": 0.9,
            })
        except Exception:
            pass

    if not chunks:
        # Generic fallback from FRED values
        try:
            yields = await get_treasury_yields()
            chunks.append({
                "source": "FRED Snapshot",
                "content": (
                    f"Current benchmark rates: 3m {yields.get('3_month')}%, 2y {yields.get('2_year')}%, 10y {yields.get('10_year')}%."
                ),
                "score": 0.75,
            })
        except Exception:
            pass

    return chunks


async def retrieve_knowledge(
    query: str,
    match_count: int = None,
) -> tuple[list[dict], list[Citation]]:
    """
    Retrieve relevant knowledge base chunks for a query.
    Returns (chunks, citations).
    """
    match_count = match_count or settings.rag_match_count
    embedding   = await embed_text(query)

    if settings.vector_backend == "pinecone" and settings.pinecone_api_key:
        chunks = await _query_pinecone(embedding, "knowledge_base", match_count)
    else:
        chunks = await _query_supabase_kb(embedding, match_count)

    if not chunks:
        chunks = await _api_fallback_knowledge(query)

    citations = [
        Citation(
            source    = c.get("source", "Unknown"),
            excerpt   = c.get("content", "")[:200] + "...",
            similarity= round(c.get("score", c.get("similarity", 0.0)), 3),
        )
        for c in chunks
        if c.get("score", c.get("similarity", 0)) > 0.5
    ]

    return chunks, citations


async def retrieve_user_docs(
    query: str,
    user_id: str,
    match_count: int = 4,
) -> list[dict]:
    """Retrieve user's private document chunks."""
    embedding = await embed_text(query)

    if settings.vector_backend == "pinecone" and settings.pinecone_api_key:
        return await _query_pinecone(embedding, f"user_{user_id}", match_count)
    else:
        return await _query_supabase_user(embedding, user_id, match_count)


# ─── Pinecone backend ─────────────────────────────────────────────────────────

async def _query_pinecone(
    embedding: list[float],
    namespace: str,
    top_k: int,
) -> list[dict]:
    try:
        from services.vector_store import query_vectors
        return await query_vectors(embedding, namespace=namespace, top_k=top_k)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Pinecone query failed: %s", e)
        return []


# ─── Supabase pgvector backend ────────────────────────────────────────────────

async def _query_supabase_kb(
    embedding: list[float],
    match_count: int,
) -> list[dict]:
    try:
        from core.database import execute_rpc
        return await execute_rpc("match_knowledge_base", {
            "query_embedding": embedding,
            "match_count":     match_count,
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Supabase KB query failed: %s", e)
        return []


async def _query_supabase_user(
    embedding: list[float],
    user_id: str,
    match_count: int,
) -> list[dict]:
    try:
        from core.database import execute_rpc
        return await execute_rpc("match_user_documents", {
            "query_embedding": embedding,
            "user_id_filter":  user_id,
            "match_count":     match_count,
        })
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Supabase user doc query failed: %s", e)
        return []

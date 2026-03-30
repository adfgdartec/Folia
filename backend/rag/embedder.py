import re
import hashlib
from core.clients import openai_client
from core.config import get_settings
import tiktoken

settings = get_settings()
_encoder = tiktoken.get_encoding("cl100k_base")

# In-process embedding cache — bounded at 2000 entries
_embed_cache: dict[str, list[float]] = {}
_MAX_CACHE = 2000


def count_tokens(text: str) -> int:
    return len(_encoder.encode(text))


def _ck(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


async def embed_text(text: str) -> list[float]:
    text = text.replace("\n", " ").strip()
    k    = _ck(text)
    if k in _embed_cache:
        return _embed_cache[k]
    resp = await openai_client.embeddings.create(model=settings.embedding_model, input=text)
    emb  = resp.data[0].embedding
    if len(_embed_cache) >= _MAX_CACHE:
        del _embed_cache[next(iter(_embed_cache))]
    _embed_cache[k] = emb
    return emb


async def embed_batch(texts: list[str]) -> list[list[float]]:
    cleaned = [t.replace("\n", " ").strip() for t in texts]
    results: list = [None] * len(cleaned)
    miss_idx: list[int] = []
    miss_txt: list[str] = []

    for i, t in enumerate(cleaned):
        k = _ck(t)
        if k in _embed_cache:
            results[i] = _embed_cache[k]
        else:
            miss_idx.append(i)
            miss_txt.append(t)

    if miss_txt:
        resp = await openai_client.embeddings.create(model=settings.embedding_model, input=miss_txt)
        for j, item in enumerate(resp.data):
            oi = miss_idx[j]
            emb = item.embedding
            results[oi] = emb
            if len(_embed_cache) >= _MAX_CACHE:
                del _embed_cache[next(iter(_embed_cache))]
            _embed_cache[_ck(miss_txt[j])] = emb

    return results  # type: ignore[return-value]


def chunk_text(
    text: str,
    chunk_size: int = None,
    overlap:    int = None,
    doc_type:   str = "default",
) -> list[str]:
    if doc_type == "government":
        chunk_size = chunk_size or 512
        overlap    = overlap    or 64
    elif doc_type == "user":
        chunk_size = chunk_size or 256
        overlap    = overlap    or 32
    else:
        chunk_size = chunk_size or settings.rag_chunk_size
        overlap    = overlap    or settings.rag_chunk_overlap

    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    chunks:    list[str] = []
    current:   list[str] = []
    curr_toks: int = 0

    for para in paragraphs:
        para_toks = count_tokens(para)
        if para_toks > chunk_size:
            if current:
                chunks.append(" ".join(current))
                current   = current[-1:] if overlap > 0 else []
                curr_toks = count_tokens(" ".join(current))
            for sent in _split_sentences(para):
                st = count_tokens(sent)
                if curr_toks + st > chunk_size and current:
                    chunks.append(" ".join(current))
                    current   = current[-1:] if overlap > 0 else []
                    curr_toks = count_tokens(" ".join(current))
                current.append(sent)
                curr_toks += st
        elif curr_toks + para_toks > chunk_size:
            if current:
                chunks.append(" ".join(current))
                if overlap > 0 and current:
                    last      = current[-1]
                    current   = [last]
                    curr_toks = count_tokens(last)
                else:
                    current   = []
                    curr_toks = 0
            current.append(para)
            curr_toks += para_toks
        else:
            current.append(para)
            curr_toks += para_toks

    if current:
        chunks.append(" ".join(current))

    return [c for c in chunks if c.strip() and count_tokens(c) >= 20]


def _split_sentences(text: str) -> list[str]:
    raw = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    return [s.strip() for s in raw if s.strip()]

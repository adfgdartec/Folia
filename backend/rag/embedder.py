from core.clients import openai_client
from core.config import get_settings
import tiktoken

settings = get_settings()
_encoder = tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str) -> int:
    return len(_encoder.encode(text))

async def embed_text(text: str) -> list[float]:
    text = text.replace("\n", " ").strip()
    response = await openai_client.embeddings.create(
        model=settings.embedding_model,
        input=text
    )
    return response.data[0].embedding

async def embed_batch(texts: list[str]) -> list[list[float]]:
    cleaned = [t.replace("\n", " ").strip() for t in texts]
    response = await openai_client.embeddings.create(
        model=settings.embedding_model,
        input=cleaned
    )
    return [item.embedding for item in response.data]

def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> list[str]:
    chunk_size = chunk_size or settings.rag_chunk_size
    overlap = overlap or settings.rag_chunk_overlap
    words = text.split()
    chunks = []
    i = 0
    while i < len(words): 
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


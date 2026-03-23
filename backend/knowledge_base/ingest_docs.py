"""
Run this script once (or whenever you add new documents) to
ingest PDF documents into the Supabase pgvector knowledge base.

Usage:
    cd backend
    source venv/bin/activate
    python -m knowledge_base.ingest_docs

Download source PDFs from:
  - IRS Publications: https://www.irs.gov/forms-instructions
  - CFPB Guides:      https://www.consumerfinance.gov/consumer-tools/
  - SEC Education:    https://www.investor.gov/
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from pypdf import PdfReader
from core.database import get_supabase, insert_rows
from rag.embedder import embed_batch, chunk_text
from core.config import get_settings

settings = get_settings()

DOCS_DIR = Path(__file__).parent / "docs"

# Map filename to human-readable source name used in citations
DOCUMENT_SOURCES = {
    "irs_pub_17.pdf":       "IRS Publication 17 — Your Federal Income Tax",
    "irs_pub_590a.pdf":     "IRS Publication 590-A — IRA Contributions",
    "irs_pub_590b.pdf":     "IRS Publication 590-B — IRA Distributions & RMDs",
    "irs_pub_970.pdf":      "IRS Publication 970 — Tax Benefits for Education",
    "irs_pub_505.pdf":      "IRS Publication 505 — Tax Withholding & Estimated Tax",
    "irs_pub_334.pdf":      "IRS Publication 334 — Tax Guide for Small Business",
    "cfpb_consumer.pdf":    "CFPB — Consumer Financial Protection Guide",
    "cfpb_credit_cards.pdf":"CFPB — Credit Card Guide",
    "cfpb_mortgages.pdf":   "CFPB — Mortgage Guide",
    "sec_investor_edu.pdf": "SEC — Investor Education Guide",
    "dol_401k_guide.pdf":   "DOL — 401(k) Plan Guide",
    "ssa_retirement.pdf":   "SSA — Retirement Benefits Guide",
    "fafsa_guide.pdf":      "Federal Student Aid — FAFSA Guide",
}

BATCH_SIZE = 50


def extract_text_from_pdf(filepath: Path) -> str:
    """Extract all text from a PDF file."""
    reader = PdfReader(str(filepath))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def clean_text(text: str) -> str:
    """Basic cleanup — remove excessive whitespace."""
    import re
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


async def ingest_pdf(filepath: Path, source_name: str, overwrite: bool = False):
    """Chunk, embed, and store a single PDF in the knowledge base."""
    print(f"\n{'='*60}")
    print(f"Ingesting: {source_name}")
    print(f"File: {filepath.name}")

    supabase = get_supabase()

    # Check if already ingested
    if not overwrite:
        existing = supabase.table("knowledge_base").select("id").eq("source", source_name).limit(1).execute()
        if existing.data:
            print(f"  Already ingested ({len(existing.data)} chunks found). Skipping.")
            print("  Use overwrite=True to re-ingest.")
            return

    # Extract text
    print("  Extracting text...")
    try:
        raw_text = extract_text_from_pdf(filepath)
        text = clean_text(raw_text)
    except Exception as e:
        print(f"  ERROR extracting text: {e}")
        return

    if len(text) < 100:
        print(f"  WARNING: Very little text extracted ({len(text)} chars). Skipping.")
        return

    # Chunk
    chunks = chunk_text(text, chunk_size=settings.rag_chunk_size, overlap=settings.rag_chunk_overlap)
    print(f"  Created {len(chunks)} chunks")

    # Embed + store in batches
    total_inserted = 0
    for i in range(0, len(chunks), BATCH_SIZE):
        batch_chunks = chunks[i:i + BATCH_SIZE]
        print(f"  Embedding batch {i // BATCH_SIZE + 1}/{(len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE}...")

        try:
            embeddings = await embed_batch(batch_chunks)
        except Exception as e:
            print(f"  ERROR embedding batch: {e}")
            continue

        rows = [
            {
                "content":   chunk,
                "source":    source_name,
                "metadata":  {
                    "chunk_index": i + j,
                    "filename":    filepath.name,
                    "total_chunks": len(chunks),
                },
                "embedding": embedding,
            }
            for j, (chunk, embedding) in enumerate(zip(batch_chunks, embeddings))
        ]

        try:
            await insert_rows("knowledge_base", rows)
            total_inserted += len(rows)
        except Exception as e:
            print(f"  ERROR inserting batch: {e}")
            continue

    print(f"  Done — {total_inserted} chunks inserted.")


async def ingest_all(overwrite: bool = False):
    """Ingest all documents in the docs/ directory."""
    if not DOCS_DIR.exists():
        print(f"ERROR: docs directory not found at {DOCS_DIR}")
        print("Create it and add PDF files from IRS.gov, CFPB.gov, etc.")
        return

    pdf_files = list(DOCS_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {DOCS_DIR}")
        print("Download IRS publications and other source docs and place them here.")
        return

    print(f"Found {len(pdf_files)} PDF files to ingest.")
    print(f"Supabase URL: {settings.supabase_url[:40]}...")

    for filepath in sorted(pdf_files):
        source_name = DOCUMENT_SOURCES.get(filepath.name, filepath.stem.replace("_", " ").title())
        await ingest_pdf(filepath, source_name, overwrite=overwrite)

    print("\n" + "="*60)
    print("INGESTION COMPLETE")

    # Show final count
    supabase = get_supabase()
    result = supabase.table("knowledge_base").select("id", count="exact").execute()
    print(f"Total chunks in knowledge base: {result.count}")


if __name__ == "__main__":
    overwrite_flag = "--overwrite" in sys.argv
    asyncio.run(ingest_all(overwrite=overwrite_flag))
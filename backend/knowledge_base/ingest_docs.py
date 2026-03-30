"""
Ingest IRS/CFPB/SEC/DOL/SSA PDFs into the vector store (Pinecone or Supabase).

Usage:
    cd backend
    source venv/bin/activate
    python -m knowledge_base.ingest_docs

Download source PDFs from:
  IRS:  https://www.irs.gov/forms-instructions
  CFPB: https://www.consumerfinance.gov/consumer-tools/
  SEC:  https://www.investor.gov/
  DOL:  https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/publications
  SSA:  https://www.ssa.gov/pubs/

Place PDFs in: backend/knowledge_base/docs/
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pypdf import PdfReader
from rag.embedder import embed_batch, chunk_text
from core.config import get_settings
import re
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()
DOCS_DIR = Path(__file__).parent / "docs"

DOCUMENT_SOURCES = {
    "irs_pub_17.pdf":        "IRS Publication 17 — Your Federal Income Tax",
    "irs_pub_590a.pdf":      "IRS Publication 590-A — IRA Contributions",
    "irs_pub_590b.pdf":      "IRS Publication 590-B — IRA Distributions & RMDs",
    "irs_pub_970.pdf":       "IRS Publication 970 — Tax Benefits for Education",
    "irs_pub_505.pdf":       "IRS Publication 505 — Tax Withholding & Estimated Tax",
    "irs_pub_334.pdf":       "IRS Publication 334 — Tax Guide for Small Business",
    "cfpb_consumer.pdf":     "CFPB — Consumer Financial Protection Guide",
    "cfpb_credit_cards.pdf": "CFPB — Credit Card Guide",
    "cfpb_mortgages.pdf":    "CFPB — Mortgage Guide",
    "sec_investor_edu.pdf":  "SEC — Investor Education Guide",
    "dol_401k_guide.pdf":    "DOL — 401(k) Plan Guide",
    "ssa_retirement.pdf":    "SSA — Retirement Benefits Guide",
    "fafsa_guide.pdf":       "Federal Student Aid — FAFSA Guide",
}

BATCH_SIZE = 50


def extract_text_from_pdf(filepath: Path) -> str:
    reader = PdfReader(str(filepath))
    pages  = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def clean_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


async def ingest_pdf_pinecone(filepath: Path, source_name: str, overwrite: bool = False):
    from services.vector_store import ingest_knowledge_chunks

    logger.info("Ingesting via Pinecone: %s", source_name)
    raw   = extract_text_from_pdf(filepath)
    text  = clean_text(raw)
    chunks = chunk_text(text)

    if not chunks:
        logger.warning("No chunks extracted from %s", filepath.name)
        return

    logger.info("  %d chunks, embedding in batches of %d...", len(chunks), BATCH_SIZE)
    all_embeddings = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch      = chunks[i : i + BATCH_SIZE]
        embeddings = await embed_batch(batch)
        all_embeddings.extend(embeddings)
        logger.info("  Embedded %d/%d", min(i + BATCH_SIZE, len(chunks)), len(chunks))

    count = await ingest_knowledge_chunks(
        chunks     = chunks,
        embeddings = all_embeddings,
        source     = source_name,
        doc_type   = "government",
        overwrite  = overwrite,
    )
    logger.info("  Upserted %d vectors for %s", count, source_name)


async def ingest_pdf_supabase(filepath: Path, source_name: str, overwrite: bool = False):
    from core.database import get_supabase, insert_rows

    logger.info("Ingesting via Supabase pgvector: %s", source_name)
    sb = get_supabase()

    if overwrite:
        sb.table("knowledge_base").delete().eq("source", source_name).execute()

    raw    = extract_text_from_pdf(filepath)
    text   = clean_text(raw)
    chunks = chunk_text(text)

    if not chunks:
        logger.warning("No chunks extracted from %s", filepath.name)
        return

    logger.info("  %d chunks, embedding...", len(chunks))
    rows = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch      = chunks[i : i + BATCH_SIZE]
        embeddings = await embed_batch(batch)
        for chunk, emb in zip(batch, embeddings):
            rows.append({
                "source":    source_name,
                "content":   chunk,
                "embedding": emb,
                "doc_type":  "government",
            })
        logger.info("  Embedded %d/%d", min(i + BATCH_SIZE, len(chunks)), len(chunks))

    await insert_rows("knowledge_base", rows)
    logger.info("  Inserted %d rows for %s", len(rows), source_name)


async def main(overwrite: bool = False):
    logger.info("=" * 60)
    logger.info("Folia Knowledge Base Ingestion")
    logger.info("Vector backend: %s", settings.vector_backend)
    logger.info("=" * 60)

    if not DOCS_DIR.exists():
        DOCS_DIR.mkdir(parents=True)
        logger.info("Created docs dir: %s", DOCS_DIR)
        logger.info("Place your PDF files there and re-run.")
        return

    pdfs = list(DOCS_DIR.glob("*.pdf"))
    if not pdfs:
        logger.warning("No PDF files found in %s", DOCS_DIR)
        logger.info("Download IRS/CFPB PDFs and place them in: %s", DOCS_DIR)
        return

    logger.info("Found %d PDF(s) to ingest", len(pdfs))

    use_pinecone = (
        settings.vector_backend == "pinecone"
        and settings.pinecone_api_key
    )

    for filepath in sorted(pdfs):
        source_name = DOCUMENT_SOURCES.get(filepath.name, filepath.stem.replace("_", " ").title())
        try:
            if use_pinecone:
                await ingest_pdf_pinecone(filepath, source_name, overwrite)
            else:
                await ingest_pdf_supabase(filepath, source_name, overwrite)
        except Exception as e:
            logger.error("Failed to ingest %s: %s", filepath.name, e)

    logger.info("")
    logger.info("Ingestion complete!")
    if use_pinecone:
        from services.vector_store import get_index_stats
        stats = await get_index_stats()
        logger.info("Pinecone index stats: %s", stats)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--overwrite", action="store_true", help="Re-ingest existing documents")
    args = parser.parse_args()
    asyncio.run(main(overwrite=args.overwrite))

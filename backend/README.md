# Folia Backend

FastAPI backend powering all AI, RAG, simulation, and data features for the Folia financial platform.

## Architecture

```
main.py                  ← FastAPI app entry point
routers/
  advisor.py             ← Streaming RAG chat (OpenAI GPT-4o)
  simulate.py            ← Financial scenario simulator + Groq narrator
  tax.py                 ← 2024 IRS tax engine
  documents.py           ← Gemini document intelligence
  stocks.py              ← Finnhub market data + AI summary
  narrate.py             ← Fast Groq narration
  glossary.py            ← RAG-powered term definitions
  health.py              ← Financial health score
  budget.py              ← Budget analysis + AI insights
  macro.py               ← FRED macroeconomic data
rag/
  embedder.py            ← OpenAI text-embedding-3-small
  retriever.py           ← Supabase pgvector similarity search
  prompt_builder.py      ← Prompt assembly with Financial metadata
services/
  tax_engine.py          ← IRS bracket calculations
  simulator.py           ← Monte Carlo + deterministic simulation
  health_score.py        ← 4-component health score
  external_data.py       ← Finnhub + FRED with caching
core/
  config.py              ← Pydantic settings
  clients.py             ← OpenAI, Groq, Gemini clients
  database.py            ← Supabase client helpers
models/
  schemas.py             ← All Pydantic request/response models
knowledge_base/
  ingest_docs.py         ← PDF ingestion script
  docs/                  ← Place IRS/CFPB/SEC PDFs here
```

## Setup

### 1. Python environment

```bash
python3 -m venv venv
source venv/bin/activate      # Mac/Linux
pip install -r requirements.txt
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Supabase database

1. Create a project at [supabase.com](https://supabase.com)
2. Open SQL Editor
3. Paste and run the entire contents of `supabase_schema.sql`

### 4. Ingest knowledge base documents

Download PDFs from:
- IRS Publications: https://www.irs.gov/forms-instructions
  - pub17.pdf, pub590a.pdf, pub590b.pdf, pub970.pdf, pub505.pdf
- CFPB: https://www.consumerfinance.gov/consumer-tools/
- SSA: https://www.ssa.gov/pubs/

Place them in `knowledge_base/docs/` then run:

```bash
python -m knowledge_base.ingest_docs
```

### 5. Run the server

```bash
uvicorn main:app --reload --port 8000
```

API is now running at `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/advisor` | Non-streaming RAG chat |
| POST | `/api/advisor/stream` | Streaming RAG chat |
| POST | `/api/simulate` | Financial scenario simulation |
| POST | `/api/tax` | Tax calculation |
| POST | `/api/documents` | Document intelligence (multipart) |
| POST | `/api/stocks` | Stock data + AI summary |
| GET  | `/api/stocks/search/{query}` | Stock ticker search |
| POST | `/api/narrate` | Fast AI narration |
| POST | `/api/glossary` | Term definition |
| POST | `/api/health` | Financial health score |
| POST | `/api/budget` | Budget analysis |
| GET  | `/api/macro/indicators` | All economic indicators |
| GET  | `/api/macro/series/{key}` | Historical series data |
| GET  | `/api/macro/yields` | Treasury yield curve |
| GET  | `/api/macro/mortgage-rate` | Current mortgage rate |
| GET  | `/api/macro/fed-rate` | Current Fed funds rate |
| GET  | `/health` | System health check |

## Deployment (Render)

1. Push repo to GitHub/GitLab
2. Create new Web Service on [render.com](https://render.com)
3. Point to your repo, set root directory to `backend`
4. Add all environment variables in Render dashboard
5. Deploy — Render uses `render.yaml` automatically

## Next.js Integration

In your Next.js app, proxy all AI calls through `/app/api/` routes:

```typescript
// app/api/advisor/route.ts
export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${process.env.PYTHON_BACKEND_URL}/api/advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return new Response(res.body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```
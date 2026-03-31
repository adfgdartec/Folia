# Folia Frontend

Next.js 15 frontend for the Folia financial intelligence platform.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + custom CSS design system
- **Charts**: Recharts
- **State**: Zustand (persisted to localStorage)
- **Fonts**: DM Sans + DM Mono
- **Realtime**: Supabase Realtime subscriptions

## Pages

| Route | Description |
|---|---|
| `/` | Redirects to onboarding or dashboard |
| `/onboarding` | 8-step Financial metadata wizard |
| `/dashboard` | Home — net worth, health score, alerts, goals |
| `/finances` | Assets, debts, goals, transactions (full CRUD) |
| `/simulate` | Scenario simulator — fork, Monte Carlo, life events |
| `/advisor` | Streaming AI chat with RAG citations |
| `/invest` | Stock explorer, paper trading, macro lab |
| `/learn` | Education curriculum + RAG glossary |
| `/tax` | 2024 tax calculator with bracket visualizer |
| `/documents` | Document upload and AI intelligence |
| `/journal` | Decision journal with outcome tracking |
| `/community` | Anonymized benchmarks and templates |
| `/settings` | Financial metadata editor and account settings |

## Component structure

```
components/
├── layout/
│   ├── Sidebar.tsx          ← sticky sidebar navigation
│   ├── AppLayout.tsx        ← wraps all authenticated pages
│   └── RealtimeManager.tsx  ← Supabase realtime subscriptions
├── charts/
│   └── index.tsx            ← 6 Recharts components
├── ui/
│   ├── Modal.tsx            ← modal + confirm dialog
│   ├── Toast.tsx            ← toast notification system
│   ├── ErrorBoundary.tsx    ← error boundary
│   └── Spinner.tsx          ← loading states
├── forms/
│   ├── AssetForm.tsx        ← add/edit asset modal
│   ├── DebtForm.tsx         ← add/edit debt modal
│   ├── GoalForm.tsx         ← add/edit goal modal
│   └── TransactionForm.tsx  ← add transaction modal
└── cards/
    ├── HealthScoreCard.tsx  ← reusable health score
    └── NetWorthCard.tsx     ← reusable net worth card
```

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Dev
npm run dev
# → http://localhost:3000
```

## Environment variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:8000          # FastAPI backend

# Optional (enables realtime)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Production
NEXT_PUBLIC_PYTHON_BACKEND_URL=https://folia-api.onrender.com  # Used by Next.js API proxy routes
```

## API proxy routes

All AI calls go through Next.js API routes (`app/api/`) which proxy to the FastAPI backend. This keeps the backend URL and API keys server-side only in production.

## Deployment

Deploy to Vercel — it auto-detects Next.js and requires zero configuration:

```bash
# Deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_PYTHON_BACKEND_URL = your Render backend URL
# NEXT_PUBLIC_SUPABASE_URL = your Supabase URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY = your Supabase anon key
```
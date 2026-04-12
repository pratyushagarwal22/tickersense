# TickerSense

**TickerSense** is a hackathon MVP: a one-stop **SEC research copilot** workspace for U.S. public companies. It combines filing metadata, a lightweight financial snapshot (when available), and simple market context—while keeping **facts separated** from interpretive summaries.

This repository is a **monorepo**:

- `apps/web`: Next.js 14 (App Router) + TypeScript + Tailwind
- `services/ingestion`: FastAPI ingestion service (Python 3.11)
- `supabase`: SQL schema for persistence/caching (optional for local demos)

## Architecture

See `docs/architecture.md`.

## Local setup

### Prerequisites

- Node.js 18+ (20+ recommended)
- Python 3.11+
- (Optional) Supabase project if you want persistence enabled end-to-end

### Environment variables

- Root: `.env.example`
- Web: `apps/web/.env.local.example`
- Ingestion: `services/ingestion/.env.example`

At minimum for a good SEC demo, set **`SEC_USER_AGENT`** in `services/ingestion/.env`.

### Install + run the web app

```bash
cd apps/web
npm install
npm run dev
```

Web default: `http://localhost:3000`

### Install + run the ingestion service

```bash
cd services/ingestion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SEC_USER_AGENT="Your Name your-email@example.com"
uvicorn app.main:app --reload --port 8001
```

Ingestion default: `http://localhost:8001/health`

### Connect web → ingestion

Set `INGESTION_SERVICE_URL` for the Next.js server (typically in `apps/web/.env.local`):

```bash
INGESTION_SERVICE_URL=http://localhost:8001
```

## How mock fallback works

### Company dashboard (`GET /api/company/[ticker]`)

- If `INGESTION_SERVICE_URL` is missing, or the ingestion request fails, the Next route returns **`apps/web/lib/mock-data.ts`** (`getMockCompany`).
- The UI labels demo/fallback state in the header when `meta.mock` is true.

### Ask Copilot (`POST /api/ask`)

- If neither `OPENAI_API_KEY` nor `ANTHROPIC_API_KEY` is set (or the provider call fails), the route returns **`getMockAskResponse`** with the required JSON shape.

### Supabase

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, the browser Supabase client is not initialized; the MVP still runs without persistence.

## Acceptance checks (MVP)

- Home page renders a polished search experience with example tickers.
- `/company/AAPL` renders dashboard sections (insights, filings, metrics, chart, copilot).
- If ingestion is down, the dashboard still renders using mock JSON.

## Future roadmap

- Deeper 10-K / 10-Q section extraction (HTML → structured sections)
- Risk-factor diffing across periods
- News + earnings transcript ingestion
- Annual report / IR deck ingestion
- Retrieval-augmented company chat (pgvector-backed memory)

## Disclaimer

TickerSense is **research support only** and **not investment advice**.

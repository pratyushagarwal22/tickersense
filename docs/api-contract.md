# API contract (MVP)

## `GET /api/company/[ticker]` (Next.js)

**Behavior**

- Proxies to `${INGESTION_SERVICE_URL}/company/{ticker}` when configured.
- On any failure (timeout, non-2xx, invalid JSON), returns the mock company payload from `apps/web/lib/mock-data.ts`.

**Response**: `CompanyPayload` (JSON)

Top-level fields:

- `ticker` (string)
- `name` (string)
- `exchange` (string | optional)
- `cik` (string | optional)
- `insights` (array of insight cards)
- `filings` (array)
- `filing_sections` (array)
- `financials` (array)
- `technicals` (array)
- `price_history` (array of `{ date, close }`)
- `governance` (object)
- `meta` (`{ facts_available, market_available, mock? }`)

## `POST /api/ask` (Next.js)

**Request JSON**

```json
{
  "ticker": "AAPL",
  "question": "What should I verify in the latest 10-Q?",
  "companyContext": {}
}
```

`companyContext` is optional; when present it should be the `CompanyPayload` returned by `/api/company/...`.

**Response JSON**

```json
{
  "answer": "string",
  "bullet_points": ["string"],
  "supporting_sources": [{ "label": "string", "url": "string?", "form": "string?" }],
  "unanswered_questions": ["string"],
  "disclaimer": "Research support only. Not investment advice."
}
```

## `GET /health` (FastAPI)

Returns `{ "status": "ok" }`.

## `GET /company/{ticker}` (FastAPI)

Returns the same `CompanyPayload` shape as the Next route (normalized dict).

**Errors**

- `404` if the ticker cannot be resolved to a CIK via SEC `company_tickers.json`.
- `500` on unexpected ingestion failures (the Next.js route should still fall back to mock).

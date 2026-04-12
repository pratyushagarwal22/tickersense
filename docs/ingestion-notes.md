# Ingestion notes (SEC + market)

## SEC etiquette

SEC endpoints require a descriptive `User-Agent` that identifies you (per SEC fair access policies). Configure:

- `SEC_USER_AGENT` in `services/ingestion/.env` (and mirror in root `.env.example` for documentation)

Example format:

`Your Name your-email@example.com`

## What the ingestion service does today

1. **Resolve CIK** via `https://www.sec.gov/files/company_tickers.json`.
2. **Fetch submissions** via `https://data.sec.gov/submissions/CIK##########.json`.
3. **Select latest filings** for `10-K`, `10-Q`, `8-K`, and `DEF 14A` from the `filings.recent` arrays (first-seen per form in the recent listing).
4. **Build archive URLs** using:
   - `https://www.sec.gov/Archives/edgar/data/{cik}/{accessionNoDash}/{primaryDocument}`
5. **Fetch company facts** via `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` and extract a small set of `us-gaap` tags when present.
6. **Fetch market history** via `yfinance` and compute:
   - SMA20 / SMA50 / SMA200
   - RSI(14) (Wilder-style smoothing via EWM)
   - approximate 52-week high/low from the trailing window available in the downloaded series

## Parsing v1 boundaries

Section text extraction is intentionally shallow:

- The API returns **placeholders** for business / risk / MD&A / governance sections, with links pointing at the identified filings where possible.
- A future iteration can add HTML parsing pipelines (with caching, rate limits, and exhibit-aware navigation).

## Operational caveats

- **Rate limiting**: SEC may throttle aggressive polling. The service uses retries (`tenacity`) but you should still avoid hot-looping requests during demos.
- **Tag variability**: XBRL tags differ across filers; the financial snapshot is best-effort and may be sparse for some companies.

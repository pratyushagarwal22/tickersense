import type { AskResponseBody, CompanyPayload, FilingItem } from "@/lib/types";

/** 10-digit CIKs for demo tickers — used only when ingestion is unavailable */
const DEMO_CIKS: Record<string, string> = {
  AAPL: "0000320193",
  MSFT: "0000789019",
  NVDA: "0001045810",
  TSLA: "0001318605",
};

function secBrowseByFormUrl(cik10: string, form: string): string {
  const cik = String(parseInt(cik10, 10));
  const type = encodeURIComponent(form);
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${type}&owner=exclude&count=10`;
}

function secCompanySearchUrl(ticker: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(
    ticker,
  )}&owner=exclude&count=40`;
}

function demoFilings(ticker: string): FilingItem[] {
  const t = ticker.toUpperCase();
  const cik = DEMO_CIKS[t];
  const baseUrl = cik ? (form: string) => secBrowseByFormUrl(cik, form) : () => secCompanySearchUrl(t);

  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      form: "10-K",
      filed_at: today,
      accession_number: "DEMO-NO-ACCESSION",
      description: "Demo: opens EDGAR filtered to latest 10-K filings for this issuer",
      filing_url: baseUrl("10-K"),
      filing_index_url: cik ? secBrowseByFormUrl(cik, "10-K") : secCompanySearchUrl(t),
      sec_viewer_url: undefined,
    },
    {
      form: "10-Q",
      filed_at: today,
      accession_number: "DEMO-NO-ACCESSION",
      description: "Demo: opens EDGAR filtered to latest 10-Q filings",
      filing_url: baseUrl("10-Q"),
      filing_index_url: cik ? secBrowseByFormUrl(cik, "10-Q") : secCompanySearchUrl(t),
    },
    {
      form: "8-K",
      filed_at: today,
      accession_number: "DEMO-NO-ACCESSION",
      description: "Demo: opens EDGAR filtered to latest 8-K filings",
      filing_url: baseUrl("8-K"),
      filing_index_url: cik ? secBrowseByFormUrl(cik, "8-K") : secCompanySearchUrl(t),
    },
    {
      form: "DEF 14A",
      filed_at: today,
      accession_number: "DEMO-NO-ACCESSION",
      description: "Demo: opens EDGAR filtered to latest DEF 14A filings",
      filing_url: baseUrl("DEF 14A"),
      filing_index_url: cik ? secBrowseByFormUrl(cik, "DEF 14A") : secCompanySearchUrl(t),
    },
  ];
}

export function getMockCompany(ticker: string): CompanyPayload {
  const t = ticker.toUpperCase();
  const cik = DEMO_CIKS[t] ?? undefined;
  const filings = demoFilings(t);

  return {
    ticker: t,
    name:
      t === "AAPL"
        ? "Apple Inc."
        : t === "MSFT"
          ? "Microsoft Corporation"
          : t === "NVDA"
            ? "NVIDIA Corporation"
            : t === "TSLA"
              ? "Tesla, Inc."
              : `${t} Corporation (Demo)`,
    exchange: "NASDAQ",
    cik: cik ?? "0000000000",
    meta: {
      facts_available: false,
      market_available: false,
      mock: true,
    },
    insights: [
      {
        category: "what_changed",
        title: "What changed",
        bullets: [
          "Demo mode: the Next.js server is not using live ingestion (missing `INGESTION_SERVICE_URL` or the Python service is unreachable).",
          "Turn on the ingestion service to resolve real accessions and deep links to primary HTML documents.",
        ],
        sources: [{ label: "Demo dataset" }],
        is_ai_synthesis: false,
      },
      {
        category: "what_matters",
        title: "What matters",
        bullets: [
          "Filings narrative (business, risks, MD&A) drives the qualitative story; market data adds timing and sentiment context.",
          "Use DEF 14A to understand incentives and governance structures that can affect long-term decision-making.",
        ],
        sources: [{ label: "Product framing" }],
        is_ai_synthesis: false,
      },
      {
        category: "strong",
        title: "What looks strong",
        bullets: [
          "The research workflow is structured to separate facts from interpretation.",
          "With ingestion enabled, filing buttons open the SEC viewer and the exact primary document when SEC provides `primaryDocument`.",
        ],
        sources: [{ label: "UX pattern" }],
        is_ai_synthesis: false,
      },
      {
        category: "concerning",
        title: "What looks concerning",
        bullets: [
          "Any automated summary can miss nuance; verify claims in the underlying filing sections.",
          "Market indicators are descriptive, not predictive.",
        ],
        sources: [{ label: "Risk note" }],
        is_ai_synthesis: false,
      },
      {
        category: "open_questions",
        title: "Open questions",
        bullets: [
          "What changed in the latest quarter versus management’s own framing in MD&A?",
          "Which risks are newly emphasized compared to the prior 10-K?",
        ],
        sources: [{ label: "Research checklist" }],
        is_ai_synthesis: false,
      },
    ],
    filings,
    filing_sections: [
      {
        id: "business",
        label: "Business",
        form: "10-K",
        excerpt:
          "Placeholder: connect ingestion to extract Item 1 (Business) text. Until then, use the EDGAR links below.",
        source_url: filings.find((f) => f.form === "10-K")?.filing_url,
      },
      {
        id: "risk_factors",
        label: "Risk factors",
        form: "10-K",
        excerpt:
          "Placeholder: risk factors evolve quarter to quarter; diffing across periods is a planned enhancement.",
        source_url: filings.find((f) => f.form === "10-K")?.filing_url,
      },
      {
        id: "mdna",
        label: "MD&A",
        form: "10-Q",
        excerpt:
          "Placeholder: MD&A is usually the fastest path to management’s explanation of performance and outlook.",
        source_url: filings.find((f) => f.form === "10-Q")?.filing_url,
      },
      {
        id: "governance",
        label: "Governance / executive compensation",
        form: "DEF 14A",
        excerpt:
          "Placeholder: DEF 14A is the primary source for pay design, equity incentives, and board structure.",
        source_url: filings.find((f) => f.form === "DEF 14A")?.filing_url,
      },
    ],
    financials: [
      { label: "Revenue (demo)", value: "—", period: "TTM", source: "SEC company facts (when available)" },
      { label: "Net income (demo)", value: "—", period: "TTM", source: "SEC company facts (when available)" },
      { label: "EPS (diluted) (demo)", value: "—", period: "MRQ", source: "SEC company facts (when available)" },
      { label: "Total assets (demo)", value: "—", period: "MRQ", source: "SEC company facts (when available)" },
    ],
    technicals: [
      { label: "Last close (demo)", value: "—" },
      { label: "SMA 20", value: "—" },
      { label: "SMA 50", value: "—" },
      { label: "SMA 200", value: "—" },
      { label: "RSI (14)", value: "—" },
      { label: "52-week range", value: "— / —" },
    ],
    price_history: Array.from({ length: 120 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (119 - i));
      return {
        date: d.toISOString().slice(0, 10),
        close: 100 + Math.sin(i / 3) * 4 + i * 0.08,
      };
    }),
    benchmark_history: Array.from({ length: 120 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (119 - i));
      return {
        date: d.toISOString().slice(0, 10),
        close: 98 + Math.sin(i / 4) * 3 + i * 0.06,
      };
    }),
    benchmark_label: "S&P 500",
    revenue_series: Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i) * 3);
      return {
        period_end: d.toISOString().slice(0, 10),
        value_usd: 80e9 + i * 1.8e9,
      };
    }),
    net_income_series: Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i) * 3);
      return {
        period_end: d.toISOString().slice(0, 10),
        value_usd: 18e9 + i * 0.4e9,
      };
    }),
    operating_expenses_series: Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i) * 3);
      return {
        period_end: d.toISOString().slice(0, 10),
        value_usd: 45e9 + i * 0.9e9,
      };
    }),
    cost_of_revenue_series: Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i) * 3);
      return {
        period_end: d.toISOString().slice(0, 10),
        value_usd: 52e9 + i * 1e9,
      };
    }),
    segment_facts: [],
    segment_reporting: {
      summary:
        "Segment operating results are in 10-Q/10-K segment footnotes. Demo workspace: bulk API segment rows may be empty.",
    },
    governance: {
      bullets: [
        "Demo governance summary: review DEF 14A for named executive officer compensation and equity grant practices.",
        "Check committee charters and independence disclosures for board oversight quality signals.",
      ],
      sources: [{ label: "DEF 14A (when linked)", form: "DEF 14A" }],
    },
  };
}

export function getMockAskResponse(ticker: string, question: string): AskResponseBody {
  return {
    answer:
      "Demo mode response: I can’t call a live model without API keys, but you can still validate the grounded-response shape. " +
      `For ${ticker}, start by anchoring on the latest 10-Q/10-K MD&A for performance drivers, then cross-check material items in recent 8-Ks. ` +
      `Your question was: “${question}”.`,
    bullet_points: [
      "Verify any quantitative claims in SEC company facts or the financial statements embedded in filings.",
      "Separate facts (filing text, reported metrics) from interpretation (narrative synthesis).",
      "List what documents you still need if the answer depends on missing exhibits or footnotes.",
    ],
    supporting_sources: [
      { label: "SEC EDGAR search", url: "https://www.sec.gov/edgar/search/" },
      { label: `Latest 10-K / 10-Q for ${ticker}`, form: "10-K" },
    ],
    unanswered_questions: [
      "What horizon are you evaluating (next quarter vs. multi-year)?",
      "Which line items are most decision-relevant for your use case?",
    ],
    disclaimer: "Research support only. Not investment advice.",
  };
}

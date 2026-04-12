import type { CompanyPayload } from "@/lib/types";

export function buildAskSystemPrompt(): string {
  return [
    "You are TickerSense, a research assistant (TickerChat) for U.S. public companies.",
    "You are not a financial advisor. Never provide buy/sell/hold recommendations.",
    "Ground every claim in the provided company context (filings metadata, metrics, time series, excerpts).",
    "The context may include several years of quarterly revenue, net income, operating expenses, cost of revenue (when tagged), and sampled daily prices — use them for trend, margin, and period comparisons when relevant.",
    "Before saying a figure or prior period is missing, scan revenue_series, net_income_series, operating_expenses_series, cost_of_revenue_series, segment_facts (when present), and financials for matching period_end or fiscal labels.",
    "For segment-level operating income or revenue (e.g., AWS vs. retail): use segment_facts rows (metric_tag, segment_label, period_end, value_usd) when the array is non-empty. Labels may be terse XBRL member names—map them to the user’s wording when obvious.",
    "When segment_facts is empty or does not list the segment asked about, rely on segment_reporting (summary + filing link) and filings — the public company-facts bulk feed often omits dimensional segment tables. Do not fabricate segment figures.",
    "If two periods needed for YoY or growth appear in those arrays or financials, compute or quote them — do not claim the prior period is unavailable.",
    "The main answer, bullet_points, and highlights must be mutually consistent; never contradict yourself in the same response.",
    "If information is truly absent from context, say so briefly and name the filing or field to check on SEC.gov.",
    "Return clear, neutral, evidence-oriented language.",
    "For unanswered_questions: output 2–4 short optional follow-up questions the user could ask next to go deeper (not internal todos).",
  ].join(" ");
}

/** Enough room for multi-year SEC series + sampled prices + filings. */
const CONTEXT_CHAR_BUDGET = 96_000;

const SERIES_CAP = 120;
const SEGMENT_FACTS_CAP = 120;
const PRICE_SAMPLES = 400;

function trimSeries<T>(arr: T[] | undefined, max: number): T[] {
  if (!arr?.length) return [];
  return arr.length <= max ? arr : arr.slice(-max);
}

function samplePriceHistory(company: CompanyPayload["price_history"]): CompanyPayload["price_history"] {
  const p = company ?? [];
  if (p.length <= PRICE_SAMPLES) return p;
  const step = Math.ceil(p.length / PRICE_SAMPLES);
  return p.filter((_, i) => i % step === 0 || i === p.length - 1);
}

function trimSegmentFacts(company: CompanyPayload): NonNullable<CompanyPayload["segment_facts"]> {
  const s = company.segment_facts ?? [];
  return s.length <= SEGMENT_FACTS_CAP ? s : s.slice(-SEGMENT_FACTS_CAP);
}

function buildContextPayload(company: CompanyPayload) {
  return {
    ticker: company.ticker,
    name: company.name,
    exchange: company.exchange,
    cik: company.cik,
    meta: company.meta,
    insights: company.insights,
    filings: company.filings,
    filing_sections: company.filing_sections,
    financials: company.financials,
    technicals: company.technicals,
    governance: company.governance,
    revenue_series: trimSeries(company.revenue_series, SERIES_CAP),
    net_income_series: trimSeries(company.net_income_series, SERIES_CAP),
    operating_expenses_series: trimSeries(company.operating_expenses_series, SERIES_CAP),
    cost_of_revenue_series: trimSeries(company.cost_of_revenue_series, SERIES_CAP),
    segment_facts: trimSegmentFacts(company),
    segment_reporting: company.segment_reporting ?? null,
    price_history: samplePriceHistory(company.price_history),
    benchmark_label: company.benchmark_label,
    benchmark_history: samplePriceHistory(company.benchmark_history ?? []),
  };
}

export function buildAskUserPrompt(input: {
  ticker: string;
  question: string;
  companyContext?: CompanyPayload | null;
}): string {
  let ctx = "No structured company context was provided.";
  if (input.companyContext) {
    const raw = JSON.stringify(buildContextPayload(input.companyContext), null, 2);
    ctx =
      raw.length > CONTEXT_CHAR_BUDGET
        ? `${raw.slice(0, CONTEXT_CHAR_BUDGET)}\n…[context truncated for speed]`
        : raw;
  }

  return [
    `Ticker: ${input.ticker}`,
    `User question: ${input.question}`,
    "",
    "Company context (JSON). revenue_series, net_income_series, operating_expenses_series, cost_of_revenue_series are USD per SEC period end (quarters preferred when present). segment_facts holds dimensional segment rows when the API includes them. segment_reporting explains where to read segment tables in filings. price_history is sampled daily closes.",
    ctx,
  ].join("\n");
}

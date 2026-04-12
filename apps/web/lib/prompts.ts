import type { CompanyPayload, WorkspaceAiEnrichment } from "@/lib/types";

export function buildAskSystemPrompt(): string {
  return [
    "You are TickerSense, a research assistant (TickerChat) for U.S. public companies.",
    "You are not a financial advisor. Never provide buy/sell/hold recommendations.",
    "Ground every claim in the provided company context (filings metadata, metrics, time series, excerpts).",
    "The context may include several years of quarterly revenue, net income, operating expenses, cost of revenue (when tagged), and sampled daily prices — use them for trend, margin, and period comparisons when relevant.",
    "Before saying a figure or prior period is missing, scan the JSON arrays and financials for matching period_end or fiscal labels.",
    "For segment-level operating income or revenue: use labeled segment rows in the JSON when present. Labels may be terse XBRL member names—map them to the user’s wording when obvious.",
    "When segment tables in the JSON are empty or omit the segment asked about, rely on segment reporting summaries and filing links. Do not fabricate segment figures.",
    "When the JSON includes filing excerpts (MD&A, risk factors, proxy), use that plain text for those topics before claiming the topic is missing from context.",
    "When a block titled like \"fetched for this question\" or \"YoY comparison\" appears after the JSON, treat it as additional authoritative plain text for this turn—prefer it for detailed risk or MD&A questions.",
    "When peer company snapshots are included, compare only using data present for each issuer. If a peer field is empty, say so—do not invent peer-specific numbers.",
    "If two periods needed for YoY or growth appear in those arrays or financials, compute or quote them — do not claim the prior period is unavailable.",
    "The main answer, bullet_points, and highlights must be mutually consistent; never contradict yourself in the same response.",
    "If information is truly absent from context, say so briefly and point to the official filing on SEC.gov—do not mention internal data layout.",
    "In answer, bullet_points, disclaimer, and unanswered_questions: write for a non-technical reader. Never quote or name JSON keys, snake_case field names, dot-notation paths, or developer terms (e.g. *_excerpt, workspace_ai). Use plain phrases like \"the risk-factor excerpt in the context\", \"the MD&A text provided\", or \"the filing excerpt\".",
    "Return clear, neutral, evidence-oriented language.",
    "For unanswered_questions: output 2–4 short optional follow-up questions the user could ask next to go deeper (not internal todos).",
  ].join(" ");
}

/** Enough room for primary + slim peer payloads + sampled prices + filing excerpts. */
const CONTEXT_CHAR_BUDGET = 120_000;

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

function trimWorkspaceAi(ai: WorkspaceAiEnrichment | undefined): WorkspaceAiEnrichment | null {
  if (!ai) return null;
  const sm = ai.section_summaries ?? {};
  const trimmedSummaries: WorkspaceAiEnrichment["section_summaries"] = {};
  for (const [k, v] of Object.entries(sm)) {
    if (typeof v === "string" && v.trim()) {
      trimmedSummaries[k as keyof WorkspaceAiEnrichment["section_summaries"]] = v.length > 1600 ? v.slice(0, 1600) + "…" : v;
    }
  }
  const mdna = ai.mdna_excerpt?.trim();
  const risks = ai.risk_factors_excerpt?.trim();
  const gov = ai.governance_excerpt?.trim();
  return {
    segment_bullets: (ai.segment_bullets ?? []).slice(0, 28),
    section_summaries: trimmedSummaries,
    governance_bullets: (ai.governance_bullets ?? []).slice(0, 10),
    deeper_reading: (ai.deeper_reading ?? []).slice(0, 14),
    ...(mdna ? { mdna_excerpt: mdna.length > 11_000 ? mdna.slice(0, 11_000) + "…" : mdna } : {}),
    ...(risks ? { risk_factors_excerpt: risks.length > 8000 ? risks.slice(0, 8000) + "…" : risks } : {}),
    ...(gov ? { governance_excerpt: gov.length > 6000 ? gov.slice(0, 6000) + "…" : gov } : {}),
  };
}

export function buildSlimPeerContext(company: CompanyPayload) {
  const ai = trimWorkspaceAi(company.workspace_ai);
  return {
    ticker: company.ticker,
    name: company.name,
    exchange: company.exchange,
    financials: company.financials.slice(0, 8),
    filings: company.filings.slice(0, 5).map((f) => ({
      form: f.form,
      filed_at: f.filed_at,
      filing_url: f.filing_url,
    })),
    insights: company.insights.map((i) => ({
      title: i.title,
      bullets: i.bullets.slice(0, 5),
    })),
    workspace_ai: ai,
    revenue_series: trimSeries(company.revenue_series, 28),
    net_income_series: trimSeries(company.net_income_series, 28),
    cost_of_revenue_series: trimSeries(company.cost_of_revenue_series, 20),
    operating_expenses_series: trimSeries(company.operating_expenses_series, 28),
  };
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
    workspace_ai: trimWorkspaceAi(company.workspace_ai),
    price_history: samplePriceHistory(company.price_history),
    benchmark_label: company.benchmark_label,
    benchmark_history: samplePriceHistory(company.benchmark_history ?? []),
  };
}

export function buildAskUserPrompt(input: {
  ticker: string;
  question: string;
  companyContext?: CompanyPayload | null;
  peerContexts?: CompanyPayload[];
  /** Plain-text SEC excerpts fetched server-side for this question only (appended after JSON). */
  questionSupplement?: string;
  /** When supplement is large, trim JSON to stay within model limits. */
  contextCharBudget?: number;
}): string {
  const budget = input.contextCharBudget ?? CONTEXT_CHAR_BUDGET;
  let ctx = "No structured company context was provided.";
  if (input.companyContext) {
    const primary = buildContextPayload(input.companyContext);
    const peers = (input.peerContexts ?? []).filter((p) => p.ticker.toUpperCase() !== input.ticker.toUpperCase());
    const peerPayloads = peers.map((p) => buildSlimPeerContext(p));
    const bundle = {
      primary_company: primary,
      peer_companies: peerPayloads,
    };
    const raw = JSON.stringify(bundle, null, 2);
    ctx = raw.length > budget ? `${raw.slice(0, budget)}\n…[context truncated for speed]` : raw;
  }

  const lines = [
    `Ticker: ${input.ticker}`,
    `User question: ${input.question}`,
    "",
    "Company context (JSON): primary_company is the full workspace; peer_companies are slimmer snapshots for comparisons. Monetary series are USD by SEC period end where noted. Some keys hold plain-text filing excerpts from the latest forms; price history may be sampled.",
    ctx,
  ];
  const sup = input.questionSupplement?.trim();
  if (sup) {
    lines.push(
      "",
      "Additional filing text for this question (plain text; use together with the JSON above):",
      sup,
    );
  }
  return lines.join("\n");
}

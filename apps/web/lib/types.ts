export type InsightCategory =
  | "what_changed"
  | "what_matters"
  | "strong"
  | "concerning"
  | "open_questions";

export type FilingForm = "10-K" | "10-Q" | "8-K" | "DEF 14A" | string;

export interface SourceRef {
  label: string;
  url?: string;
  form?: FilingForm;
}

export interface InsightCard {
  category: InsightCategory;
  title: string;
  bullets: string[];
  sources: SourceRef[];
  is_ai_synthesis?: boolean;
}

export interface FilingItem {
  form: string;
  filed_at: string;
  accession_number: string;
  primary_document?: string;
  /** Direct Archives URL (primary HTML) when available from SEC submissions */
  filing_url?: string;
  /** Directory-style filing index (lists exhibits / related files) */
  filing_index_url?: string;
  /** SEC’s interactive viewer for this accession (often the most reliable entry point) */
  sec_viewer_url?: string;
  description?: string;
}

export interface FilingSectionExcerpt {
  id: string;
  label: string;
  form?: string;
  excerpt: string;
  source_url?: string;
}

export interface FinancialMetric {
  label: string;
  value: string;
  period?: string;
  source?: string;
}

export interface TechnicalMetric {
  label: string;
  value: string;
}

export interface PriceBar {
  date: string;
  /** Stock close; benchmark may use null when no session match */
  close: number | null;
}

/** SEC XBRL metric (USD), one row per reporting period end */
export interface MetricPoint {
  period_end: string;
  value_usd: number;
}

/** @deprecated alias — use MetricPoint */
export type RevenuePoint = MetricPoint;

export interface GovernanceSummary {
  bullets: string[];
  sources: SourceRef[];
}

export interface SegmentFactPoint {
  metric_tag: string;
  period_end: string;
  value_usd: number;
  segment_label: string;
  fiscal_period?: string | null;
}

export interface SegmentReportingContext {
  summary: string;
  filing_url?: string | null;
  form?: string | null;
  filed_at?: string | null;
}

export interface CompanyPayload {
  ticker: string;
  name: string;
  exchange?: string;
  cik?: string;
  insights: InsightCard[];
  filings: FilingItem[];
  filing_sections: FilingSectionExcerpt[];
  financials: FinancialMetric[];
  technicals: TechnicalMetric[];
  price_history: PriceBar[];
  /** S&P 500 (or label) closes aligned by calendar date where available */
  benchmark_history?: PriceBar[];
  benchmark_label?: string;
  /** Revenue history from SEC company facts (quarters preferred; FY excluded when quarters exist) */
  revenue_series: MetricPoint[];
  /** Net income (NetIncomeLoss) — same period rules as revenue */
  net_income_series?: MetricPoint[];
  /** Operating expenses (OperatingExpenses or CostsAndExpenses) */
  operating_expenses_series?: MetricPoint[];
  /** Cost of revenue / COGS — for margin and ratio questions when tagged */
  cost_of_revenue_series?: MetricPoint[];
  /** Dimensional segment rows when SEC company-facts includes them (often empty for large filers). */
  segment_facts?: SegmentFactPoint[];
  /** Where to read segment tables when bulk facts omit them */
  segment_reporting?: SegmentReportingContext;
  governance: GovernanceSummary;
  meta: {
    facts_available: boolean;
    market_available: boolean;
    mock?: boolean;
  };
}

export interface AskRequestBody {
  ticker: string;
  question: string;
  companyContext?: CompanyPayload | null;
}

export interface AskResponseBody {
  answer: string;
  bullet_points: string[];
  supporting_sources: SourceRef[];
  unanswered_questions: string[];
  disclaimer: string;
}

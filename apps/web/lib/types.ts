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
  close: number;
}

export interface GovernanceSummary {
  bullets: string[];
  sources: SourceRef[];
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

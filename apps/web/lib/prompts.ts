import type { CompanyPayload } from "@/lib/types";

export function buildAskSystemPrompt(): string {
  return [
    "You are TickerSense, a research copilot for U.S. public companies.",
    "You are not a financial advisor. Never provide buy/sell/hold recommendations.",
    "Ground every claim in the provided company context (filings metadata, metrics, excerpts).",
    "If information is missing, say so and list what would be needed to answer confidently.",
    "Return clear, neutral, evidence-oriented language.",
  ].join(" ");
}

const CONTEXT_CHAR_BUDGET = 16_000;

export function buildAskUserPrompt(input: {
  ticker: string;
  question: string;
  companyContext?: CompanyPayload | null;
}): string {
  let ctx = "No structured company context was provided.";
  if (input.companyContext) {
    const raw = JSON.stringify(
      {
        ticker: input.companyContext.ticker,
        name: input.companyContext.name,
        insights: input.companyContext.insights,
        filings: input.companyContext.filings,
        filing_sections: input.companyContext.filing_sections,
        financials: input.companyContext.financials,
        technicals: input.companyContext.technicals,
        governance: input.companyContext.governance,
      },
      null,
      2,
    );
    ctx =
      raw.length > CONTEXT_CHAR_BUDGET
        ? `${raw.slice(0, CONTEXT_CHAR_BUDGET)}\n…[context truncated for speed]`
        : raw;
  }

  return [
    `Ticker: ${input.ticker}`,
    `User question: ${input.question}`,
    "",
    "Company context (JSON):",
    ctx,
  ].join("\n");
}

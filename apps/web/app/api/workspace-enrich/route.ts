import { fetchAnthropicMessages } from "@/lib/anthropic-fetch";
import {
  extractMdnaExcerpt,
  extractProxyGovernanceExcerpt,
  extractRiskFactorsExcerpt,
  looksLikeTableOfContents,
} from "@/lib/filing-text-extract";
import { loadCompanyFromIngestion } from "@/lib/ingestion-client";
import { fetchFilingPlainText } from "@/lib/sec-filing-plain-text";
import type { CompanyPayload, WorkspaceAiEnrichment } from "@/lib/types";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Keep under org TPM; MD&A + risks are duplicated as prioritized excerpts + body. */
const MAX_FETCH_10Q = 56_000;
const MAX_FETCH_10K = 68_000;
const MAX_PROXY_CHARS = 36_000;
const MAX_USER_CONTENT_CHARS = 70_000;

export const runtime = "nodejs";
export const maxDuration = 120;

const BodySchema = z.object({
  ticker: z.string().min(1),
});

function envTrim(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function tryParseJsonObject(text: string): Record<string, unknown> | null {
  const raw = text.trim();
  let body = raw.replace(/^```(?:json)?\s*\n?/i, "");
  const fenceEnd = body.lastIndexOf("```");
  if (fenceEnd !== -1) body = body.slice(0, fenceEnd).trim();
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      return JSON.parse(s) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  const direct = tryParse(body);
  if (direct) return direct;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return tryParse(body.slice(start, end + 1));
}

function normalizeEnrichment(parsed: Record<string, unknown>): WorkspaceAiEnrichment {
  const strArr = (k: string): string[] => {
    const v = parsed[k];
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  };
  const sectionRaw = parsed.section_summaries;
  const section_summaries: WorkspaceAiEnrichment["section_summaries"] = {};
  if (sectionRaw && typeof sectionRaw === "object" && !Array.isArray(sectionRaw)) {
    for (const key of ["business", "risk_factors", "mdna", "segments", "governance"] as const) {
      const v = (sectionRaw as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim()) section_summaries[key] = v.trim();
    }
  }
  return {
    segment_bullets: strArr("segment_bullets").slice(0, 12),
    section_summaries,
    governance_bullets: strArr("governance_bullets").slice(0, 8),
    deeper_reading: strArr("deeper_reading").slice(0, 10),
  };
}

function riskExcerptNeedsFallback(s: string): boolean {
  if (s.length < 500) return true;
  return looksLikeTableOfContents(s.slice(0, Math.min(4500, s.length)));
}

function mergeEnrichment(
  ai: WorkspaceAiEnrichment,
  mdna_excerpt: string,
  risk_factors_excerpt: string,
  governance_excerpt: string,
): WorkspaceAiEnrichment {
  const out: WorkspaceAiEnrichment = { ...ai };
  if (mdna_excerpt.length > 200) out.mdna_excerpt = mdna_excerpt;
  if (risk_factors_excerpt.length > 200) out.risk_factors_excerpt = risk_factors_excerpt;
  if (governance_excerpt.length > 200) out.governance_excerpt = governance_excerpt;
  return out;
}

const ENRICH_PROMPT = `You are given plain text extracted from SEC EDGAR filings (HTML tags removed). It may include prioritized MD&A and Risk Factors excerpts plus a 10-Q/10-K body and/or DEF 14A proxy, concatenated with headers.

Tasks:
1) segment_bullets: Extract ONLY factual, quantitative or explicit qualitative statements about segments, product lines (e.g. iPhone, Services), geographies, or operating income by segment IF they appear in the text. Use short bullets (max 25 words each). If none, return [].
2) section_summaries: For each key among business, risk_factors, mdna, segments, governance — write 2–4 sentences summarizing what the excerpt says that is useful to an investor. Use the MD&A and Risk excerpts when present. If that topic is not in the text, use an empty string "".
3) governance_bullets: From proxy-related content only: 3–6 bullets on pay, board, or governance facts stated in the text. If no proxy content, return [].
4) deeper_reading: 4–8 short bullets telling the user what to open next in the full PDF/HTML filing (exhibits, footnotes, compensation tables, segment tables).

Rules: Do not invent numbers or segments. If unsure, omit. Return raw JSON only, no markdown.`;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let company: CompanyPayload;
  try {
    company = await loadCompanyFromIngestion(parsed.data.ticker);
  } catch {
    return NextResponse.json(emptyEnrichment());
  }

  if (company.meta.mock) {
    return NextResponse.json(emptyEnrichment());
  }

  const tenQ = company.filings.find((f) => f.form === "10-Q");
  const tenK = company.filings.find((f) => f.form === "10-K");
  const def14a = company.filings.find((f) => f.form === "DEF 14A");

  const [qBody, kBody] = await Promise.all([
    fetchFilingPlainText(tenQ?.filing_url, MAX_FETCH_10Q),
    fetchFilingPlainText(tenK?.filing_url, MAX_FETCH_10K),
  ]);

  const mdnaSource = qBody || kBody;
  const mdna_excerpt = extractMdnaExcerpt(mdnaSource, 16_000);

  const riskPrimary = kBody || qBody;
  const riskSecondary = kBody && qBody ? qBody : "";
  let risk_factors_excerpt = extractRiskFactorsExcerpt(riskPrimary, 14_000);
  if (riskExcerptNeedsFallback(risk_factors_excerpt) && riskSecondary) {
    const alt = extractRiskFactorsExcerpt(riskSecondary, 14_000);
    if (alt.length > risk_factors_excerpt.length) risk_factors_excerpt = alt;
  }

  const pText = await fetchFilingPlainText(def14a?.filing_url, MAX_PROXY_CHARS);
  const governance_excerpt = extractProxyGovernanceExcerpt(pText, 12_000);

  const chunks: string[] = [];
  if (governance_excerpt) chunks.push("=== Proxy / governance excerpt (prioritized) ===\n" + governance_excerpt);
  if (mdna_excerpt) chunks.push("=== MD&A excerpt (prioritized) ===\n" + mdna_excerpt);
  if (risk_factors_excerpt) chunks.push("=== Risk factors excerpt (prioritized) ===\n" + risk_factors_excerpt);
  if (qBody) chunks.push("=== 10-Q body (truncated) ===\n" + qBody);
  if (kBody) chunks.push("=== 10-K body (truncated) ===\n" + kBody);
  if (pText) chunks.push("=== DEF 14A proxy body (truncated) ===\n" + pText);

  if (!chunks.length) {
    return NextResponse.json(
      mergeEnrichment(emptyEnrichment(), mdna_excerpt, risk_factors_excerpt, governance_excerpt),
    );
  }

  const key = envTrim("ANTHROPIC_API_KEY");
  if (!key) {
    return NextResponse.json(
      mergeEnrichment(emptyEnrichment(), mdna_excerpt, risk_factors_excerpt, governance_excerpt),
    );
  }

  const model = envTrim("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
  const userContent =
    `Company: ${company.name} (${company.ticker})\n\n` + chunks.join("\n\n").slice(0, MAX_USER_CONTENT_CHARS);

  try {
    const res = await fetchAnthropicMessages(
      key,
      {
        model,
        max_tokens: 4096,
        temperature: 0.2,
        system:
          ENRICH_PROMPT +
          ' JSON shape: {"segment_bullets":[],"section_summaries":{"business":"","risk_factors":"","mdna":"","segments":"","governance":""},"governance_bullets":[],"deeper_reading":[]}',
        messages: [{ role: "user", content: userContent }],
      },
      { timeoutMs: 90_000, maxRetries: 5 },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("[workspace-enrich] anthropic", res.status, detail.slice(0, 400));
      return NextResponse.json(
        mergeEnrichment(emptyEnrichment(), mdna_excerpt, risk_factors_excerpt, governance_excerpt),
      );
    }

    const body = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = body.content?.map((c) => c.text).join("\n") ?? "";
    const obj = tryParseJsonObject(text);
    if (!obj) {
      console.error("[workspace-enrich] unparseable model output", text.slice(0, 200));
      return NextResponse.json(
        mergeEnrichment(emptyEnrichment(), mdna_excerpt, risk_factors_excerpt, governance_excerpt),
      );
    }
    return NextResponse.json(
      mergeEnrichment(normalizeEnrichment(obj), mdna_excerpt, risk_factors_excerpt, governance_excerpt),
    );
  } catch (e) {
    console.error("[workspace-enrich]", e);
    return NextResponse.json(
      mergeEnrichment(emptyEnrichment(), mdna_excerpt, risk_factors_excerpt, governance_excerpt),
    );
  }
}

function emptyEnrichment(): WorkspaceAiEnrichment {
  return {
    segment_bullets: [],
    section_summaries: {},
    governance_bullets: [],
    deeper_reading: [],
  };
}

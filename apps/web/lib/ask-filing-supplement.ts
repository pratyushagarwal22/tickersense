import {
  extractMdnaExcerptDeep,
  extractProxyGovernanceExcerpt,
  extractRiskFactorsExcerptDeep,
  wordCount,
} from "@/lib/filing-text-extract";
import { fetchFilingPlainText } from "@/lib/sec-filing-plain-text";
import type { CompanyPayload } from "@/lib/types";

const ASK_FETCH_10K_CHARS = 320_000;
const ASK_FETCH_10Q_CHARS = 200_000;
const ASK_FETCH_PROXY_CHARS = 100_000;
const FETCH_TIMEOUT_MS = 55_000;

export type AskFilingSupplementNeeds = {
  deepRisk: boolean;
  deepMdna: boolean;
  deepProxy: boolean;
  prior10kRisk: boolean;
};

export function inferAskFilingSupplementNeeds(question: string): AskFilingSupplementNeeds {
  const q = question;
  return {
    deepRisk:
      /\b(risk\s*factors?|item\s*1a|1a\b|export\s*control|china|sanction|geopolitic|litigation|regulat\w*|compliance|cyber|subpoena|investigation|supply\s*chain|capacity|constraint|bottleneck|shortage|logistics)\b/i.test(
        q,
      ) || /\b10-?k\b.*\b(risk|disclosure)\b/i.test(q),
    deepMdna:
      /\b(md\s*&\s*a|mda\b|management'?s\s+discussion|item\s*2\b|margin|outlook|guidance|demand|supply\s*chain)\b/i.test(
        q,
      ),
    deepProxy: /\b(proxy|def\s*14a|executive\s+pay|compensation|say-?on-?pay|board\s+of\s+directors)\b/i.test(q),
    prior10kRisk:
      /\b(prior\s+years?|prior[-\s]+year|previous\s+year|last\s+year|yoy|year[-\s]over[-\s]year|vs\.?\s*prior|compared\s+to\s+(the\s+)?prior|earlier\s+10-?k|another\s+10-?k|second\s+10-?k|fy\s*20\d{2}|versus\s+last\s+year)\b/i.test(
        q,
      ) || /\b10-?k\b.*\b10-?k\b/i.test(q),
  };
}

function tenKsNewestFirst(company: CompanyPayload) {
  return company.filings
    .filter((f) => f.form === "10-K" && f.filing_url)
    .sort((a, b) => (a.filed_at < b.filed_at ? 1 : a.filed_at > b.filed_at ? -1 : 0));
}

/**
 * On each TickerChat question, pull additional plain text from SEC when the question needs it.
 * Does not replace the Python ingestion job; it augments the model context for this turn only.
 */
export async function buildAskFilingSupplement(
  company: CompanyPayload,
  question: string,
): Promise<string> {
  if (company.meta.mock) return "";

  const needs = inferAskFilingSupplementNeeds(question);
  if (!needs.deepRisk && !needs.deepMdna && !needs.deepProxy && !needs.prior10kRisk) return "";

  const tenKs = tenKsNewestFirst(company);
  const latestK = tenKs[0];
  const priorK = tenKs[1];

  const tenQ = company.filings.find((f) => f.form === "10-Q");
  const def14a = company.filings.find((f) => f.form === "DEF 14A");

  const chunks: string[] = [];

  const run = async () => {
    if (needs.deepRisk && latestK?.filing_url) {
      const raw = await fetchFilingPlainText(latestK.filing_url, ASK_FETCH_10K_CHARS, {
        timeoutMs: FETCH_TIMEOUT_MS,
      });
      if (raw.length > 500) {
        const risk = extractRiskFactorsExcerptDeep(raw, 55_000);
        if (risk.length > 400 && wordCount(risk) > 120) {
          chunks.push(
            `=== Latest 10-K (filed ${latestK.filed_at}) — Item 1A / risk factors (fetched for this question) ===\n${risk}`,
          );
        }
      }
    }

    if (needs.prior10kRisk && priorK?.filing_url) {
      const rawPrior = await fetchFilingPlainText(priorK.filing_url, ASK_FETCH_10K_CHARS, {
        timeoutMs: FETCH_TIMEOUT_MS,
      });
      if (rawPrior.length > 500) {
        const riskPrior = extractRiskFactorsExcerptDeep(rawPrior, 45_000);
        if (riskPrior.length > 400 && wordCount(riskPrior) > 120) {
          chunks.push(
            `=== Prior 10-K (filed ${priorK.filed_at}) — Item 1A / risk factors (fetched for YoY comparison) ===\n${riskPrior}`,
          );
        }
      }
    }

    if (needs.deepMdna) {
      const qUrl = tenQ?.filing_url;
      const kUrl = latestK?.filing_url;
      const rawQ = qUrl
        ? await fetchFilingPlainText(qUrl, ASK_FETCH_10Q_CHARS, { timeoutMs: FETCH_TIMEOUT_MS })
        : "";
      const rawK =
        !rawQ && kUrl
          ? await fetchFilingPlainText(kUrl, ASK_FETCH_10K_CHARS, { timeoutMs: FETCH_TIMEOUT_MS })
          : "";
      const mdnaRaw = rawQ || rawK;
      if (mdnaRaw.length > 500) {
        const mdna = extractMdnaExcerptDeep(mdnaRaw, 28_000);
        if (mdna.length > 400) {
          const label = rawQ ? `10-Q filed ${tenQ!.filed_at}` : `10-K filed ${latestK!.filed_at}`;
          chunks.push(`=== ${label} — MD&A (fetched for this question) ===\n${mdna}`);
        }
      }
    }

    if (needs.deepProxy && def14a?.filing_url) {
      const rawP = await fetchFilingPlainText(def14a.filing_url, ASK_FETCH_PROXY_CHARS, {
        timeoutMs: FETCH_TIMEOUT_MS,
      });
      if (rawP.length > 500) {
        const gov = extractProxyGovernanceExcerpt(rawP, 22_000);
        if (gov.length > 400) {
          chunks.push(
            `=== DEF 14A (filed ${def14a.filed_at}) — proxy excerpt (fetched for this question) ===\n${gov}`,
          );
        }
      }
    }
  };

  await run();

  const joined = chunks.join("\n\n");
  if (joined.length > 70_000) return `${joined.slice(0, 70_000)}\n…[supplement truncated]`;
  return joined;
}

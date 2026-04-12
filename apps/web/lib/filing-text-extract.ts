/**
 * Extract MD&A, Risk Factors, and proxy regions from SEC filing plain text (HTML already stripped).
 * Heuristic — filing formats vary; used to enrich TickerChat + workspace summaries.
 */

const MDNA_PATTERNS: RegExp[] = [
  /Item\s*2\.{0,2}\s*Management['']s\s+Discussion\s+and\s+Analysis/gi,
  /MANAGEMENT['']S\s+DISCUSSION\s+AND\s+ANALYSIS/gi,
  /Management['']s\s+Discussion\s+and\s+Analysis\s+of\s+Financial\s+Condition/gi,
  /Discussion\s+and\s+Analysis\s+of\s+Financial\s+Condition\s+and\s+Results\s+of\s+Operations/gi,
];

const RISK_PATTERNS: RegExp[] = [
  /Item\s*1A\.{0,2}\s*Risk\s+Factors/gi,
  /Item\s*1\s*A\.{0,2}\s*Risk\s+Factors/gi,
  /RISK\s+FACTORS/gi,
];

const PROXY_PATTERNS: RegExp[] = [
  /COMPENSATION\s+DISCUSSION\s+AND\s+ANALYSIS/gi,
  /Executive\s+Compensation/gi,
  /Summary\s+Compensation\s+Table/gi,
  /Corporate\s+Governance/gi,
  /Proposal\s+One/gi,
  /BOARD\s+OF\s+DIRECTORS/gi,
];

const TOC_LINE_RE = /^item\s*\d/i;

function withGlobal(re: RegExp): RegExp {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return new RegExp(re.source, flags);
}

function sliceFromMatch(text: string, re: RegExp, maxLen: number): string {
  re.lastIndex = 0;
  const m = re.exec(text);
  if (!m || m.index == null) return "";
  const start = m.index;
  return text.slice(start, start + maxLen).trim();
}

function wordCount(s: string): number {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return 0;
  return t.split(" ").length;
}

/** True when a slice looks like a table-of-contents block (many “Item N” lines, little prose). */
export function looksLikeTableOfContents(slice: string): boolean {
  const lines = slice.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 8) return false;
  const head = lines.slice(0, Math.min(50, lines.length));
  let itemish = 0;
  for (const line of head) {
    if (TOC_LINE_RE.test(line) || /^\d+\.\s*item\s/i.test(line)) itemish++;
  }
  if (itemish >= 6) return true;
  if (head.length >= 12 && itemish / head.length >= 0.28) return true;
  const shortLines = head.filter((l) => l.length < 90 && l.split(/\s+/).length < 18).length;
  if (head.length >= 10 && shortLines / head.length > 0.85 && itemish >= 3) return true;
  return false;
}

function offsetsFor(text: string): number[] {
  if (text.length < 22_000) return [0];
  return [0, Math.floor(text.length * 0.05), Math.floor(text.length * 0.1)];
}

function findBestSlice(
  text: string,
  maxLen: number,
  patterns: RegExp[],
  minProseWords: number,
): string {
  let best = "";
  const offs = offsetsFor(text);
  for (const off of offs) {
    const space = text.slice(off);
    for (const re of patterns) {
      const g = withGlobal(re);
      let m: RegExpExecArray | null;
      while ((m = g.exec(space)) !== null) {
        const absStart = off + m.index;
        const slice = text.slice(absStart, absStart + maxLen);
        const head = slice.slice(0, Math.min(4000, slice.length));
        if (looksLikeTableOfContents(head)) continue;
        if (wordCount(slice) < minProseWords) continue;
        if (slice.length > best.length) best = slice;
      }
    }
  }
  if (best.length > 600) return best.trim();

  for (const off of offs) {
    const space = text.slice(off);
    for (const re of patterns) {
      const g = withGlobal(re);
      let m: RegExpExecArray | null;
      while ((m = g.exec(space)) !== null) {
        const absStart = off + m.index;
        const slice = text.slice(absStart, absStart + maxLen);
        const head = slice.slice(0, Math.min(4000, slice.length));
        if (looksLikeTableOfContents(head)) continue;
        if (slice.length > 400 && slice.length > best.length) best = slice;
      }
    }
  }
  if (best.length > 400) return best.trim();

  for (const re of patterns) {
    const s = sliceFromMatch(text, re, maxLen);
    if (s.length > 200) return s.trim();
  }
  return best.trim();
}

export function extractMdnaExcerpt(text: string, maxLen: number): string {
  if (!text.trim()) return "";
  return findBestSlice(text, maxLen, MDNA_PATTERNS, 72);
}

export function extractRiskFactorsExcerpt(text: string, maxLen: number): string {
  if (!text.trim()) return "";
  return findBestSlice(text, maxLen, RISK_PATTERNS, 100);
}

export function extractProxyGovernanceExcerpt(text: string, maxLen: number): string {
  if (!text.trim()) return "";
  let best = "";
  const offs = text.length > 25_000 ? [0, Math.floor(text.length * 0.04), Math.floor(text.length * 0.08)] : [0];
  for (const off of offs) {
    const space = text.slice(off);
    for (const re of PROXY_PATTERNS) {
      const g = withGlobal(re);
      let m: RegExpExecArray | null;
      while ((m = g.exec(space)) !== null) {
        const absStart = off + m.index;
        const slice = text.slice(absStart, absStart + maxLen);
        const head = slice.slice(0, Math.min(2500, slice.length));
        if (looksLikeTableOfContents(head)) continue;
        if (slice.length > best.length) best = slice;
      }
    }
  }
  if (best.length > 400) return best.trim();
  const start = offs[0] ?? 0;
  return text.slice(start, start + Math.min(maxLen, Math.max(0, text.length - start))).trim();
}

/** Fetch SEC EDGAR filing HTML and strip to plain text (shared by workspace-enrich and /api/ask). */

export function stripSecFilingHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSecArchivesUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "www.sec.gov" && u.pathname.startsWith("/Archives/edgar/data/");
  } catch {
    return false;
  }
}

function envTrim(name: string): string | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export async function fetchFilingPlainText(
  url: string | undefined,
  maxChars: number,
  options?: { timeoutMs?: number },
): Promise<string> {
  if (!url || !isSecArchivesUrl(url)) return "";
  const ua =
    envTrim("SEC_USER_AGENT") ??
    envTrim("EDGAR_USER_AGENT") ??
    "TickerSense/1.0 (research tool; contact: support@example.com)";
  const res = await fetch(url, {
    headers: { "user-agent": ua, accept: "text/html,*/*" },
    signal: AbortSignal.timeout(options?.timeoutMs ?? 35_000),
  });
  if (!res.ok) return "";
  const html = await res.text();
  const text = stripSecFilingHtml(html);
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

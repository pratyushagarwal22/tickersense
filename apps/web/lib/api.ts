import type { AskRequestBody, AskResponseBody, CompanyPayload } from "@/lib/types";

export async function fetchCompany(ticker: string): Promise<CompanyPayload> {
  const res = await fetch(`/api/company/${encodeURIComponent(ticker)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load company (${res.status})`);
  }
  return (await res.json()) as CompanyPayload;
}

export async function askTickerChat(body: AskRequestBody): Promise<AskResponseBody> {
  let res: Response;
  try {
    res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      throw new Error(
        "Could not reach the server. If you opened several tickers at once, wait a few seconds and try again.",
      );
    }
    throw new Error(msg || "Request failed");
  }

  let data: AskResponseBody & { error?: string; detail?: string };
  try {
    data = (await res.json()) as AskResponseBody & { error?: string; detail?: string };
  } catch {
    throw new Error(`TickerChat returned an invalid response (${res.status}). Try again.`);
  }

  if (!res.ok) {
    const hint =
      data.detail && /429|rate.?limit/i.test(data.detail)
        ? " The model API may be rate-limited—wait a minute and retry."
        : "";
    throw new Error((data.detail || data.error || `Ask failed (${res.status})`) + hint);
  }
  return data;
}

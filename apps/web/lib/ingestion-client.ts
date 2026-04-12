import { getMockCompany } from "@/lib/mock-data";
import type { CompanyPayload } from "@/lib/types";

export async function loadCompanyFromIngestion(ticker: string): Promise<CompanyPayload> {
  const normalized = ticker.trim().toUpperCase();
  const base = process.env.INGESTION_SERVICE_URL?.replace(/\/$/, "");
  if (!base) {
    return getMockCompany(normalized);
  }

  try {
    const res = await fetch(`${base}/company/${encodeURIComponent(normalized)}`, {
      cache: "no-store",
      headers: { "user-agent": "TickerSenseWeb/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`ingestion status ${res.status}`);
    return (await res.json()) as CompanyPayload;
  } catch {
    return getMockCompany(normalized);
  }
}

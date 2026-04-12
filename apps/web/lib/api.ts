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

export async function askCopilot(body: AskRequestBody): Promise<AskResponseBody> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Ask failed (${res.status})`);
  }
  return (await res.json()) as AskResponseBody;
}

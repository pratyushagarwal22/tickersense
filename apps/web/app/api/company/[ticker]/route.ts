import { loadCompanyFromIngestion } from "@/lib/ingestion-client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker ?? "";
  const payload = await loadCompanyFromIngestion(ticker);
  return NextResponse.json(payload);
}

import { CompanyWorkspace } from "@/components/company/company-workspace";
import { loadCompanyFromIngestion } from "@/lib/ingestion-client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { ticker: string };
}): Promise<Metadata> {
  const raw = params.ticker?.trim().toUpperCase() ?? "";
  if (!raw) return { title: "TickerSense" };
  return {
    title: `${raw} · TickerSense`,
    description: `SEC workspace, filings, and TickerChat for ${raw}.`,
  };
}

export default async function CompanyPage({ params }: { params: { ticker: string } }) {
  const raw = params.ticker?.trim();
  if (!raw) notFound();

  const data = await loadCompanyFromIngestion(raw);

  return <CompanyWorkspace initialData={data} />;
}

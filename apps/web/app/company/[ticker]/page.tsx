import { TickerChatPanel } from "@/components/company/ask-copilot";
import { CompanyHeader } from "@/components/company/company-header";
import { CompanyToolbar } from "@/components/company/company-toolbar";
import { FilingsPanel } from "@/components/company/filings-panel";
import { GovernancePanel } from "@/components/company/governance-panel";
import { InsightCard } from "@/components/company/insight-card";
import { FinancialTrendsChart } from "@/components/company/financial-trends-chart";
import { MarketChart } from "@/components/company/market-chart";
import { MetricsGrid } from "@/components/company/metrics-grid";
import { SectionsPanel } from "@/components/company/sections-panel";
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

  return (
    <main className="space-y-6">
      <CompanyToolbar data={data} />

      <CompanyHeader data={data} />

      <section className="grid gap-4 lg:grid-cols-2">
        {data.insights.map((card) => (
          <InsightCard key={card.category} card={card} />
        ))}
      </section>

      <FilingsPanel data={data} />
      <GovernancePanel data={data} />
      <SectionsPanel data={data} />
      <MetricsGrid data={data} />
      <section className="space-y-4">
        <MarketChart data={data} />
        <FinancialTrendsChart data={data} />
      </section>

      <TickerChatPanel data={data} />
    </main>
  );
}

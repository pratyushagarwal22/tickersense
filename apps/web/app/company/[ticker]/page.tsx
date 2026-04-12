import { AskCopilotPanel } from "@/components/company/ask-copilot";
import { CompanyHeader } from "@/components/company/company-header";
import { CompanyToolbar } from "@/components/company/company-toolbar";
import { FilingsPanel } from "@/components/company/filings-panel";
import { GovernancePanel } from "@/components/company/governance-panel";
import { InsightCard } from "@/components/company/insight-card";
import { MarketChart } from "@/components/company/market-chart";
import { MetricsGrid } from "@/components/company/metrics-grid";
import { RevenueChart } from "@/components/company/revenue-chart";
import { SectionsPanel } from "@/components/company/sections-panel";
import { loadCompanyFromIngestion } from "@/lib/ingestion-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
      <section className="grid gap-4 lg:grid-cols-2">
        <MarketChart data={data} />
        <RevenueChart data={data} />
      </section>

      <AskCopilotPanel data={data} />
    </main>
  );
}

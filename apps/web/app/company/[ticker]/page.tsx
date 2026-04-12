import { AskCopilotPanel } from "@/components/company/ask-copilot";
import { CompanyHeader } from "@/components/company/company-header";
import { FilingsPanel } from "@/components/company/filings-panel";
import { GovernancePanel } from "@/components/company/governance-panel";
import { InsightCard } from "@/components/company/insight-card";
import { MarketChart } from "@/components/company/market-chart";
import { MetricsGrid } from "@/components/company/metrics-grid";
import { SectionsPanel } from "@/components/company/sections-panel";
import { loadCompanyFromIngestion } from "@/lib/ingestion-client";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: { ticker: string } }) {
  const raw = params.ticker?.trim();
  if (!raw) notFound();

  const data = await loadCompanyFromIngestion(raw);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
          ← Back
        </Link>
      </div>

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
      <MarketChart data={data} />

      <AskCopilotPanel data={data} />
    </main>
  );
}

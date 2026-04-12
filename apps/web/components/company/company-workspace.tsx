"use client";

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
import { WorkspacePrimerCard } from "@/components/company/workspace-primer-card";
import type { CompanyPayload, WorkspaceAiEnrichment } from "@/lib/types";
import { useEffect, useState } from "react";

export function CompanyWorkspace({ initialData }: { initialData: CompanyPayload }) {
  const [data, setData] = useState<CompanyPayload>(initialData);
  const [enrichStatus, setEnrichStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (initialData.meta.mock) {
      setEnrichStatus("done");
      return;
    }
    const ac = new AbortController();
    const hardStop = { id: undefined as number | undefined };
    setEnrichStatus("loading");
    const t = window.setTimeout(() => {
      hardStop.id = window.setTimeout(() => ac.abort(), 150_000);
      fetch("/api/workspace-enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker: initialData.ticker }),
        signal: ac.signal,
      })
        .then(async (r) => {
          if (!r.ok) return null;
          return (await r.json()) as WorkspaceAiEnrichment;
        })
        .then((ai) => {
          if (ac.signal.aborted) return;
          if (ai) {
            setData((d) => ({ ...d, workspace_ai: ai }));
          }
          setEnrichStatus("done");
        })
        .catch(() => {
          if (!ac.signal.aborted) setEnrichStatus("error");
        })
        .finally(() => {
          if (hardStop.id != null) {
            window.clearTimeout(hardStop.id);
            hardStop.id = undefined;
          }
        });
    }, 450);
    return () => {
      window.clearTimeout(t);
      if (hardStop.id != null) window.clearTimeout(hardStop.id);
      ac.abort();
    };
  }, [initialData.ticker, initialData.meta.mock]);

  return (
    <main className="space-y-6">
      <CompanyToolbar data={data} />

      <CompanyHeader data={data} />

      {enrichStatus === "loading" ? (
        <p className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-900">
          Summarizing latest SEC filing text for segment notes, filing guides, and governance (may take up to a minute)…
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {data.insights.map((card) => (
          <InsightCard key={card.category} card={card} />
        ))}
        <WorkspacePrimerCard />
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

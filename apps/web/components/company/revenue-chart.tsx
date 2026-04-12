"use client";

import type { CompanyPayload } from "@/lib/types";
import { formatCompactUsd, formatDate } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueChart({ data }: { data: CompanyPayload }) {
  const series = data.revenue_series ?? [];
  const chartData = series.map((p) => ({
    period: formatDate(p.period_end),
    value: p.value_usd,
    rawEnd: p.period_end,
  }));

  const title = data.meta.mock ? "Revenue (demo series)" : "Revenue (SEC company facts)";
  const subtitle =
    series.length < 2
      ? "Need at least two reported periods to chart revenue. Try live ingestion with SEC company facts, or use demo tickers in mock mode."
      : data.meta.mock
        ? "Synthetic quarterly points for UI preview when ingestion is off."
        : "Values from revenue-related XBRL tags (USD), by period end date.";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>

      {chartData.length >= 2 ? (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-35} textAnchor="end" height={56} />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatCompactUsd(Number(v))}
              />
              <Tooltip
                formatter={(v) => [formatCompactUsd(Number(v)), "Revenue"]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { rawEnd?: string } | undefined;
                  return p?.rawEnd ? `Period end ${formatDate(p.rawEnd)}` : "";
                }}
                labelClassName="text-xs"
              />
              <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Not enough revenue history to plot.</p>
      )}
    </div>
  );
}

"use client";

import {
  applySharedFinancialWindow,
  buildFinancialTrendRows,
  periodEndToMs,
  type FinancialTrendRow,
} from "@/lib/financial-trends";
import type { CompanyPayload } from "@/lib/types";
import { formatCompactUsd, formatDate } from "@/lib/format";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TREND_YEARS = 5;

type Row = FinancialTrendRow & { t: number };

export function FinancialTrendsChart({ data }: { data: CompanyPayload }) {
  const chartData = useMemo(() => {
    const { revenue, netIncome, opex } = applySharedFinancialWindow(
      data.revenue_series ?? [],
      data.net_income_series ?? [],
      data.operating_expenses_series ?? [],
      TREND_YEARS,
    );
    const rows = buildFinancialTrendRows(revenue, netIncome, opex, (iso) => formatDate(iso));
    const out: Row[] = [];
    for (const r of rows) {
      const t = periodEndToMs(r.period_end);
      if (t == null) continue;
      out.push({ ...r, t });
    }
    return out.sort((a, b) => a.t - b.t);
  }, [data.revenue_series, data.net_income_series, data.operating_expenses_series]);

  const hasAny = chartData.some(
    (r) => r.revenue != null || r.netIncome != null || r.opex != null,
  );
  const hasMultiMetric = useMemo(
    () =>
      [data.net_income_series?.length ?? 0, data.operating_expenses_series?.length ?? 0].some((n) => n > 0),
    [data.net_income_series, data.operating_expenses_series],
  );

  /** One tick per distinct period so the x-axis shows the full date range (Recharts otherwise hides many). */
  const xTicks = useMemo(
    () => Array.from(new Set(chartData.map((r) => r.t))).sort((a, b) => a - b),
    [chartData],
  );

  const yDomain = useMemo((): [number, number] | undefined => {
    const vals: number[] = [];
    chartData.forEach((r) => {
      if (r.revenue != null && Number.isFinite(r.revenue)) vals.push(r.revenue);
      if (r.netIncome != null && Number.isFinite(r.netIncome)) vals.push(r.netIncome);
      if (r.opex != null && Number.isFinite(r.opex)) vals.push(r.opex);
    });
    if (vals.length < 1) return undefined;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || Math.abs(hi) || 1;
    const pad = Math.max(span * 0.14, Math.abs(hi) * 0.03, 1e6);
    return [lo - pad, hi + pad];
  }, [chartData]);

  const title = data.meta.mock ? "Financial Trends (demo)" : "Financial Trends (SEC company facts)";
  const subtitle = data.meta.mock
    ? "Synthetic quarterly series for UI preview."
    : hasMultiMetric
      ? `Last ${TREND_YEARS} years (from latest period). Time axis is proportional—wide gaps mean no tagged value for that quarter in company facts yet. Revenue, net income, and operating expenses when tagged.`
      : `Last ${TREND_YEARS} years of revenue. Time axis is proportional; gaps reflect missing periods in SEC data.`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>

      {hasAny && chartData.length >= 2 ? (
        <div className="mt-4 h-80 w-full min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 12, top: 16, bottom: 72 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xTicks}
                interval={0}
                minTickGap={0}
                tickFormatter={(v) => {
                  const d = new Date(Number(v));
                  return Number.isNaN(d.getTime()) ? "" : formatDate(d.toISOString().slice(0, 10));
                }}
                tick={{ fontSize: 9 }}
                stroke="#94a3b8"
                angle={-42}
                textAnchor="end"
                height={68}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
                domain={yDomain ?? ["auto", "auto"]}
                tickFormatter={(v) => formatCompactUsd(Number(v))}
              />
              <Tooltip
                formatter={(v, name) => [
                  v != null && v !== "" ? formatCompactUsd(Number(v)) : "—",
                  String(name),
                ]}
                labelFormatter={(_, p) => {
                  const row = p?.[0]?.payload as Row | undefined;
                  return row?.period_end ? `Period end ${formatDate(row.period_end)}` : "";
                }}
                labelClassName="text-xs"
              />
              <Legend
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 12, width: "100%", paddingTop: 12 }}
                iconType="plainline"
                iconSize={12}
              />
              {chartData.some((r) => r.revenue != null) ? (
                <Line
                  type="linear"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ) : null}
              {chartData.some((r) => r.netIncome != null) ? (
                <Line
                  type="linear"
                  dataKey="netIncome"
                  name="Net income"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ) : null}
              {chartData.some((r) => r.opex != null) ? (
                <Line
                  type="linear"
                  dataKey="opex"
                  name="Operating expenses"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Not enough SEC history to plot trends.</p>
      )}
    </div>
  );
}

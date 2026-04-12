"use client";

import type { CompanyPayload } from "@/lib/types";
import { formatCompactUsd } from "@/lib/format";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function MarketChart({ data }: { data: CompanyPayload }) {
  const chartData = data.price_history.map((p) => ({
    date: p.date,
    close: p.close,
  }));

  const title = data.meta.mock
    ? "Share price (demo data)"
    : data.meta.market_available
      ? "Share price"
      : "Share price (limited market data)";
  const subtitle = data.meta.mock
    ? "Synthetic series for UI demo when market data is unavailable."
    : data.meta.market_available
      ? "Daily closes from market data (context only—not a trading view)."
      : "Fallback series shown because live history could not be loaded.";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              domain={["auto", "auto"]}
              tickFormatter={(v) => formatCompactUsd(Number(v))}
            />
            <Tooltip
              formatter={(v) => [formatCompactUsd(Number(v)), "Close"]}
              labelClassName="text-xs"
            />
            <Line type="monotone" dataKey="close" stroke="#315cff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

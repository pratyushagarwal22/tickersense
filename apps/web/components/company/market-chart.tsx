"use client";

import type { CompanyPayload } from "@/lib/types";
import { formatCompactUsd, formatDate } from "@/lib/format";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type IdxRow = {
  date: string;
  stockIdx: number;
  benchIdx: number | null;
  stock: number;
  bench: number | null;
};

export function MarketChart({ data }: { data: CompanyPayload }) {
  const benchLabel = data.benchmark_label ?? "S&P 500";

  const { chartData, hasBench, mode } = useMemo(() => {
    const ph = data.price_history ?? [];
    const bh = data.benchmark_history ?? [];
    const benchByDate = new Map(bh.map((b) => [b.date, b.close]));
    const merged = ph.map((p) => ({
      date: p.date,
      stock: typeof p.close === "number" ? p.close : NaN,
      bench: benchByDate.get(p.date) ?? null,
    }));

    const firstBoth = merged.findIndex(
      (m) => Number.isFinite(m.stock) && m.bench != null && Number.isFinite(m.bench),
    );
    if (firstBoth >= 0) {
      const s0 = merged[firstBoth]!.stock;
      const b0 = merged[firstBoth]!.bench!;
      const rows: IdxRow[] = merged
        .filter((m) => Number.isFinite(m.stock))
        .map((m) => ({
          date: m.date,
          stock: m.stock,
          bench: m.bench,
          stockIdx: (m.stock / s0) * 100,
          benchIdx:
            m.bench != null && Number.isFinite(m.bench) ? (m.bench / b0) * 100 : null,
        }));
      return { chartData: rows, hasBench: true, mode: "indexed" as const };
    }

    const rows = merged
      .filter((m) => Number.isFinite(m.stock))
      .map((m) => ({
        date: m.date,
        stock: m.stock,
        bench: null as number | null,
        stockIdx: m.stock,
        benchIdx: null as number | null,
      }));
    return { chartData: rows, hasBench: false, mode: "price" as const };
  }, [data.price_history, data.benchmark_history]);

  const minMax = useMemo(() => {
    if (chartData.length < 2) return null;
    let minI = 0;
    let maxI = 0;
    chartData.forEach((p, i) => {
      const v = p.stockIdx;
      if (v < chartData[minI]!.stockIdx) minI = i;
      if (v > chartData[maxI]!.stockIdx) maxI = i;
    });
    return { min: chartData[minI]!, max: chartData[maxI]! };
  }, [chartData]);

  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length < 2) return undefined;
    const vals: number[] = [];
    chartData.forEach((p) => {
      vals.push(p.stockIdx);
      if (p.benchIdx != null) vals.push(p.benchIdx);
    });
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || 1;
    // Extra headroom so indexed min/max labels and the S&P 500 line are not clipped at the plot edge.
    const pad = Math.max(span * 0.22, mode === "indexed" ? 18 : 4);
    return [lo - pad, hi + pad];
  }, [chartData, mode]);

  /** Show every trading day when the series is short; sample ~24 ticks when very long so labels stay legible. */
  const dateTicks = useMemo(() => {
    const dates = chartData.map((p) => p.date);
    if (dates.length <= 40) return dates;
    const out: string[] = [];
    const step = Math.max(1, Math.ceil(dates.length / 24));
    for (let i = 0; i < dates.length; i += step) out.push(dates[i]!);
    if (out[out.length - 1] !== dates[dates.length - 1]) out.push(dates[dates.length - 1]!);
    return out;
  }, [chartData]);

  const title = data.meta.mock
    ? "Price Trends (demo data)"
    : data.meta.market_available
      ? "Price Trends"
      : "Price Trends (limited market data)";
  const subtitle = data.meta.mock
    ? "Synthetic series for UI demo when market data is unavailable."
    : hasBench && mode === "indexed"
      ? `Daily closes over ~5 years, indexed to 100 at the first session both this stock and ${benchLabel} have data (apples-to-apples comparison).`
      : data.meta.market_available
        ? "Daily closes from market data (~5 years when available). Context only—not a trading view."
        : "Fallback series shown because live history could not be loaded.";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4 h-[28rem] w-full min-h-[448px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 4, right: 16, top: 52, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              ticks={dateTicks}
              interval={0}
              minTickGap={0}
              tickFormatter={(d) => formatDate(String(d))}
              tick={{ fontSize: 9 }}
              stroke="#94a3b8"
              angle={-38}
              textAnchor="end"
              height={56}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#94a3b8"
              domain={yDomain ?? ["auto", "auto"]}
              tickFormatter={(v) =>
                mode === "indexed" ? `${Number(v).toFixed(0)}` : formatCompactUsd(Number(v))
              }
              label={
                mode === "indexed"
                  ? { value: "Indexed (start = 100)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }
                  : undefined
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as IdxRow | undefined;
                if (!row) return null;
                const dateStr = formatDate(String(label));
                return (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-slate-900">{dateStr}</p>
                    {mode === "indexed" ? (
                      <div className="mt-2 space-y-1.5 text-slate-700">
                        <p>
                          <span className="font-medium text-[#315cff]">{data.ticker}</span>
                          {": "}
                          {formatCompactUsd(row.stock)}
                          <span className="text-slate-500">
                            {" "}
                            · indexed {row.stockIdx.toFixed(1)} (vs start = 100)
                          </span>
                        </p>
                        {row.bench != null && row.benchIdx != null ? (
                          <p>
                            <span className="font-medium text-slate-600">{benchLabel}</span>
                            {": "}
                            {formatCompactUsd(row.bench)}
                            <span className="text-slate-500">
                              {" "}
                              · indexed {row.benchIdx.toFixed(1)} (vs start = 100)
                            </span>
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-1 text-slate-700">{formatCompactUsd(row.stock)}</p>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: 12, width: "100%", paddingTop: 8 }}
              iconType="plainline"
            />
            <Line
              type="monotone"
              dataKey="stockIdx"
              name={data.ticker}
              stroke="#315cff"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            {hasBench ? (
              <Line
                type="monotone"
                dataKey="benchIdx"
                name={benchLabel}
                stroke="#64748b"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ) : null}
            {minMax && mode === "indexed" ? (
              <>
                <ReferenceDot
                  x={minMax.min.date}
                  y={minMax.min.stockIdx}
                  r={5}
                  fill="#315cff"
                  stroke="#ffffff"
                  strokeWidth={1}
                  label={{
                    value: `${minMax.min.stockIdx.toFixed(1)}`,
                    position: "bottom",
                    offset: 14,
                    fontSize: 11,
                    fill: "#475569",
                    fontWeight: 600,
                  }}
                />
                <ReferenceDot
                  x={minMax.max.date}
                  y={minMax.max.stockIdx}
                  r={5}
                  fill="#315cff"
                  stroke="#ffffff"
                  strokeWidth={1}
                  label={{
                    value: `${minMax.max.stockIdx.toFixed(1)}`,
                    position: "top",
                    offset: 14,
                    fontSize: 11,
                    fill: "#475569",
                    fontWeight: 600,
                  }}
                />
              </>
            ) : null}
            {minMax && mode === "price" ? (
              <>
                <ReferenceDot
                  x={minMax.min.date}
                  y={minMax.min.stockIdx}
                  r={5}
                  fill="#315cff"
                  stroke="#ffffff"
                  strokeWidth={1}
                  label={{
                    value: formatCompactUsd(minMax.min.stock),
                    position: "bottom",
                    offset: 14,
                    fontSize: 11,
                    fill: "#475569",
                    fontWeight: 600,
                  }}
                />
                <ReferenceDot
                  x={minMax.max.date}
                  y={minMax.max.stockIdx}
                  r={5}
                  fill="#315cff"
                  stroke="#ffffff"
                  strokeWidth={1}
                  label={{
                    value: formatCompactUsd(minMax.max.stock),
                    position: "top",
                    offset: 14,
                    fontSize: 11,
                    fill: "#475569",
                    fontWeight: 600,
                  }}
                />
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

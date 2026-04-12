import type { MetricPoint } from "@/lib/types";

/** Normalize SEC period strings so the same day merges across tags (YYYY-MM-DD). */
export function normalizePeriodEnd(iso: string): string {
  const t = iso.trim();
  return t.length >= 10 ? t.slice(0, 10) : t;
}

function latestPeriodEnd(points: MetricPoint[]): string | null {
  if (!points.length) return null;
  const sorted = [...points]
    .map((p) => ({ ...p, period_end: normalizePeriodEnd(p.period_end) }))
    .sort((a, b) => a.period_end.localeCompare(b.period_end));
  return sorted[sorted.length - 1]?.period_end ?? null;
}

function subtractYearsFromDay(isoDay: string, years: number): string {
  const d = new Date(isoDay.includes("T") ? isoDay : `${isoDay}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay.slice(0, 10);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function dedupeByPeriod(points: MetricPoint[]): MetricPoint[] {
  const byEnd = new Map<string, MetricPoint>();
  for (const p of points) {
    byEnd.set(p.period_end, p);
  }
  return Array.from(byEnd.values()).sort((a, b) => a.period_end.localeCompare(b.period_end));
}

/**
 * One rolling window for all series: anchor = latest of **revenue** or **net income** (not opex alone).
 * Prevents stale opex (e.g. ending in 2010) from pulling the window back to 2005 while revenue is 2025.
 */
export function applySharedFinancialWindow(
  revenue: MetricPoint[],
  netIncome: MetricPoint[],
  opex: MetricPoint[],
  years: number,
): { revenue: MetricPoint[]; netIncome: MetricPoint[]; opex: MetricPoint[] } {
  const rLatest = latestPeriodEnd(revenue);
  const niLatest = latestPeriodEnd(netIncome);
  const oxLatest = latestPeriodEnd(opex);

  let anchor: string | null = null;
  if (rLatest || niLatest) {
    const candidates = [rLatest, niLatest].filter((x): x is string => Boolean(x));
    const sortedC = candidates.sort((a, b) => a.localeCompare(b));
    anchor = sortedC.length ? sortedC[sortedC.length - 1]! : null;
  } else {
    anchor = oxLatest;
  }

  if (!anchor || years <= 0) {
    return { revenue: [], netIncome: [], opex: [] };
  }

  const cutoff = subtractYearsFromDay(anchor, years);

  const inWindow = (p: MetricPoint) => {
    const d = normalizePeriodEnd(p.period_end);
    return d >= cutoff && d <= anchor;
  };

  return {
    revenue: dedupeByPeriod(revenue.map((p) => ({ ...p, period_end: normalizePeriodEnd(p.period_end) })).filter(inWindow)),
    netIncome: dedupeByPeriod(
      netIncome.map((p) => ({ ...p, period_end: normalizePeriodEnd(p.period_end) })).filter(inWindow),
    ),
    opex: dedupeByPeriod(opex.map((p) => ({ ...p, period_end: normalizePeriodEnd(p.period_end) })).filter(inWindow)),
  };
}

/** Per-series window (legacy). Prefer `applySharedFinancialWindow` for charts. */
export function filterMetricPointsLastYears(points: MetricPoint[], years: number): MetricPoint[] {
  if (!points.length || years <= 0) return points;
  const normalized = points.map((p) => ({
    ...p,
    period_end: normalizePeriodEnd(p.period_end),
  }));
  const sorted = [...normalized].sort((a, b) => a.period_end.localeCompare(b.period_end));
  const last = sorted[sorted.length - 1]?.period_end;
  if (!last) return points;
  const latest = new Date(last.includes("T") ? last : `${last}T12:00:00Z`);
  if (Number.isNaN(latest.getTime())) return points;
  const cutoff = new Date(latest);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const filtered = sorted.filter((p) => {
    const d = new Date(p.period_end.includes("T") ? p.period_end : `${p.period_end}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  });
  const byEnd = new Map<string, MetricPoint>();
  for (const p of filtered) {
    byEnd.set(p.period_end, p);
  }
  return Array.from(byEnd.values()).sort((a, b) => a.period_end.localeCompare(b.period_end));
}

export type FinancialTrendRow = {
  period_end: string;
  label: string;
  revenue: number | null;
  netIncome: number | null;
  opex: number | null;
};

/** Milliseconds for chart X-axis (time scale). */
export function periodEndToMs(iso: string): number | null {
  const day = normalizePeriodEnd(iso);
  const d = new Date(day.includes("T") ? day : `${day}T12:00:00Z`);
  const n = d.getTime();
  return Number.isNaN(n) ? null : n;
}

/** Align revenue, net income, and opex by `period_end` for multi-series charts. */
export function buildFinancialTrendRows(
  revenue: MetricPoint[],
  netIncome: MetricPoint[] | undefined,
  opex: MetricPoint[] | undefined,
  formatLabel: (iso: string) => string,
): FinancialTrendRow[] {
  const keys = new Set<string>();
  for (const x of revenue) keys.add(normalizePeriodEnd(x.period_end));
  for (const x of netIncome ?? []) keys.add(normalizePeriodEnd(x.period_end));
  for (const x of opex ?? []) keys.add(normalizePeriodEnd(x.period_end));
  const sorted = Array.from(keys).sort((a, b) => a.localeCompare(b));
  const rm = new Map(revenue.map((r) => [normalizePeriodEnd(r.period_end), r.value_usd]));
  const nm = new Map((netIncome ?? []).map((r) => [normalizePeriodEnd(r.period_end), r.value_usd]));
  const om = new Map((opex ?? []).map((r) => [normalizePeriodEnd(r.period_end), r.value_usd]));
  return sorted.map((period_end) => ({
    period_end,
    label: formatLabel(period_end),
    revenue: rm.get(period_end) ?? null,
    netIncome: nm.get(period_end) ?? null,
    opex: om.get(period_end) ?? null,
  }));
}

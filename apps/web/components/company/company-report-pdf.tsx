import type { TickerChatTurn } from "@/lib/chat-storage";
import {
  applySharedFinancialWindow,
  buildFinancialTrendRows,
  periodEndToMs,
  type FinancialTrendRow,
} from "@/lib/financial-trends";
import { formatCompactUsd, formatDate } from "@/lib/format";
import type { CompanyPayload, FilingItem } from "@/lib/types";
import { Document, Link, Page, Polyline, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

const PDF_TREND_YEARS = 5;

/** One continuous polyline per series (sorted by time) — avoids fragmented “broken” segments in the PDF. */
function FinancialTrendsPdfChart({ data }: { data: CompanyPayload }) {
  const { revenue, netIncome, opex } = applySharedFinancialWindow(
    data.revenue_series ?? [],
    data.net_income_series ?? [],
    data.operating_expenses_series ?? [],
    PDF_TREND_YEARS,
  );
  const rows = buildFinancialTrendRows(revenue, netIncome, opex, (iso) => iso);
  const withT: Array<FinancialTrendRow & { t: number }> = [];
  for (const r of rows) {
    const t = periodEndToMs(r.period_end);
    if (t == null) continue;
    withT.push({ ...r, t });
  }
  withT.sort((a, b) => a.t - b.t);
  if (withT.length < 2) {
    return <Text style={styles.emptyState}>Not enough SEC history to plot trends.</Text>;
  }
  const ts = withT.map((r) => r.t);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const tSpan = tMax - tMin || 1;
  const vals: number[] = [];
  for (const r of withT) {
    if (r.revenue != null) vals.push(r.revenue);
    if (r.netIncome != null) vals.push(r.netIncome);
    if (r.opex != null) vals.push(r.opex);
  }
  if (!vals.length) {
    return <Text style={styles.emptyState}>No numeric series in range.</Text>;
  }
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const rawSpan = rawMax - rawMin || 1;
  const yPad = Math.max(rawSpan * 0.1, Math.abs(rawMax) * 0.03);
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;
  const ySpan = yMax - yMin || 1;
  const yAxisW = 36;
  const plotW = 520 - yAxisW;
  const plotH = 152;
  const plotPad = 4;
  const plotInnerH = plotH - plotPad * 2;
  const xOf = (t: number) => ((t - tMin) / tSpan) * (plotW - 1);
  const yOf = (v: number) => plotPad + plotInnerH * (1 - (v - yMin) / ySpan);
  const toPair = (t: number, v: number) => {
    const x = xOf(t);
    const y = yOf(v);
    return `${x},${y}`;
  };
  const yTickVals = Array.from({ length: 5 }, (_, i) => yMin + (ySpan * i) / 4);
  const seriesList: { color: string; label: string; points: { t: number; v: number }[] }[] = [];
  const pushSeries = (color: string, label: string, get: (r: FinancialTrendRow & { t: number }) => number | null) => {
    const pts = withT
      .map((r) => {
        const v = get(r);
        return v == null ? null : { t: r.t, v };
      })
      .filter((p): p is { t: number; v: number } => p != null)
      .sort((a, b) => a.t - b.t);
    if (pts.length >= 2) seriesList.push({ color, label, points: pts });
  };
  pushSeries(C.teal, "Revenue", (r) => r.revenue);
  pushSeries(C.brand600, "Net income", (r) => r.netIncome);
  pushSeries("#ea580c", "Operating expenses", (r) => r.opex);

  if (!seriesList.length) {
    return <Text style={styles.emptyState}>Not enough points to draw trend lines.</Text>;
  }

  const uniquePeriods = Array.from(new Set(withT.map((r) => r.period_end))).sort();
  const periodStart = uniquePeriods[0] ?? "";
  const periodEnd = uniquePeriods[uniquePeriods.length - 1] ?? "";
  const xTickPeriods = (() => {
    if (uniquePeriods.length <= 10) return uniquePeriods;
    const out: string[] = [];
    const step = Math.max(1, Math.ceil(uniquePeriods.length / 8));
    for (let i = 0; i < uniquePeriods.length; i += step) out.push(uniquePeriods[i]!);
    if (out[out.length - 1] !== uniquePeriods[uniquePeriods.length - 1]) {
      out.push(uniquePeriods[uniquePeriods.length - 1]!);
    }
    return out;
  })();

  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ fontSize: 8, color: C.slate700, marginBottom: 4 }}>
        Date range: {formatDate(periodStart)} — {formatDate(periodEnd)} ({uniquePeriods.length} period
        {uniquePeriods.length === 1 ? "" : "s"})
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: yAxisW,
            height: plotH,
            paddingTop: 2,
            paddingBottom: 2,
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingRight: 4,
          }}
        >
          {[...yTickVals].reverse().map((v, i) => (
            <Text key={`y-${i}`} style={{ fontSize: 6, color: C.slate600 }}>
              {formatCompactUsd(v)}
            </Text>
          ))}
        </View>
        <View>
          <Svg width={plotW} height={plotH}>
            {seriesList.map((s) => (
              <Polyline
                key={s.label}
                points={s.points.map((p) => toPair(p.t, p.v)).join(" ")}
                stroke={s.color}
                strokeWidth={1.6}
                fill="none"
              />
            ))}
            <Polyline
              points={`0,${plotH - 0.5} ${plotW - 1},${plotH - 0.5}`}
              stroke={C.slate500}
              strokeWidth={0.7}
            />
            <Polyline
              points={`0.5,0 0.5,${plotH - 1}`}
              stroke={C.slate500}
              strokeWidth={0.7}
            />
          </Svg>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: plotW,
              marginTop: 4,
              paddingLeft: 2,
              paddingRight: 2,
            }}
          >
            {xTickPeriods.map((pe) => (
              <Text key={pe} style={{ fontSize: 5.5, color: C.slate600, maxWidth: plotW / 5 }}>
                {formatDate(pe)}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 8,
          width: "100%",
        }}
      >
        {seriesList.map((s) => (
          <Text key={s.label} style={{ fontSize: 7.5, color: s.color, marginHorizontal: 8, fontWeight: "bold" }}>
            {s.label}
          </Text>
        ))}
      </View>
      <Text style={{ fontSize: 7, color: C.slate500, marginTop: 6 }}>
        Same last-{PDF_TREND_YEARS}-year window as the site; one USD scale for all lines. Axes: USD (left), period end
        (below).
      </Text>
    </View>
  );
}

/** Matches web: slate borders, brand blue accents, dark filing badges */
const C = {
  pageBg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate100: "#f1f5f9",
  brand700: "#1d4ed8",
  brand600: "#2563eb",
  teal: "#0d9488",
};

const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    backgroundColor: C.pageBg,
    color: C.slate800,
  },
  wordmark: { fontSize: 8, fontWeight: "bold", color: C.brand600, letterSpacing: 0.5, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "bold", color: C.slate900, marginBottom: 6 },
  subtitle: { fontSize: 8.5, color: C.slate600, marginBottom: 16, lineHeight: 1.45 },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 12, fontWeight: "bold", color: C.slate900, marginBottom: 4 },
  cardDesc: { fontSize: 8, color: C.slate600, marginBottom: 10, lineHeight: 1.45 },
  sectionLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  labelCol: { width: "32%", color: C.slate600, fontSize: 8 },
  valueCol: { width: "68%", color: C.slate900, fontSize: 9 },
  block: { marginBottom: 6, lineHeight: 1.55, fontSize: 9, color: C.slate800 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  badge: {
    backgroundColor: C.slate900,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: { color: "#ffffff", fontSize: 8, fontWeight: "bold" },
  mono: { fontSize: 7.5, color: C.slate500, fontFamily: "Courier" },
  emptyState: {
    padding: 10,
    backgroundColor: C.slate100,
    borderRadius: 8,
    fontSize: 8,
    color: C.slate600,
  },
  chatUser: {
    backgroundColor: C.slate100,
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  chatAsst: {
    backgroundColor: C.card,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
});

const btn = StyleSheet.create({
  outline: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#ffffff",
    marginRight: 6,
    marginBottom: 4,
  },
  outlineText: { fontSize: 8, fontWeight: "bold", color: C.brand700 },
  primary: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: C.slate900,
    marginRight: 6,
    marginBottom: 4,
  },
  primaryText: { fontSize: 8, fontWeight: "bold", color: "#ffffff" },
  ghost: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#ffffff",
    marginRight: 6,
    marginBottom: 4,
  },
  ghostText: { fontSize: 8, fontWeight: "bold", color: C.slate800 },
  resume: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: C.brand600,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  resumeText: { fontSize: 9, fontWeight: "bold", color: "#ffffff" },
  sourcePill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.slate100,
    marginRight: 4,
    marginBottom: 3,
  },
  sourcePillText: { fontSize: 7.5, color: C.brand700, fontWeight: "bold" },
});

function LinkButton({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "outline" | "primary" | "ghost";
}) {
  if (variant === "primary") {
    return (
      <Link src={href} style={btn.primary}>
        <Text style={btn.primaryText}>{label}</Text>
      </Link>
    );
  }
  if (variant === "ghost") {
    return (
      <Link src={href} style={btn.ghost}>
        <Text style={btn.ghostText}>{label}</Text>
      </Link>
    );
  }
  return (
    <Link src={href} style={btn.outline}>
      <Text style={btn.outlineText}>{label}</Text>
    </Link>
  );
}

function FilingActions({ f }: { f: FilingItem }) {
  const indexDiffers = f.filing_index_url && f.filing_index_url !== f.filing_url;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
      {f.filing_url ? <LinkButton href={f.filing_url} label="Primary link" variant="outline" /> : null}
      {f.sec_viewer_url ? <LinkButton href={f.sec_viewer_url} label="SEC viewer" variant="primary" /> : null}
      {indexDiffers && f.filing_index_url ? (
        <LinkButton href={f.filing_index_url} label="Filing index" variant="ghost" />
      ) : null}
    </View>
  );
}

type PdfPriceModel =
  | {
      mode: "indexed";
      dates: string[];
      stockIdx: number[];
      benchIdx: (number | null)[];
      benchLabel: string;
    }
  | {
      mode: "price";
      dates: string[];
      close: number[];
    };

function buildPdfPriceModel(data: CompanyPayload): PdfPriceModel | null {
  const ph = (data.price_history ?? [])
    .slice(-220)
    .filter((p): p is { date: string; close: number } => typeof p.close === "number");
  if (ph.length < 2) return null;
  const benchByDate = new Map(
    (data.benchmark_history ?? []).map((b) => [b.date, typeof b.close === "number" ? b.close : null]),
  );
  const merged = ph.map((p) => ({
    date: p.date,
    stock: p.close,
    bench: benchByDate.get(p.date) ?? null,
  }));
  const firstBoth = merged.findIndex(
    (m) => Number.isFinite(m.stock) && m.bench != null && Number.isFinite(m.bench as number),
  );
  const benchLabel = data.benchmark_label ?? "S&P 500";
  if (firstBoth < 0) {
    return {
      mode: "price",
      dates: merged.map((m) => m.date),
      close: merged.map((m) => m.stock),
    };
  }
  const s0 = merged[firstBoth]!.stock;
  const b0 = merged[firstBoth]!.bench as number;
  const dates: string[] = [];
  const stockIdx: number[] = [];
  const benchIdx: (number | null)[] = [];
  for (const m of merged) {
    if (!Number.isFinite(m.stock)) continue;
    dates.push(m.date);
    stockIdx.push((m.stock / s0) * 100);
    benchIdx.push(
      m.bench != null && Number.isFinite(m.bench) ? ((m.bench as number) / b0) * 100 : null,
    );
  }
  return { mode: "indexed", dates, stockIdx, benchIdx, benchLabel };
}

function PriceSparkline({ data }: { data: CompanyPayload }) {
  const model = buildPdfPriceModel(data);
  if (!model) return null;

  const yAxisW = 36;
  const plotW = 520 - yAxisW;
  const plotH = 158;
  const plotPad = 6;
  const plotInnerH = plotH - plotPad * 2;
  const n = model.mode === "indexed" ? model.dates.length : model.dates.length;

  let minV: number;
  let maxV: number;
  let fmtY: (v: number) => string;
  let stockPts: string;
  let benchPtSegments: string[] = [];
  let lowLabel: string;
  let highLabel: string;

  if (model.mode === "indexed") {
    const vals: number[] = [...model.stockIdx];
    model.benchIdx.forEach((b) => {
      if (b != null && Number.isFinite(b)) vals.push(b);
    });
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = rawMax - rawMin || 1;
    const pad = Math.max(span * 0.2, 14);
    minV = rawMin - pad;
    maxV = rawMax + pad;
    fmtY = (v) => `${Math.round(v)}`;
    const rng = maxV - minV || 1;
    const xOf = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * (plotW - 1));
    const yOf = (c: number) => plotPad + plotInnerH * (1 - (c - minV) / rng);
    stockPts = model.stockIdx.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
    {
      let chunk: string[] = [];
      for (let i = 0; i < model.benchIdx.length; i++) {
        const b = model.benchIdx[i];
        if (b == null || !Number.isFinite(b)) {
          if (chunk.length >= 2) benchPtSegments.push(chunk.join(" "));
          chunk = [];
        } else {
          chunk.push(`${xOf(i)},${yOf(b)}`);
        }
      }
      if (chunk.length >= 2) benchPtSegments.push(chunk.join(" "));
    }
    let minI = 0;
    let maxI = 0;
    model.stockIdx.forEach((v, i) => {
      if (v < model.stockIdx[minI]!) minI = i;
      if (v > model.stockIdx[maxI]!) maxI = i;
    });
    lowLabel = `Low idx ${model.stockIdx[minI]!.toFixed(1)} (${formatDate(model.dates[minI]!)})`;
    highLabel = `High idx ${model.stockIdx[maxI]!.toFixed(1)} (${formatDate(model.dates[maxI]!)})`;
  } else {
    const vals = model.close;
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const span = rawMax - rawMin || 1;
    const pad = Math.max(span * 0.12, Math.abs(rawMax) * 0.02);
    minV = rawMin - pad;
    maxV = rawMax + pad;
    fmtY = (v) => formatCompactUsd(v);
    const rng = maxV - minV || 1;
    const xOf = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * (plotW - 1));
    const yOf = (c: number) => plotPad + plotInnerH * (1 - (c - minV) / rng);
    stockPts = model.close.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
    let minI = 0;
    let maxI = 0;
    model.close.forEach((v, i) => {
      if (v < model.close[minI]!) minI = i;
      if (v > model.close[maxI]!) maxI = i;
    });
    lowLabel = `Low ${formatCompactUsd(model.close[minI]!)} (${formatDate(model.dates[minI]!)})`;
    highLabel = `High ${formatCompactUsd(model.close[maxI]!)} (${formatDate(model.dates[maxI]!)})`;
  }

  const rng = maxV - minV || 1;
  const yTickVals = Array.from({ length: 5 }, (_, i) => minV + (rng * i) / 4);
  const firstD = model.dates[0]!;
  const lastD = model.dates[model.dates.length - 1]!;
  const tickIx =
    n <= 8
      ? Array.from({ length: n }, (_, i) => i)
      : Array.from(
          new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]),
        ).sort((a, b) => a - b);

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={{ fontSize: 8, color: C.slate700, marginBottom: 4 }}>
        Date range: {formatDate(firstD)} — {formatDate(lastD)}
        {model.mode === "indexed"
          ? ` · Indexed to 100 at first session with ${model.benchLabel} (same as site)`
          : ""}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: yAxisW,
            height: plotH,
            paddingTop: 2,
            paddingBottom: 2,
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingRight: 4,
          }}
        >
          {[...yTickVals].reverse().map((v, i) => (
            <Text key={`py-${i}`} style={{ fontSize: 6, color: C.slate600 }}>
              {fmtY(v)}
            </Text>
          ))}
        </View>
        <View>
          <Svg width={plotW} height={plotH}>
            {benchPtSegments.map((seg, idx) => (
              <Polyline key={`bench-${idx}`} points={seg} stroke="#94a3b8" strokeWidth={1.5} fill="none" />
            ))}
            <Polyline points={stockPts} stroke={C.brand600} strokeWidth={1.8} fill="none" />
            <Polyline
              points={`0,${plotH - 0.5} ${plotW - 1},${plotH - 0.5}`}
              stroke={C.slate500}
              strokeWidth={0.7}
            />
            <Polyline
              points={`0.5,0 0.5,${plotH - 1}`}
              stroke={C.slate500}
              strokeWidth={0.7}
            />
          </Svg>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: plotW,
              marginTop: 4,
              paddingLeft: 2,
              paddingRight: 2,
            }}
          >
            {tickIx.map((i) => (
              <Text key={model.dates[i]!} style={{ fontSize: 5.5, color: C.slate600 }}>
                {formatDate(model.dates[i]!)}
              </Text>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginTop: 6, width: "100%" }}>
        <Text style={{ fontSize: 7, color: C.brand600, fontWeight: "bold", marginHorizontal: 10 }}>
          {data.ticker}
        </Text>
        {model.mode === "indexed" ? (
          <Text style={{ fontSize: 7, color: "#94a3b8", fontWeight: "bold", marginHorizontal: 10 }}>
            {model.benchLabel}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ fontSize: 8, color: C.slate600 }}>{lowLabel}</Text>
        <Text style={{ fontSize: 8, color: C.slate600, textAlign: "right" }}>{highLabel}</Text>
      </View>
    </View>
  );
}

export function CompanyReportPdfDocument({
  data,
  livePageUrl,
  generatedAtIso,
  chatTurns,
}: {
  data: CompanyPayload;
  livePageUrl: string;
  generatedAtIso: string;
  chatTurns: TickerChatTurn[];
}) {
  const hasPdfPrice = buildPdfPriceModel(data) != null;

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.wordmark}>TICKERSENSE</Text>
        <Text style={styles.title}>
          {data.name} ({data.ticker})
        </Text>
        <Text style={styles.subtitle}>
          Generated {formatDate(generatedAtIso)} · {data.meta.mock ? "Demo workspace" : "Live workspace snapshot"}
        </Text>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Continue on the website</Text>
          <Text style={styles.cardDesc}>
            Same company workspace as in your browser — charts, filings, and TickerChat context.
          </Text>
          <Link src={livePageUrl} style={btn.resume}>
            <Text style={btn.resumeText}>Open this page on TickerSense</Text>
          </Link>
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Company</Text>
          <Text style={styles.cardDesc}>Identifiers and listing.</Text>
          <View style={styles.row}>
            <Text style={styles.labelCol}>Ticker</Text>
            <Text style={styles.valueCol}>{data.ticker}</Text>
          </View>
          {data.exchange ? (
            <View style={styles.row}>
              <Text style={styles.labelCol}>Exchange</Text>
              <Text style={styles.valueCol}>{data.exchange}</Text>
            </View>
          ) : null}
          {data.cik ? (
            <View style={styles.row}>
              <Text style={styles.labelCol}>CIK</Text>
              <Text style={styles.valueCol}>{data.cik}</Text>
            </View>
          ) : null}
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Price Trends</Text>
          <Text style={styles.cardDesc}>
            Daily closes (sampled for PDF length). When benchmark data aligns by date, the chart matches the site:
            stock vs {data.benchmark_label ?? "S&P 500"}, indexed to 100; otherwise price only.
          </Text>
          {hasPdfPrice ? (
            <PriceSparkline data={data} />
          ) : (
            <Text style={styles.emptyState}>No price history in this export.</Text>
          )}
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Financial Trends</Text>
          <Text style={styles.cardDesc}>
            Last {PDF_TREND_YEARS} years — revenue, net income, and operating expenses (when tagged). Same logic as the
            website: quarterly periods preferred; period keys normalized to calendar dates.
          </Text>
          <FinancialTrendsPdfChart data={data} />
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Key financials</Text>
          <Text style={styles.cardDesc}>Latest tagged metrics from the workspace.</Text>
          {data.financials.map((f) => (
            <View key={f.label} style={styles.row}>
              <Text style={styles.labelCol}>{f.label}</Text>
              <Text style={styles.valueCol}>
                {f.value}
                {f.period ? ` · ${f.period}` : ""}
              </Text>
            </View>
          ))}
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Filings timeline</Text>
          <Text style={styles.cardDesc}>
            Latest 10-K, 10-Q, 8-K, and DEF 14A. Tap a button to open the SEC destination (same labels as the site).
          </Text>
          {data.filings.map((f) => (
            <View
              key={`${f.form}-${f.accession_number}`}
              style={{
                marginBottom: 10,
                padding: 10,
                backgroundColor: C.slate100,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                <View style={[styles.badge, { marginRight: 8 }]}>
                  <Text style={styles.badgeText}>{f.form}</Text>
                </View>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: C.slate900 }}>{formatDate(f.filed_at)}</Text>
              </View>
              {f.description ? <Text style={[styles.block, { marginTop: 6 }]}>{f.description}</Text> : null}
              <Text style={[styles.mono, { marginTop: 4 }]}>{f.accession_number}</Text>
              <FilingActions f={f} />
            </View>
          ))}
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Filing excerpts</Text>
          <Text style={styles.cardDesc}>Anchors from the structured workspace.</Text>
          {data.filing_sections.map((s) => (
            <View key={s.id} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: "bold", fontSize: 9, color: C.slate900 }}>{s.label}</Text>
              <Text style={styles.block}>{s.excerpt}</Text>
              {s.source_url ? (
                <View style={{ marginTop: 4 }}>
                  <LinkButton href={s.source_url} label="Open source" variant="outline" />
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View wrap={false} style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          {data.insights.map((i) => (
            <View key={i.category + i.title} style={{ marginBottom: 10 }}>
              <Text style={{ fontWeight: "bold", fontSize: 9, color: C.slate900 }}>{i.title}</Text>
              {i.bullets.map((b, idx) => (
                <Text key={`${idx}-${b.slice(0, 24)}`} style={styles.block}>
                  • {b}
                </Text>
              ))}
              {i.sources?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
                  {i.sources.map((s) =>
                    s.url ? (
                      <Link key={s.label + s.url} src={s.url} style={btn.sourcePill}>
                        <Text style={btn.sourcePillText}>
                          {s.label}
                          {s.form ? ` · ${s.form}` : ""}
                        </Text>
                      </Link>
                    ) : (
                      <View key={s.label} style={btn.sourcePill}>
                        <Text style={[btn.sourcePillText, { color: C.slate600 }]}>
                          {s.label}
                          {s.form ? ` · ${s.form}` : ""}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {chatTurns.length ? (
          <>
            <View style={styles.divider} />
            <Text style={[styles.title, { fontSize: 14 }]}>TickerChat</Text>
            <Text style={styles.subtitle}>Transcript from this session (included for your records).</Text>
            {chatTurns.map((t) => (
              <View key={t.id} style={{ marginBottom: 12 }}>
                <Text style={styles.sectionLabel}>You · {formatDate(t.at)}</Text>
                <View style={styles.chatUser}>
                  <Text style={styles.block}>{t.question}</Text>
                </View>
                <Text style={styles.sectionLabel}>TickerChat</Text>
                <View style={styles.chatAsst}>
                  <Text style={styles.block}>{t.response.answer}</Text>
                  {t.response.bullet_points.length ? (
                    <>
                      <Text style={[styles.sectionLabel, { marginTop: 6 }]}>Highlights</Text>
                      {t.response.bullet_points.map((b, idx) => (
                        <Text key={`${idx}-${b.slice(0, 32)}`} style={styles.block}>
                          • {b}
                        </Text>
                      ))}
                    </>
                  ) : null}
                  {t.response.supporting_sources.length ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                      {t.response.supporting_sources.map((s) =>
                        s.url ? (
                          <Link key={t.id + s.label + s.url} src={s.url} style={btn.sourcePill}>
                            <Text style={btn.sourcePillText}>
                              {s.label}
                              {s.form ? ` · ${s.form}` : ""}
                            </Text>
                          </Link>
                        ) : (
                          <View key={s.label} style={btn.sourcePill}>
                            <Text style={[btn.sourcePillText, { color: C.slate600 }]}>
                              {s.label}
                              {s.form ? ` · ${s.form}` : ""}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  ) : null}
                  {t.response.unanswered_questions.length ? (
                    <>
                      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Suggested follow-ups</Text>
                      {t.response.unanswered_questions.map((uq, idx) => (
                        <Text key={`${t.id}-uq-${idx}`} style={styles.block}>
                          • {uq}
                        </Text>
                      ))}
                    </>
                  ) : null}
                  <Text style={[styles.subtitle, { marginTop: 6, marginBottom: 0 }]}>{t.response.disclaimer}</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text style={{ fontSize: 7, color: C.slate500, marginTop: 12, textAlign: "center" }}>
          Research support only. Not investment advice. In PDF viewers, use pointer over buttons to follow links.
        </Text>
      </Page>
    </Document>
  );
}

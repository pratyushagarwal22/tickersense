import type { CopilotChatTurn } from "@/lib/chat-storage";
import { formatCompactUsd, formatDate } from "@/lib/format";
import type { CompanyPayload, FilingItem } from "@/lib/types";
import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: C.pageBg,
    color: C.slate800,
  },
  wordmark: { fontSize: 8, fontWeight: "bold", color: C.brand600, letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "bold", color: C.slate900, marginBottom: 4 },
  subtitle: { fontSize: 8, color: C.slate600, marginBottom: 14 },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 11, fontWeight: "bold", color: C.slate900, marginBottom: 2 },
  cardDesc: { fontSize: 7.5, color: C.slate600, marginBottom: 8, lineHeight: 1.35 },
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
  block: { marginBottom: 5, lineHeight: 1.4, fontSize: 8.5, color: C.slate800 },
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
  barChartRow: { flexDirection: "row", alignItems: "flex-end", height: 72, marginTop: 6 },
  barCol: { flex: 1, alignItems: "center" },
  bar: { width: 10, backgroundColor: C.teal, borderRadius: 2 },
  barLabel: { fontSize: 6, color: C.slate500, marginTop: 4, textAlign: "center" },
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

function RevenueBars({ revenue }: { revenue: { period_end: string; value_usd: number }[] }) {
  if (revenue.length < 2) return null;
  const maxV = Math.max(...revenue.map((r) => r.value_usd), 1);
  return (
    <View style={styles.barChartRow}>
      {revenue.map((p) => {
        const h = Math.max(4, (p.value_usd / maxV) * 56);
        return (
          <View key={p.period_end} style={styles.barCol}>
            <View style={[styles.bar, { height: h }]} />
            <Text style={styles.barLabel}>{formatDate(p.period_end)}</Text>
          </View>
        );
      })}
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
  chatTurns: CopilotChatTurn[];
}) {
  const revenue = data.revenue_series ?? [];

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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Continue on the website</Text>
          <Text style={styles.cardDesc}>
            Same company workspace as in your browser — charts, filings, and Copilot context.
          </Text>
          <Link src={livePageUrl} style={btn.resume}>
            <Text style={btn.resumeText}>Open this page on TickerSense</Text>
          </Link>
        </View>

        <View style={styles.card}>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Revenue (SEC company facts)</Text>
          <Text style={styles.cardDesc}>
            Reported revenue by period end (USD). Mirrors the revenue chart on the site when data is available.
          </Text>
          {revenue.length >= 2 ? (
            <>
              <RevenueBars revenue={revenue} />
              {revenue.map((p) => (
                <View key={p.period_end} style={styles.row}>
                  <Text style={styles.labelCol}>{formatDate(p.period_end)}</Text>
                  <Text style={styles.valueCol}>{formatCompactUsd(p.value_usd)}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyState}>
              Not enough revenue history to plot — need at least two SEC periods with a revenue tag. Financial
              summary line items may still show the latest point above.
            </Text>
          )}
        </View>

        <View style={styles.card}>
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

        <View style={styles.card}>
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

        <View style={styles.card}>
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

        <View style={styles.card}>
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
            <Text style={[styles.title, { fontSize: 14 }]}>Ask Copilot</Text>
            <Text style={styles.subtitle}>Transcript from this session (included for your records).</Text>
            {chatTurns.map((t) => (
              <View key={t.id} style={{ marginBottom: 12 }}>
                <Text style={styles.sectionLabel}>You · {formatDate(t.at)}</Text>
                <View style={styles.chatUser}>
                  <Text style={styles.block}>{t.question}</Text>
                </View>
                <Text style={styles.sectionLabel}>Copilot</Text>
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

import type { CompanyPayload } from "@/lib/types";
import type { ReactNode } from "react";

/** One-line blurbs; keys match ingestion labels where possible. */
const FIN_HELP: Record<string, string> = {
  Revenue: "Top-line sales for the latest tagged period (often quarter or TTM depending on filing).",
  "Gross profit": "Revenue minus cost of revenue—before operating expenses.",
  "Operating income": "Profit from core operations after operating expenses (roughly ‘operating margin’ context).",
  "Net income": "Bottom-line profit after tax and other items for the tagged period.",
  "EPS (diluted)":
    "Earnings per share using diluted share count—includes options/convertibles that could add shares. Compare to prior periods in the 10-Q/10-K EPS roll-forward.",
  "Total assets": "Balance sheet scale at the period end date shown.",
};

const TECH_HELP: Record<string, string> = {
  "Last close": "Most recent session closing price in this snapshot.",
  "SMA 20": "~1 month trend smoothing vs. daily noise.",
  "SMA 50": "~2.5 month trend; often compared to price for medium-term posture.",
  "SMA 200": "~10 month trend; common long-term reference (not a forecast).",
  "RSI (14)": "Momentum 0–100 over 14 sessions; descriptive only—not a timing signal by itself.",
  "52-week range": "Low / high closes over the trailing 52 weeks in this feed.",
};

function techBlurb(label: string): string | undefined {
  const n = label.replace(/\s*\(demo\)\s*$/i, "").trim();
  if (TECH_HELP[n]) return TECH_HELP[n];
  const hit = Object.keys(TECH_HELP).find((k) => n.toLowerCase().includes(k.toLowerCase()));
  return hit ? TECH_HELP[hit] : undefined;
}

function finBlurb(label: string): string | undefined {
  const n = label.replace(/\s*\(demo\)\s*$/i, "").trim();
  if (FIN_HELP[n]) return FIN_HELP[n];
  const k = Object.keys(FIN_HELP).find((key) => n.toLowerCase().includes(key.toLowerCase()));
  return k ? FIN_HELP[k] : undefined;
}

function MetricRow({
  label,
  value,
  blurb,
  meta,
}: {
  label: string;
  value: string;
  blurb?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {blurb ? <p className="mt-1 text-xs leading-snug text-slate-500">{blurb}</p> : null}
        {meta ? <div className="mt-1 text-[11px] text-slate-400">{meta}</div> : null}
      </div>
      <p className="mt-2 shrink-0 text-lg font-semibold tabular-nums text-slate-950 sm:mt-0 sm:text-right">
        {value}
      </p>
    </div>
  );
}

export function MetricsGrid({ data }: { data: CompanyPayload }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
      <div className="flex min-h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-8">
        <h2 className="text-xl font-semibold text-slate-950">Financial Snapshot</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {data.meta.facts_available
            ? "Figures from SEC XBRL tags. Dates are period ends—newer rows are more recent."
            : data.meta.mock
              ? "Demo placeholders. Connect live ingestion for SEC company facts."
              : "Tags unavailable for this issuer yet—use the latest 10-Q/10-K for full statements."}
        </p>
        <div className="mt-5 flex flex-1 flex-col gap-3">
          {data.financials.map((m) => {
            const blurb = finBlurb(m.label);
            return (
              <MetricRow
                key={m.label}
                label={m.label}
                value={m.value}
                blurb={blurb}
                meta={
                  <>
                    {m.period ? `${m.period}` : ""}
                    {m.source ? <span className={m.period ? " · " : ""}>{m.source}</span> : null}
                  </>
                }
              />
            );
          })}
        </div>
      </div>

      <div className="flex min-h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-8">
        <h2 className="text-xl font-semibold text-slate-950">Market Snapshot</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Price and common technicals—descriptive context only, not predictions or advice.
        </p>
        <div className="mt-5 flex flex-1 flex-col gap-3">
          {data.technicals.map((m) => {
            const tb = techBlurb(m.label);
            return <MetricRow key={m.label} label={m.label} value={m.value} blurb={tb} />;
          })}
        </div>
      </div>
    </div>
  );
}

import type { CompanyPayload } from "@/lib/types";

export function MetricsGrid({ data }: { data: CompanyPayload }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-950">Financial snapshot</h2>
        <p className="mt-1 text-sm text-slate-600">
          {data.meta.facts_available
            ? "Values from SEC XBRL company facts (latest period shown per tag—confirm in filed statements)."
            : data.meta.mock
              ? "Demo placeholders. Connect live ingestion for SEC company facts."
              : "No usable tags returned for these metrics yet—filers vary; open the 10-K/10-Q for full statements."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.financials.map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{m.value}</p>
              <p className="mt-1 text-xs text-slate-500">
                {m.period ? `${m.period}` : ""}
                {m.source ? <span className="block">{m.source}</span> : null}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-950">Technical snapshot</h2>
        <p className="mt-1 text-sm text-slate-600">
          Market data and simple indicators via yfinance (when available).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.technicals.map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { CompanyPayload } from "@/lib/types";

export function MetricsGrid({ data }: { data: CompanyPayload }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-950">Financial snapshot</h2>
        <p className="mt-1 text-balance text-sm leading-relaxed text-slate-600">
          {data.meta.facts_available
            ? "Key figures pulled from SEC data tags (XBRL). The date is the end of the reporting period—compare across rows to see how recent each number is."
            : data.meta.mock
              ? "Demo placeholders. Connect live ingestion for SEC company facts."
              : "We couldn’t pull these tags for this company yet—open the latest 10-K or 10-Q for full statements."}
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
        <h2 className="text-lg font-semibold text-slate-950">Market snapshot</h2>
        <p className="mt-1 text-balance text-sm leading-relaxed text-slate-600">
          Recent price and simple indicators (moving averages, RSI, 52-week range). Helpful for timing context—not a
          prediction of where the price goes next.
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

import type { CompanyPayload } from "@/lib/types";
import { SourcePill } from "@/components/company/source-pill";

export function SectionsPanel({ data }: { data: CompanyPayload }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">What to read in the filings</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        These cards point you to the usual sections investors open first. Full text still lives in the official filing—use
        the links to jump straight to the source.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.filing_sections.map((s) => (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">{s.label}</p>
              {s.form ? (
                <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {s.form}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{s.excerpt}</p>
            {s.source_url ? (
              <div className="mt-3">
                <SourcePill source={{ label: "Open official filing", url: s.source_url, form: s.form }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

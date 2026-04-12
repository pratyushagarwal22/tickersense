import type { CompanyPayload } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { FileText } from "lucide-react";

export function FilingsPanel({ data }: { data: CompanyPayload }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Filings timeline</h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest identified 10-K, 10-Q, 8-K, and DEF 14A (when present in submissions). With live
            ingestion, use <span className="font-medium">SEC viewer</span> if the primary HTML link
            does not load.
          </p>
        </div>
        <FileText className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-5 space-y-3">
        {data.filings.map((f) => (
          <div
            key={`${f.form}-${f.accession_number}-${f.filed_at}`}
            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                  {f.form}
                </span>
                <span className="text-sm font-medium text-slate-800">{formatDate(f.filed_at)}</span>
              </div>
              {f.description ? (
                <p className="mt-2 text-sm text-slate-600">{f.description}</p>
              ) : null}
              <p className="mt-2 font-mono text-xs text-slate-500">{f.accession_number}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {f.filing_url ? (
                <a
                  href={f.filing_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
                >
                  Primary link
                </a>
              ) : null}
              {f.sec_viewer_url ? (
                <a
                  href={f.sec_viewer_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white ring-1 ring-slate-900 hover:bg-slate-800"
                >
                  SEC viewer
                </a>
              ) : null}
              {f.filing_index_url && f.filing_index_url !== f.filing_url ? (
                <a
                  href={f.filing_index_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Filing index
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

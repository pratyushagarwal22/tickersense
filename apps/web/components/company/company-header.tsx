import type { CompanyPayload } from "@/lib/types";
import { Building2 } from "lucide-react";

export function CompanyHeader({ data }: { data: CompanyPayload }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
            <Building2 className="h-4 w-4" />
            SEC research workspace
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              {data.name}
            </h1>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
              {data.ticker}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {data.exchange ? `${data.exchange}` : "Exchange unknown"}
            {data.cik ? <span className="text-slate-400"> · CIK {data.cik}</span> : null}
            {data.meta.mock ? (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
                Demo / fallback data
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Research support only. Not investment advice.
      </p>
    </div>
  );
}

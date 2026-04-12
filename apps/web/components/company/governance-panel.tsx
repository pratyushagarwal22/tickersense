import type { CompanyPayload } from "@/lib/types";
import { SourcePill } from "@/components/company/source-pill";
import { Scale } from "lucide-react";

export function GovernancePanel({ data }: { data: CompanyPayload }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Governance & executive pay</h2>
          <p className="mt-1 text-balance text-sm leading-relaxed text-slate-600">
            The “proxy” filing explains who runs the company and how leaders are paid. Read it for context—not as a
            scorecard on the stock.
          </p>
        </div>
        <Scale className="h-5 w-5 text-slate-400" />
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {data.governance.bullets.map((b) => (
          <li key={b} className="leading-relaxed">
            <span className="mr-2 text-slate-400">•</span>
            {b}
          </li>
        ))}
      </ul>

      {data.governance.sources.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.governance.sources.map((s) => (
            <SourcePill key={`${s.label}-${s.url ?? ""}`} source={s} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

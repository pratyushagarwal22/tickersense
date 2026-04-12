import type { CompanyPayload } from "@/lib/types";
import { SourcePill } from "@/components/company/source-pill";
import { Scale } from "lucide-react";

export function GovernancePanel({ data }: { data: CompanyPayload }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Governance & Executive Pay</h2>
          <p className="mt-1 text-balance text-sm leading-relaxed text-slate-600">
            The “proxy” filing explains who runs the company and how leaders are paid. Read it for context—not as a
            scorecard on the stock.
          </p>
        </div>
        <Scale className="h-5 w-5 text-slate-400" />
      </div>

      {data.workspace_ai?.section_summaries?.governance ? (
        <p className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm leading-relaxed text-slate-800">
          <span className="font-semibold text-brand-900">From latest proxy (AI summary): </span>
          {data.workspace_ai.section_summaries.governance}
        </p>
      ) : data.workspace_ai?.governance_excerpt?.trim() ? (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm leading-relaxed text-slate-800">
          <span className="font-semibold text-slate-900">From latest proxy (filing excerpt): </span>
          <span className="whitespace-pre-wrap">{data.workspace_ai.governance_excerpt.trim()}</span>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {(data.workspace_ai?.governance_bullets?.length
          ? data.workspace_ai.governance_bullets
          : data.governance.bullets
        ).map((b) => (
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

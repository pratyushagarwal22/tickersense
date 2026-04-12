import type { CompanyPayload } from "@/lib/types";
import { SourcePill } from "@/components/company/source-pill";

const SECTION_AI_KEYS = [
  "business",
  "risk_factors",
  "mdna",
  "segments",
  "governance",
] as const;

function AiSummaryBox({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/80 p-3 text-sm leading-relaxed text-slate-800">
      <span className="font-semibold text-brand-900">Summary: </span>
      {text}
    </div>
  );
}

function FilingTextFallback({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
      <span className="font-semibold text-slate-800">{title}: </span>
      {text}
    </div>
  );
}

export function SectionsPanel({ data }: { data: CompanyPayload }) {
  const ai = data.workspace_ai;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-10">
      <h2 className="text-xl font-semibold text-slate-950">What to read in the filings</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Cards use two columns on large screens so shorter cards fill space naturally. Very long segment lists scroll only when
        needed—verify numbers in the official filing.
      </p>

      <div className="mt-6 columns-1 [column-gap:1.25rem] lg:columns-2">
        {data.filing_sections.map((s) => {
          const aiKey = SECTION_AI_KEYS.includes(s.id as (typeof SECTION_AI_KEYS)[number])
            ? (s.id as (typeof SECTION_AI_KEYS)[number])
            : null;
          const aiPara = aiKey ? ai?.section_summaries?.[aiKey] : undefined;
          const segmentExtras = s.id === "segments" && ai?.segment_bullets?.length ? ai.segment_bullets : null;
          const segmentScroll = segmentExtras && segmentExtras.length > 14;
          const mdnaRaw = s.id === "mdna" && !aiPara && ai?.mdna_excerpt?.trim() ? ai.mdna_excerpt.trim() : null;
          const riskRaw =
            s.id === "risk_factors" && !aiPara && ai?.risk_factors_excerpt?.trim() ? ai.risk_factors_excerpt.trim() : null;
          const govRaw =
            s.id === "governance" && !aiPara && ai?.governance_excerpt?.trim() ? ai.governance_excerpt.trim() : null;

          return (
            <div key={s.id} className="mb-5 break-inside-avoid rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{s.label}</p>
                {s.form ? (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {s.form}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{s.excerpt}</p>
              {aiPara ? <AiSummaryBox text={aiPara} /> : null}
              {mdnaRaw ? (
                <FilingTextFallback title="Excerpt from filing (MD&A region)" text={mdnaRaw} />
              ) : null}
              {riskRaw ? (
                <FilingTextFallback title="Excerpt from filing (risk factors region)" text={riskRaw} />
              ) : null}
              {govRaw ? (
                <FilingTextFallback title="Excerpt from filing (proxy / executive compensation region)" text={govRaw} />
              ) : null}
              {segmentExtras ? (
                <ul
                  className={`mt-3 space-y-1.5 text-sm text-slate-700 ${
                    segmentScroll ? "max-h-80 overflow-y-auto pr-1" : ""
                  }`}
                >
                  {segmentExtras.map((b) => (
                    <li key={b}>
                      <span className="text-slate-400">•</span> {b}
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.source_url ? (
                <div className="mt-3">
                  <SourcePill source={{ label: "Open official filing", url: s.source_url, form: s.form }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {ai?.deeper_reading?.length ? (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <p className="text-sm font-semibold text-slate-900">What to read next in the full filing</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {ai.deeper_reading.map((line) => (
              <li key={line}>
                <span className="text-slate-400">•</span> {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { askCopilot } from "@/lib/api";
import type { AskResponseBody, CompanyPayload } from "@/lib/types";
import { Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { SourcePill } from "@/components/company/source-pill";

export function AskCopilotPanel({ data }: { data: CompanyPayload }) {
  const [q, setQ] = useState("What should I read first to understand the last quarter?");
  const [out, setOut] = useState<AskResponseBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const disabled = useMemo(() => loading || !q.trim(), [loading, q]);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await askCopilot({
        ticker: data.ticker,
        question: q.trim(),
        companyContext: data,
      });
      setOut(res);
    } catch (e) {
      setOut(null);
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">Ask Copilot</h2>
      <p className="mt-1 text-sm text-slate-600">
        Grounded Q&amp;A over the structured workspace context. No buy/sell guidance.
      </p>

      <div className="mt-4 space-y-3">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </button>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {out ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
          <p className="text-sm leading-relaxed text-slate-800">{out.answer}</p>
          {out.bullet_points.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Highlights
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {out.bullet_points.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {out.supporting_sources.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supporting sources
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {out.supporting_sources.map((s) => (
                  <SourcePill key={`${s.label}-${s.url ?? ""}`} source={s} />
                ))}
              </div>
            </div>
          ) : null}

          {out.unanswered_questions.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Still open
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {out.unanswered_questions.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-slate-500">{out.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}

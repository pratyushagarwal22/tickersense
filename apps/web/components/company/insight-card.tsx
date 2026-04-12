import type { InsightCard as InsightCardModel } from "@/lib/types";
import { SourcePill } from "@/components/company/source-pill";
import { cn } from "@/lib/format";
import { Sparkles } from "lucide-react";

const styles: Record<InsightCardModel["category"], string> = {
  what_changed: "border-indigo-200 bg-indigo-50/40",
  what_matters: "border-sky-200 bg-sky-50/40",
  strong: "border-emerald-200 bg-emerald-50/40",
  concerning: "border-amber-200 bg-amber-50/40",
  open_questions: "border-slate-200 bg-white",
};

export function InsightCard({ card }: { card: InsightCardModel }) {
  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", styles[card.category])}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
        {card.is_ai_synthesis ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            Synthesis
          </span>
        ) : (
          <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            Evidence-oriented
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {card.bullets.map((b) => (
          <li key={b} className="leading-relaxed">
            <span className="mr-2 text-slate-400">•</span>
            {b}
          </li>
        ))}
      </ul>
      {card.sources.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {card.sources.map((s) => (
            <SourcePill key={`${s.label}-${s.url ?? ""}`} source={s} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

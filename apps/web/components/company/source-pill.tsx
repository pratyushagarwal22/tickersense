import type { SourceRef } from "@/lib/types";
import { ExternalLink } from "lucide-react";

export function SourcePill({ source }: { source: SourceRef }) {
  const text = source.form ? `${source.label} · ${source.form}` : source.label;
  if (source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-brand-300 hover:bg-white"
      >
        <span className="min-w-0 max-w-full whitespace-normal break-words sm:max-w-[520px]">{text}</span>
        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </a>
    );
  }

  return (
    <span className="inline-flex max-w-full items-start rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
      <span className="min-w-0 max-w-full whitespace-normal break-words sm:max-w-[520px]">{text}</span>
    </span>
  );
}

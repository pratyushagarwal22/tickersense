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
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-300 hover:bg-white"
      >
        <span className="max-w-[240px] truncate">{text}</span>
        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
      {text}
    </span>
  );
}

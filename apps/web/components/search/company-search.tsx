"use client";

import { formatTicker } from "@/lib/format";
import { Search } from "lucide-react";
import { useState } from "react";

export function CompanySearch() {
  const [q, setQ] = useState("");

  function submit() {
    const t = formatTicker(q);
    if (!t) return;
    const url = `/company/${encodeURIComponent(t)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setQ("");
  }

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Enter a ticker (e.g. AAPL)"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4"
          aria-label="Company ticker search"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        className="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        Open workspace
      </button>
    </div>
  );
}

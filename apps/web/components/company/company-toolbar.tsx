"use client";

import { loadChat } from "@/lib/chat-storage";
import type { CompanyPayload } from "@/lib/types";
import { Download, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

export function CompanyToolbar({ data }: { data: CompanyPayload }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const downloadPdf = useCallback(async () => {
    setBusy(true);
    try {
      const [{ pdf }, { CompanyReportPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/company/company-report-pdf"),
      ]);
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      const path = `/company/${encodeURIComponent(data.ticker)}`;
      const livePageUrl = origin ? `${origin}${path}` : path;
      const chatTurns = loadChat(data.ticker);
      const blob = await pdf(
        <CompanyReportPdfDocument
          data={data}
          livePageUrl={livePageUrl}
          generatedAtIso={new Date().toISOString()}
          chatTurns={chatTurns}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.ticker}-tickersense.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, [data]);

  function copyPageLink() {
    if (typeof window === "undefined") return;
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
        ← Back
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copyPageLink}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:border-brand-300"
        >
          <Link2 className="h-4 w-4 text-slate-500" />
          {copied ? "Copied" : "Copy page link"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadPdf()}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
      </div>
    </div>
  );
}

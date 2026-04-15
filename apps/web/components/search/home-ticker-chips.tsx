"use client";

const DEMO_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA"] as const;

export function HomeTickerChips() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-slate-500">Try:</span>
      {DEMO_TICKERS.map((t) => (
        <a
          key={t}
          href={`/company/${t}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-transparent bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900"
        >
          {t}
        </a>
      ))}
    </div>
  );
}

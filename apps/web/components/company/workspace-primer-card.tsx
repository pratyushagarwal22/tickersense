/** Sixth grid tile: balances the 2× insight layout and reinforces source-of-truth habits. */
export function WorkspacePrimerCard() {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Verify in the filings</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        Summaries and charts are starting points—SEC documents are authoritative for numbers and legal text.
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
        <li>
          <span className="mr-2 text-slate-400">•</span>
          Open the linked 10-Q/10-K for exact tables, footnotes, and risk-factor wording.
        </li>
        <li>
          <span className="mr-2 text-slate-400">•</span>
          Cross-check AI segment notes against Note disclosures—dimensional data in company facts can be incomplete.
        </li>
        <li>
          <span className="mr-2 text-slate-400">•</span>
          Use TickerChat after skimming &quot;What to read&quot; so answers stay grounded in what you opened.
        </li>
      </ul>
    </div>
  );
}

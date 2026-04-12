import { CompanySearch } from "@/components/search/company-search";
import { HomeTickerChips } from "@/components/search/home-ticker-chips";

const FILING_HELP = [
  {
    name: "10-K (annual report)",
    plain:
      "A full-year snapshot: what the company sells, major risks, audited financials, and management’s long-form discussion. Good for the big picture.",
  },
  {
    name: "10-Q (quarterly report)",
    plain:
      "Updates the story every quarter—revenue, costs, and management’s explanation of what moved. Best place to start for “what happened last quarter?”",
  },
  {
    name: "8-K (current report)",
    plain:
      "Material news between scheduled filings—earnings releases, leadership changes, deals, or restatements. Use it to see what just happened.",
  },
  {
    name: "DEF 14A (proxy)",
    plain:
      "How executives are paid and how the board runs the company. Useful for understanding incentives, not for predicting returns.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col items-center space-y-12 pb-12">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft md:p-10">
        <p className="text-2xl font-bold tracking-tight text-brand-700 md:text-3xl">TickerSense</p>
        <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight text-slate-950 md:text-5xl md:leading-tight">
          Research public companies in one place
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Pull together official company filings, key numbers, and market context so you can see{" "}
          <span className="font-medium text-slate-800">what changed</span>,{" "}
          <span className="font-medium text-slate-800">what matters</span>, and what to read next—without
          day-trading hype or “buy/sell” tips.
        </p>
        <div className="mx-auto mt-8 max-w-xl text-left">
          <CompanySearch />
        </div>
        <div className="mt-6">
          <HomeTickerChips />
        </div>
      </section>

      <section className="w-full space-y-4">
        <h2 className="text-center text-xl font-semibold text-slate-900 md:text-2xl">
          SEC filings in plain English
        </h2>
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-slate-600 md:text-base">
          Everything here is built from <strong className="font-medium text-slate-800">public SEC documents</strong> and{" "}
          <strong className="font-medium text-slate-800">market data</strong>. You don’t need a finance degree: use the
          timeline to open the real filing, skim the sections below, then ask TickerChat questions in everyday language.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {FILING_HELP.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-soft"
            >
              <h3 className="font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.plain}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid w-full gap-4 md:grid-cols-3">
        {[
          {
            title: "Start with sources",
            body: "Filings are the official record. We surface dates and links so you can verify anything that matters to you.",
          },
          {
            title: "Add market context",
            body: "Price and simple indicators help you place results in time—not to time the market.",
          },
          {
            title: "Think, don’t follow hype",
            body: "No buy/sell calls. Ask what changed, what’s uncertain, and what you’d still want to check in the documents.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft md:text-left"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-slate-500">
        Research support only. Not investment advice.
      </p>
    </main>
  );
}

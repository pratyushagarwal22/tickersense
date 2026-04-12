import { CompanySearch } from "@/components/search/company-search";

export default function HomePage() {
  return (
    <main className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-700">
            TickerSense
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Research public companies in one place.
          </h1>
          <p className="text-lg text-slate-600">
            A thought-partner workspace built on SEC filings, financial trends,
            and market context. It helps users understand what changed, what
            matters, what looks strong, what looks concerning, and what still
            needs investigation.
          </p>
          <CompanySearch />
          <div className="flex flex-wrap gap-2 text-sm text-slate-500">
            <span>Try:</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">AAPL</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">MSFT</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">NVDA</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">TSLA</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "SEC-first research",
            body: "Anchor the experience in 10-K, 10-Q, 8-K, and DEF 14A filings.",
          },
          {
            title: "Market context",
            body: "Layer on price, volume, and simple technical indicators.",
          },
          {
            title: "Thinking, not advice",
            body: "Surface evidence, questions, and tradeoffs instead of buy/sell calls.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>

      <p className="text-center text-xs text-slate-500">
        Research support only. Not investment advice.
      </p>
    </main>
  );
}

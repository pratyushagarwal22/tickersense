export default function LoadingCompanyWorkspace() {
  return (
    <main className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft md:p-8">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-8 w-72 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-60 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-3 w-40 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft"
          >
            <div className="h-4 w-44 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-10/12 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-64 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </main>
  );
}


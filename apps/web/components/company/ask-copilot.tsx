"use client";

import { SourcePill } from "@/components/company/source-pill";
import { askTickerChat } from "@/lib/api";
import {
  clearChat,
  loadChat,
  saveChat,
  type TickerChatTurn,
} from "@/lib/chat-storage";
import type { CompanyPayload } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TickerChatPanel({ data }: { data: CompanyPayload }) {
  const [q, setQ] = useState("What should I read first to understand the last quarter?");
  const [turns, setTurns] = useState<TickerChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTurns(loadChat(data.ticker));
  }, [data.ticker]);

  const disabled = useMemo(() => loading || !q.trim(), [loading, q]);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await askTickerChat({
        ticker: data.ticker,
        question: q.trim(),
        companyContext: data,
      });
      const turn: TickerChatTurn = {
        id: newId(),
        question: q.trim(),
        response: res,
        at: new Date().toISOString(),
      };
      setTurns((prev) => {
        const next = [...prev, turn];
        saveChat(data.ticker, next);
        return next;
      });
      setQ("");
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    clearChat(data.ticker);
    setTurns([]);
    setErr(null);
  }

  return (
    <div
      id="ticker-chat"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">TickerChat</h2>
          <p className="mt-1 text-sm text-slate-600">
            Grounded Q&amp;A over the structured workspace context. No buy/sell guidance. History is kept
            for this tab until you clear it (included in PDF export). Shift+Enter for a new line; Enter sends.
          </p>
        </div>
        {turns.length ? (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </button>
        ) : null}
      </div>

      <div className="mt-4 max-h-[min(520px,70vh)] space-y-4 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
        {turns.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Ask a question below.</p>
        ) : (
          turns.map((t) => <TurnBlock key={t.id} turn={t} />)
        )}
        <div ref={bottomRef} />
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!disabled) void submit();
            }
          }}
          rows={3}
          placeholder="Ask about filings, risks, or where to read next…"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => void submit()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </button>
      </div>
    </div>
  );
}

function TurnBlock({ turn }: { turn: TickerChatTurn }) {
  const out = turn.response;
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        You · {formatDate(turn.at)}
      </p>
      <p className="text-sm text-slate-800">{turn.question}</p>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">TickerChat</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-800">{out.answer}</p>
        {out.bullet_points.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highlights</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {out.bullet_points.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {out.supporting_sources.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Supporting sources
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {out.supporting_sources.map((s) => (
                <SourcePill key={`${turn.id}-${s.label}-${s.url ?? ""}`} source={s} />
              ))}
            </div>
          </div>
        ) : null}

        {out.unanswered_questions.length ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Suggested follow-ups
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {out.unanswered_questions.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-slate-500">{out.disclaimer}</p>
      </div>
    </div>
  );
}

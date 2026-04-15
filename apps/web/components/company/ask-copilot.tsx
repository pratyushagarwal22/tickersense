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

const LOADING_MESSAGES = [
  "Reading SEC filings…",
  "Pulling company disclosures…",
  "Extracting relevant sections…",
  "Reviewing official documents…",
  "Gathering evidence from SEC filings…",
  "Connecting filings and financials…",
  "Verifying against SEC sources…",
  "Preparing your answer…",
  "Grounding the answer in company filings…",
  "Finding what matters in the filings…",
  "Digging into the SEC documents…",
  "Preparing an evidence-based response…",
  "Looking for relevant sections in the filings…",
] as const;

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pickLoadingMessage(): string {
  const n = LOADING_MESSAGES.length;
  if (!n) return "Preparing your answer…";
  return LOADING_MESSAGES[Math.floor(Math.random() * n)]!;
}

const STARTER_QUESTIONS = [
  "What should I read first to understand the last quarter?",
  "How did revenue and margins trend over the last year?",
  "Which risks in the 10-K look new or expanded versus prior years?",
];

export function TickerChatPanel({ data }: { data: CompanyPayload }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<TickerChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState<string>(pickLoadingMessage());
  const [loadingTyped, setLoadingTyped] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const scrollAfterTurnId = useRef<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingTyped("");
      return;
    }

    setLoadingTyped("");

    const full = loadingTarget || pickLoadingMessage();
    let i = 0;
    let typingId: number | null = null;
    let nextMsgId: number | null = null;

    const typeNext = () => {
      i++;
      setLoadingTyped(full.slice(0, i));
      if (i >= full.length) {
        if (nextMsgId != null) window.clearTimeout(nextMsgId);
        nextMsgId = window.setTimeout(() => {
          // Let the completed message linger a bit so it’s readable.
          setLoadingTyped("");
          nextMsgId = window.setTimeout(() => {
            setLoadingTarget(pickLoadingMessage());
          }, 260);
        }, 1400);
        return;
      }
      // Slightly slower “typewriter” feel so the status line is readable.
      typingId = window.setTimeout(typeNext, 55 + Math.floor(Math.random() * 35));
    };

    // Brief pause before typing starts.
    typingId = window.setTimeout(typeNext, 160);

    return () => {
      if (typingId != null) window.clearTimeout(typingId);
      if (nextMsgId != null) window.clearTimeout(nextMsgId);
    };
  }, [loading, loadingTarget]);

  useEffect(() => {
    setTurns(loadChat(data.ticker));
  }, [data.ticker]);

  useEffect(() => {
    if (loading) return;
    const id = scrollAfterTurnId.current;
    if (!id) return;
    scrollAfterTurnId.current = null;
    requestAnimationFrame(() => {
      document.getElementById(`ticker-chat-turn-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    });
  }, [loading, turns]);

  const disabled = useMemo(() => loading || !q.trim(), [loading, q]);

  const lastFollowUps = useMemo(() => {
    if (turns.length === 0) return [] as string[];
    return turns[turns.length - 1]!.response.unanswered_questions ?? [];
  }, [turns]);

  async function submit(questionOverride?: string) {
    const question = (questionOverride ?? q).trim();
    if (!question) return;
    setLoadingTarget(pickLoadingMessage());
    setLoading(true);
    setErr(null);
    try {
      const res = await askTickerChat({
        ticker: data.ticker,
        question,
        companyContext: data,
      });
      const turn: TickerChatTurn = {
        id: newId(),
        question,
        response: res,
        at: new Date().toISOString(),
      };
      scrollAfterTurnId.current = turn.id;
      setTurns((prev) => {
        const next = [...prev, turn];
        saveChat(data.ticker, next);
        return next;
      });
      setQ("");
    } catch (e) {
      scrollAfterTurnId.current = null;
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
            Grounded Q&amp;A over the structured workspace context. No buy/sell guidance. History is kept for this tab
            until you clear it (included in PDF export).
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

      <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
        {turns.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Pick a starter question or type your own below.</p>
        ) : (
          turns.map((t) => <TurnBlock key={t.id} turn={t} />)
        )}
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {turns.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {STARTER_QUESTIONS.map((sq) => (
            <button
              key={sq}
              type="button"
              disabled={loading}
              onClick={() => {
                setQ(sq);
                void submit(sq);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-700 shadow-sm hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
            >
              {sq}
            </button>
          ))}
        </div>
      ) : lastFollowUps.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested follow-ups</p>
          <div className="flex flex-wrap gap-2">
            {lastFollowUps.map((fq) => (
              <button
                key={fq}
                type="button"
                disabled={loading}
                onClick={() => void submit(fq)}
                className="rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1.5 text-left text-xs font-medium text-brand-900 shadow-sm hover:border-brand-400 hover:bg-brand-100 disabled:opacity-50"
              >
                {fq}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!loading && q.trim()) void submit();
            }
          }}
          rows={3}
          placeholder="Ask about filings, risks, segments, or where to read next…"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none ring-brand-200 focus:border-brand-400 focus:ring-4"
        />
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {loading ? (
            <p className="text-xs font-normal text-slate-500">
              <span className="whitespace-pre">{loadingTyped.length ? loadingTyped : " "}</span>
              <span className="inline-block w-[0.6ch] animate-pulse text-slate-400">|</span>
            </p>
          ) : (
            <div />
          )}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex w-full items-center justify-start gap-2 sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => void submit()}
                className="inline-flex w-full min-w-44 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Send className="h-4 w-4" />
                Ask
              </button>
            </div>
            <p className="text-xs text-slate-500 sm:text-right">
              <span className="font-medium text-slate-600">Shift+Enter</span> new line ·{" "}
              <span className="font-medium text-slate-600">Enter</span> sends
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TurnBlock({ turn }: { turn: TickerChatTurn }) {
  const out = turn.response;
  return (
    <div
      id={`ticker-chat-turn-${turn.id}`}
      className="scroll-mt-24 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
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
              Suggested follow-ups (copy)
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {out.unanswered_questions.map((uq) => (
                <li key={uq} className="select-text">
                  • {uq}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-slate-500">{out.disclaimer}</p>
      </div>
    </div>
  );
}

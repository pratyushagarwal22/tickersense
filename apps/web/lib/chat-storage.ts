import type { AskResponseBody } from "@/lib/types";

export const CHAT_STORAGE_PREFIX = "tickersense-chat-v1";

export interface TickerChatTurn {
  id: string;
  question: string;
  response: AskResponseBody;
  at: string;
}

export function chatStorageKey(ticker: string): string {
  return `${CHAT_STORAGE_PREFIX}-${ticker.trim().toUpperCase()}`;
}

export function loadChat(ticker: string): TickerChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(chatStorageKey(ticker));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is TickerChatTurn =>
        typeof t === "object" &&
        t !== null &&
        "id" in t &&
        "question" in t &&
        "response" in t,
    );
  } catch {
    return [];
  }
}

export function saveChat(ticker: string, turns: TickerChatTurn[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(chatStorageKey(ticker), JSON.stringify(turns));
  } catch {
    // quota / private mode
  }
}

export function clearChat(ticker: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(chatStorageKey(ticker));
  } catch {
    /* ignore */
  }
}

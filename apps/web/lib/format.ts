import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function formatTicker(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...opts,
  }).format(n);
}

export function formatCompactUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

/** Listing venue label (e.g. Apple on NASDAQ) — not the same as a benchmark index. */
export function formatExchangeLabel(raw?: string): string {
  if (!raw?.trim()) return "Exchange unknown";
  const t = raw.trim();
  const upper = t.toUpperCase();
  if (upper.includes("NASDAQ")) return "NASDAQ";
  if (upper.includes("NYSE")) return "NYSE";
  if (upper.includes("AMEX")) return "AMEX";
  return t;
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

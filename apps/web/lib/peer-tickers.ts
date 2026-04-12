/**
 * Infer U.S. equity tickers mentioned for peer / competitor comparisons in TickerChat.
 * Conservative: avoids firing on every question; uses aliases and explicit tickers.
 */

const STOP = new Set(
  [
    "THE",
    "AND",
    "FOR",
    "ARE",
    "BUT",
    "NOT",
    "YOU",
    "ALL",
    "CAN",
    "HER",
    "WAS",
    "ONE",
    "OUR",
    "OUT",
    "DAY",
    "GET",
    "HAS",
    "HIM",
    "HIS",
    "HOW",
    "ITS",
    "MAY",
    "NEW",
    "NOW",
    "OLD",
    "SEE",
    "TWO",
    "WHO",
    "BOY",
    "DID",
    "LET",
    "PUT",
    "SAY",
    "SHE",
    "TOO",
    "USE",
    "ITEM",
    "NOTE",
    "FORM",
    "FILED",
    "RISK",
    "EPS",
    "YOY",
    "SEC",
    "EDGAR",
    "USD",
    "NYSE",
    "NASDAQ",
    "MDA",
    "CEO",
    "CFO",
    "IPO",
    "ETF",
    "GAAP",
    "XBRL",
    "KPI",
    "TTM",
    "MRQ",
    "FY",
    "QOQ",
    "MOM",
  ].map((s) => s.toUpperCase()),
);

/** Common names → U.S. listing ticker (skip non-U.S. names without a clean ticker). */
const NAME_TO_TICKER: Record<string, string> = {
  MICROSOFT: "MSFT",
  GOOGLE: "GOOGL",
  ALPHABET: "GOOGL",
  AMAZON: "AMZN",
  META: "META",
  FACEBOOK: "META",
  NVIDIA: "NVDA",
  TESLA: "TSLA",
  APPLE: "AAPL",
  NETFLIX: "NFLX",
  AMD: "AMD",
  INTEL: "INTC",
  ORACLE: "ORCL",
  IBM: "IBM",
  COCA: "KO",
  PEPSI: "PEP",
  WALMART: "WMT",
  COSTCO: "COST",
  DISNEY: "DIS",
  BOEING: "BA",
  JPMORGAN: "JPM",
};

function suggestsComparison(question: string): boolean {
  return /\b(vs\.?|versus|compare|comparison|peers?|competitors?|rivals?|against\b)\b/i.test(question);
}

/**
 * Returns up to `max` distinct tickers (uppercase) other than `currentTicker`.
 */
export function inferPeerTickers(question: string, currentTicker: string, max = 2): string[] {
  const cur = currentTicker.trim().toUpperCase();
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (t: string) => {
    const u = t.trim().toUpperCase();
    if (!u || u === cur || u.length < 2 || u.length > 5 || STOP.has(u) || seen.has(u)) return;
    if (!/^[A-Z]+$/.test(u)) return;
    seen.add(u);
    out.push(u);
  };

  // e.g. "(e.g., MSFT, NVDA)" or "(MSFT, GOOGL)"
  const paren = question.match(/\(([^)]{1,120})\)/g);
  if (paren) {
    for (const block of paren) {
      const inner = block.slice(1, -1);
      const tickLike = inner.match(/\b([A-Z]{2,5})\b/g);
      if (tickLike) {
        for (const t of tickLike) push(t);
      }
    }
  }

  for (const [name, tick] of Object.entries(NAME_TO_TICKER)) {
    try {
      const re = new RegExp(`\\b${name}\\b`, "i");
      if (re.test(question)) push(tick);
    } catch {
      /* ignore bad pattern */
    }
  }

  if (suggestsComparison(question)) {
    const globalTicks = question.match(/\b([A-Z]{2,5})\b/g);
    if (globalTicks) {
      for (const t of globalTicks) push(t);
    }
  }

  return out.slice(0, max);
}

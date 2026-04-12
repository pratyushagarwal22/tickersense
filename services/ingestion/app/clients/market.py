from __future__ import annotations

import asyncio
from dataclasses import dataclass

import pandas as pd
import yfinance as yf
from loguru import logger


@dataclass
class MarketBundle:
    last_close: float | None
    sma_20: float | None
    sma_50: float | None
    sma_200: float | None
    rsi_14: float | None
    week_52_high: float | None
    week_52_low: float | None
    price_history: list[dict[str, float | str]]
    benchmark_history: list[dict[str, float | str]]
    benchmark_label: str


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _day_key(ts) -> str:
    if hasattr(ts, "date"):
        return ts.date().isoformat()
    return pd.to_datetime(ts).date().isoformat()


def build_market_bundle(ticker: str) -> MarketBundle:
    t = ticker.upper().strip()
    label = "S&P 500"
    try:
        hist = yf.Ticker(t).history(period="5y", auto_adjust=False)
        if hist is None or hist.empty:
            raise ValueError("empty history")

        closes = hist["Close"].dropna()
        last_close = float(closes.iloc[-1])
        sma_20 = float(closes.tail(20).mean()) if len(closes) >= 20 else None
        sma_50 = float(closes.tail(50).mean()) if len(closes) >= 50 else None
        sma_200 = float(closes.tail(200).mean()) if len(closes) >= 200 else None
        rsi_series = _rsi(closes, 14)
        rsi_14 = float(rsi_series.iloc[-1]) if len(rsi_series) and pd.notna(rsi_series.iloc[-1]) else None

        last_year = closes.tail(252) if len(closes) >= 126 else closes
        week_52_high = float(last_year.max()) if len(last_year) else None
        week_52_low = float(last_year.min()) if len(last_year) else None

        bench_map: dict[str, float] = {}
        try:
            bhist = yf.Ticker("^GSPC").history(period="5y", auto_adjust=False)
            if bhist is not None and not bhist.empty:
                for ts, row in bhist.iterrows():
                    bench_map[_day_key(ts)] = float(row["Close"])
        except Exception as exc:
            logger.warning("S&P 500 benchmark fetch failed: {}", exc)

        price_history: list[dict[str, float | str]] = []
        benchmark_history: list[dict[str, float | str]] = []
        for ts, row in hist.iterrows():
            if pd.isna(row.get("Close")):
                continue
            d = _day_key(ts)
            c = float(row["Close"])
            price_history.append({"date": d, "close": c})
            bc = bench_map.get(d)
            benchmark_history.append({"date": d, "close": bc if bc is not None else None})

        return MarketBundle(
            last_close=last_close,
            sma_20=sma_20,
            sma_50=sma_50,
            sma_200=sma_200,
            rsi_14=rsi_14,
            week_52_high=week_52_high,
            week_52_low=week_52_low,
            price_history=price_history,
            benchmark_history=benchmark_history,
            benchmark_label=label,
        )
    except Exception as exc:
        logger.warning("yfinance failed for {}: {}", t, exc)
        return MarketBundle(
            last_close=None,
            sma_20=None,
            sma_50=None,
            sma_200=None,
            rsi_14=None,
            week_52_high=None,
            week_52_low=None,
            price_history=[],
            benchmark_history=[],
            benchmark_label=label,
        )


async def build_market_bundle_async(ticker: str) -> MarketBundle:
    return await asyncio.to_thread(build_market_bundle, ticker)

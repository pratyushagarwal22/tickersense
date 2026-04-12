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


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def build_market_bundle(ticker: str) -> MarketBundle:
    t = ticker.upper().strip()
    try:
        hist = yf.Ticker(t).history(period="400d", auto_adjust=False)
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

        tail = hist.tail(120).reset_index()
        price_history: list[dict[str, float | str]] = []
        for _, row in tail.iterrows():
            dt = row["Date"]
            if hasattr(dt, "date"):
                d = dt.date().isoformat()
            else:
                d = pd.to_datetime(dt).date().isoformat()
            price_history.append({"date": d, "close": float(row["Close"])})

        return MarketBundle(
            last_close=last_close,
            sma_20=sma_20,
            sma_50=sma_50,
            sma_200=sma_200,
            rsi_14=rsi_14,
            week_52_high=week_52_high,
            week_52_low=week_52_low,
            price_history=price_history,
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
        )


async def build_market_bundle_async(ticker: str) -> MarketBundle:
    return await asyncio.to_thread(build_market_bundle, ticker)

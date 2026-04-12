from __future__ import annotations

import json
from typing import Any

import httpx
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings


def _sec_headers() -> dict[str, str]:
    return {
        "User-Agent": settings.SEC_USER_AGENT,
        "Accept-Encoding": "gzip, deflate",
    }


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.4, min=0.5, max=4))
async def fetch_json(url: str) -> Any:
    headers = _sec_headers()
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(url, headers=headers)
        res.raise_for_status()
        return res.json()


async def resolve_cik_for_ticker(ticker: str) -> tuple[str, str]:
    """
    Returns (cik_10_digit, company_name)
    """
    t = ticker.upper().strip()
    data = await fetch_json("https://www.sec.gov/files/company_tickers.json")

    rows: list[dict[str, Any]]
    if isinstance(data, dict):
        rows = [v for v in data.values() if isinstance(v, dict)]
    else:
        rows = list(data)

    for row in rows:
        if str(row.get("ticker", "")).upper() == t:
            cik_int = int(row["cik_str"])
            cik = f"{cik_int:010d}"
            title = str(row.get("title") or t)
            return cik, title

    logger.warning("Could not resolve CIK for ticker={}", t)
    raise ValueError(f"Unknown ticker: {t}")


def cik_for_url(cik_10: str) -> str:
    return str(int(cik_10))


async def fetch_submissions(cik_10: str) -> dict[str, Any]:
    cik = cik_for_url(cik_10)
    url = f"https://data.sec.gov/submissions/CIK{cik_10}.json"
    data = await fetch_json(url)
    if not isinstance(data, dict):
        raise ValueError("Unexpected submissions payload")
    data["_cik_numeric"] = cik
    return data


async def fetch_company_facts(cik_10: str) -> dict[str, Any]:
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_10}.json"
    return await fetch_json(url)


def extract_company_name(submissions: dict[str, Any], ticker: str, fallback: str) -> str:
    name = submissions.get("name")
    if isinstance(name, str) and name.strip():
        return name
    tickers = submissions.get("tickers") or []
    if isinstance(tickers, list) and ticker.upper() in {str(x).upper() for x in tickers}:
        return fallback
    return fallback


def extract_exchange(submissions: dict[str, Any]) -> str | None:
    ex = submissions.get("exchanges")
    if isinstance(ex, list) and ex:
        v = ex[0]
        return str(v) if v is not None else None
    return None

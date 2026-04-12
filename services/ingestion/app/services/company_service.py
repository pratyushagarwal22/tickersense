from __future__ import annotations

from datetime import date, timedelta

from loguru import logger

from app.clients.market import build_market_bundle_async
from app.clients.sec import (
    extract_company_name,
    extract_exchange,
    fetch_company_facts,
    fetch_submissions,
    resolve_cik_for_ticker,
)
from app.models.schemas import (
    CompanyMeta,
    CompanyPayload,
    FilingItem,
    FinancialMetric,
    GovernanceSummary,
    InsightCard,
    PriceBar,
    SourceRef,
    TechnicalMetric,
)
from app.parsers.filings import build_section_placeholders, latest_filings_from_submissions, pick_facts


def _fmt_num(n: float | None, *, prefix: str = "", suffix: str = "") -> str:
    if n is None:
        return "—"
    return f"{prefix}{n:,.2f}{suffix}"


def _synthetic_prices() -> list[PriceBar]:
    out: list[PriceBar] = []
    for i in range(120):
        d = date.today() - timedelta(days=119 - i)
        out.append(PriceBar(date=d.isoformat(), close=100.0 + (i % 9) * 0.35))
    return out


def _filing_by_form(filings: list[FilingItem], form: str) -> FilingItem | None:
    for f in filings:
        if f.form == form:
            return f
    return None


def _insights(
    *,
    ticker: str,
    filings: list[FilingItem],
    market_available: bool,
    financial_rows: list[dict[str, str | None]],
) -> list[InsightCard]:
    filing_sources = [
        SourceRef(label=f"{f.form} filed {f.filed_at}", url=f.filing_url, form=f.form)
        for f in filings[:4]
    ]

    def_lines: list[str] = []
    for f in filings[:6]:
        def_lines.append(
            f"{f.form} on {f.filed_at} (accession {f.accession_number})—use SEC viewer or primary link in the timeline."
        )

    fact_lines: list[str] = []
    for r in financial_rows[:3]:
        label = r.get("label")
        value = r.get("value")
        period = r.get("period") or "see filing"
        if label and value:
            fact_lines.append(
                f"From SEC XBRL company facts: {label} is {value} (period end {period}). "
                "Cross-check this tag against the face financials in the 10-K/10-Q."
            )

    k = _filing_by_form(filings, "10-K")
    q = _filing_by_form(filings, "10-Q")
    eight = _filing_by_form(filings, "8-K")
    px = _filing_by_form(filings, "DEF 14A")

    snapshot_parts: list[str] = []
    if eight:
        snapshot_parts.append(f"Most recent 8-K on file: {eight.filed_at}.")
    if q:
        snapshot_parts.append(f"Latest 10-Q on file: {q.filed_at}.")
    if k:
        snapshot_parts.append(f"Latest 10-K on file: {k.filed_at}.")
    if px:
        snapshot_parts.append(f"Latest DEF 14A on file: {px.filed_at}.")
    snapshot = " ".join(snapshot_parts) if snapshot_parts else "No major form links were resolved in this response—verify the ticker and SEC availability."

    what_changed_bullets: list[str] = [snapshot]
    if def_lines:
        what_changed_bullets.append(def_lines[0])
    what_changed_bullets.append(
        "Next step: open the newest 8-K and 10-Q from the timeline; skim Item headlines and exhibits for material events, then read MD&A for management’s narrative."
    )

    what_matters_bullets = [
        "What matters in the documents: Item 1 / 1A (10-K) for business and risks; MD&A (10-Q/10-K) for performance vs. outlook; DEF 14A for pay design and governance.",
    ]
    if k or q:
        what_matters_bullets.append(
            f"Anchors on your timeline: "
            f"{f'10-K filed {k.filed_at}' if k else '10-K not linked'}; "
            f"{f'10-Q filed {q.filed_at}' if q else '10-Q not linked'}."
        )
    what_matters_bullets.append(
        "Next step: pick one thesis (e.g., demand, margins, liquidity) and trace it from MD&A numbers back to the statements and footnotes."
    )

    strong_bullets: list[str] = []
    if fact_lines:
        strong_bullets.extend(fact_lines[:2])
    else:
        strong_bullets.append(
            "SEC submission metadata is available: you have machine-readable filing dates and links into EDGAR for primary verification."
        )
    strong_bullets.append(
        "Next step: tie any headline metric you care about to a specific line item and filing (avoid orphan numbers)."
    )
    if market_available:
        strong_bullets.append(
            "Market panel adds timing context (price/technicals)—use it as context, not a substitute for filing evidence."
        )

    return [
        InsightCard(
            category="what_changed",
            title="What changed",
            bullets=what_changed_bullets[:4],
            sources=filing_sources[:3] or [SourceRef(label="SEC EDGAR", url="https://www.sec.gov/edgar/search/")],
            is_ai_synthesis=False,
        ),
        InsightCard(
            category="what_matters",
            title="What matters",
            bullets=what_matters_bullets[:4],
            sources=filing_sources[:2]
            + [SourceRef(label="EDGAR", url="https://www.sec.gov/edgar/search/")],
            is_ai_synthesis=False,
        ),
        InsightCard(
            category="strong",
            title="What looks strong",
            bullets=strong_bullets[:4],
            sources=filing_sources[:1] or [SourceRef(label="SEC", url="https://www.sec.gov/")],
            is_ai_synthesis=False,
        ),
        InsightCard(
            category="concerning",
            title="What looks concerning",
            bullets=[
                "XBRL tags and automated pulls can miss restatements, non-GAAP adjustments, or segment detail—read the filing if the number drives a decision.",
                "Technical indicators describe recent price action; they do not validate business quality or risk.",
                "Next step: flag any metric you would act on and list the exact exhibit/footnote you still need to read.",
            ],
            sources=[SourceRef(label="Interpretation caution")],
            is_ai_synthesis=False,
        ),
        InsightCard(
            category="open_questions",
            title="Open questions",
            bullets=[
                f"For {ticker}: what changed last quarter that MD&A attributes to one-time vs. recurring factors?",
                "Which risk factors are new or expanded versus the prior 10-K, and what operational evidence supports that?",
                "Next step: write down 3 questions only the 10-Q/10-K text can answer, then search those documents directly.",
            ],
            sources=[SourceRef(label="Research checklist")],
            is_ai_synthesis=False,
        ),
    ]


async def build_company_payload(ticker: str) -> dict:
    t = ticker.upper().strip()
    cik, fallback_name = await resolve_cik_for_ticker(t)
    submissions = await fetch_submissions(cik)
    name = extract_company_name(submissions, t, fallback_name)
    exchange = extract_exchange(submissions)

    filings = latest_filings_from_submissions(
        submissions,
        ["10-K", "10-Q", "8-K", "DEF 14A"],
    )

    facts_available = False
    financial_rows: list[dict[str, str | None]] = []
    try:
        facts_json = await fetch_company_facts(cik)
        financial_rows = pick_facts(facts_json)
        facts_available = len(financial_rows) > 0
    except Exception as exc:
        logger.warning("company facts failed for {}: {}", t, exc)

    financials = [
        FinancialMetric(
            label=str(r["label"]),
            value=str(r["value"]),
            period=r.get("period"),
            source=r.get("source"),
        )
        for r in financial_rows
    ]
    if len(financials) < 4:
        defaults = [
            ("Revenue", "—", "TTM", "SEC company facts (if tagged)"),
            ("Net income", "—", "TTM", "SEC company facts (if tagged)"),
            ("EPS (diluted)", "—", "MRQ", "SEC company facts (if tagged)"),
            ("Total assets", "—", "MRQ", "SEC company facts (if tagged)"),
        ]
        for label, value, period, source in defaults[len(financials) :]:
            financials.append(FinancialMetric(label=label, value=value, period=period, source=source))
            if len(financials) >= 4:
                break

    market = await build_market_bundle_async(t)
    market_available = market.last_close is not None

    techs = [
        TechnicalMetric(label="Last close", value=_fmt_num(market.last_close, prefix="$")),
        TechnicalMetric(label="SMA 20", value=_fmt_num(market.sma_20, prefix="$")),
        TechnicalMetric(label="SMA 50", value=_fmt_num(market.sma_50, prefix="$")),
        TechnicalMetric(label="SMA 200", value=_fmt_num(market.sma_200, prefix="$")),
        TechnicalMetric(label="RSI (14)", value=_fmt_num(market.rsi_14, suffix="")),
        TechnicalMetric(
            label="52-week range",
            value=f"{_fmt_num(market.week_52_low, prefix='$')} / {_fmt_num(market.week_52_high, prefix='$')}",
        ),
    ]

    price_history = (
        [PriceBar(date=str(x["date"]), close=float(x["close"])) for x in market.price_history]
        if market.price_history
        else _synthetic_prices()
    )

    px = _filing_by_form(filings, "DEF 14A")
    gov_lead = (
        f"EDGAR shows a DEF 14A filed {px.filed_at}; start there for pay tables, CD&A, and board structure."
        if px
        else "No DEF 14A link in this payload—search EDGAR for the latest proxy when available."
    )
    governance = GovernanceSummary(
        bullets=[
            gov_lead,
            "Review named executive officer compensation, equity grant practices, and clawback / hedging policies.",
            "Check board independence, committee charters, and related-party transaction disclosures.",
            "Next step: open the linked DEF 14A (or search EDGAR) and read the summary comp table plus CD&A narrative.",
        ],
        sources=(
            [SourceRef(label=f"DEF 14A filed {px.filed_at}", url=px.filing_url, form="DEF 14A")]
            if px and px.filing_url
            else [SourceRef(label="DEF 14A (search EDGAR)", url="https://www.sec.gov/edgar/search/", form="DEF 14A")]
        ),
    )

    payload = CompanyPayload(
        ticker=t,
        name=name,
        exchange=exchange,
        cik=cik,
        insights=_insights(
            ticker=t,
            filings=filings,
            market_available=market_available,
            financial_rows=financial_rows,
        ),
        filings=filings,
        filing_sections=build_section_placeholders(filings),
        financials=financials[:8],
        technicals=techs,
        price_history=price_history,
        governance=governance,
        meta=CompanyMeta(
            facts_available=facts_available,
            market_available=market_available,
            mock=False,
        ),
    )

    return payload.model_dump()

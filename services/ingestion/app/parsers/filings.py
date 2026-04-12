from __future__ import annotations

from datetime import date, datetime
from itertools import zip_longest
from typing import Any

from app.models.schemas import FilingItem, FilingSectionExcerpt


def _archives_primary_url(cik_numeric: str, accession: str, primary_document: str) -> str:
    accession_nodash = accession.replace("-", "")
    cik_num = str(int(cik_numeric))
    return f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{accession_nodash}/{primary_document}"


def _filing_index_url(cik_numeric: str, accession: str) -> str:
    accession_nodash = accession.replace("-", "")
    cik_num = str(int(cik_numeric))
    return f"https://www.sec.gov/Archives/edgar/data/{cik_num}/{accession_nodash}/{accession}-index.htm"


def _sec_viewer_url(cik_numeric: str, accession: str) -> str:
    cik_num = str(int(cik_numeric))
    return (
        "https://www.sec.gov/cgi-bin/viewer?action=view"
        f"&cik={cik_num}&accession_number={accession}&xbrl_type=v"
    )


def latest_filings_from_submissions(submissions: dict[str, Any], wanted: list[str]) -> list[FilingItem]:
    recent = submissions.get("filings", {}).get("recent", {})
    if not isinstance(recent, dict):
        return []

    forms = recent.get("form") or []
    dates = recent.get("filingDate") or []
    accs = recent.get("accessionNumber") or []
    docs = recent.get("primaryDocument") or []

    cik_numeric = str(submissions.get("_cik_numeric") or submissions.get("cik") or "")
    try:
        cik_numeric = str(int(str(cik_numeric)))
    except Exception:
        cik_numeric = str(cik_numeric)

    out: list[FilingItem] = []
    # Keep two most recent 10-Ks (newest first) so TickerChat can compare YoY risk-factor language.
    max_per_form: dict[str, int] = {f: 2 if f == "10-K" else 1 for f in wanted}
    counts: dict[str, int] = {}

    # Arrays are usually aligned, but `primaryDocument` can be shorter; zip_longest avoids silent truncation.
    for form, filed_at, accession, doc in zip_longest(forms, dates, accs, docs, fillvalue=None):
        if form is None or filed_at is None or accession is None:
            continue
        if form not in wanted:
            continue
        n = counts.get(form, 0)
        if n >= max_per_form.get(form, 1):
            continue
        counts[form] = n + 1

        primary = str(doc).strip() if doc else None
        idx_url = _filing_index_url(cik_numeric, str(accession))
        viewer_url = _sec_viewer_url(cik_numeric, str(accession))
        if primary:
            primary_url = _archives_primary_url(cik_numeric, str(accession), primary)
            doc_url = primary_url
        else:
            primary_url = None
            doc_url = idx_url

        out.append(
            FilingItem(
                form=str(form),
                filed_at=str(filed_at),
                accession_number=str(accession),
                primary_document=primary,
                filing_url=doc_url,
                filing_index_url=idx_url,
                sec_viewer_url=viewer_url,
                description=None,
            )
        )

    return out


def build_section_placeholders(filings: list[FilingItem]) -> list[FilingSectionExcerpt]:
    def meta(form: str) -> tuple[str | None, str | None]:
        for f in filings:
            if f.form == form:
                return f.filed_at, f.filing_url
        return None, None

    tenk_d, tenk = meta("10-K")
    tenq_d, tenq = meta("10-Q")
    def_d, def14a = meta("DEF 14A")

    def lead(date: str | None, form: str) -> str:
        if date:
            return f"Latest {form} on file with the SEC is dated {date}. "
        return f"We could not attach a direct {form} link in this view. "

    # Order: proxy (governance) before MD&A so shorter cards can sit higher in multi-column layouts.
    return [
        FilingSectionExcerpt(
            id="business",
            label="What the company does (Business)",
            form="10-K",
            excerpt=(
                f"{lead(tenk_d, '10-K')}"
                "In the annual report, look for “Item 1. Business”—that’s management’s plain-English overview of products, customers, and competition. "
                "Open the filing below to read it at the source."
            ),
            source_url=tenk,
        ),
        FilingSectionExcerpt(
            id="risk_factors",
            label="Risks to know about",
            form="10-K",
            excerpt=(
                f"{lead(tenk_d, '10-K')}"
                "“Risk factors” list what could hurt the business (regulation, competition, supply chain, etc.). "
                "Skim for risks that are new or longer than last year."
            ),
            source_url=tenk,
        ),
        FilingSectionExcerpt(
            id="governance",
            label="Pay & board (proxy statement)",
            form="DEF 14A",
            excerpt=(
                f"{lead(def_d, 'DEF 14A')}"
                "The proxy explains how executives are paid and how the board oversees the company. "
                "Use it to see incentives—not to predict the stock price."
            ),
            source_url=def14a,
        ),
        FilingSectionExcerpt(
            id="mdna",
            label="How management explains results (MD&A)",
            form="10-Q",
            excerpt=(
                f"{lead(tenq_d or tenk_d, '10-Q' if tenq_d else '10-K')}"
                "Management’s discussion (MD&A) connects the numbers to the story—why sales or margins moved. "
                "Start here when you want “why” behind the quarter."
            ),
            source_url=tenq or tenk,
        ),
        FilingSectionExcerpt(
            id="segments",
            label="Segment results (operating income by business)",
            form="10-Q",
            excerpt=(
                f"{lead(tenq_d or tenk_d, '10-Q' if tenq_d else '10-K')}"
                "Operating income and revenue by segment (e.g., AWS, North America, International, Advertising) appear in the "
                "segment reporting footnotes and tables—usually in the 10-Q/10-K financial statements section. "
                "The SEC company-facts API snapshot often omits these dimensional rows; read the linked filing for authoritative segment figures."
            ),
            source_url=tenq or tenk,
        ),
    ]


def _format_fact_value(val: float | int) -> str:
    x = float(val)
    ax = abs(x)
    if ax >= 1e12:
        return f"${x / 1e12:.2f}T"
    if ax >= 1e9:
        return f"${x / 1e9:.2f}B"
    if ax >= 1e6:
        return f"${x / 1e6:.2f}M"
    if ax >= 1e3:
        return f"${x:,.0f}"
    return f"${x:,.2f}"


def _parse_day_str(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s)[:10]).date()
    except ValueError:
        return None


def _parse_obs_date(r: dict[str, Any]) -> date | None:
    for k in ("end", "instant", "filed"):
        v = r.get(k)
        if not v:
            continue
        try:
            return datetime.fromisoformat(str(v)[:10]).date()
        except ValueError:
            continue
    return None


def _latest_from_units(node: dict[str, Any]) -> tuple[float | int | None, str | None, str | None]:
    """Pick the observation with the latest reporting period (by end/instant date)."""
    units_obj = node.get("units")
    if not isinstance(units_obj, dict):
        return None, None, None

    rows: list[dict[str, Any]] = []
    for key in ("USD", "EUR", "GBP", "CAD", "shares", "pure", "EPS", "USD/shares"):
        block = units_obj.get(key)
        if isinstance(block, list) and block:
            rows.extend(block)
            break
    if not rows:
        for block in units_obj.values():
            if isinstance(block, list) and block:
                rows.extend(block)
                break
    rows = [r for r in rows if r.get("val") is not None]
    if not rows:
        return None, None, None

    def period_key(r: dict[str, Any]) -> tuple[date, int]:
        d = _parse_obs_date(r) or date.min
        fp = str(r.get("fp") or "")
        fy_pref = 0 if fp == "FY" else 1
        return (d, -fy_pref)

    best = max(rows, key=period_key)
    val = best.get("val")
    if val is None:
        return None, None, None
    end = best.get("end") or best.get("instant")
    form = best.get("form")
    return val, str(end) if end else None, str(form) if form else None


def pick_facts(company_facts: dict[str, Any]) -> list[dict[str, str | None]]:
    facts = company_facts.get("facts")
    if not isinstance(facts, dict):
        return []

    us_gaap = facts.get("us-gaap")
    if not isinstance(us_gaap, dict):
        return []

    def fmt_value(tag: str, raw: float | int) -> str:
        if isinstance(raw, (int, float)) and abs(float(raw)) < 1000 and tag == "EarningsPerShareDiluted":
            return f"{float(raw):.2f}"
        if isinstance(raw, (int, float)):
            return _format_fact_value(raw)
        return str(raw)

    def latest_for_tag(tag: str) -> tuple[str | None, str | None, date | None]:
        node = us_gaap.get(tag)
        if not isinstance(node, dict):
            return None, None, None
        raw, end, _form = _latest_from_units(node)
        if raw is None:
            return None, None, None
        d = None
        if end:
            try:
                d = datetime.fromisoformat(end[:10]).date()
            except ValueError:
                d = None
        return fmt_value(tag, raw), end, d

    out: list[dict[str, str | None]] = []

    # Revenue: many filers report under ASC 606 OR legacy "Revenues" — pick ONE line with the newest period.
    revenue_tags = [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
    ]
    revenue_opts: list[tuple[date, str, str | None]] = []
    for tag in revenue_tags:
        val, end, d = latest_for_tag(tag)
        if not val:
            continue
        period = d or _parse_day_str(end) or date.min
        revenue_opts.append((period, val, end))
    if revenue_opts:
        _d, val, end = max(revenue_opts, key=lambda x: x[0])
        out.append(
            {
                "label": "Revenue",
                "value": val,
                "period": end,
                "source": "SEC XBRL company facts",
            }
        )

    other = [
        ("GrossProfit", "Gross profit"),
        ("OperatingIncomeLoss", "Operating income"),
        ("NetIncomeLoss", "Net income"),
        ("EarningsPerShareDiluted", "EPS (diluted)"),
        ("Assets", "Total assets"),
    ]
    for tag, label in other:
        val, end, _d = latest_for_tag(tag)
        if val:
            out.append({"label": label, "value": val, "period": end, "source": "SEC XBRL company facts"})

    return out[:8]


def _rows_from_units_node(node: dict[str, Any]) -> list[dict[str, Any]]:
    """Collect fact rows from a company-facts concept node; prefer USD (same strategy as _latest_from_units)."""
    units_obj = node.get("units")
    if not isinstance(units_obj, dict):
        return []
    rows: list[dict[str, Any]] = []
    for key in ("USD", "EUR", "GBP", "CAD", "shares", "pure", "EPS", "USD/shares"):
        block = units_obj.get(key)
        if isinstance(block, list) and block:
            rows.extend([r for r in block if isinstance(r, dict) and r.get("val") is not None])
            break
    if not rows:
        for block in units_obj.values():
            if isinstance(block, list) and block:
                rows.extend([r for r in block if isinstance(r, dict) and r.get("val") is not None])
                break
    return rows


QUARTERLY_FP = frozenset({"Q1", "Q2", "Q3", "Q4"})


def _row_fp(r: dict[str, Any]) -> str:
    return str(r.get("fp") or "").strip().upper()


def _filter_period_consistent_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Avoid mixing quarterly points with FY annual totals (FY spikes every ~4th bar on mixed charts)."""
    if not rows:
        return []
    quarterly = [r for r in rows if _row_fp(r) in QUARTERLY_FP]
    if len(quarterly) >= 3:
        return quarterly
    fy_rows = [r for r in rows if _row_fp(r) == "FY"]
    if len(fy_rows) >= 2:
        return fy_rows
    if quarterly:
        return quarterly
    no_fy = [r for r in rows if _row_fp(r) != "FY"]
    return no_fy if no_fy else rows


def _normalize_period_day(end: str) -> str:
    """ISO date prefix so revenue vs net income align on the same calendar key."""
    s = str(end).strip()
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    return s


def _dedupe_rows_by_period_end(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_end: dict[str, dict[str, Any]] = {}
    for r in rows:
        raw = str(r.get("end") or r.get("instant") or "")
        if not raw:
            continue
        end = _normalize_period_day(raw)
        filed = str(r.get("filed") or "")
        prev = by_end.get(end)
        if prev is None or filed >= str(prev.get("filed") or ""):
            by_end[end] = r
    sorted_ends = sorted(by_end.keys(), key=lambda e: _parse_day_str(e) or date.min)
    return [by_end[e] for e in sorted_ends]


def _extract_us_gaap_metric_series_single_tag(
    company_facts: dict[str, Any],
    tag: str,
    *,
    max_points: int,
) -> list[dict[str, Any]]:
    """Build a period series from one us-gaap tag, or []."""
    facts = company_facts.get("facts")
    if not isinstance(facts, dict):
        return []
    us_gaap = facts.get("us-gaap")
    if not isinstance(us_gaap, dict):
        return []
    node = us_gaap.get(tag)
    if not isinstance(node, dict):
        return []

    rows = _rows_from_units_node(node)
    if not rows:
        return []

    rows = _filter_period_consistent_rows(rows)
    rows = _dedupe_rows_by_period_end(rows)
    tail = rows[-max_points:] if len(rows) > max_points else rows

    out: list[dict[str, Any]] = []
    for r in tail:
        raw = str(r.get("end") or r.get("instant") or "")
        if not raw:
            continue
        end = _normalize_period_day(raw)
        val = r.get("val")
        if val is None:
            continue
        try:
            v = float(val)
        except (TypeError, ValueError):
            continue
        out.append({"period_end": end, "value_usd": v})
    return out


def extract_us_gaap_metric_series(
    company_facts: dict[str, Any],
    tag_names: list[str],
    *,
    max_points: int = 80,
) -> list[dict[str, Any]]:
    """Time series from us-gaap tags; USD-preferring; quarterly vs FY not mixed.

    When multiple tag names are provided, picks the candidate whose **latest period_end**
    is most recent (avoids stale concepts e.g. legacy OperatingExpenses ending years ago
    while CostsAndExpenses carries current quarters).
    """
    if not tag_names:
        return []

    best: list[dict[str, Any]] | None = None
    best_latest: date | None = None
    for tag in tag_names:
        out = _extract_us_gaap_metric_series_single_tag(
            company_facts, tag, max_points=max_points
        )
        if not out:
            continue
        last_d = _parse_day_str(out[-1]["period_end"])
        if last_d is None:
            continue
        if best_latest is None or last_d > best_latest:
            best_latest = last_d
            best = out

    return best or []


def _segment_member_label(segments: Any) -> str:
    if not isinstance(segments, list) or not segments:
        return "segment"
    parts: list[str] = []
    for seg in segments[:8]:
        if not isinstance(seg, dict):
            continue
        m = str(seg.get("member") or seg.get("value") or "")
        if ":" in m:
            m = m.split(":")[-1]
        m = m.replace("Member", "").replace("_", " ").strip()
        if m:
            parts.append(m[:72])
    return " · ".join(parts) if parts else "segment"


def extract_segment_dimensional_facts(
    company_facts: dict[str, Any],
    *,
    max_rows: int = 200,
) -> list[dict[str, Any]]:
    """Dimensional facts (segment / axis) when present in the company-facts JSON.

    Many large filers omit segment rows from the public bulk JSON; this returns [] then.
    When rows exist, they power TickerChat answers for segment operating income / revenue.
    """
    facts = company_facts.get("facts")
    if not isinstance(facts, dict):
        return []
    us_gaap = facts.get("us-gaap")
    if not isinstance(us_gaap, dict):
        return []

    def tag_relevant(tag: str) -> bool:
        t = tag
        return any(
            k in t
            for k in (
                "OperatingIncome",
                "IncomeLoss",
                "Revenue",
                "Segment",
                "Profit",
                "ReportingSegment",
                "CostsAndExpenses",
            )
        )

    out: list[dict[str, Any]] = []
    for tag, node in us_gaap.items():
        if not isinstance(node, dict) or not tag_relevant(tag):
            continue
        rows = _rows_from_units_node(node)
        for r in rows:
            if not isinstance(r, dict) or r.get("val") is None:
                continue
            segs = r.get("segments")
            if not segs:
                continue
            raw_end = str(r.get("end") or r.get("instant") or "")
            if len(raw_end) < 10:
                continue
            period_end = _normalize_period_day(raw_end)
            try:
                v = float(r["val"])
            except (TypeError, ValueError):
                continue
            fp = _row_fp(r)
            if fp not in QUARTERLY_FP and fp != "FY":
                continue
            out.append(
                {
                    "metric_tag": tag,
                    "period_end": period_end,
                    "value_usd": v,
                    "segment_label": _segment_member_label(segs),
                    "fiscal_period": fp,
                }
            )
            if len(out) >= max_rows:
                return sorted(out, key=lambda x: x["period_end"])
    return sorted(out, key=lambda x: x["period_end"])


def build_segment_reporting_context(filings: list[FilingItem]) -> dict[str, Any]:
    tenq = next((f for f in filings if f.form == "10-Q"), None)
    tenk = next((f for f in filings if f.form == "10-K"), None)
    primary = tenq or tenk
    summary = (
        "Segment-level operating income and revenue (e.g., by product line or geography) are in the segment reporting "
        "footnotes—typically in the 10-Q or 10-K financial statements. The SEC company-facts bulk feed often does not "
        "include dimensional segment rows; when `segment_facts` below is empty, use the linked filing for authoritative tables."
    )
    return {
        "summary": summary,
        "filing_url": primary.filing_url if primary else None,
        "form": primary.form if primary else None,
        "filed_at": primary.filed_at if primary else None,
    }


def extract_revenue_series(
    company_facts: dict[str, Any],
    *,
    max_points: int = 80,
) -> list[dict[str, Any]]:
    """Revenue (USD) from the best revenue tag; quarterly rows only when enough quarters exist (no FY spike)."""
    tags = [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
    ]
    return extract_us_gaap_metric_series(company_facts, tags, max_points=max_points)

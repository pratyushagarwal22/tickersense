from __future__ import annotations

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
    seen: set[str] = set()

    # Arrays are usually aligned, but `primaryDocument` can be shorter; zip_longest avoids silent truncation.
    for form, filed_at, accession, doc in zip_longest(forms, dates, accs, docs, fillvalue=None):
        if form is None or filed_at is None or accession is None:
            continue
        if form not in wanted:
            continue
        if form in seen:
            continue
        seen.add(form)

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
            return f"From EDGAR metadata: latest linked {form} filing date is {date}. "
        return f"No {form} link resolved in this payload yet. "

    return [
        FilingSectionExcerpt(
            id="business",
            label="Business",
            form="10-K",
            excerpt=(
                f"{lead(tenk_d, '10-K')}"
                "Item 1 (Business) text is not auto-extracted in v1—open the primary document and read Item 1 for the company’s own description of operations."
            ),
            source_url=tenk,
        ),
        FilingSectionExcerpt(
            id="risk_factors",
            label="Risk factors",
            form="10-K",
            excerpt=(
                f"{lead(tenk_d, '10-K')}"
                "Item 1A (Risk Factors) is where material risks are listed; compare wording to the prior 10-K to see what changed."
            ),
            source_url=tenk,
        ),
        FilingSectionExcerpt(
            id="mdna",
            label="MD&A",
            form="10-Q",
            excerpt=(
                f"{lead(tenq_d or tenk_d, '10-Q' if tenq_d else '10-K')}"
                "Item 2 (MD&A) in the 10-Q (or Item 7 in the 10-K) is usually the fastest path to management’s explanation of results and outlook."
            ),
            source_url=tenq or tenk,
        ),
        FilingSectionExcerpt(
            id="governance",
            label="Governance / executive compensation",
            form="DEF 14A",
            excerpt=(
                f"{lead(def_d, 'DEF 14A')}"
                "DEF 14A holds executive compensation tables, CD&A, and board/governance disclosures—use the linked proxy as the source of truth."
            ),
            source_url=def14a,
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


def _latest_from_units(node: dict[str, Any]) -> tuple[float | int | None, str | None, str | None]:
    """SEC company facts nest observations under tag['units']['USD'], not tag['USD']."""
    units_obj = node.get("units")
    if not isinstance(units_obj, dict):
        return None, None, None

    rows: list[dict[str, Any]] = []
    for key in ("USD", "EUR", "GBP", "CAD", "shares", "pure", "EPS", "USD/shares"):
        block = units_obj.get(key)
        if isinstance(block, list) and block:
            rows = block
            break
    if not rows:
        for block in units_obj.values():
            if isinstance(block, list) and block:
                rows = block
                break
    if not rows:
        return None, None, None

    def sort_key(r: dict[str, Any]) -> tuple[str, int, int]:
        end = str(r.get("end") or r.get("instant") or "")
        fp = str(r.get("fp") or "")
        fy_raw = r.get("fy")
        try:
            fy = int(fy_raw) if fy_raw is not None else 0
        except (TypeError, ValueError):
            fy = 0
        fy_pref = 0 if fp == "FY" else 1
        return (end, fy_pref, fy)

    rows_sorted = sorted(rows, key=sort_key)
    last = rows_sorted[-1]
    val = last.get("val")
    if val is None:
        return None, None, None
    end = last.get("end") or last.get("instant")
    form = last.get("form")
    return val, str(end) if end else None, str(form) if form else None


def pick_facts(company_facts: dict[str, Any]) -> list[dict[str, str | None]]:
    facts = company_facts.get("facts")
    if not isinstance(facts, dict):
        return []

    us_gaap = facts.get("us-gaap")
    if not isinstance(us_gaap, dict):
        return []

    def latest_value(tag: str) -> tuple[str | None, str | None]:
        node = us_gaap.get(tag)
        if not isinstance(node, dict):
            return None, None
        raw, end, _form = _latest_from_units(node)
        if raw is None:
            return None, None
        if isinstance(raw, (int, float)):
            if abs(float(raw)) < 1000 and tag == "EarningsPerShareDiluted":
                return f"{float(raw):.2f}", end
            return _format_fact_value(raw), end
        return str(raw), end

    # Order: try common revenue tags first (filers vary).
    candidates = [
        ("Revenues", "Revenue"),
        ("SalesRevenueNet", "Revenue"),
        ("RevenueFromContractWithCustomerExcludingAssessedTax", "Revenue (ASC 606)"),
        ("NetIncomeLoss", "Net income"),
        ("EarningsPerShareDiluted", "EPS (diluted)"),
        ("Assets", "Total assets"),
    ]

    out: list[dict[str, str | None]] = []
    seen_labels: set[str] = set()
    for tag, label in candidates:
        value, end = latest_value(tag)
        if value and label not in seen_labels:
            seen_labels.add(label)
            out.append({"label": label, "value": value, "period": end, "source": "SEC XBRL company facts"})
        if len(out) >= 4:
            break

    return out

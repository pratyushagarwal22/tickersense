from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


InsightCategory = Literal[
    "what_changed",
    "what_matters",
    "strong",
    "concerning",
    "open_questions",
]


class SourceRef(BaseModel):
    label: str
    url: str | None = None
    form: str | None = None


class InsightCard(BaseModel):
    category: InsightCategory
    title: str
    bullets: list[str] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)
    is_ai_synthesis: bool | None = False


class FilingItem(BaseModel):
    form: str
    filed_at: str
    accession_number: str
    primary_document: str | None = None
    filing_url: str | None = None
    filing_index_url: str | None = None
    sec_viewer_url: str | None = None
    description: str | None = None


class FilingSectionExcerpt(BaseModel):
    id: str
    label: str
    form: str | None = None
    excerpt: str
    source_url: str | None = None


class FinancialMetric(BaseModel):
    label: str
    value: str
    period: str | None = None
    source: str | None = None


class TechnicalMetric(BaseModel):
    label: str
    value: str


class PriceBar(BaseModel):
    date: str
    close: float


class GovernanceSummary(BaseModel):
    bullets: list[str] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)


class CompanyMeta(BaseModel):
    facts_available: bool
    market_available: bool
    mock: bool | None = False


class CompanyPayload(BaseModel):
    ticker: str
    name: str
    exchange: str | None = None
    cik: str | None = None
    insights: list[InsightCard] = Field(default_factory=list)
    filings: list[FilingItem] = Field(default_factory=list)
    filing_sections: list[FilingSectionExcerpt] = Field(default_factory=list)
    financials: list[FinancialMetric] = Field(default_factory=list)
    technicals: list[TechnicalMetric] = Field(default_factory=list)
    price_history: list[PriceBar] = Field(default_factory=list)
    governance: GovernanceSummary = Field(default_factory=GovernanceSummary)
    meta: CompanyMeta

    model_config = {"extra": "ignore"}


class HealthResponse(BaseModel):
    status: str


class ErrorDetail(BaseModel):
    detail: Any

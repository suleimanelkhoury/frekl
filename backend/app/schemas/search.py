"""Pydantic schemas for the global search endpoint."""

from pydantic import BaseModel


class SearchHit(BaseModel):
    """One aggregated search result.

    Hits are grouped by name (case-insensitive) across ALL budgets —
    a monthly item yields one hit, not one per month. `occurrences` is
    the number of distinct budgets containing the name; the remaining
    fields describe the MOST RECENT occurrence (budget id for
    deep-linking, month/year for display).
    """

    budget_id: int
    budget_title: str
    month: int
    year: int
    label: str  # the matched text: budget title / category name / item label
    category: str | None = None  # set for item hits
    occurrences: int  # distinct budgets containing the name


class SearchResponse(BaseModel):
    """Grouped search results, each group newest-first and capped."""

    query: str
    budgets: list[SearchHit]
    categories: list[SearchHit]
    items: list[SearchHit]

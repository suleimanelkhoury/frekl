"""Pydantic schemas for the investments overview endpoint."""

from decimal import Decimal

from pydantic import BaseModel


class InvestmentMonth(BaseModel):
    """One month's investing — the Investitionen category of a budget.

    Budgets without an investment category contribute zeros so the
    timeline shows gaps instead of skipping months (same philosophy as
    the category-trend endpoint).
    """

    budget_id: int
    title: str
    month: int
    year: int
    projected: Decimal  # SOLL invested
    actual: Decimal  # IST invested
    cumulative: Decimal  # running total of actual across all months


class InvestmentItem(BaseModel):
    """One investment row (e.g. "MSCI World") aggregated across budgets."""

    label: str  # most recent spelling
    occurrences: int
    total: Decimal


class InvestmentsResponse(BaseModel):
    """The full investing history: per month, per row, and the total."""

    months: list[InvestmentMonth]
    items: list[InvestmentItem]
    total: Decimal  # the final cumulative value

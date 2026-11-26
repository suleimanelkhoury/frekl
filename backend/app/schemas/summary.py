"""Pydantic schemas for summary, category-summary, and chart-data endpoints."""

from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BudgetSummary(BaseModel):
    """Grand totals for a budget — SOLL/IST/UNTERSCHIED."""

    model_config = ConfigDict(from_attributes=True)

    # Income
    total_projected_income: Decimal
    total_actual_income: Decimal

    # Income breakdown: salary (Gehalt) vs. extra (Übertrag/Zusatzeinkommen)
    total_projected_gehalt: Decimal
    total_actual_gehalt: Decimal
    total_projected_extra: Decimal
    total_actual_extra: Decimal

    # Expenses
    total_projected_expenses: Decimal
    total_actual_expenses: Decimal

    # Balance = income - expenses
    projected_balance: Decimal  # SOLL BALANCE
    actual_balance: Decimal  # IST BALANCE
    balance_difference: Decimal  # UNTERSCHIED (actual balance - projected balance)

    # Expense difference
    expense_difference: Decimal  # projected expenses - actual expenses


class CategorySubtotal(BaseModel):
    """Subtotal (Zwischensumme) for a single category."""

    model_config = ConfigDict(from_attributes=True)

    category_id: int
    category_name: str
    sort_order: int
    item_count: int
    projected_subtotal: Decimal
    actual_subtotal: Decimal
    difference: Decimal


class CategorySummaryResponse(BaseModel):
    """Per-category subtotals for a budget."""

    budget_id: int
    categories: list[CategorySubtotal]


class ChartDataPoint(BaseModel):
    """A single data point for charts (e.g. expenses by category)."""

    label: str
    projected: Decimal
    actual: Decimal
    # Only set by the category-trend endpoint; lets the frontend render
    # proper month-year axis labels.
    month: int | None = None
    year: int | None = None


class ChartData(BaseModel):
    """Data structured for frontend charts."""

    budget_id: int
    budget_title: str
    # Bar / pie chart: expenses by category
    expenses_by_category: list[ChartDataPoint]
    # Summary numbers for comparison charts
    income_vs_expenses: ChartDataPoint


class CategoryTrendResponse(BaseModel):
    """Monthly SOLL/IST totals for one category across recent months."""

    category_name: str
    months: list[ChartDataPoint]


class TopItem(BaseModel):
    """A single expense row aggregated across all of a user's budgets."""

    label: str
    # Category of the row's first occurrence (display context)
    category: str
    total: Decimal


class TopItemsResponse(BaseModel):
    """Expense rows ranked by summed actual spending across all budgets."""

    items: list[TopItem]


class ItemHistoryEntry(BaseModel):
    """A single expense item occurrence of one row label, in one budget."""

    budget_id: int
    budget_title: str
    month: int
    year: int
    # Category the item lives in (the same row label can appear in
    # different categories across budgets)
    category: str
    label: str
    projected_cost: Decimal
    actual_cost: Decimal
    difference: Decimal


class ItemHistoryResponse(BaseModel):
    """Every expense item entry for one row label across ALL budgets."""

    label: str
    entries: list[ItemHistoryEntry]
    total_projected: Decimal
    total_actual: Decimal


class RowUsage(BaseModel):
    """How often one expense row label occurs across all budgets."""

    label: str
    # Category of the row's first occurrence (display context)
    category: str
    occurrences: int
    # Number of distinct budgets the label appears in
    budget_count: int
    total_actual: Decimal
    # Budget of the row's first occurrence (display context for
    # one-time rows)
    month: int
    year: int


class SimilarNameGroup(BaseModel):
    """A cluster of expense row labels with very similar names."""

    labels: list[RowUsage]


class BudgetAnalysisResponse(BaseModel):
    """Label analysis across all budgets.

    `one_time` holds rows that occurred exactly once; `similar` holds
    clusters of row labels whose names are near-duplicates (likely the
    same recurring row spelled differently).
    """

    one_time: list[RowUsage]
    similar: list[SimilarNameGroup]


class BudgetComparisonEntry(BaseModel):
    """A single budget's totals within a multi-month comparison."""

    model_config = ConfigDict(from_attributes=True)

    budget_id: int
    title: str
    month: int
    year: int
    total_projected_income: Decimal
    total_actual_income: Decimal
    total_projected_gehalt: Decimal
    total_actual_gehalt: Decimal
    total_projected_extra: Decimal
    total_actual_extra: Decimal
    total_projected_expenses: Decimal
    total_actual_expenses: Decimal
    projected_balance: Decimal
    actual_balance: Decimal


class BudgetComparison(BaseModel):
    """Multi-month comparison of budgets belonging to a user."""

    budgets: list[BudgetComparisonEntry]


class YearlyCategoryTotal(BaseModel):
    """Aggregated total for a single category across one year."""

    name: str
    total: Decimal  # actual (IST) total spent in that category during the year


class YearlyComparisonEntry(BaseModel):
    """Aggregated totals for a single year across all of a user's budgets."""

    year: int
    total_income: Decimal  # actual income (IST)
    total_gehalt: Decimal  # actual salary (IST)
    total_extra: Decimal  # actual extra income (IST)
    total_expenses: Decimal  # actual expenses (IST)
    total_balance: Decimal  # actual balance (IST)
    invested: Decimal  # actual amount invested (Investitionen category)
    categories: list[YearlyCategoryTotal]


class YearlyComparison(BaseModel):
    """Comparison of a user's budgets aggregated by year."""

    years: list[YearlyComparisonEntry]


class RecurringItem(BaseModel):
    """One recurring expense row aggregated across all budgets.

    A row counts as recurring when it appears at a REGULAR cadence —
    gaps between occurrence months must be consistent (monthly, every
    three months like GEZ, yearly); random appearances don't qualify
    (see app/services/recurring.py). Trend compares the average actual
    cost of the earliest entries against the latest entries — direction
    is "up" (recently pricier), "down", or "flat"; None when the row
    has fewer than two entries.
    """

    label: str  # most recent spelling
    category: str  # most recent category spelling
    occurrences: int  # total row entries across all budgets
    budget_count: int  # distinct budgets (months) the row appears in
    first_month: int
    first_year: int
    last_month: int
    last_year: int
    total_actual: Decimal
    # Average actual cost per entry (per bill, not per month)
    avg_actual: Decimal
    # Detected interval in months: 1 = monthly, 3 = quarterly, …
    cadence_months: int
    # Trend: averages of the earliest/latest half of the entries
    # (middle entry skipped when the count is odd); None below 2 entries
    early_avg: Decimal | None = None
    late_avg: Decimal | None = None
    direction: str | None = None  # "up" | "down" | "flat"
    # Relative change between the two halves, in percent
    change_pct: float | None = None


class RecurringResponse(BaseModel):
    """All recurring rows of a user, sorted by total actual spending."""

    items: list[RecurringItem] = []

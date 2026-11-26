"""Investments overview — the Investitionen categories across budgets.

Builds the investing history for the dedicated Investments page: the
per-month SOLL/IST invested amounts with a running cumulative total
(the growth of the portfolio), plus a per-row breakdown (MSCI World,
BYD, …) aggregated across all budgets.

A category counts as an investment category when its name matches
"investitionen"/"investments" (same rule as the summary service).
"""

from decimal import Decimal

from app.models.user import User
from app.schemas.investments import (
    InvestmentItem,
    InvestmentMonth,
    InvestmentsResponse,
)
from app.services.summary import _is_investment_category


def investment_overview(user: User) -> InvestmentsResponse:
    """Aggregate the investing history across ALL of the user's budgets."""
    months: list[InvestmentMonth] = []
    cumulative = Decimal("0")

    # key (lowercased label) -> [total, occurrences, most recent label]
    item_acc: dict[str, list] = {}

    budgets = sorted(user.budgets, key=lambda b: (b.year, b.month, b.id))
    for budget in budgets:
        projected = Decimal("0")
        actual = Decimal("0")
        for category in budget.categories:
            if not _is_investment_category(category.name):
                continue
            for item in category.items:
                projected += item.projected_cost
                actual += item.actual_cost
                key = item.label.strip().lower()
                entry = item_acc.setdefault(
                    key, [Decimal("0"), 0, item.label]
                )
                entry[0] += item.actual_cost
                entry[1] += 1
                entry[2] = item.label  # display follows the latest month

        cumulative += actual
        months.append(
            InvestmentMonth(
                budget_id=budget.id,
                title=budget.title,
                month=budget.month,
                year=budget.year,
                projected=projected,
                actual=actual,
                cumulative=cumulative,
            )
        )

    items = [
        InvestmentItem(label=label, occurrences=occurrences, total=total)
        for total, occurrences, label in sorted(
            item_acc.values(), key=lambda e: e[0], reverse=True
        )
    ]

    return InvestmentsResponse(months=months, items=items, total=cumulative)

"""Global search — find budgets, categories, and expense items by name.

A single endpoint powering the header search box: one substring query,
three result groups (budget titles, category names, item labels).

Results are GLOBAL, not per budget: each group contains one hit per
distinct name (matched case-insensitively, like top-items / recurring),
with the number of occurrences and the most recent occurrence as
context (budget id for deep-linking, month/year for display). A
monthly row like "Streaming" therefore yields ONE hit covering all 21
budgets, not 21 separate ones.

Matching is case-insensitive; groups are returned newest-first (ordered
by their most recent occurrence) and capped so a short needle like "a"
can't flood the response.
"""

from app.models.user import User
from app.services.chronology import chronological_budgets
from app.services.labels import simple_label
from app.schemas.search import SearchHit, SearchResponse

MAX_BUDGET_HITS = 10
MAX_CATEGORY_HITS = 10
MAX_ITEM_HITS = 20


def search_user_data(user: User, query: str) -> SearchResponse:
    """Search ALL of the user's budgets for the given substring.

    Returns aggregated hits: one per distinct budget title, category
    name, and item label.
    """
    needle = simple_label(query)
    if not needle:
        return SearchResponse(query=query, budgets=[], categories=[], items=[])

    # Normalized name -> accumulator. Iterating newest-first and using
    # setdefault means the FIRST (most recent) occurrence provides the
    # display spelling and deep-link context.
    budget_acc: dict[str, dict] = {}
    category_acc: dict[str, dict] = {}
    item_acc: dict[str, dict] = {}

    budgets = chronological_budgets(user.budgets, reverse=True)
    for budget in budgets:
        key = simple_label(budget.title)
        budget_acc.setdefault(
            key,
            {
                "label": budget.title,
                "budgets": set(),
                "budget_id": budget.id,
                "budget_title": budget.title,
                "month": budget.month,
                "year": budget.year,
            },
        )["budgets"].add(budget.id)

        for category in budget.categories:
            cat_key = simple_label(category.name)
            cat_entry = category_acc.setdefault(
                cat_key,
                {
                    "label": category.name,
                    "budgets": set(),
                    "budget_id": budget.id,
                    "budget_title": budget.title,
                    "month": budget.month,
                    "year": budget.year,
                },
            )
            cat_entry["budgets"].add(budget.id)

            for item in category.items:
                if needle not in item.label.lower():
                    continue
                item_key = simple_label(item.label)
                item_acc.setdefault(
                    item_key,
                    {
                        "label": item.label,
                        "category": category.name,
                        "budgets": set(),
                        "budget_id": budget.id,
                        "budget_title": budget.title,
                        "month": budget.month,
                        "year": budget.year,
                    },
                )
                item_acc[item_key]["budgets"].add(budget.id)

    def to_hit(entry: dict, *, with_category: bool = False) -> SearchHit:
        return SearchHit(
            budget_id=entry["budget_id"],
            budget_title=entry["budget_title"],
            month=entry["month"],
            year=entry["year"],
            label=entry["label"],
            category=entry.get("category") if with_category else None,
            occurrences=len(entry["budgets"]),
        )

    return SearchResponse(
        query=query,
        budgets=[
            to_hit(e) for e in budget_acc.values() if needle in e["label"].lower()
        ][:MAX_BUDGET_HITS],
        categories=[
            to_hit(e)
            for e in category_acc.values()
            if needle in e["label"].lower()
        ][:MAX_CATEGORY_HITS],
        items=[
            to_hit(e, with_category=True)
            for e in item_acc.values()
        ][:MAX_ITEM_HITS],
    )

"""Budget analysis — label hygiene across all of a user's budgets.

Two views for cleaning up recurring rows:
- one-time rows: labels that occurred exactly once ever
- similar names: clusters of labels whose names are near-duplicates
  (likely the same recurring row spelled differently — "Lidl" vs
  "LIDL", "Deutsche Bahn" vs "Deutschebahn")
"""

from decimal import Decimal
from difflib import SequenceMatcher

from app.models.user import User
from app.services.chronology import chronological_budgets
from app.services.labels import normalize_label
from app.schemas.summary import (
    BudgetAnalysisResponse,
    RowUsage,
    SimilarNameGroup,
)

# Two labels whose normalized names match at or above this ratio are
# considered "very similar" (SequenceMatcher ratio: 1.0 = identical).
# 0.8 catches typos and shorthand variants ("Lidl" / "LIDL ",
# "Amazon" / "Amazom") without merging genuinely different rows.
SIMILARITY_THRESHOLD = 0.8


def analyze_user_labels(user: User) -> BudgetAnalysisResponse:
    """Analyze every expense row label across ALL of the user's budgets."""
    # Raw label -> accumulated stats. Raw spelling is kept distinct so
    # different spellings surface as near-duplicates instead of silently
    # merging (the top-items ranking merges case-insensitively; this
    # analysis is exactly the place to expose them).
    stats: dict[str, dict] = {}
    budgets = chronological_budgets(user.budgets)
    for budget in budgets:
        for category in budget.categories:
            for item in category.items:
                entry = stats.setdefault(
                    item.label,
                    {
                        "occurrences": 0,
                        "budget_ids": set(),
                        "total_actual": Decimal("0"),
                        "category": category.name,
                        "month": budget.month,
                        "year": budget.year,
                    },
                )
                entry["occurrences"] += 1
                entry["budget_ids"].add(budget.id)
                entry["total_actual"] += item.actual_cost

    def to_usage(label: str) -> RowUsage:
        s = stats[label]
        return RowUsage(
            label=label,
            category=s["category"],
            occurrences=s["occurrences"],
            budget_count=len(s["budget_ids"]),
            total_actual=s["total_actual"],
            month=s["month"],
            year=s["year"],
        )

    # One-time rows: occurred exactly once ever
    one_time = [
        to_usage(label) for label, s in stats.items() if s["occurrences"] == 1
    ]
    one_time.sort(key=lambda u: (u.total_actual, u.label), reverse=True)

    # Cluster distinct raw labels whose normalized names are very
    # similar (union-find over pairwise SequenceMatcher ratios)
    labels = list(stats)
    normalized = {label: normalize_label(label) for label in labels}
    parent = {label: label for label in labels}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for i, a in enumerate(labels):
        for b in labels[i + 1 :]:
            ratio = SequenceMatcher(
                None, normalized[a], normalized[b], autojunk=False
            ).ratio()
            if ratio >= SIMILARITY_THRESHOLD:
                parent[find(b)] = find(a)

    clusters: dict[str, list[str]] = {}
    for label in labels:
        clusters.setdefault(find(label), []).append(label)

    similar: list[SimilarNameGroup] = []
    for members in clusters.values():
        if len(members) < 2:
            continue
        usages = sorted(
            (to_usage(m) for m in members),
            key=lambda u: (u.total_actual, u.label),
            reverse=True,
        )
        similar.append(SimilarNameGroup(labels=usages))
    similar.sort(
        key=lambda g: sum(u.total_actual for u in g.labels), reverse=True
    )

    return BudgetAnalysisResponse(one_time=one_time, similar=similar)

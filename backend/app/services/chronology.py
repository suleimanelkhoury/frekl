"""Chronological ordering of a user's budgets.

Every cross-budget view iterates budgets oldest → newest (or the
reverse). The sort key must include the ``id`` tie-break: two budgets
can share a (year, month) — without the id the order is
nondeterministic and "first-seen"/"most recent" display spellings
would flicker between requests.
"""

from app.models.budget import Budget


def chronological_budgets(
    budgets: list[Budget], *, reverse: bool = False
) -> list[Budget]:
    """Return `budgets` sorted by (year, month, id), oldest first.

    With ``reverse=True`` the newest budget comes first.
    """
    return sorted(budgets, key=lambda b: (b.year, b.month, b.id), reverse=reverse)

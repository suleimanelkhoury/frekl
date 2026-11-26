"""Smart prefill — draft a new budget's SOLL rows from spending history.

Two strategies, selected per request via `BudgetCreate.prefill`:

- ``last``: copy the plan of the budget immediately before the target
  month (same as cloning, but the source is picked automatically and
  the carryover is correct — see below).
- ``average``: plan from what was actually spent, averaged over the
  last up to three budgets before the target month. Only rows that
  appear in EVERY budget of the window are planned (recurring rows);
  one-offs and rows seen in only some months are dropped, as are rows
  with no actual spending at all.

Both strategies zero out the actual (IST) amounts — the new month
starts empty — and share one important money-model rule: the "Extra"
income row's SOLL is the previous budget's ACTUAL balance (the
carryover), never a copied or averaged Extra amount. Monthly balances
must never be summed or averaged across months, because the same
money is carried forward month after month.
"""

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.expense_item import ExpenseItem
from app.models.income import Income
from app.models.user import User
from app.schemas.budget import BudgetCreate, PrefillStrategy
from app.services.summary import _is_salary_label, calculate_budget_summary

# Budgets whose actual spending is averaged in the "average" strategy.
PREFILL_AVERAGE_WINDOW = 3

# Money is stored with two decimal places; averaged amounts are rounded
# half-up (the conventional rounding for money).
_TWO_PLACES = Decimal("0.01")


@dataclass
class PrefillIncome:
    """One income row for the new budget (actual starts at zero)."""

    label: str
    projected_amount: Decimal


@dataclass
class PrefillItem:
    """One expense row for the new budget (actual starts at zero)."""

    label: str
    projected_cost: Decimal


@dataclass
class PrefillCategory:
    """One category with its prefilled expense rows."""

    name: str
    sort_order: int
    items: list[PrefillItem] = field(default_factory=list)


@dataclass
class PrefillContent:
    """The drafted content of a new budget, ready to be persisted."""

    incomes: list[PrefillIncome] = field(default_factory=list)
    categories: list[PrefillCategory] = field(default_factory=list)


def history_budgets(
    user: User, *, year: int, month: int, count: int
) -> list[Budget]:
    """Return the `count` budgets strictly before (year, month), newest first.

    "Strictly before" keeps the target month itself out of the window —
    prefilling a past month (e.g. filling a gap in the archive) only
    uses budgets from earlier months. If the target month's budget
    already exists, it is not used as a source either.
    """
    earlier = [b for b in user.budgets if (b.year, b.month) < (year, month)]
    earlier.sort(key=lambda b: (b.year, b.month, b.id), reverse=True)
    return earlier[:count]


def _extra_carryover(db: Session, budget: Budget) -> Decimal:
    """The carryover a new month starts with: `budget`'s actual balance."""
    return calculate_budget_summary(budget, db).actual_balance


def _is_extra_label(label: str) -> bool:
    """True if an income row is the carryover row ("Extra")."""
    return label.strip().lower() == "extra"


def _build_last(
    user: User, *, year: int, month: int, db: Session
) -> PrefillContent | None:
    """Draft from the single budget immediately before the target.

    Copies the source's projected (SOLL) values verbatim — the user's
    plan travels month to month — except for the Extra row, whose SOLL
    becomes the source's actual balance (the real carryover, which a
    plain clone would get wrong by copying the source's planned Extra).
    """
    window = history_budgets(user, year=year, month=month, count=1)
    if not window:
        return None
    source = window[0]
    carryover = _extra_carryover(db, source)

    content = PrefillContent()
    for income in source.incomes:
        projected = income.projected_amount
        if _is_extra_label(income.label):
            projected = carryover
        content.incomes.append(
            PrefillIncome(label=income.label, projected_amount=projected)
        )

    for category in source.categories:
        prefill_category = PrefillCategory(
            name=category.name, sort_order=category.sort_order
        )
        for item in category.items:
            prefill_category.items.append(
                PrefillItem(label=item.label, projected_cost=item.projected_cost)
            )
        content.categories.append(prefill_category)

    return content


def _build_average(
    user: User, *, year: int, month: int, db: Session
) -> PrefillContent | None:
    """Draft from the actual spending of the last up-to-three budgets.

    Only RECURRING rows are planned: a row must appear in every budget
    of the window (matched case-insensitively — same rule as top-items
    / analysis — and counted once per budget, so duplicate rows within
    a single month don't fake recurrence). Each kept row's SOLL is its
    summed actual spending divided by the window size (fewer source
    budgets → divided by what exists), rounded half-up to cents. Rows
    with zero actual spending in the whole window are dropped as well —
    average plans from spending, not from stale plan rows.

    The Extra row is exempt from both rules (see module docstring): its
    SOLL is the previous budget's actual balance. Salary and other
    income rows follow the same recurring + nonzero rules as expenses.
    """
    window = history_budgets(
        user, year=year, month=month, count=PREFILL_AVERAGE_WINDOW
    )
    if not window:
        return None
    window_size = len(window)
    carryover = _extra_carryover(db, window[0])

    # ── Income rows ─────────────────────────────
    # key (lowercased label) -> [summed actual, display label,
    # first-seen order, budget ids the row was seen in]
    income_acc: dict[str, list] = {}
    order = 0
    for budget in window:
        for income in budget.incomes:
            if _is_extra_label(income.label):
                continue  # carryover, never averaged
            key = income.label.strip().lower()
            entry = income_acc.get(key)
            if entry is None:
                income_acc[key] = [
                    income.actual_amount,
                    income.label,
                    order,
                    {budget.id},
                ]
                order += 1
            else:
                entry[0] += income.actual_amount
                entry[3].add(budget.id)

    content = PrefillContent()
    content.incomes.append(PrefillIncome(label="Extra", projected_amount=carryover))
    for summed, label, _seen, budgets_seen in sorted(
        income_acc.values(), key=lambda e: e[2]
    ):
        # Recurring only: must appear in every budget of the window,
        # and something must have actually been earned.
        if len(budgets_seen) < window_size or summed <= 0:
            continue
        content.incomes.append(
            PrefillIncome(
                label=label,
                projected_amount=(
                    summed / window_size
                ).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP),
            )
        )

    # ── Expense rows ────────────────────────────
    # key (category, item) -> accumulator with display info from the
    # most recent budget in the window (first sight when iterating
    # newest-first), so spellings and ordering follow the latest month.
    item_acc: dict[tuple[str, str], dict] = {}
    cat_order: dict[str, int] = {}  # category key -> first-seen order
    order = 0
    for budget in window:
        for category in budget.categories:
            cat_key = category.name.strip().lower()
            cat_order.setdefault(cat_key, order)
            order += 1
            for item in category.items:
                item_key = item.label.strip().lower()
                acc_key = (cat_key, item_key)
                entry = item_acc.get(acc_key)
                if entry is None:
                    item_acc[acc_key] = {
                        "sum": item.actual_cost,
                        "label": item.label,
                        "cat_name": category.name,
                        "cat_sort": category.sort_order,
                        "cat_order": cat_order[cat_key],
                        "item_order": order,
                        "budgets": {budget.id},
                    }
                    order += 1
                else:
                    entry["sum"] += item.actual_cost
                    entry["budgets"].add(budget.id)

    # Group accumulators by category (in first-seen order), items by
    # first-seen order within the whole window.
    by_category: dict[str, list] = {}
    for acc_key, entry in item_acc.items():
        # Recurring only: present in every budget of the window, and
        # actually spent at least once.
        if len(entry["budgets"]) < window_size or entry["sum"] <= 0:
            continue
        by_category.setdefault(entry["cat_order"], []).append(entry)

    for cat_order_index in sorted(by_category):
        entries = sorted(by_category[cat_order_index], key=lambda e: e["item_order"])
        first = entries[0]
        prefill_category = PrefillCategory(
            name=first["cat_name"], sort_order=first["cat_sort"]
        )
        for entry in entries:
            prefill_category.items.append(
                PrefillItem(
                    label=entry["label"],
                    projected_cost=(
                        entry["sum"] / window_size
                    ).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP),
                )
            )
        content.categories.append(prefill_category)

    # Salary rows averaged to zero (never actually earned) are dropped
    # above; a budget with only a carryover is still valid.
    return content


def create_prefilled_budget(
    user: User, budget_in: BudgetCreate, db: Session
) -> Budget:
    """Create a budget, drafting its SOLL rows from history.

    Returns a blank budget when the strategy has no history to draw
    from (e.g. the user's very first budget) — creation never fails
    because of a missing source.
    """
    builders = {
        PrefillStrategy.LAST: _build_last,
        PrefillStrategy.AVERAGE: _build_average,
    }
    builder = builders[budget_in.prefill]
    content = builder(user, year=budget_in.year, month=budget_in.month, db=db)

    budget = Budget(
        user_id=user.id,
        title=budget_in.title,
        month=budget_in.month,
        year=budget_in.year,
    )
    db.add(budget)
    db.flush()  # populate budget.id

    if content is None:
        db.commit()
        db.refresh(budget)
        return budget

    for income in content.incomes:
        db.add(
            Income(
                budget_id=budget.id,
                label=income.label,
                projected_amount=income.projected_amount,
                actual_amount=Decimal("0"),
            )
        )

    for category in content.categories:
        new_category = Category(
            budget_id=budget.id,
            name=category.name,
            sort_order=category.sort_order,
        )
        db.add(new_category)
        db.flush()  # populate new_category.id

        for item in category.items:
            db.add(
                ExpenseItem(
                    category_id=new_category.id,
                    label=item.label,
                    projected_cost=item.projected_cost,
                    actual_cost=Decimal("0"),
                )
            )

    db.commit()
    db.refresh(budget)
    return budget

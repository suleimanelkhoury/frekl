"""Recurring items — subscription-style rows aggregated across budgets.

The companion to the analysis service: where analysis exposes label
hygiene problems (one-offs, near-duplicates), this view aggregates
each recurring row's spending history — average cost, cadence, first
and last appearance, and a price trend (are subscriptions quietly
getting more expensive?).

Rows are grouped case-insensitively (same normalization as analysis /
top-items). Recurring means REGULAR: the row's occurrence months must
follow a dominant interval (monthly salary deductions, GEZ every three
months, yearly insurance). Random appearances — buying something twice
months apart, or in bursts — do not qualify:

- exactly two distinct months: only a consecutive pair (gap of one
  month) counts, e.g. a subscription that just started;
- three or more: the most common gap between occurrences is the
  cadence; it must cover at least half of all gaps, and no gap may
  exceed the cadence by more than two months (a skipped month or two
  is tolerated — bills drift across month boundaries).

The display spelling and category follow the most recent occurrence.
"""

from collections import Counter
from decimal import ROUND_HALF_UP, Decimal

from app.models.user import User
from app.schemas.summary import RecurringItem, RecurringResponse
from app.services.analysis import _normalize_label

# A row must appear in at least this many distinct months to have
# detectable cadence at all.
MIN_MONTHS = 2

_TWO_PLACES = Decimal("0.01")


def _quantize(value: Decimal) -> Decimal:
    """Round money to two decimal places, half-up."""
    return value.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def _cadence(months: set[int]) -> int | None:
    """Detect the regular interval (in months) of a row's occurrences.

    `months` holds the distinct occurrence months as offsets from month
    zero (year * 12 + month). Returns the cadence when the pattern is
    regular, None when it is random:

    - two occurrences: only a consecutive pair (gap 1) counts — with a
      single gap there is no way to tell "quarterly" from "random";
    - three or more: the cadence is the most common gap (ties → the
      smaller gap). It must cover at least half of all gaps, and no
      gap may exceed cadence + 2 months — a skipped month or two is
      tolerated (bills drift, a month gets missed), but bursts and
      multi-month holes are not a cadence.
    """
    if len(months) < MIN_MONTHS:
        return None
    offsets = sorted(months)
    gaps = [b - a for a, b in zip(offsets, offsets[1:])]
    if len(gaps) == 1:
        return 1 if gaps[0] == 1 else None
    counts = Counter(gaps)
    most = max(counts.values())
    cadence = min(gap for gap, n in counts.items() if n == most)
    if most / len(gaps) < 0.5:
        return None  # no dominant interval
    if max(gaps) > cadence + 2:
        return None  # a hole too big to be a skipped month
    return cadence


def recurring_user_items(user: User) -> RecurringResponse:
    """Aggregate every recurring expense row across ALL of the user's budgets."""
    # Normalized label -> accumulator. Entries are collected
    # chronologically (budgets are sorted by year/month), so the trend
    # halves below split cleanly into earliest and latest.
    acc: dict[str, dict] = {}
    budgets = sorted(user.budgets, key=lambda b: (b.year, b.month, b.id))
    for budget in budgets:
        for category in budget.categories:
            for item in category.items:
                key = _normalize_label(item.label)
                entry = acc.setdefault(
                    key,
                    {
                        "total": Decimal("0"),
                        "occurrences": 0,
                        "months": set(),  # distinct occurrence months
                        "entries": [],  # (year, month, actual_cost)
                        "label": item.label,
                        "category": category.name,
                    },
                )
                entry["total"] += item.actual_cost
                entry["occurrences"] += 1
                entry["months"].add(budget.year * 12 + budget.month - 1)
                entry["entries"].append(
                    (budget.year, budget.month, item.actual_cost)
                )
                # Display spellings follow the most recent occurrence
                entry["label"] = item.label
                entry["category"] = category.name

    items: list[RecurringItem] = []
    for e in acc.values():
        cadence = _cadence(e["months"])
        if cadence is None:
            continue  # one-off or irregularly appearing row

        entries: list[tuple[int, int, Decimal]] = e["entries"]
        n = len(entries)
        first_year, first_month, _ = entries[0]
        last_year, last_month, _ = entries[-1]

        # ── Trend ───────────────────────────────────
        # Compare the average of the earliest entries against the
        # average of the latest entries. With an odd count, the middle
        # entry joins neither half — a symmetric split, so a single
        # month can't dominate either side.
        early_avg: Decimal | None = None
        late_avg: Decimal | None = None
        direction: str | None = None
        change_pct: float | None = None
        if n >= 2:
            half = n // 2
            early_sum = sum((cost for _, _, cost in entries[:half]), Decimal("0"))
            late_sum = sum(
                (cost for _, _, cost in entries[n - half :]), Decimal("0")
            )
            early_avg = _quantize(early_sum / half)
            late_avg = _quantize(late_sum / half)
            if late_avg > early_avg:
                direction = "up"
            elif late_avg < early_avg:
                direction = "down"
            else:
                direction = "flat"
            if early_avg > 0:
                change_pct = round(
                    float((late_avg - early_avg) / early_avg * 100), 1
                )

        items.append(
            RecurringItem(
                label=e["label"],
                category=e["category"],
                occurrences=e["occurrences"],
                budget_count=len(e["months"]),
                first_month=first_month,
                first_year=first_year,
                last_month=last_month,
                last_year=last_year,
                total_actual=_quantize(e["total"]),
                avg_actual=_quantize(e["total"] / e["occurrences"]),
                cadence_months=cadence,
                early_avg=early_avg,
                late_avg=late_avg,
                direction=direction,
                change_pct=change_pct,
            )
        )

    items.sort(key=lambda i: (i.total_actual, i.label), reverse=True)
    return RecurringResponse(items=items)

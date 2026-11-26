"""Shared Excel layout constants — the export ↔ import contract.

The import template and the exporter must agree on the sheet layout
and on the German month names used in budget titles ("Juli 2026").
Keeping the canonical data here means a spelling fix only has to
happen once.
"""

GERMAN_MONTH_NAMES = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
]


def german_month_number(name: str) -> int | None:
    """Return 1–12 for a (case-insensitive) German month name, else None."""
    lowered = name.strip().lower()
    for index, month_name in enumerate(GERMAN_MONTH_NAMES):
        if lowered == month_name.lower():
            return index + 1
    return None

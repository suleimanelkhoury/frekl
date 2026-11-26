"""Label normalization shared by every cross-budget aggregation.

Two normalization semantics exist in the app, on purpose:

- :func:`normalize_label` lowercases AND collapses internal whitespace.
  Used wherever near-duplicate detection or cadence grouping must treat
  "Lidl  extra" like "lidl extra" (budget analysis, recurring items).

- :func:`simple_label` only lowercases and trims the ends. Used for
  plain identity matching (top-items, item-history, search, prefill,
  investments, summary classifiers) — collapsing whitespace there would
  silently merge rows the user spelled with double spaces.

Keep the two apart: changing one site's semantics changes what rows
get grouped together.
"""


def normalize_label(label: str) -> str:
    """Lowercase and collapse whitespace — the baseline for comparing."""
    return " ".join(label.strip().lower().split())


def simple_label(label: str) -> str:
    """Lowercase + trim, keeping internal whitespace as-is."""
    return label.strip().lower()

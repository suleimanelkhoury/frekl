"""Money helpers shared by the services.

All user-facing money is quantized to two decimal places, half-up —
the same rounding the import template and the Excel export assume.
Banker's rounding (Decimal's default) would turn 12.005 into 12.00
while the rest of the app says 12.01.
"""

from decimal import ROUND_HALF_UP, Decimal

TWO_PLACES = Decimal("0.01")


def quantize_money(value: Decimal) -> Decimal:
    """Round money to two decimal places, half-up."""
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

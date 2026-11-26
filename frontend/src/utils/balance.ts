/**
 * Balance/difference color helper — teal for non-negative, burgundy
 * for negative.
 *
 * Teal matches the income series color in the charts (#0d9488 =
 * teal-600), burgundy matches the expenses series (#9f1239 = rose-800),
 * so "money in / money out" reads the same color everywhere.
 * Shared by BudgetCard, CategorySection, SummaryBar, and ChartsPage,
 * which previously repeated the same Tailwind class ternaries.
 */

/** Tailwind classes for a value that is >= 0 (teal) vs < 0 (burgundy). */
export function balanceColor(value: number): string {
  return value >= 0
    ? 'text-teal-600 dark:text-teal-400'
    : 'text-rose-800 dark:text-rose-400';
}

/**
 * Badge tone for a signed value as a colored pill.
 *
 * `goodWhenPositive` decides the polarity: a positive difference is
 * *good* (under budget → green), but a positive price trend is *bad*
 * (subscriptions getting more expensive → red). Shared by
 * DifferenceBadge and the subscriptions TrendBadge.
 */
export function badgeTone(value: number, goodWhenPositive: boolean): string {
  const good = goodWhenPositive ? value > 0 : value < 0;
  const bad = goodWhenPositive ? value < 0 : value > 0;
  return good
    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    : bad
      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

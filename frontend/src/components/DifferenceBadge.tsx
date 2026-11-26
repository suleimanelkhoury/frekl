/**
 * DifferenceBadge — shows a difference value with color coding.
 *
 * Green if positive (under budget / earned more), red if negative
 * (over budget / earned less), gray if zero.
 */

import { formatCurrency } from '../utils/format';
import { toNumber } from '../utils/format';
import { badgeTone } from '../utils/balance';

interface DifferenceBadgeProps {
  /** The difference value as a string (e.g. "50.00" or "-30.00"). */
  value: string;
  /** Whether to show a + sign for positive values. */
  showSign?: boolean;
}

export function DifferenceBadge({
  value,
  showSign = true,
}: DifferenceBadgeProps) {
  const num = toNumber(value);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTone(num, true)}`}
    >
      {showSign && num > 0 ? '+' : ''}{formatCurrency(value)}
    </span>
  );
}

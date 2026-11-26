/**
 * SummaryBar — sticky bar at bottom showing grand totals.
 *
 * Displays SOLL GESAMTKOSTEN, IST GESAMTKOSTEN, GESAMTUNTERSCHIED,
 * SOLL BALANCE, IST BALANCE, and UNTERSCHIED.
 */

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDifference, toNumber } from '../utils/format';
import { balanceColor } from '../utils/balance';
import type { BudgetSummary } from '../types';

/** One quiet label/value tile in the summary grid. */
function Tile({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-500">{label}</p>
      <p
        className={`text-sm font-semibold ${
          tone ?? 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {children}
      </p>
    </div>
  );
}

interface SummaryBarProps {
  summary: BudgetSummary | undefined;
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const { t } = useTranslation();
  if (!summary) return null;

  const expenseDiff = toNumber(summary.expense_difference);
  const balanceDiff = toNumber(summary.balance_difference);

  return (
    <div className="sticky bottom-0 z-30 border-t border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-6">
        <Tile label={t('detail.summary.sollTotalCosts')}>
          {formatCurrency(summary.total_projected_expenses)}
        </Tile>
        <Tile label={t('detail.summary.istTotalCosts')}>
          {formatCurrency(summary.total_actual_expenses)}
        </Tile>
        <Tile
          label={t('detail.summary.totalDifference')}
          tone={balanceColor(expenseDiff)}
        >
          {formatDifference(summary.expense_difference)}
        </Tile>
        <Tile label={t('detail.summary.sollBalance')}>
          {formatCurrency(summary.projected_balance)}
        </Tile>
        <Tile label={t('detail.summary.istBalance')}>
          {formatCurrency(summary.actual_balance)}
        </Tile>
        <Tile
          label={t('detail.summary.difference')}
          tone={balanceColor(balanceDiff)}
        >
          {formatDifference(summary.balance_difference)}
        </Tile>
      </div>
    </div>
  );
}

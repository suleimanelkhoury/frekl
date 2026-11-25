/**
 * DashboardSummary — a single year-overview "money snapshot" above the
 * budget grid, with a year selector so the numbers can be viewed for
 * any year with budgets.
 *
 * Layout (one flat panel, hierarchy by size instead of card grids):
 * - Hero: the year's earned Gehalt (Σ actual Gehalt — summing only
 *   Gehalt is safe; Extra is the monthly carryover and must never be
 *   summed).
 * - Money-flow bar: how the spent money split into consumption and
 *   investing (leftovers reach investments via the carryover, so
 *   there is no separate "saved" slice).
 * - Inline stat row: the remaining numbers as quiet label/value pairs
 *   separated by a hairline, not boxed tiles.
 *
 * Note on the money model: each month's remaining balance is carried
 * into the next month as its SOLL Extra, so monthly balances and Extra
 * income must NOT be summed across months (the same money would be
 * counted repeatedly). Instead:
 *
 *   - Overall Income = overall expenses + end-of-year balance
 *     − January carryover (new money in = money out + pile growth)
 *
 * Renders nothing while loading or when no budgets exist.
 */

import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { budgetsApi } from '../api';
import { formatCurrency, toNumber } from '../utils/format';
import { queryKeys } from '../utils/queryKeys';
import { neutralButtonClass, pillButtonClass } from '../utils/ui';
import { lazy, Suspense } from 'react';
// Lazy: the modal is the only reason the dashboard pulls in Recharts
// (~370 kB chunk). Loading it on first open keeps the initial
// dashboard chunk small.
const CategorySpendingModal = lazy(() =>
  import('./CategorySpendingModal').then((m) => ({
    default: m.CategorySpendingModal,
  })),
);
import type { BudgetComparisonEntry } from '../types';
import { ChartPieIcon } from './Icons';

/** A quiet label/value pair in the inline stat row (no card box). */
function InlineStat({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div title={title}>
      <p className="text-xs text-gray-500 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {children}
      </p>
    </div>
  );
}

/** Legend item for the money-flow bar (dot + label + amount). */
function LegendItem({
  dotClassName,
  label,
  amount,
}: {
  dotClassName: string;
  label: string;
  amount: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dotClassName}`} />
      {label}
      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
        {amount}
      </span>
    </span>
  );
}

export function DashboardSummary() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  // null = automatic: current year if it has budgets, else the newest
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showCategorySpending, setShowCategorySpending] = useState(false);

  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: queryKeys.comparison,
    queryFn: budgetsApi.compare,
  });
  const { data: yearly, isLoading: yearlyLoading } = useQuery({
    queryKey: queryKeys.yearlyComparison,
    queryFn: budgetsApi.compareYearly,
  });

  if (comparisonLoading || yearlyLoading) return null;

  const availableYears = [
    ...new Set(comparison?.budgets.map((b) => b.year) ?? []),
  ].sort((a, b) => b - a); // newest first
  if (availableYears.length === 0) return null;

  const activeYear =
    selectedYear ??
    (availableYears.includes(currentYear) ? currentYear : availableYears[0]);

  // Entries are sorted by (year, month) ascending — filter to the
  // selected year and keep that order.
  const entries: BudgetComparisonEntry[] =
    comparison?.budgets.filter((b) => b.year === activeYear) ?? [];
  if (entries.length === 0) return null;

  // ── Raw money-flow sums ─────────────────────
  const ytdExpenses = entries.reduce(
    (sum, e) => sum + toNumber(e.total_actual_expenses),
    0,
  );

  const latest = entries[entries.length - 1];
  const currentBalance = toNumber(latest.actual_balance);

  // The carryover written into the year's first budget (SOLL Extra) —
  // money earned last year, i.e. not new income this year.
  const startCarryover = toNumber(entries[0].total_projected_extra);

  const ytdSavings = currentBalance - startCarryover;
  const ytdIncome = ytdSavings + ytdExpenses;

  // ── Earned ──────────────────────────────────
  // Σ actual Gehalt — new money earned in the year. Only Gehalt is
  // summed; Extra is the monthly carryover (previous months' balances)
  // and would count the same money repeatedly.
  const earned = entries.reduce(
    (sum, e) => sum + toNumber(e.total_actual_gehalt),
    0,
  );

  // ── Investing ───────────────────────────────
  // invested is already computed per year by the backend (sum of the
  // Investitionen category's actual costs).
  const yearEntry = yearly?.years.find((y) => y.year === activeYear);
  const invested = yearEntry ? toNumber(yearEntry.invested) : 0;
  // Share of new income that went into investments. On average this is
  // the same per month, so one rate covers both views.
  const investingRate = ytdIncome > 0 ? (invested / ytdIncome) * 100 : null;

  // ── Consumption (investments excluded) ──────
  const ytdConsumption = ytdExpenses - invested;
  const avgConsumption = ytdConsumption / entries.length;

  // ── Money-flow bar ──────────────────────────
  // How the spent money split into consumption and investing.
  const barVisible = ytdExpenses > 0;
  const consumptionPct = barVisible ? (ytdConsumption / ytdExpenses) * 100 : 0;
  const investedPct = barVisible ? (invested / ytdExpenses) * 100 : 0;

  return (
    <div className="mb-6">
      {/* ── Year selector + category spending ──── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {availableYears.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setSelectedYear(year)}
            className={pillButtonClass(year === activeYear)}
          >
            {year}
          </button>
        ))}
        <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
          |
        </span>
        <button
          type="button"
          onClick={() => setShowCategorySpending(true)}
          className={`${neutralButtonClass} inline-flex items-center gap-2`}
          title={t('dashboard.summary.categorySpendingTitle', {
            year: activeYear,
          })}
        >
          <ChartPieIcon size={14} /> {t('dashboard.summary.categorySpending')}
        </button>
      </div>

      {/* ── Money snapshot (single flat panel) ──── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        {/* Hero: earned Gehalt for the year */}
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t('dashboard.summary.earned')}
        </p>
        <p
          className="mt-0.5 text-3xl font-bold tabular-nums text-teal-600 dark:text-teal-400"
          title={t('dashboard.summary.earnedTitle', {
            count: entries.length,
            year: activeYear,
          })}
        >
          {formatCurrency(earned)}
        </p>

        {/* Money-flow bar: consumption vs. investing share of expenses */}
        {barVisible && (
          <div className="mt-5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                style={{ width: `${consumptionPct}%` }}
                className="bg-gray-300 dark:bg-gray-500"
                title={t('dashboard.summary.overallExpensesTitle', {
                  amount: formatCurrency(invested),
                })}
              />
              <div
                style={{ width: `${investedPct}%` }}
                className="bg-teal-600 dark:bg-teal-400"
                title={t('dashboard.summary.overallInvestedTitle', {
                  year: activeYear,
                })}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              <LegendItem
                dotClassName="bg-gray-300 dark:bg-gray-500"
                label={t('dashboard.summary.bar.consumption')}
                amount={formatCurrency(ytdConsumption)}
              />
              <LegendItem
                dotClassName="bg-teal-600 dark:bg-teal-400"
                label={t('dashboard.summary.bar.invested')}
                amount={formatCurrency(invested)}
              />
            </div>
          </div>
        )}

        {/* Inline stat row — hairline-separated, no boxes */}
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <InlineStat
            label={t('dashboard.summary.overallIncome')}
            title={t('dashboard.summary.overallIncomeTitle', {
              year: activeYear,
              carryover: formatCurrency(startCarryover),
            })}
          >
            {formatCurrency(ytdIncome)}
          </InlineStat>
          <InlineStat
            label={t('dashboard.summary.overallExpenses')}
            title={t('dashboard.summary.overallExpensesTitle', {
              amount: formatCurrency(invested),
            })}
          >
            {formatCurrency(ytdConsumption)}
          </InlineStat>
          <InlineStat
            label={t('dashboard.summary.avgMonthlyExpenses')}
            title={t('dashboard.summary.avgExpensesTitle', {
              count: entries.length,
              year: activeYear,
            })}
          >
            {formatCurrency(avgConsumption)}
          </InlineStat>
          <InlineStat
            label={t('dashboard.summary.overallInvested')}
            title={t('dashboard.summary.overallInvestedTitle', {
              year: activeYear,
            })}
          >
            {formatCurrency(invested)}
            {investingRate !== null && (
              <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">
                · {investingRate.toFixed(1)} %
              </span>
            )}
          </InlineStat>
        </div>
      </div>

      {/* ── Category spending popup ─────────────── */}
      {showCategorySpending && (
        <Suspense fallback={null}>
          <CategorySpendingModal
            year={activeYear}
            onClose={() => setShowCategorySpending(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

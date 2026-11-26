/**
 * Investments Page — the dedicated view of the Investitionen
 * categories across all budgets.
 *
 * Sections:
 * - Stat row: total invested, this year, monthly average, months
 *   tracked.
 * - Cumulative area chart: the growth of the portfolio (running total
 *   of actual invested money).
 * - Monthly bars: SOLL vs IST invested per month.
 * - Per-investment table: each row's total (click for the full
 *   history via the shared expense-history drill-down).
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { budgetsApi } from '../api';
import { ExpenseHistoryModal } from '../components/ExpenseHistoryModal';
import { ChartContainer } from '../components/ChartContainer';
import { Spinner } from '../components/Spinner';
import { CHART_TOOLTIP_STYLE, SERIES_COLORS } from '../utils/chartTheme';
import { formatCurrency, formatMonthYear, toNumber } from '../utils/format';
import { queryKeys } from '../utils/queryKeys';

export function InvestmentsPage() {
  const { t } = useTranslation();
  const [historyLabel, setHistoryLabel] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.investments,
    queryFn: budgetsApi.getInvestments,
  });

  if (isLoading) return <Spinner />;

  if (!data || data.months.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          {t('investments.title')}
        </h1>
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-500">
            {t('investments.emptyState')}
          </p>
        </div>
      </div>
    );
  }

  // ── Chart data ───────────────────────────────
  const chartData = data.months.map((m) => ({
    label: formatMonthYear(m.month, m.year),
    cumulative: toNumber(m.cumulative),
    actual: toNumber(m.actual),
    projected: toNumber(m.projected),
  }));

  // ── Stats ────────────────────────────────────
  const total = toNumber(data.total);
  const now = new Date();
  const currentYear = now.getFullYear();
  const thisYear = data.months
    .filter((m) => m.year === currentYear)
    .reduce((sum, m) => sum + toNumber(m.actual), 0);
  const avgMonthly = total / data.months.length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        {t('investments.title')}
      </h1>

      {/* ── Stat row ─────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: t('investments.stats.total'),
            value: formatCurrency(total),
            accent: true,
          },
          {
            label: t('investments.stats.thisYear'),
            value: formatCurrency(thisYear),
          },
          {
            label: t('investments.stats.avgMonthly'),
            value: formatCurrency(avgMonthly),
          },
          {
            label: t('investments.stats.months'),
            value: String(data.months.length),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {stat.label}
            </p>
            <p
              className={`mt-0.5 text-lg font-bold tabular-nums ${
                stat.accent
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Cumulative growth ────────────────────── */}
      <div className="mb-6">
        <ChartContainer title={t('investments.charts.cumulative')}>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={SERIES_COLORS.Invested}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={SERIES_COLORS.Invested}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name={t('investments.series.cumulative')}
                stroke={SERIES_COLORS.Invested}
                strokeWidth={2}
                fill="url(#investedFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* ── Monthly SOLL vs IST ──────────────────── */}
      <div className="mb-6">
        <ChartContainer title={t('investments.charts.monthly')}>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Legend />
              <Bar
                dataKey="projected"
                name={t('investments.series.projected')}
                fill={SERIES_COLORS.Plan}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="actual"
                name={t('investments.series.actual')}
                fill={SERIES_COLORS.Invested}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* ── Per-investment breakdown ─────────────── */}
      <ChartContainer title={t('investments.items.title')}>
        <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
          {t('investments.items.hint')}
        </p>
        {data.items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('investments.items.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-4 font-medium">
                    {t('investments.items.columns.label')}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t('investments.items.columns.occurrences')}
                  </th>
                  <th className="py-2 font-medium text-right">
                    {t('investments.items.columns.total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.label}
                    onClick={() => setHistoryLabel(item.label)}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">
                      {item.label}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-gray-700 dark:text-gray-300">
                      {item.occurrences}
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartContainer>

      {/* ── Drill-down: full history of the clicked investment ── */}
      {historyLabel && (
        <ExpenseHistoryModal
          label={historyLabel}
          onClose={() => setHistoryLabel(null)}
        />
      )}
    </div>
  );
}

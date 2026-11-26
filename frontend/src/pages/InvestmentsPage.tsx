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
import { useIsMobile } from '../hooks/useIsMobile';
import { useHistoryDrillDown } from '../hooks/useHistoryDrillDown';
import { formatCurrency, formatMonthYear, toNumber } from '../utils/format';
import { queryKeys } from '../utils/queryKeys';
import {
  currencyTooltipProps,
  gridProps,
  LEGEND_PROPS,
  makeYearTickFormatter,
  SERIES_COLORS,
  timeXAxisProps,
  timeYAxisProps,
} from '../utils/chartTheme';
import {pageTitleClass, tableHeadRowClass, clickableRowClass} from '../utils/ui';

export function InvestmentsPage() {
  const { t } = useTranslation();
  // Phone adaptation for chart geometry (see useIsMobile): lower plot
  // baselines so the charts don't tower over their information density.
  const isMobile = useIsMobile();
  // Row label clicked in the per-investment table (opens its history)
  const history = useHistoryDrillDown();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.investments,
    queryFn: budgetsApi.getInvestments,
  });

  if (isLoading) return <Spinner />;

  if (!data || data.months.length === 0) {
    return (
      <div>
        <h1 className={pageTitleClass}>
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
    // Kept for the mobile x-axis tick formatter, which labels only
    // the first month of each year (see yearTickFormatter).
    year: m.year,
    cumulative: toNumber(m.cumulative),
    actual: toNumber(m.actual),
    projected: toNumber(m.projected),
  }));

  // ── Mobile x-axis: year-change ticks ─────────
  // On phones, only the first month of each year is labeled — with the
  // year itself — every other month stays a plain tick (same rule as
  // ChartsPage). Desktop keeps full month labels.
  const yearTickFormatter = makeYearTickFormatter(chartData, isMobile);

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
      <h1 className={pageTitleClass}>
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
          <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
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
              <CartesianGrid {...gridProps} />
              <XAxis {...timeXAxisProps(yearTickFormatter)} />
              <YAxis {...timeYAxisProps} />
              <Tooltip {...currencyTooltipProps} />
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
          <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
            <BarChart data={chartData}>
              <CartesianGrid {...gridProps} />
              <XAxis {...timeXAxisProps(yearTickFormatter)} />
              <YAxis {...timeYAxisProps} />
              <Tooltip {...currencyTooltipProps} />
              <Legend {...LEGEND_PROPS} />
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
            {/* Phones: 12px font and no occurrences column — label +
                total identify the row (same rule as the expense
                history table) */}
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className={tableHeadRowClass}>
                  <th className="py-2 pr-4 font-medium">
                    {t('investments.items.columns.label')}
                  </th>
                  {!isMobile && (
                    <th className="py-2 pr-4 font-medium">
                      {t('investments.items.columns.occurrences')}
                    </th>
                  )}
                  <th className="py-2 font-medium text-right">
                    {t('investments.items.columns.total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr
                    key={item.label}
                    onClick={() => history.openFor(item.label)}
                    className={clickableRowClass}
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">
                      {item.label}
                    </td>
                    {!isMobile && (
                      <td className="py-2 pr-4 tabular-nums text-gray-700 dark:text-gray-300">
                        {item.occurrences}
                      </td>
                    )}
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
      {history.label && (
        <ExpenseHistoryModal label={history.label} onClose={history.close} />
      )}
    </div>
  );
}

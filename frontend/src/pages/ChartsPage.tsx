/**
 * Charts Page — visualizations using Recharts.
 *
 * Two tabs:
 * - Overall: income vs. expenses, the cash balance (savings
 *   trajectory) over time, and the top expense rows across all
 *   budgets, with the SOLL plan as dashed lines
 *   (moved here from the former Comparison page). Clicking a top
 *   expense row opens its full history across all budgets.
 * - Monthly: single-budget charts — expenses by category (SOLL vs
 *   IST), the expense distribution donut, and per-category variance
 *   (SOLL − IST), with click-to-drill-down into a category's items
 *   and its 12-month trend.
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { budgetsApi } from '../api';
import { CategoryDrillDownModal } from '../components/CategoryDrillDownModal';
import { ChartContainer } from '../components/ChartContainer';
import { ExpenseHistoryModal } from '../components/ExpenseHistoryModal';
import { Spinner } from '../components/Spinner';
import { useIsMobile } from '../hooks/useIsMobile';
import { useHistoryDrillDown } from '../hooks/useHistoryDrillDown';
import { formatCurrency, formatMonthYear, toNumber } from '../utils/format';
import {pillButtonClass, pageTitleClass} from '../utils/ui';import { queryKeys } from '../utils/queryKeys';
import {
  categoryYAxisProps,
  currencyTooltipProps,
  gridProps,
  LEGEND_PROPS,
  lineDot,
  makeYearTickFormatter,
  numberXAxisProps,
  PIE_COLORS,
  rowsHeight,
  SERIES_COLORS,
  timeXAxisProps,
  timeYAxisProps,
  vBarMargin,
} from '../utils/chartTheme';

type ChartTab = 'overall' | 'monthly';

/** Medal colors for the top three rows (gold / silver / bronze). */
const MEDAL_COLORS = [
  { ring: '#ffe066', fill: '#d9a406', border: '#a87d04' },
  { ring: '#d9d9d9', fill: '#9e9e9e', border: '#707070' },
  { ring: '#f2a65a', fill: '#c47f3e', border: '#8f5a28' },
];

/** Medal badge (gold / silver / bronze) with blue ribbons, drawn at the
 * left edge of the top three bars in the top-items chart. The `small`
 * variant (phones) drops the ribbons and shrinks the ring — the
 * mobile rows are only 24px tall, too tight for the full medal. */
function MedalBadge(props: {
  x?: number | string;
  y?: number | string;
  height?: number | string;
  index?: number;
  small?: boolean;
}) {
  const index = Number(props.index ?? -1);
  if (index < 0 || index >= MEDAL_COLORS.length) return null;
  const small = props.small ?? false;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const height = Number(props.height ?? 0);
  const { ring, fill } = MEDAL_COLORS[index];
  const r = small ? 9 : 13;
  const cx = x + r + 1;
  const cy = y + height / 2;
  // Two blue swallowtail ribbons splayed out beneath the medal
  const ribbon = '#2b5dd7';
  const tails = [-1, 1].map((s) => (
    <polygon
      key={s}
      points={[
        [cx + s * r * 0.25, cy + r * 0.4],
        [cx + s * r * 0.9, cy + r * 0.95],
        [cx + s * r * 0.9, cy + r * 1.6],
        [cx + s * r * 0.575, cy + r * 1.25],
        [cx + s * r * 0.25, cy + r * 1.6],
      ]
        .map(([px, py]) => `${px},${py}`)
        .join(' ')}
      fill={ribbon}
    />
  ));
  return (
    <g>
      {!small && tails}
      <circle cx={cx} cy={cy} r={r} fill={ring} />
      <circle cx={cx} cy={cy} r={r - (small ? 3 : 4)} fill={fill} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={small ? 10 : 12}
        fontWeight={700}
        fill="#ffffff"
      >
        {index + 1}
      </text>
    </g>
  );
}

export function ChartsPage() {
  const { t } = useTranslation();
  // Phone adaptation for SVG-only chart geometry (axis widths, dot
  // sizes) that Tailwind classes can't reach — see useIsMobile.
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<ChartTab>('overall');
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Row label clicked in the top-expenses chart (opens its history)
  const history = useHistoryDrillDown();

  const { data: budgets } = useQuery({
    queryKey: queryKeys.budgets,
    queryFn: budgetsApi.list,
  });

  // Auto-select the latest budget (list is sorted chronologically ascending,
  // so the most recent budget is the last entry)
  const budgetId =
    selectedBudgetId ?? budgets?.[budgets.length - 1]?.id ?? null;

  // ── Overall tab data ─────────────────────────
  const { data: comparison, isLoading: comparisonLoading } = useQuery({
    queryKey: queryKeys.comparison,
    queryFn: budgetsApi.compare,
  });

  // Top expense rows across ALL budgets (aggregated by row label)
  const { data: topItems } = useQuery({
    queryKey: queryKeys.topItems,
    queryFn: budgetsApi.getTopItems,
  });

  const overallData =
    comparison?.budgets.map((e) => ({
      label: formatMonthYear(e.month, e.year),
      // Kept for the mobile x-axis tick formatter, which labels only
      // the first month of each year (see yearTickFormatter).
      year: e.year,
      // Total income (Gehalt + Extra) — Extra often contains the
      // previous month's carryover, so showing only Gehalt would
      // understate income in months with big carryovers.
      income:
        toNumber(e.total_actual_gehalt) + toNumber(e.total_actual_extra),
      expenses: toNumber(e.total_actual_expenses),
      plannedExpenses: toNumber(e.total_projected_expenses),
      balance: toNumber(e.actual_balance),
      plannedBalance: toNumber(e.projected_balance),
    })) ?? [];

  const topItemsData =
    topItems?.items.map((i) => ({ label: i.label, value: toNumber(i.total) })) ??
    [];

  // ── Mobile x-axis tick formatters ────────────
  // Shared factories in chartTheme: on phones, time axes label only
  // the first month of each year (with the year itself) and category
  // names longer than 10 characters are truncated (the full name
  // stays in the tooltip). Desktop keeps full labels.
  const yearTickFormatter = makeYearTickFormatter(overallData, isMobile);

  // Custom bar shape for the top-items chart: gold/silver/bronze for
  // the top three (with a darker border of their own color), brand
  // teal for the rest.
  const renderTopItemBar = (props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    payload?: { label?: string };
  }) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    const height = Number(props.height ?? 0);
    const index = topItemsData.findIndex(
      (d) => d.label === props.payload?.label,
    );
    const isMedal = index >= 0 && index < MEDAL_COLORS.length;
    const fill = isMedal
      ? MEDAL_COLORS[index].fill
      : SERIES_COLORS.Projected;
    const stroke = isMedal ? MEDAL_COLORS[index].border : undefined;
    return (
      <rect
        className="top-item-bar"
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 2 : 0}
      />
    );
  };

  // ── Monthly tab data ─────────────────────────
  const { data: chartData, isLoading } = useQuery({
    queryKey: queryKeys.budget.chartData(budgetId!),
    queryFn: () => budgetsApi.getChartData(budgetId!),
    enabled: tab === 'monthly' && !!budgetId,
  });

  // Only categories with any money attached — zero-value categories
  // (empty SOLL and IST) just add empty rows to the bar chart and
  // would distort the pie's percentages.
  const activeCategories =
    chartData?.expenses_by_category.filter(
      (c) => toNumber(c.projected) > 0 || toNumber(c.actual) > 0,
    ) ?? [];

  // Prepare data for the pie chart (actual expenses by category)
  const pieData = activeCategories
    .map((c) => ({ name: c.label, value: toNumber(c.actual) }))
    .filter((d) => d.value > 0);

  // Variance per category: SOLL − IST (positive = under budget,
  // negative = overspent), sorted best-to-worst.
  const varianceData = activeCategories
    .map((c) => ({
      label: c.label,
      variance: toNumber(c.projected) - toNumber(c.actual),
    }))
    .sort((a, b) => b.variance - a.variance);

  // Shared height for the monthly charts so the side-by-side cards
  // align (the bar chart scales with the number of categories). Lower
  // baseline on phones — 350px of plot for ~300px width carries no
  // extra information, it just scrolls.
  const chartHeight = rowsHeight(activeCategories.length, isMobile, 240);

  const selectCategory = (name: string | undefined) => {
    if (!name) return;
    setSelectedCategory((prev) => (prev === name ? null : name));
  };

  return (
    <div>
      <h1 className={pageTitleClass}>
        {t('charts.title')}
      </h1>

      {/* ── Tabs ──────────────────────────────── */}
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={pillButtonClass(tab === 'overall')}
          onClick={() => setTab('overall')}
        >
          {t('charts.tabs.overall')}
        </button>
        <button
          type="button"
          className={pillButtonClass(tab === 'monthly')}
          onClick={() => setTab('monthly')}
        >
          {t('charts.tabs.monthly')}
        </button>
      </div>

      {tab === 'overall' ? (
        /* ── Overall tab ─────────────────────── */
        comparisonLoading ? (
          <Spinner />
        ) : overallData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-500">
              {t('charts.emptyState.overall')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* ── Income vs Expenses over time ────── */}
            <ChartContainer title={t('charts.charts.incomeVsExpenses.title')}>
              <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
                <LineChart data={overallData}>
                  <CartesianGrid {...gridProps} />
                  <XAxis {...timeXAxisProps(yearTickFormatter)} />
                  <YAxis {...timeYAxisProps} />
                  <Tooltip {...currencyTooltipProps} />
                  <Legend {...LEGEND_PROPS} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name={t('charts.series.incomeGehaltExtra')}
                    stroke={SERIES_COLORS.Income}
                    strokeWidth={2}
                    dot={lineDot(isMobile)}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name={t('charts.series.expensesActual')}
                    stroke={SERIES_COLORS.Expenses}
                    strokeWidth={2}
                    dot={lineDot(isMobile)}
                  />
                  <Line
                    type="monotone"
                    dataKey="plannedExpenses"
                    name={t('charts.series.expensesPlan')}
                    stroke={SERIES_COLORS.Plan}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* ── Balance over time ────────────────── */}
            {/* Note: with the carryover model (each month's balance
                becomes next month's SOLL Extra), the balance IS the
                cumulative cash pile — this line already is the savings
                trajectory. The dashed plan line shows how the SOLL
                forecast tracked it. */}
            <ChartContainer title={t('charts.charts.balance.title')}>
              <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
                <LineChart data={overallData}>
                  <CartesianGrid {...gridProps} />
                  <XAxis {...timeXAxisProps(yearTickFormatter)} />
                  <YAxis {...timeYAxisProps} />
                  <Tooltip {...currencyTooltipProps} />
                  <Legend {...LEGEND_PROPS} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name={t('charts.series.balanceActual')}
                    stroke={SERIES_COLORS.Balance}
                    strokeWidth={2}
                    dot={lineDot(isMobile)}
                  />
                  <Line
                    type="monotone"
                    dataKey="plannedBalance"
                    name={t('charts.series.balancePlan')}
                    stroke={SERIES_COLORS.Plan}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* ── Top expense rows across all budgets ── */}
            {topItemsData.length > 0 && (
              <ChartContainer title={t('charts.charts.topExpenses.title')}>
                <ResponsiveContainer
                  width="100%"
                  height={rowsHeight(topItemsData.length, isMobile, 200)}
                >
                  <BarChart
                    data={topItemsData}
                    layout="vertical"
                    margin={vBarMargin(isMobile)}
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis {...numberXAxisProps} />
                    <YAxis {...categoryYAxisProps('label', isMobile)} />
                    <Tooltip {...currencyTooltipProps} />
                    <Bar
                      dataKey="value"
                      name={t('charts.series.spentIst')}
                      // Thin bars on phones — auto size fills most of
                      // the 24px row and reads chunky
                      barSize={isMobile ? 18 : undefined}
                      shape={renderTopItemBar}
                      radius={[0, 4, 4, 0]}
                      onClick={(data) =>
                        history.openFor(
                          (data as { label?: string })?.label ?? null,
                        )
                      }
                      className="cursor-pointer"
                    >
                      {/* Medals on the top three bars (compact variant
                          on phones) */}
                      <LabelList
                        dataKey="value"
                        content={(props) => (
                          <MedalBadge {...props} small={isMobile} />
                        )}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        )
      ) : (
        /* ── Monthly tab ─────────────────────── */
        <>
          {/* ── Budget selector ─────────────────── */}
          {budgets && budgets.length > 0 && (
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('charts.labels.selectBudget')}
              </label>
              <select
                value={budgetId ?? ''}
                onChange={(e) => {
                  setSelectedBudgetId(parseInt(e.target.value));
                  // Reset the drill-down when a different budget is
                  // selected (the category belongs to the old budget)
                  setSelectedCategory(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {budgets && budgets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-500">
                {t('charts.emptyState.monthly')}
              </p>
            </div>
          )}

          {isLoading && <Spinner />}

          {chartData && (
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-500">
              {t('charts.tip')}
            </p>
          )}

          {chartData && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* ── Bar chart: expenses by category ─── */}
              {/* Horizontal layout: with ~12 categories, rotated
                  x-axis labels visually shift one bar to the left
                  (Recharts rotation + auto-hidden ticks), making bars
                  appear misattributed. Y-axis category names are
                  always unambiguous. */}
              <ChartContainer title={t('charts.charts.expensesByCategory.title')}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={activeCategories}
                    layout="vertical"
                    margin={vBarMargin(isMobile)}
                  >
                    <XAxis {...numberXAxisProps} />
                    <YAxis {...categoryYAxisProps('label', isMobile)} />
                    <Tooltip {...currencyTooltipProps} />
                    <Legend {...LEGEND_PROPS} />
                    <Bar
                      dataKey="projected"
                      name="SOLL"
                      fill={SERIES_COLORS.Projected}
                      barSize={isMobile ? 10 : undefined}
                      radius={[0, 4, 4, 0]}
                      onClick={(data) =>
                        selectCategory((data as { label?: string })?.label)
                      }
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="actual"
                      name="IST"
                      fill={SERIES_COLORS.Actual}
                      barSize={isMobile ? 10 : undefined}
                      radius={[0, 4, 4, 0]}
                      onClick={(data) =>
                        selectCategory((data as { label?: string })?.label)
                      }
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* ── Pie chart: expense distribution ─── */}
              {/* Donut style: percentages on the slices (values in the
                  tooltip), hole keeps the visual weight light. */}
              <ChartContainer title={t('charts.charts.expenseDistribution.title')}>
                <ResponsiveContainer
                  width="100%"
                  height={isMobile ? 300 : chartHeight}
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      // Smaller donut on phones so the percentage
                      // labels stay inside the plot
                      innerRadius={isMobile ? 38 : 55}
                      outerRadius={isMobile ? 82 : 120}
                      label={(entry) =>
                        `${Math.round((entry.percent ?? 0) * 100)}%`
                      }
                      fontSize={isMobile ? 10 : 11}
                      onClick={(entry) =>
                        selectCategory((entry as { name?: string })?.name)
                      }
                      className="cursor-pointer"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...currencyTooltipProps} />
                    <Legend {...LEGEND_PROPS} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* ── Variance chart: SOLL − IST per category ── */}
              <ChartContainer
                title={t('charts.charts.categoryVariance.title')}
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={varianceData}
                    layout="vertical"
                    margin={vBarMargin(isMobile)}
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis {...numberXAxisProps} />
                    <YAxis {...categoryYAxisProps('label', isMobile)} />
                    <Tooltip {...currencyTooltipProps} />
                    <ReferenceLine x={0} stroke={SERIES_COLORS.Plan} />
                    <Bar
                      dataKey="variance"
                      name={t('charts.series.sollMinusIst')}
                      barSize={isMobile ? 18 : undefined}
                      radius={[0, 4, 4, 0]}
                      onClick={(data) =>
                        selectCategory((data as { label?: string })?.label)
                      }
                      className="cursor-pointer"
                    >
                      {varianceData.map((entry) => (
                        <Cell
                          key={`variance-${entry.label}`}
                          fill={
                            entry.variance >= 0
                              ? SERIES_COLORS.Income
                              : SERIES_COLORS.Projected
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* ── Income vs Expenses summary ──────── */}
              <ChartContainer
                title={t('charts.charts.incomeVsExpensesSummary.title')}
                className="lg:col-span-2"
              >
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="rounded-lg bg-brand-50 p-4 dark:bg-brand-900/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('charts.labels.projectedBalance')}
                    </p>
                    <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                      {formatCurrency(chartData.income_vs_expenses.projected)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('charts.labels.actualBalance')}
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(chartData.income_vs_expenses.actual)}
                    </p>
                  </div>
                </div>
              </ChartContainer>
            </div>
          )}
        </>
      )}

      {/* ── Category drill-down modal (monthly tab) */}
      {tab === 'monthly' && selectedCategory && budgetId && (
        <CategoryDrillDownModal
          budgetId={budgetId}
          categoryName={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {/* ── Expense history modal (overall tab, top-expenses chart) */}
      {history.label && (
        <ExpenseHistoryModal
          label={history.label}
          onClose={history.close}
        />
      )}
    </div>
  );
}

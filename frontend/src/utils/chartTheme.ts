/**
 * Shared chart theme — colors and Recharts styling used across
 * ChartsPage, DashboardSummary, CategorySpendingModal,
 * CategoryDrillDownModal, and InvestmentsPage.
 */

import { formatCurrency } from './format';

/** Palette used to color pie slices (cycled).
 *
 * Muted, warm-leaning categorical colors — dusty earth tones chosen to
 * suit the terracotta theme (low chroma, mid luminance, so slices don't
 * scream next to the UI). Deliberately disjoint from SERIES_COLORS: the
 * pie legend sits next to the SOLL/IST bar legend on the Monthly tab,
 * and identical colors in both made the legends look like one shared
 * mapping.
 */
export const PIE_COLORS = [
  '#b0684d', // clay
  '#8d5a74', // plum
  '#c2a04c', // ochre
  '#6b8cae', // dusty blue
  '#7f9a6d', // sage
  '#c87f4f', // burnt orange
  '#7d89a8', // slate
  '#b5738a', // dusty rose
  '#8a8f4a', // olive
  '#9b7f9e', // mauve
  '#a9846b', // camel
  '#5f9490', // muted teal
];

/** Named series colors (stat cards + line charts).
 *
 * Income = teal, Expenses = burgundy (deliberately darker than the
 * old red so the two don't read as "AI default red/green").
 * Projected/Invested/Balance follow the brand terracotta (see @theme
 * in index.css); Balance never shares a chart with Projected, so the
 * reuse is safe. Plan stays neutral gray — both plan lines (expenses
 * and balance) use it, so dashed gray consistently means "plan".
 */
export const SERIES_COLORS = {
  Gehalt: '#10b981',
  Income: '#0d9488',
  Extra: '#f59e0b',
  Expenses: '#9f1239',
  Balance: '#b8492c',
  Invested: '#b8492c',
  Projected: '#b8492c',
  Actual: '#10b981',
  Plan: '#9ca3af',
};

/** Consistent tooltip styling for all charts. */
export const CHART_TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
} as const;

/** Compact legend props — the default 14px legend text wraps into
 * tall multi-line blocks on phones. Smaller icons + 12px text keep it
 * to one or two tight lines. Spread onto every <Legend />:
 * `<Legend {...LEGEND_PROPS} />`. */
export const LEGEND_PROPS = {
  iconSize: 10,
  wrapperStyle: { fontSize: '0.75rem', lineHeight: '1.35' },
} as const;

/* ── Shared chart building blocks ───────────── */
/* Recharts 3 registers axes/tooltips by mount-time dispatch, but to
 * stay off its internals these are shared as props objects and pure
 * factories — spread them into the JSX children directly. */

/** Currency tooltip props — `<Tooltip {...currencyTooltipProps} />`.
 * Values arrive as strings/numbers (Recharts types them loosely, hence
 * the unknown param); formatCurrency handles both. */
export const currencyTooltipProps = {
  formatter: (value: unknown) => formatCurrency(Number(value)),
  contentStyle: CHART_TOOLTIP_STYLE,
} as const;

/** Identical dashed grid on every chart. */
export const gridProps = {
  strokeDasharray: '3 3',
  stroke: '#e5e7eb',
} as const;

/** Margin for vertical-layout (horizontal bar) charts. Phones pull the
 * y-axis line toward the card edge for more plot width. */
export const vBarMargin = (isMobile: boolean) => ({
  left: isMobile ? -14 : 8,
  right: 24,
});

/** Height for row-based bar charts: a baseline for few rows, growing
 * 24px (phone) / 34px (desktop) per row. */
export const rowsHeight = (
  rows: number,
  isMobile: boolean,
  mobileBase: number,
  desktopBase = 350,
) => Math.max(isMobile ? mobileBase : desktopBase, rows * (isMobile ? 24 : 34) + 60);

/** X-axis for time-series charts: half-size ticks; on phones only the
 * first month of each year is labeled — with the year itself — every
 * other month renders as a plain tick (data entries must carry their
 * `year`). Desktop keeps full month labels. */
export const makeYearTickFormatter =
  (data: { year: number }[], isMobile: boolean) =>
  (value: string, index: number): string => {
    if (!isMobile) return value;
    return index === 0 || data[index]?.year !== data[index - 1]?.year
      ? String(data[index]?.year ?? '')
      : '';
  };

/** Tick formatter factory for category names: on phones, names longer
 * than `max` characters are truncated with an ellipsis (the full name
 * stays in the tooltip). */
export const makeTruncateTick =
  (isMobile: boolean, max = 10) =>
  (value: string): string =>
    isMobile && value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** Y-axis props for vertical-layout bar charts (category names on the
 * left). Phones reserve less width and truncate long names. */
export const categoryYAxisProps = (dataKey: string, isMobile: boolean) => ({
  type: 'category' as const,
  dataKey,
  width: isMobile ? 96 : 130,
  fontSize: 12,
  tickFormatter: makeTruncateTick(isMobile),
});

/** Numeric x-axis for vertical-layout bar charts. */
export const numberXAxisProps = {
  type: 'number' as const,
  fontSize: 12,
} as const;

/** X-axis props for time-series charts (label + tick size + year
 * formatter for phones). */
export const timeXAxisProps = (
  tickFormatter: (value: string, index: number) => string,
) => ({
  dataKey: 'label',
  fontSize: 12,
  tickSize: 3,
  tickFormatter,
});

/** Y-axis props for time-series charts. */
export const timeYAxisProps = { fontSize: 12 } as const;

/** Line-chart dot sizing — big enough to read on desktop, small
 * enough not to overlap on a phone. */
export const lineDot = (isMobile: boolean) => ({ r: isMobile ? 2.5 : 4 });

/**
 * Shared UI helpers — class-name builders for common interactive styles.
 */

/**
 * Tailwind classes for pill/tab toggle buttons (e.g. the Overall/Monthly
 * tabs on the Charts page and the year pills on the dashboard).
 */
export function pillButtonClass(active: boolean): string {
  return `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
  }`;
}

/**
 * Tailwind classes for secondary ("neutral") action buttons — the
 * gray-filled style used across the app (calculator keypad, cancel
 * buttons, toolbar actions like Import Excel). Use instead of the old
 * bordered-white style so all neutral buttons look and hover alike.
 */
export const neutralButtonClass =
  'rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';

/** Primary brand action (px-4/py-2, semibold) — "New Budget", form
 * submits, modal confirmations. */
export const primaryButtonClass =
  'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';

/** Compact primary brand action (px-3/py-1.5, medium) — inline form
 * submits on the detail page. */
export const primaryButtonCompactClass =
  'rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50';

/** Page heading (h1) — 20px on phones, 24px from sm. */
export const pageTitleClass =
  'mb-6 text-xl font-bold text-gray-900 sm:text-2xl dark:text-white';

/** Full-width form input (the standard text/select field). */
export const fieldInputClass =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

/** Compact form input for inline editing inside tables/rows. */
export const fieldInputCompactClass =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

/** Empty-state box (dashed border, centered message). */
export const emptyStateClass =
  'rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800';

/** Table header row (all data tables share the hairline + muted look). */
export const tableHeadRowClass =
  'border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400';

/** Clickable table row (drill-down tables: hover highlight + pointer). */
export const clickableRowClass =
  'cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/50';

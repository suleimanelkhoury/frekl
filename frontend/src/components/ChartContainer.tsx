/**
 * ChartContainer — wrapper for Recharts components.
 *
 * Provides a consistent card-style container with a title for charts.
 */

import { type ReactNode } from 'react';

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  children,
  className = '',
}: ChartContainerProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 dark:text-white">
        {title}
      </h3>
      <div className="w-full">{children}</div>
    </div>
  );
}

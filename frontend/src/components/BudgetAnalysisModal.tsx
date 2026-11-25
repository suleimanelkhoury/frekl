/**
 * BudgetAnalysisModal — label hygiene across all budgets, opened from
 * the Settings page's "Budget Analysis" button.
 *
 * Two sections:
 * - One-time rows: labels that occurred exactly once ever
 * - Very similar names: clusters of near-duplicate spellings (likely
 *   the same recurring row typed differently)
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { budgetsApi } from '../api';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { formatCurrency, formatMonthYear } from '../utils/format';
import { queryKeys } from '../utils/queryKeys';

export function BudgetAnalysisModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.analysis,
    queryFn: budgetsApi.getAnalysis,
  });

  return (
    <Modal
      title={t('settings.analysis.title')}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {/* ── One-time rows ─────────────────────── */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('settings.analysis.oneTime.title')}
            </h4>
            {data.one_time.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {t('settings.analysis.oneTime.empty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="py-2 pr-4 font-medium">
                        {t('settings.analysis.columns.label')}
                      </th>
                      <th className="py-2 pr-4 font-medium">
                        {t('settings.analysis.columns.category')}
                      </th>
                      <th className="py-2 pr-4 font-medium">
                        {t('settings.analysis.columns.budget')}
                      </th>
                      <th className="py-2 font-medium text-right">
                        {t('settings.analysis.columns.ist')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.one_time.map((row) => (
                      <tr
                        key={row.label}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">
                          {row.label}
                        </td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                          {row.category}
                        </td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                          {formatMonthYear(row.month, row.year)}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(row.total_actual)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Very similar names ────────────────── */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('settings.analysis.similar.title')}
            </h4>
            {data.similar.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {t('settings.analysis.similar.empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {data.similar.map((group, groupIndex) => (
                  <div
                    key={`group-${groupIndex}`}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    {group.labels.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-4 py-1"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {row.label}
                          </span>
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                            {row.category} ·{' '}
                            {t('settings.analysis.similar.occurrences', {
                              count: row.occurrences,
                              budgets: row.budget_count,
                            })}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm text-gray-700 dark:text-gray-300">
                          {formatCurrency(row.total_actual)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

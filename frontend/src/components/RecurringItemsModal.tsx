/**
 * RecurringItemsModal — subscription-style rows aggregated across all
 * budgets, opened from the Settings page's "Subscriptions" button.
 *
 * One table: each recurring row (present in ≥ 2 budgets) with its
 * average actual cost, the months it spanned, and a price trend
 * (earliest entries vs. latest entries) that reveals subscriptions
 * quietly getting more expensive. Clicking a row opens the
 * ExpenseHistoryModal for that label — the same drill-down the
 * top-expenses chart uses.
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { budgetsApi } from '../api';
import { ExpenseHistoryModal } from './ExpenseHistoryModal';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { useHistoryDrillDown } from '../hooks/useHistoryDrillDown';
import { formatCurrency, formatMonthYear } from '../utils/format';
import { badgeTone } from '../utils/balance';
import { queryKeys } from '../utils/queryKeys';
import { clickableRowClass, tableHeadRowClass } from '../utils/ui';
import type { RecurringItem } from '../types';

/** Trend badge: arrow + change, colored like DifferenceBadge (up =
 * paying more = red, down = green, flat = gray). */
function TrendBadge({ item }: { item: RecurringItem }) {
  const { t } = useTranslation();
  if (!item.direction || item.change_pct === null) return null;

  const tone = badgeTone(
    item.direction === 'up' ? 1 : item.direction === 'down' ? -1 : 0,
    false,
  );
  const arrow = item.direction === 'up' ? '▲' : item.direction === 'down' ? '▼' : '→';
  const pct =
    item.direction === 'flat' ? '' : ` ${Math.abs(item.change_pct).toFixed(1)} %`;

  return (
    <span
      title={t('settings.subscriptions.trend.hint')}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}
    >
      {arrow}
      {pct}
    </span>
  );
}

export function RecurringItemsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const history = useHistoryDrillDown();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.recurring,
    queryFn: budgetsApi.getRecurring,
  });

  return (
    <>
      <Modal
        title={t('settings.subscriptions.title')}
        onClose={onClose}
        widthClassName="max-w-3xl"
      >
        {isLoading || !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t('settings.subscriptions.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRowClass}>
                  <th className="py-2 pr-4 font-medium">
                    {t('settings.subscriptions.columns.label')}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t('settings.subscriptions.columns.category')}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t('settings.subscriptions.columns.seen')}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t('settings.subscriptions.columns.period')}
                  </th>
                  <th className="py-2 pr-4 font-medium text-right">
                    {t('settings.subscriptions.columns.avg')}
                  </th>
                  <th className="py-2 font-medium text-right">
                    {t('settings.subscriptions.columns.trend')}
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
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                      {item.category}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-gray-700 dark:text-gray-300">
                      {t('settings.subscriptions.seen', {
                        count: item.occurrences,
                        budgets: item.budget_count,
                      })}
                      <span className="block text-xs text-gray-400 dark:text-gray-500">
                        {item.cadence_months === 1
                          ? t('settings.subscriptions.cadenceMonthly')
                          : t('settings.subscriptions.cadenceEvery', {
                              months: item.cadence_months,
                            })}
                      </span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-gray-700 dark:text-gray-300">
                      {formatMonthYear(item.first_month, item.first_year)}
                      {' – '}
                      {formatMonthYear(item.last_month, item.last_year)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.avg_actual)}
                    </td>
                    <td className="py-2 text-right">
                      <TrendBadge item={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ── Drill-down: full history of the clicked row ── */}
      {history.label && (
        <ExpenseHistoryModal label={history.label} onClose={history.close} />
      )}
    </>
  );
}

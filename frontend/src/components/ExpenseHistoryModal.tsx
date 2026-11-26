/**
 * ExpenseHistoryModal — every recorded expense entry for one row label,
 * across all budgets ("all the Ausgaben ever").
 *
 * Opened by clicking a bar in the top-expenses chart on the Charts
 * page's Overall tab, a row in the subscriptions or investments
 * tables, or a hit in the global search. Fetches the backend's
 * item-history endpoint, which applies the same case-insensitive label
 * aggregation as the top-items ranking; entries are chronological with
 * per-entry SOLL/IST/difference and the summed totals. Clicking an
 * entry navigates to that entry's budget detail page.
 */

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { budgetsApi } from '../api';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { balanceColor } from '../utils/balance';
import { formatCurrency, formatMonthYear, toNumber } from '../utils/format';
import { queryKeys } from '../utils/queryKeys';

interface ExpenseHistoryModalProps {
  /** The row label clicked in the chart (display spelling). */
  label: string;
  onClose: () => void;
}

export function ExpenseHistoryModal({
  label,
  onClose,
}: ExpenseHistoryModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.itemHistory(label),
    queryFn: () => budgetsApi.getItemHistory(label),
  });

  const totalDiff = data
    ? toNumber(data.total_actual) - toNumber(data.total_projected)
    : 0;

  return (
    <Modal
      title={t('charts.history.title', { name: label })}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      {isLoading || !data ? (
        <Spinner />
      ) : data.entries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t('charts.history.empty')}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
            {t('charts.history.entries', { count: data.entries.length })} ·{' '}
            {t('charts.history.openHint')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-4 font-medium">
                    {t('charts.history.budget')}
                  </th>
                  <th className="py-2 pr-4 font-medium">
                    {t('charts.history.category')}
                  </th>
                  <th className="py-2 font-medium text-right">
                    {t('charts.history.projected')}
                  </th>
                  <th className="py-2 font-medium text-right">
                    {t('charts.history.actual')}
                  </th>
                  <th className="py-2 font-medium text-right">
                    {t('charts.history.difference')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, index) => (
                  <tr
                    key={`hist-${index}`}
                    onClick={() => {
                      onClose();
                      navigate(`/budgets/${entry.budget_id}`);
                    }}
                    title={t('charts.history.openBudget')}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">
                      {formatMonthYear(entry.month, entry.year)}
                    </td>
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                      {entry.category}
                    </td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(entry.projected_cost)}
                    </td>
                    <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(entry.actual_cost)}
                    </td>
                    <td
                      className={`py-2 text-right font-medium ${balanceColor(toNumber(entry.difference))}`}
                    >
                      {formatCurrency(entry.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-gray-900 dark:text-gray-100">
                  <td className="py-2 pr-4" colSpan={2}>
                    {t('charts.history.total')}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(data.total_projected)}
                  </td>
                  <td className="py-2 text-right">
                    {formatCurrency(data.total_actual)}
                  </td>
                  <td
                    className={`py-2 text-right ${balanceColor(totalDiff)}`}
                  >
                    {formatCurrency(totalDiff)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

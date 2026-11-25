/**
 * Dashboard Page — overview of all budgets.
 *
 * Year pills select the year; the selected year shows its money
 * snapshot (summary panel) directly above its budget cards — one
 * coherent block per year. Includes a button to create a new budget
 * and a button to import an Excel file.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetsApi } from '../api';
import { useTranslation } from 'react-i18next';
import { BudgetCard } from '../components/BudgetCard';
import { DashboardSummary } from '../components/DashboardSummary';
import { Spinner } from '../components/Spinner';
import { emptyBudgetDraft } from '../utils/budgetForm';
import { queryKeys } from '../utils/queryKeys';
import { neutralButtonClass, pillButtonClass } from '../utils/ui';
import { UploadIcon } from '../components/Icons';

// Lazy: SheetJS (xlsx) is ~380 kB and only needed once the user
// actually opens the import dialog.
const ExcelImportModal = lazy(() =>
  import('../components/ExcelImportModal').then((m) => ({
    default: m.ExcelImportModal,
  })),
);

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBudget, setNewBudget] = useState(emptyBudgetDraft);
  // Selected year for the combined summary + cards block (null =
  // automatic: the current year if it has budgets, else the newest)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const { data: budgets, isLoading } = useQuery({
    queryKey: queryKeys.budgets,
    queryFn: budgetsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: (budget) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      queryClient.invalidateQueries({ queryKey: queryKeys.comparison });
      queryClient.invalidateQueries({ queryKey: queryKeys.yearlyComparison });
      setShowCreateForm(false);
      setNewBudget(emptyBudgetDraft());
      navigate(`/budgets/${budget.id}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newBudget);
  };

  const handleImportSuccess = (budgetId: number) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
    queryClient.invalidateQueries({ queryKey: queryKeys.comparison });
    queryClient.invalidateQueries({ queryKey: queryKeys.yearlyComparison });
    setShowImportModal(false);
    navigate(`/budgets/${budgetId}`);
  };

  if (isLoading) {
    return <Spinner />;
  }

  // ── Year selection ──────────────────────────
  // Years with budgets, newest first. The current year is the default
  // when it has budgets, otherwise the newest one.
  const now = new Date();
  const years = [...new Set((budgets ?? []).map((b) => b.year))].sort(
    (a, b) => b - a,
  );
  const activeYear =
    selectedYear ??
    (years.includes(now.getFullYear()) ? now.getFullYear() : years[0]);
  const activeBudgets = (budgets ?? [])
    .filter((b) => b.year === activeYear)
    .sort((a, b) => b.month - a.month); // newest month first

  // ── Current/latest budget ───────────────────
  // This month's budget if one exists, otherwise the most recent one.
  // The backend returns budgets sorted by (year, month) ascending, so
  // the last element is the latest.
  const currentBudget = budgets
    ? budgets.find(
        (b) => b.month === now.getMonth() + 1 && b.year === now.getFullYear(),
      ) ?? budgets[budgets.length - 1]
    : undefined;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.title')}
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className={`${neutralButtonClass} inline-flex items-center gap-2`}
          >
            <UploadIcon size={14} /> {t('dashboard.actions.importExcel')}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {t('dashboard.actions.newBudget')}
          </button>
        </div>
      </div>

      {/* ── Create budget form ────────────────── */}
      {showCreateForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard.create.heading')}
          </h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('dashboard.create.titleLabel')}
              </label>
              <input
                type="text"
                value={newBudget.title}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, title: e.target.value })
                }
                placeholder={t('dashboard.create.titlePlaceholder')}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('dashboard.create.monthLabel')}
              </label>
              <select
                value={newBudget.month}
                onChange={(e) =>
                  setNewBudget({
                    ...newBudget,
                    month: parseInt(e.target.value),
                  })
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('dashboard.create.yearLabel')}
              </label>
              <input
                type="number"
                value={newBudget.year}
                onChange={(e) =>
                  setNewBudget({ ...newBudget, year: parseInt(e.target.value) })
                }
                min="2000"
                max="2100"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {createMutation.isPending
                  ? t('dashboard.create.submitting')
                  : t('dashboard.create.submit')}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('common.actions.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Year pills + combined summary & cards ── */}
      {years.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={pillButtonClass(year === activeYear)}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Year snapshot + this year's cards, one block */}
          <DashboardSummary year={activeYear} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeBudgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                isCurrent={budget.id === currentBudget?.id}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-500">
            {t('dashboard.archive.empty')}
          </p>
        </div>
      )}

      {/* ── Import modal ──────────────────────── */}
      <Suspense fallback={null}>
        <ExcelImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      </Suspense>
    </div>
  );
}

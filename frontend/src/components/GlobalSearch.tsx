/**
 * GlobalSearch — the header search box.
 *
 * One substring query against GET /api/search (debounced, min 2
 * characters) with a dropdown of grouped results: budgets, categories,
 * and expense items. Results are GLOBAL — one hit per distinct name
 * with its occurrence count and the most recent occurrence as context
 * (a monthly row yields one hit, not one per budget). Clicking a
 * budget or category hit navigates to its most recent budget's detail
 * page; clicking an item hit opens the shared expense-history
 * drill-down for that label (all entries across all budgets).
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api';
import { ExpenseHistoryModal } from './ExpenseHistoryModal';
import { SearchIcon, XIcon } from './Icons';
import { queryKeys } from '../utils/queryKeys';
import { formatMonthYear } from '../utils/format';

/** Delay in ms before a typed query is actually sent. */
const DEBOUNCE_MS = 300;
/** Minimum query length before searching (keeps the noise down). */
const MIN_QUERY_LENGTH = 2;

function useDebounced(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [historyLabel, setHistoryLabel] = useState<string | null>(null);

  const debounced = useDebounced(query, DEBOUNCE_MS);
  const active = debounced.trim().length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => searchApi.search(debounced),
    enabled: active,
    // Keep previous results visible while typing further.
    placeholderData: (previous) => previous,
  });

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const goToBudget = (budgetId: number) => {
    close();
    navigate(`/budgets/${budgetId}`);
  };

  const hasResults =
    data &&
    (data.budgets.length > 0 ||
      data.categories.length > 0 ||
      data.items.length > 0);

  return (
    <>
      {/* Outside-click catcher (transparent, under the dropdown) */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="relative hidden sm:block">
        {/* ── Input ───────────────────────────────── */}
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-2 text-gray-400 dark:text-gray-500">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
            }}
            placeholder={t('common.search.placeholder')}
            aria-label={t('common.search.placeholder')}
            className="w-48 rounded-lg border border-gray-300 py-1.5 pl-8 pr-8 text-sm focus:border-brand-500 focus:outline-none sm:w-64 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          {query && (
            <button
              type="button"
              onClick={close}
              className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={t('common.actions.close')}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* ── Results dropdown ────────────────────── */}
        {open && active && (
          <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {isFetching && !data ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                {t('common.states.loading')}
              </p>
            ) : data && !hasResults ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
                {t('common.search.noResults')}
              </p>
            ) : data ? (
              <div className="max-h-96 overflow-y-auto">
                {/* ── Budgets ─────────────────────── */}
                {data.budgets.length > 0 && (
                  <SearchSection title={t('common.search.budgets')}>
                    {data.budgets.map((hit) => (
                      <SearchRow
                        key={`b-${hit.budget_id}`}
                        onClick={() => goToBudget(hit.budget_id)}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {hit.label}
                        </span>
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                          {hit.occurrences > 1 && `${hit.occurrences}× · `}
                          {formatMonthYear(hit.month, hit.year)}
                        </span>
                      </SearchRow>
                    ))}
                  </SearchSection>
                )}

                {/* ── Categories ──────────────────── */}
                {data.categories.length > 0 && (
                  <SearchSection title={t('common.search.categories')}>
                    {data.categories.map((hit, index) => (
                      <SearchRow
                        key={`c-${hit.label}-${index}`}
                        onClick={() => goToBudget(hit.budget_id)}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {hit.label}
                        </span>
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                          {hit.occurrences}× · {hit.budget_title}
                        </span>
                      </SearchRow>
                    ))}
                  </SearchSection>
                )}

                {/* ── Items ───────────────────────── */}
                {data.items.length > 0 && (
                  <SearchSection title={t('common.search.items')}>
                    {data.items.map((hit, index) => (
                      <SearchRow
                        key={`i-${hit.label}-${index}`}
                        onClick={() => {
                          close();
                          setHistoryLabel(hit.label);
                        }}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {hit.label}
                        </span>
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                          {hit.category} · {hit.occurrences}×
                        </span>
                      </SearchRow>
                    ))}
                  </SearchSection>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Drill-down for item hits ──────────────── */}
      {historyLabel && (
        <ExpenseHistoryModal
          label={historyLabel}
          onClose={() => setHistoryLabel(null)}
        />
      )}
    </>
  );
}

/** A labeled group of result rows. */
function SearchSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 last:border-b-0 dark:border-gray-800">
      <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

/** One clickable result row. */
function SearchRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      {children}
    </button>
  );
}

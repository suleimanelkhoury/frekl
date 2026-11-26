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
 *
 * Desktop (sm+): always-visible input in the header. Phones: an icon
 * button that opens a full-screen search sheet (a fixed 10rem input
 * would crowd the header row).
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api';
import { ExpenseHistoryModal } from './ExpenseHistoryModal';
import { useHistoryDrillDown } from '../hooks/useHistoryDrillDown';
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
  // Render state with exit animations: the dropdown/sheet stay mounted
  // briefly (playing their out-animation) after close() — see the
  // *_MS durations below.
  const [dropOpen, setDropOpen] = useState(false);
  const [dropClosing, setDropClosing] = useState(false);
  // Phones: the full-screen search sheet (opened via the header icon)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetClosing, setSheetClosing] = useState(false);
  const history = useHistoryDrillDown();

  const DROPDOWN_MS = 140;
  const SHEET_MS = 180;
  const dropTimer = useRef<number | null>(null);
  const sheetTimer = useRef<number | null>(null);

  const debounced = useDebounced(query, DEBOUNCE_MS);
  const active = debounced.trim().length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => searchApi.search(debounced),
    enabled: active,
    // Keep previous results visible while typing further.
    placeholderData: (previous) => previous,
  });

  /** Show the dropdown (typing or focusing the input). Re-opens
   * cleanly even while the out-animation is still playing. */
  const openDropdown = () => {
    if (dropTimer.current) window.clearTimeout(dropTimer.current);
    setDropClosing(false);
    setDropOpen(true);
    setOpen(true);
  };

  const openSheet = () => {
    if (sheetTimer.current) window.clearTimeout(sheetTimer.current);
    setSheetClosing(false);
    setSheetOpen(true);
    openDropdown();
  };

  /** Close dropdown + sheet; they stay mounted briefly to play their
   * out-animation before unmounting. */
  const close = () => {
    setOpen(false);
    setQuery('');
    if (dropOpen && !dropClosing) {
      setDropClosing(true);
      dropTimer.current = window.setTimeout(() => {
        setDropOpen(false);
        setDropClosing(false);
      }, DROPDOWN_MS);
    }
    if (sheetOpen && !sheetClosing) {
      setSheetClosing(true);
      sheetTimer.current = window.setTimeout(() => {
        setSheetOpen(false);
        setSheetClosing(false);
      }, SHEET_MS);
    }
  };

  // Clear pending close timers on unmount
  useEffect(
    () => () => {
      if (dropTimer.current) window.clearTimeout(dropTimer.current);
      if (sheetTimer.current) window.clearTimeout(sheetTimer.current);
    },
    [],
  );

  const goToBudget = (budgetId: number) => {
    close();
    navigate(`/budgets/${budgetId}`);
  };

  const hasResults =
    data &&
    (data.budgets.length > 0 ||
      data.categories.length > 0 ||
      data.items.length > 0);

  // ── Shared results list (desktop dropdown + mobile sheet) ──
  const results = (() => {
    if (!active) return null;
    if (isFetching && !data) {
      return (
        <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
          {t('common.states.loading')}
        </p>
      );
    }
    if (data && !hasResults) {
      return (
        <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
          {t('common.search.noResults')}
        </p>
      );
    }
    if (!data) return null;
    return (
      <div className="max-h-96 overflow-y-auto">
        {/* ── Budgets ─────────────────────────────── */}
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

        {/* ── Categories ──────────────────────────── */}
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

        {/* ── Items ───────────────────────────────── */}
        {data.items.length > 0 && (
          <SearchSection title={t('common.search.items')}>
            {data.items.map((hit, index) => (
              <SearchRow
                key={`i-${hit.label}-${index}`}
                onClick={() => {
                  close();
                  history.openFor(hit.label);
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
    );
  })();

  // The shared input (icon, field, clear button) — width set by the
  // wrapper (fixed in the header on desktop, flex-1 in the sheet)
  const searchInput = (
    <div className="relative flex-1">
      <span className="pointer-events-none absolute left-2.5 top-2 text-gray-400 dark:text-gray-500">
        <SearchIcon size={16} />
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          openDropdown();
        }}
        onFocus={() => openDropdown()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
        placeholder={t('common.search.placeholder')}
        aria-label={t('common.search.placeholder')}
        className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-8 text-sm focus:border-brand-500 focus:outline-none sm:py-1.5 sm:w-72 lg:w-80 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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
  );

  return (
    <>
      {/* ── Desktop: inline header input ──────────── */}
      <div className="relative hidden sm:block">
        {searchInput}

        {/* Results dropdown (fades/slides in and out; only rendered
            when there is content — an empty bordered box would show as
            a thin line under the input) */}
        {dropOpen && results && (
          <div
            className={`absolute right-0 z-50 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
              dropClosing
                ? 'animate-[search-drop-out_140ms_ease-in_forwards]'
                : 'animate-[search-drop-in_140ms_ease-out]'
            }`}
          >
            {results}
          </div>
        )}
      </div>

      {/* ── Phones: icon button + full-screen sheet ── */}
      <div className="flex items-stretch self-stretch sm:hidden">
        <button
          type="button"
          onClick={openSheet}
          aria-label={t('common.search.placeholder')}
          className="flex items-center px-3 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <SearchIcon size={20} />
        </button>
      </div>
      {sheetOpen && (
        <div
          className={`fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900 ${
            sheetClosing
              ? 'animate-[search-sheet-out_180ms_ease-in_forwards]'
              : 'animate-[search-sheet-in_180ms_ease-out]'
          }`}
        >
          {/* Same height as the header (h-16) so the sheet reads as
              its continuation */}
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
            {searchInput}
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('common.actions.cancel')}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="overflow-hidden rounded-none border-gray-200 dark:border-gray-700">
              {results}
            </div>
          </div>
        </div>
      )}

      {/* Outside-click catcher for the desktop dropdown (transparent,
          under the dropdown) */}
      {open && !sheetOpen && !sheetClosing && (
        <div
          className="fixed inset-0 z-40"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Drill-down for item hits ──────────────── */}
      {history.label && (
        <ExpenseHistoryModal label={history.label} onClose={history.close} />
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

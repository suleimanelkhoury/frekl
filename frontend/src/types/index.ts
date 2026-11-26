/**
 * TypeScript types matching the backend Pydantic schemas.
 * These mirror the API response/request bodies exactly.
 */

// ── Auth ─────────────────────────────────────
export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: User;
}

// ── Budget ───────────────────────────────────
/** How a new budget's SOLL rows are drafted from history (backend
 * `BudgetCreate.prefill`): blank, the previous budget's plan, or an
 * average of the last up to three budgets' actual spending. */
export type PrefillStrategy = 'none' | 'last' | 'average';

export interface BudgetCreate {
  title: string;
  month: number;
  year: number;
  prefill?: PrefillStrategy;
}

export interface Budget {
  id: number;
  user_id: number;
  title: string;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetDetail extends Budget {
  incomes: Income[];
  categories: Category[];
}

// ── Income ───────────────────────────────────
export interface IncomeCreate {
  label: string;
  projected_amount?: string | number;
  actual_amount?: string | number;
}

export interface IncomeUpdate {
  label?: string;
  projected_amount?: string | number;
  actual_amount?: string | number;
}

export interface Income {
  id: number;
  budget_id: number;
  label: string;
  projected_amount: string;
  actual_amount: string;
  difference: string;
}

// ── Category ─────────────────────────────────
export interface CategoryCreate {
  name: string;
  sort_order?: number;
}

export interface CategoryUpdate {
  name?: string;
  sort_order?: number;
}

export interface Category {
  id: number;
  budget_id: number;
  name: string;
  sort_order: number;
  items: ExpenseItem[];
}

// ── Expense Item ─────────────────────────────
export interface ExpenseItemCreate {
  label: string;
  projected_cost?: string | number;
  actual_cost?: string | number;
}

export interface ExpenseItemUpdate {
  label?: string;
  projected_cost?: string | number;
  actual_cost?: string | number;
}

export interface ExpenseItem {
  id: number;
  category_id: number;
  label: string;
  projected_cost: string;
  actual_cost: string;
  difference: string;
}

// ── Summary ──────────────────────────────────
export interface BudgetSummary {
  total_projected_income: string;
  total_actual_income: string;
  total_projected_gehalt: string;
  total_actual_gehalt: string;
  total_projected_extra: string;
  total_actual_extra: string;
  total_projected_expenses: string;
  total_actual_expenses: string;
  projected_balance: string;
  actual_balance: string;
  balance_difference: string;
  expense_difference: string;
}

// ── Chart Data ───────────────────────────────
export interface ChartDataPoint {
  label: string;
  projected: string;
  actual: string;
  // Only set on category-trend data points
  month?: number | null;
  year?: number | null;
}

export interface ChartData {
  budget_id: number;
  budget_title: string;
  expenses_by_category: ChartDataPoint[];
  income_vs_expenses: ChartDataPoint;
}

// ── Category Trend ───────────────────────────
export interface CategoryTrend {
  category_name: string;
  months: ChartDataPoint[];
}

// ── Top Items (all budgets) ──────────────────
export interface TopItem {
  label: string;
  category: string;
  total: string;
}

export interface TopItemsResponse {
  items: TopItem[];
}

// ── Item History (all budgets) ───────────────
export interface ItemHistoryEntry {
  budget_id: number;
  budget_title: string;
  month: number;
  year: number;
  category: string;
  label: string;
  projected_cost: string;
  actual_cost: string;
  difference: string;
}

export interface ItemHistoryResponse {
  label: string;
  entries: ItemHistoryEntry[];
  total_projected: string;
  total_actual: string;
}

// ── Budget Analysis (label hygiene, all budgets) ──
export interface RowUsage {
  label: string;
  category: string;
  occurrences: number;
  budget_count: number;
  total_actual: string;
  month: number;
  year: number;
}

export interface SimilarNameGroup {
  labels: RowUsage[];
}

export interface BudgetAnalysisResponse {
  one_time: RowUsage[];
  similar: SimilarNameGroup[];
}

// ── Recurring items (subscriptions, all budgets) ──
export interface RecurringItem {
  label: string; // most recent spelling
  category: string; // most recent category spelling
  occurrences: number;
  budget_count: number;
  first_month: number;
  first_year: number;
  last_month: number;
  last_year: number;
  total_actual: string;
  avg_actual: string;
  /** Detected interval in months: 1 = monthly, 3 = quarterly, … */
  cadence_months: number;
  early_avg: string | null;
  late_avg: string | null;
  direction: 'up' | 'down' | 'flat' | null;
  change_pct: number | null;
}

export interface RecurringResponse {
  items: RecurringItem[];
}

// ── Multi-month Comparison ───────────────────
export interface BudgetComparisonEntry {
  budget_id: number;
  title: string;
  month: number;
  year: number;
  total_projected_income: string;
  total_actual_income: string;
  total_projected_gehalt: string;
  total_actual_gehalt: string;
  total_projected_extra: string;
  total_actual_extra: string;
  total_projected_expenses: string;
  total_actual_expenses: string;
  projected_balance: string;
  actual_balance: string;
}

export interface BudgetComparison {
  budgets: BudgetComparisonEntry[];
}

// ── Yearly Comparison ───────────────────────
export interface YearlyCategoryTotal {
  name: string;
  total: string;
}

export interface YearlyComparisonEntry {
  year: number;
  total_income: string;
  total_gehalt: string;
  total_extra: string;
  total_expenses: string;
  total_balance: string;
  invested: string;
  categories: YearlyCategoryTotal[];
}

export interface YearlyComparison {
  years: YearlyComparisonEntry[];
}

// ── Budget Clone (recurring templates) ───────
export interface BudgetClone {
  title: string;
  month: number;
  year: number;
  copy_actuals?: boolean;
}

// ── Excel Import ─────────────────────────────
export interface ExcelImportResponse {
  budget_id: number;
  budget_title: string;
  categories_imported: number;
  income_imported: number;
  items_imported: number;
  message: string;
}

// ── API Error ────────────────────────────────
export interface ApiError {
  error: {
    status_code: number;
    message: string;
    detail: unknown;
    path: string;
    method: string;
  };
}

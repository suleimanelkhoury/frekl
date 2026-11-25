/**
 * Settings Page — user profile, language, budget analysis, change
 * password, logout.
 *
 * Shows the current user's email and account creation date, the
 * language switcher, a budget-analysis launcher (one-time rows and
 * near-duplicate row names), and a logout button. (Password change is
 * a placeholder for now.)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { BudgetAnalysisModal } from '../components/BudgetAnalysisModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { formatDate } from '../utils/format';
import { neutralButtonClass } from '../utils/ui';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        {t('settings.title')}
      </h1>

      {/* ── Profile ───────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('settings.profile.title')}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-500">
              {t('settings.profile.email')}
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {user?.email}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-500">
              {t('settings.profile.memberSince')}
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {user?.created_at ? formatDate(user.created_at) : t('settings.profile.noDate')}
            </p>
          </div>
        </div>
      </section>

      <hr className="mb-8 border-gray-200 dark:border-gray-700" />

      {/* ── Language ──────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('settings.language.title')}
        </h2>
        <div className="max-w-xs">
          <LanguageSwitcher />
        </div>
      </section>

      <hr className="mb-8 border-gray-200 dark:border-gray-700" />

      {/* ── Budget analysis ───────────────────── */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('settings.analysis.title')}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-500">
          {t('settings.analysis.hint')}
        </p>
        <button
          type="button"
          onClick={() => setAnalysisOpen(true)}
          className={neutralButtonClass}
        >
          {t('settings.analysis.open')}
        </button>
      </section>

      <hr className="mb-8 border-gray-200 dark:border-gray-700" />

      {/* ── Change password (placeholder) ─────── */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('settings.changePassword.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t('settings.changePassword.placeholder')}
        </p>
      </section>

      <hr className="mb-8 border-gray-200 dark:border-gray-700" />

      {/* ── Danger zone ───────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-red-600 dark:text-red-400">
          {t('settings.logout.title')}
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-500">
          {t('settings.logout.hint')}
        </p>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          {t('settings.logout.title')}
        </button>
      </section>

      {/* ── Budget analysis modal ─────────────── */}
      {analysisOpen && (
        <BudgetAnalysisModal onClose={() => setAnalysisOpen(false)} />
      )}
    </div>
  );
}

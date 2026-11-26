/**
 * RestoreBackupModal — restore budgets from a downloaded backup file.
 *
 * Flow: pick a .json file → parsed client-side and validated (format
 * tag) → a summary of the backup is shown → pick a restore mode
 * ("merge" fills missing months, "replace" wipes everything first —
 * with a red warning) → run the restore and report the counts.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { backupApi } from '../api';
import { Modal } from './Modal';
import { formatDateTime } from '../utils/format';
import { invalidateGlobalBudgetData } from '../utils/queryKeys';
import {primaryButtonClass, neutralButtonClass, fieldInputClass} from '../utils/ui';
import type { RestoreMode } from '../types';

interface ParsedBackup {
  format?: string;
  version?: number;
  exported_at?: string;
  email?: string;
  budgets?: unknown[];
}

export function RestoreBackupModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backup, setBackup] = useState<ParsedBackup | null>(null);
  const [fileError, setFileError] = useState(false);
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(
    null,
  );

  const restoreMutation = useMutation({
    mutationFn: () => backupApi.restore(backup, mode),
    onSuccess: (response) => {
      // A restore changes every derived view.
      invalidateGlobalBudgetData(queryClient);
      setResult(response);
    },
  });

  const handleFile = (file: File | undefined) => {
    setBackup(null);
    setFileError(false);
    setResult(null);
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as ParsedBackup;
        if (parsed?.format !== 'frekl-backup') {
          setFileError(true);
          return;
        }
        setBackup(parsed);
      })
      .catch(() => setFileError(true));
  };

  return (
    <Modal
      title={t('settings.backup.modal.title')}
      onClose={onClose}
      widthClassName="max-w-lg"
    >
      {result ? (
        /* ── Result view ─────────────────────────── */
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t('settings.backup.modal.result', {
              created: result.created,
              skipped: result.skipped,
            })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={primaryButtonClass}
          >
            {t('settings.backup.modal.close')}
          </button>
        </div>
      ) : (
        /* ── Setup view ──────────────────────────── */
        <div className="space-y-4">
          {/* ── File picker ─────────────────────── */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.backup.modal.fileLabel')}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="w-full text-sm text-gray-700 dark:text-gray-300"
            />
            {fileError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {t('settings.backup.modal.fileError')}
              </p>
            )}
          </div>

          {/* ── Backup summary ──────────────────── */}
          {backup && (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {t('settings.backup.modal.summary', {
                date: backup.exported_at
                  ? formatDateTime(backup.exported_at)
                  : '—',
                email: backup.email ?? '—',
                budgets: backup.budgets?.length ?? 0,
              })}
            </p>
          )}

          {/* ── Mode selection ──────────────────── */}
          {backup && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.backup.modal.modeLabel')}
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as RestoreMode)}
                className={`w-full ${fieldInputClass}`}
              >
                <option value="merge">
                  {t('settings.backup.modal.modeMerge')}
                </option>
                <option value="replace">
                  {t('settings.backup.modal.modeReplace')}
                </option>
              </select>
              {mode === 'replace' && (
                <p className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                  {t('settings.backup.modal.replaceWarning')}
                </p>
              )}
            </div>
          )}

          {restoreMutation.isError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t('settings.backup.modal.error')}
            </p>
          )}

          {/* ── Actions ─────────────────────────── */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={neutralButtonClass}
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="button"
              disabled={!backup || restoreMutation.isPending}
              onClick={() => restoreMutation.mutate()}
              className={primaryButtonClass}
            >
              {restoreMutation.isPending
                ? t('settings.backup.modal.restoring')
                : t('settings.backup.modal.restore')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

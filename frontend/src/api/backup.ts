/**
 * Backup API service — export and restore the user's data as JSON.
 */

import { api } from './client';
import type { RestoreMode, RestoreResponse } from '../types';

export const backupApi = {
  /** Download all of the user's data as a JSON backup file.

   Fetches the JSON blob with the auth token attached and triggers a
   browser download of it. */
  download: async (): Promise<void> => {
    const response = await api.get<Blob>('/backup/', {
      responseType: 'blob',
    });

    // Extract the filename from the Content-Disposition header if present.
    let filename = 'frekl-backup.json';
    const disposition = response.headers['content-disposition'];
    if (typeof disposition === 'string') {
      const match = /filename="?([^"]+)"?/.exec(disposition);
      if (match?.[1]) filename = match[1];
    }

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /** Restore budgets from a backup document. */
  restore: async (
    data: unknown,
    mode: RestoreMode,
  ): Promise<RestoreResponse> => {
    const response = await api.post<RestoreResponse>('/backup/restore', {
      data,
      mode,
    });
    return response.data;
  },
};

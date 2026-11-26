/**
 * Search API service — global search across budgets, categories, and
 * expense items.
 */

import { api } from './client';
import type { SearchResponse } from '../types';

export const searchApi = {
  /** Case-insensitive substring search over all of the user's data. */
  search: async (q: string): Promise<SearchResponse> => {
    const response = await api.get<SearchResponse>('/search/', {
      params: { q },
    });
    return response.data;
  },
};

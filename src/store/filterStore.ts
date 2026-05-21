import { create } from 'zustand';
import type { PayType } from '../types';

export type SortOption = 'distance' | 'pay' | 'recent';
export type PayTypeFilter = PayType | 'all'; // 'hour' | 'day' | 'month' | 'all'

export interface FilterState {
  sortBy: SortOption;
  payTypeFilter: PayTypeFilter;
  // Derived helper
  activeFilterCount: () => number;
  // Actions
  setSortBy: (sort: SortOption) => void;
  setPayTypeFilter: (type: PayTypeFilter) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  sortBy: 'distance',
  payTypeFilter: 'all',

  activeFilterCount: () => {
    const { sortBy, payTypeFilter } = get();
    let count = 0;
    if (sortBy !== 'distance') count++; // 'distance' is the default
    if (payTypeFilter !== 'all') count++;
    return count;
  },

  setSortBy: (sortBy) => set({ sortBy }),
  setPayTypeFilter: (payTypeFilter) => set({ payTypeFilter }),
  resetFilters: () => set({ sortBy: 'distance', payTypeFilter: 'all' }),
}));

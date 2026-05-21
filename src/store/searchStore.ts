import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchState {
  recentSearches: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addSearch: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          
          // Remove duplicate if it exists, then add to front
          const filtered = state.recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
          const updated = [trimmed, ...filtered].slice(0, 10); // Keep max 10
          
          return { recentSearches: updated };
        }),
      removeSearch: (query) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((q) => q !== query),
        })),
      clearSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'kaamnow-search-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

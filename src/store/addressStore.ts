import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_ADDRESSES = 20;
const MAX_RECENTS = 10;

export type AddressLabel = 'home' | 'work' | 'family' | 'other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  flatHouse: string;
  floor?: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  notes?: string;
  receiverName?: string;
  receiverPhone?: string;
  isDefault: boolean;
  createdAt: number;
  lastUsed: number;
}

export interface RecentSearch {
  id: string;
  query: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
}

interface AddressState {
  savedAddresses: SavedAddress[];
  activeAddressId: string | null;
  recentSearches: RecentSearch[];
  isLoaded: boolean;

  // Actions
  loadFromStorage: () => Promise<void>;
  addAddress: (addr: Omit<SavedAddress, 'id' | 'createdAt' | 'lastUsed'>) => Promise<string>;
  editAddress: (id: string, partial: Partial<SavedAddress>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
  addRecentSearch: (search: Omit<RecentSearch, 'id' | 'timestamp'>) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  getActive: () => SavedAddress | null;
}

import { useAuthStore } from './authStore';

const getStorageKeys = () => {
  const user = useAuthStore.getState().user;
  const userSuffix = user ? `_${user.id || user.phone || 'auth'}` : '_guest';
  return {
    addresses: `kn_saved_addresses${userSuffix}`,
    recents: `kn_recent_searches${userSuffix}`,
  };
};

const persist = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('AddressStore persist error:', e);
  }
};

export const useAddressStore = create<AddressState>((set, get) => ({
  savedAddresses: [],
  activeAddressId: null,
  recentSearches: [],
  isLoaded: false,

  loadFromStorage: async () => {
    try {
      const keys = getStorageKeys();
      const [addrRaw, recentRaw] = await Promise.all([
        AsyncStorage.getItem(keys.addresses),
        AsyncStorage.getItem(keys.recents),
      ]);
      const savedAddresses: SavedAddress[] = addrRaw ? JSON.parse(addrRaw) : [];
      const recentSearches: RecentSearch[] = recentRaw ? JSON.parse(recentRaw) : [];
      const defaultAddr = savedAddresses.find((a) => a.isDefault);
      set({
        savedAddresses,
        recentSearches,
        activeAddressId: defaultAddr?.id ?? savedAddresses[0]?.id ?? null,
        isLoaded: true,
      });
    } catch (e) {
      set({ isLoaded: true });
    }
  },

  addAddress: async (addr) => {
    const id = `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const newAddr: SavedAddress = { ...addr, id, createdAt: now, lastUsed: now };

    const state = get();

    // Deduplicate: if an address with same lat/lng (within ~50m) already exists, just activate it
    const THRESHOLD = 0.0005; // ~50 metres
    const existing = state.savedAddresses.find(
      (a) =>
        Math.abs(a.lat - addr.lat) < THRESHOLD &&
        Math.abs(a.lng - addr.lng) < THRESHOLD
    );
    if (existing) {
      // Just update lastUsed and set active — no new entry
      const updated = state.savedAddresses.map((a) =>
        a.id === existing.id ? { ...a, lastUsed: now } : a
      );
      set({ savedAddresses: updated, activeAddressId: existing.id });
      const keys = getStorageKeys();
      await persist(keys.addresses, updated);
      return existing.id;
    }

    // If this is default, un-default all others
    const existingList = addr.isDefault
      ? state.savedAddresses.map((a) => ({ ...a, isDefault: false }))
      : [...state.savedAddresses];

    // FIFO: prune to MAX_ADDRESSES
    const next = [newAddr, ...existingList].slice(0, MAX_ADDRESSES);
    const newActiveId = addr.isDefault ? id : (state.activeAddressId ?? id);

    set({ savedAddresses: next, activeAddressId: newActiveId });

    const keys = getStorageKeys();
    await persist(keys.addresses, next);
    return id;
  },

  editAddress: async (id, partial) => {
    const state = get();
    const updated = state.savedAddresses.map((a) =>
      a.id === id ? { ...a, ...partial } : a
    );
    set({ savedAddresses: updated });
    const keys = getStorageKeys();
    await persist(keys.addresses, updated);
  },

  deleteAddress: async (id) => {
    const state = get();
    const updated = state.savedAddresses.filter((a) => a.id !== id);
    const newActiveId = state.activeAddressId === id
      ? (updated.find((a) => a.isDefault)?.id ?? updated[0]?.id ?? null)
      : state.activeAddressId;

    // Update state first so UI reacts immediately
    set({ savedAddresses: updated, activeAddressId: newActiveId });

    // Then persist to storage
    const keys = getStorageKeys();
    await persist(keys.addresses, updated);
  },

  setDefault: async (id) => {
    const state = get();
    const updated = state.savedAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    set({ savedAddresses: updated, activeAddressId: id });
    const keys = getStorageKeys();
    await persist(keys.addresses, updated);
  },

  setActive: (id) => {
    const state = get();
    if (id) {
      const updated = state.savedAddresses.map((a) =>
        a.id === id ? { ...a, lastUsed: Date.now() } : a
      );
      set({ activeAddressId: id, savedAddresses: updated });
      const keys = getStorageKeys();
      persist(keys.addresses, updated);
    } else {
      set({ activeAddressId: null });
    }
  },

  getActive: () => {
    const { savedAddresses, activeAddressId } = get();
    return savedAddresses.find((a) => a.id === activeAddressId) ?? null;
  },

  addRecentSearch: async (search) => {
    const item: RecentSearch = {
      ...search,
      id: `rs_${Date.now()}`,
      timestamp: Date.now(),
    };
    set((state) => {
      // Deduplicate by address
      const filtered = state.recentSearches.filter(
        (r) => r.address.toLowerCase() !== search.address.toLowerCase()
      );
      const next = [item, ...filtered].slice(0, MAX_RECENTS);
      const keys = getStorageKeys();
      persist(keys.recents, next);
      return { recentSearches: next };
    });
  },

  clearRecentSearches: async () => {
    const keys = getStorageKeys();
    await AsyncStorage.removeItem(keys.recents);
    set({ recentSearches: [] });
  },
}));


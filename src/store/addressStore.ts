import { create } from 'zustand';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

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
    Sentry.captureMessage(`${'AddressStore persist error:'} ${e}`);
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
      const user = useAuthStore.getState().user;
      
      let savedAddresses: SavedAddress[] = [];

      // 1. Try to fetch from Backend API if authenticated
      if (user) {
        try {
          const response = await api.get(`/users/addresses`);

          if (response.status === 200) {
            const data = response.data;
            if (data.success && data.addresses) {
              savedAddresses = data.addresses.map((d: any) => ({
                id: d.id,
                label: (d.label as AddressLabel) || 'other',
                flatHouse: d.flat_house || '',
                street: d.address || '',
                area: d.area || '',
                landmark: d.landmark || '',
                city: d.city || '',
                state: d.state || '',
                pincode: d.pincode || '',
                lat: d.latitude || 0,
                lng: d.longitude || 0,
                isDefault: d.is_default || false,
                createdAt: new Date(d.created_at).getTime(),
                lastUsed: new Date(d.updated_at).getTime(),
              }));
              
              // Sync cloud data back to local storage
              await persist(keys.addresses, savedAddresses);
            }
          } else {
            console.warn("Backend fetch address error:", response.status);
          }
        } catch (e) {
          console.warn("Backend API exception:", e);
        }
      }

      // 2. If Supabase failed or empty (or guest), fallback to Local Storage
      if (savedAddresses.length === 0) {
        const addrRaw = await AsyncStorage.getItem(keys.addresses);
        if (addrRaw) savedAddresses = JSON.parse(addrRaw);
      }

      // Load Recent Searches (Local only)
      const recentRaw = await AsyncStorage.getItem(keys.recents);
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
    const user = useAuthStore.getState().user;
    let savedId = `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    let newAddr: SavedAddress = { ...addr, id: savedId, createdAt: now, lastUsed: now };

    if (user) {
      if (addr.isDefault) {
        await supabase.from('user_location').update({ is_default: false }).eq('user_id', user.id);
      }
      const { data, error } = await supabase.from('user_location').insert({
        user_id: user.id,
        latitude: addr.lat,
        longitude: addr.lng,
        address: addr.street,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        label: addr.label,
        flat_house: addr.flatHouse,
        area: addr.area,
        landmark: addr.landmark,
        is_default: addr.isDefault
      }).select().single();

      if (data && !error) {
        savedId = data.id;
        newAddr.id = savedId;
      }
    }

    const state = get();
    const existingList = addr.isDefault
      ? state.savedAddresses.map((a) => ({ ...a, isDefault: false }))
      : [...state.savedAddresses];

    const next = [newAddr, ...existingList].slice(0, MAX_ADDRESSES);
    const newActiveId = addr.isDefault ? savedId : (state.activeAddressId ?? savedId);

    set({ savedAddresses: next, activeAddressId: newActiveId });
    await persist(getStorageKeys().addresses, next);
    return savedId;
  },

  editAddress: async (id, partial) => {
    const user = useAuthStore.getState().user;
    
    if (user && !id.startsWith('addr_')) {
      // It's a Supabase UUID
      if (partial.isDefault) {
        await supabase.from('user_location').update({ is_default: false }).eq('user_id', user.id);
      }
      
      const updatePayload: any = {};
      if (partial.lat !== undefined) updatePayload.latitude = partial.lat;
      if (partial.lng !== undefined) updatePayload.longitude = partial.lng;
      if (partial.street !== undefined) updatePayload.address = partial.street;
      if (partial.city !== undefined) updatePayload.city = partial.city;
      if (partial.state !== undefined) updatePayload.state = partial.state;
      if (partial.pincode !== undefined) updatePayload.pincode = partial.pincode;
      if (partial.label !== undefined) updatePayload.label = partial.label;
      if (partial.flatHouse !== undefined) updatePayload.flat_house = partial.flatHouse;
      if (partial.area !== undefined) updatePayload.area = partial.area;
      if (partial.landmark !== undefined) updatePayload.landmark = partial.landmark;
      if (partial.isDefault !== undefined) updatePayload.is_default = partial.isDefault;
      updatePayload.updated_at = new Date().toISOString();

      await supabase.from('user_location').update(updatePayload).eq('id', id);
    }

    const state = get();
    let updated = state.savedAddresses.map((a) => a.id === id ? { ...a, ...partial } : a);
    
    if (partial.isDefault) {
       updated = updated.map(a => a.id !== id ? { ...a, isDefault: false } : a);
    }

    set({ savedAddresses: updated });
    await persist(getStorageKeys().addresses, updated);
  },

  deleteAddress: async (id) => {
    const user = useAuthStore.getState().user;
    
    if (user && !id.startsWith('addr_')) {
      await supabase.from('user_location').update({ is_deleted: true }).eq('id', id);
    }

    const state = get();
    const updated = state.savedAddresses.filter((a) => a.id !== id);
    const newActiveId = state.activeAddressId === id
      ? (updated.find((a) => a.isDefault)?.id ?? updated[0]?.id ?? null)
      : state.activeAddressId;

    set({ savedAddresses: updated, activeAddressId: newActiveId });
    await persist(getStorageKeys().addresses, updated);
  },

  setDefault: async (id) => {
    await get().editAddress(id, { isDefault: true });
  },

  setActive: (id) => {
    const state = get();
    if (id) {
      const updated = state.savedAddresses.map((a) =>
        a.id === id ? { ...a, lastUsed: Date.now() } : a
      );
      set({ activeAddressId: id, savedAddresses: updated });
      persist(getStorageKeys().addresses, updated);
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
      const filtered = state.recentSearches.filter(
        (r) => r.address.toLowerCase() !== search.address.toLowerCase()
      );
      const next = [item, ...filtered].slice(0, MAX_RECENTS);
      persist(getStorageKeys().recents, next);
      return { recentSearches: next };
    });
  },

  clearRecentSearches: async () => {
    const keys = getStorageKeys();
    await AsyncStorage.removeItem(keys.recents);
    set({ recentSearches: [] });
  },
}));

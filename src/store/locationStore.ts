import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationState {
  lat: number | null;
  lng: number | null;
  locationName: string | null;
  hasPermission: boolean | null;
  isDetecting: boolean;
  accuracy: number | null;
  updateLocation: (lat: number, lng: number, name?: string, accuracy?: number) => void;
  setPermission: (status: boolean) => void;
  setDetecting: (detecting: boolean) => void;
  clearLocation: () => void;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEY_LAT = 'kn_last_lat';
const STORAGE_KEY_LNG = 'kn_last_lng';
const STORAGE_KEY_NAME = 'kn_last_location_name';
const STORAGE_KEY_PERM = 'kn_location_permission';

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  locationName: null,
  hasPermission: null,
  isDetecting: false,
  accuracy: null,

  loadFromStorage: async () => {
    try {
      const [latRaw, lngRaw, nameRaw, permRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_LAT),
        AsyncStorage.getItem(STORAGE_KEY_LNG),
        AsyncStorage.getItem(STORAGE_KEY_NAME),
        AsyncStorage.getItem(STORAGE_KEY_PERM),
      ]);
      set({
        lat: latRaw ? parseFloat(latRaw) : null,
        lng: lngRaw ? parseFloat(lngRaw) : null,
        locationName: nameRaw ?? null,
        hasPermission: permRaw ? permRaw === 'true' : null,
      });
    } catch (e) {
      console.warn('LocationStore: loadFromStorage error:', e);
    }
  },

  updateLocation: (lat, lng, name, accuracy) => {
    set({ lat, lng, locationName: name ?? null, isDetecting: false, accuracy: accuracy ?? null });
    try {
      AsyncStorage.setItem(STORAGE_KEY_LAT, lat.toString());
      AsyncStorage.setItem(STORAGE_KEY_LNG, lng.toString());
      if (name) {
        AsyncStorage.setItem(STORAGE_KEY_NAME, name);
      } else {
        AsyncStorage.removeItem(STORAGE_KEY_NAME);
      }
    } catch (e) {
      console.warn('LocationStore: updateLocation persist error:', e);
    }
  },

  setPermission: (hasPermission) => {
    set({ hasPermission });
    try {
      AsyncStorage.setItem(STORAGE_KEY_PERM, hasPermission.toString());
    } catch (e) {
      console.warn('LocationStore: setPermission persist error:', e);
    }
  },

  setDetecting: (isDetecting) => set({ isDetecting }),

  clearLocation: () => {
    set({ lat: null, lng: null, locationName: null, accuracy: null });
    try {
      AsyncStorage.removeItem(STORAGE_KEY_LAT);
      AsyncStorage.removeItem(STORAGE_KEY_LNG);
      AsyncStorage.removeItem(STORAGE_KEY_NAME);
    } catch (e) {
      console.warn('LocationStore: clearLocation persist error:', e);
    }
  },
}));


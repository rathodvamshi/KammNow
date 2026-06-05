import { create } from 'zustand';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";
import { Alert } from 'react-native';

interface LocationState {
  lat: number | null;
  lng: number | null;
  locationName: string | null;
  hasPermission: boolean | null;
  isDetecting: boolean;
  accuracy: number | null;
  sessionLocationConfirmed: boolean;
  updateLocation: (lat: number, lng: number, name?: string, accuracy?: number) => void;
  setPermission: (status: boolean) => void;
  setDetecting: (detecting: boolean) => void;
  clearLocation: () => void;
  loadFromStorage: () => Promise<void>;
  detectCurrentLocation: () => Promise<boolean>;
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
  sessionLocationConfirmed: false,

  loadFromStorage: async () => {
    try {
      const [latRaw, lngRaw, nameRaw, permRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_LAT),
        AsyncStorage.getItem(STORAGE_KEY_LNG),
        AsyncStorage.getItem(STORAGE_KEY_NAME),
        AsyncStorage.getItem(STORAGE_KEY_PERM)
      ]);
      set({
        lat: latRaw ? parseFloat(latRaw) : null,
        lng: lngRaw ? parseFloat(lngRaw) : null,
        locationName: nameRaw ?? null,
        hasPermission: permRaw ? permRaw === 'true' : null,
      });
    } catch (e) {
      Sentry.captureMessage(`${'LocationStore: loadFromStorage error:'} ${e}`);
    }
  },

  updateLocation: (lat, lng, name, accuracy) => {
    set({ lat, lng, locationName: name ?? null, isDetecting: false, accuracy: accuracy ?? null, sessionLocationConfirmed: true });
    try {
      AsyncStorage.setItem(STORAGE_KEY_LAT, String(lat));
      AsyncStorage.setItem(STORAGE_KEY_LNG, String(lng));
      if (name) {
        AsyncStorage.setItem(STORAGE_KEY_NAME, name);
      } else {
        AsyncStorage.removeItem(STORAGE_KEY_NAME);
      }
    } catch (e) {
      Sentry.captureMessage(`${'LocationStore: updateLocation persist error:'} ${e}`);
    }
  },

  setPermission: (hasPermission) => {
    set({ hasPermission });
    try {
      AsyncStorage.setItem(STORAGE_KEY_PERM, String(hasPermission));
    } catch (e) {
      Sentry.captureMessage(`LocationStore: setPermission persist error: ${e}`);
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
      Sentry.captureMessage(`LocationStore: clearLocation persist error: ${e}`);
    }
  },

  detectCurrentLocation: async () => {
    set({ isDetecting: true });
    try {
      const gpsEnabled = await ExpoLocation.hasServicesEnabledAsync();
      if (!gpsEnabled) {
        Alert.alert('GPS Disabled', 'Please enable Location Services in your device settings.');
        set({ isDetecting: false });
        return false;
      }

      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      set({ hasPermission: status === 'granted' });
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby jobs.');
        set({ isDetecting: false });
        return false;
      }

      // Use Balanced accuracy — faster fix, still precise enough for job radius matching
      let location = null;
      try {
        location = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
      } catch {
        // Fallback to last known position for weak signal situations
        location = await ExpoLocation.getLastKnownPositionAsync();
        if (!location) {
          throw new Error('Unable to get location. Please ensure you have a clear view of the sky or try again.');
        }
      }

      const { latitude, longitude, accuracy } = location.coords;

      // Import reverseGeocode here to avoid circular dependency — use the full geocoding util
      // which prefers Google API → Expo fallback → OSM Nominatim fallback
      let locName = 'Current Location';
      try {
        const { reverseGeocode } = await import('../utils/geocoding');
        const geo = await reverseGeocode(latitude, longitude);
        // Use the most specific available area name
        locName = geo.area || geo.city || geo.formattedLine2 || 'Current Location';
      } catch (geoErr) {
        Sentry.captureMessage(`Reverse geocode failed in detectCurrentLocation: ${geoErr}`);
      }

      useLocationStore.getState().updateLocation(latitude, longitude, locName, accuracy ?? undefined);
      set({ isDetecting: false });
      return true;
    } catch (error: any) {
      Sentry.captureException(error);
      Alert.alert('Location Error', error.message || 'Could not detect location. Please try again.');
      set({ isDetecting: false });
      return false;
    }
  },
}));


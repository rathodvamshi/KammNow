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
      AsyncStorage.setItem(STORAGE_KEY_PERM, String(hasPermission));
    try {
    } catch (e) {
      Sentry.captureMessage(`${'LocationStore: setPermission persist error:'} ${e}`);
    }
  },

  setDetecting: (isDetecting) => set({ isDetecting }),

  clearLocation: () => {
    set({ lat: null, lng: null, locationName: null, accuracy: null });
      AsyncStorage.removeItem(STORAGE_KEY_LAT);
      AsyncStorage.removeItem(STORAGE_KEY_LNG);
      AsyncStorage.removeItem(STORAGE_KEY_NAME);
    try {
    } catch (e) {
      Sentry.captureMessage(`${'LocationStore: clearLocation persist error:'} ${e}`);
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

      let location = null;
      try {
        location = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Highest,
          timeInterval: 5000,
        });
      } catch (err) {
        // Fallback for weak signal or timeouts
        location = await ExpoLocation.getLastKnownPositionAsync();
        if (!location) {
          throw new Error('Unable to get location. Please ensure you have a clear view of the sky or try again.');
        }
      }

      const { latitude, longitude, accuracy } = location.coords;
      let locName = 'Current Location';

      try {
        const geocode = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
        if (geocode && geocode.length > 0) {
          const geo = geocode[0];
          locName = geo.name || geo.street || geo.city || geo.region || locName;
        }
      } catch (geoErr) {
        Sentry.captureMessage(`Reverse geocode failed: ${geoErr}`);
      }

      useLocationStore.getState().updateLocation(latitude, longitude, locName, accuracy ?? undefined);
      set({ isDetecting: false });
      return true;
    } catch (error: any) {
      Sentry.captureException(error);
      Alert.alert('Location Error', error.message || 'Could not detect location.');
      set({ isDetecting: false });
      return false;
    }
  },
}));


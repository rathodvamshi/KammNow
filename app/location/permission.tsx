import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import { LocationPromptBottomSheet } from '../../src/components/organisms/LocationPromptBottomSheet';
import { useLocationStore } from '../../src/store/locationStore';
import { reverseGeocode } from '../../src/utils/geocoding';
import { LinearGradient } from 'expo-linear-gradient';

export default function LocationPermissionScreen() {
  const [promptSheetMode, setPromptSheetMode] = useState<'permission_needed' | 'gps_off'>('permission_needed');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const gpsEnabled = await ExpoLocation.hasServicesEnabledAsync();
      if (!gpsEnabled) {
        setPromptSheetMode('gps_off');
      }
      setIsVisible(true);
    };
    checkStatus();
  }, []);

  const handleEnableLocation = async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        const geo = await reverseGeocode(latitude, longitude);
        useLocationStore.getState().updateLocation(
          latitude,
          longitude,
          geo.formattedLine2 || geo.area || geo.city || 'Current Location'
        );
        useLocationStore.getState().setPermission(true);
        router.replace('/(tabs)');
      } catch (err) {
        console.warn('Failed to get location', err);
      }
    }
  };

  const handleClose = () => {
    const lat = useLocationStore.getState().lat;
    if (lat) {
      router.replace('/(tabs)');
    }
  };

  return (
    <LinearGradient
      colors={['#0A0F1E', '#0F172A', '#1A1035']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <LocationPromptBottomSheet
        mode={promptSheetMode}
        visible={isVisible}
        onClose={handleClose}
        onSelectOnMap={() => {
          router.push('/location/map-picker');
        }}
        onSearchManually={() => {
          router.push('/location/saved-addresses');
        }}
        onContinueSaved={() => {
          router.replace('/(tabs)');
        }}
        onEnableLocation={handleEnableLocation}
        hasSavedAddresses={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

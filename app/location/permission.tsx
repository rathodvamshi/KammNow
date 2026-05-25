import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import { View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import { LocationPromptBottomSheet } from '../../src/components/organisms/LocationPromptBottomSheet';
import { useLocationStore } from '../../src/store/locationStore';
import { reverseGeocode } from '../../src/utils/geocoding';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { userService } from '../../src/services/userService';

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

        // SYNC ONBOARDING PROFILE TO BACKEND IF NEEDED
        const user = useAuthStore.getState().user;
        if (user && !user.is_verified) {
          try {
            await userService.updateProfile(user.id, {
              name: user.name || '',
              age: user.age || 0,
              role: user.role,
              skills: user.skills,
            });
            useAuthStore.getState().updateUser({ is_verified: true });
          } catch (e) {
            console.error('Failed to sync profile', e);
          }
        }

        router.replace('/(tabs)');
      } catch (err) {
        Sentry.captureMessage(`${'Failed to get location'} ${err}`);
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
    >
      <LocationPromptBottomSheet
        mode={promptSheetMode}
        visible={isVisible}
        onClose={handleClose}
        onEnableLocation={handleEnableLocation}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import { LocationPromptBottomSheet } from '../../src/components/organisms/LocationPromptBottomSheet';
import { useLocationStore } from '../../src/store/locationStore';
import { reverseGeocode } from '../../src/utils/geocoding';

export default function TabsLayout() {
  const { lat } = useLocationStore();
  const [promptSheetMode, setPromptSheetMode] = useState<'permission_needed' | 'gps_off'>('permission_needed');
  const [isLocationSheetVisible, setIsLocationSheetVisible] = useState(false);

  useEffect(() => {
    if (!lat) {
      const checkStatus = async () => {
        const gpsEnabled = await ExpoLocation.hasServicesEnabledAsync();
        if (!gpsEnabled) {
          setPromptSheetMode('gps_off');
        }
        setIsLocationSheetVisible(true);
      };
      checkStatus();
    } else {
      setIsLocationSheetVisible(false);
    }
  }, [lat]);

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
        setIsLocationSheetVisible(false);
      } catch (err) {
        console.warn('Failed to get location', err);
      }
    }
  };

  const handleClose = () => {
    if (useLocationStore.getState().lat) {
      setIsLocationSheetVisible(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="inbox" />
        <Tabs.Screen name="feedback" />
        <Tabs.Screen name="my-jobs" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <LocationPromptBottomSheet
        mode={promptSheetMode}
        visible={isLocationSheetVisible}
        onClose={handleClose}
        onSelectOnMap={() => {
          router.push('/location/map-picker');
        }}
        onSearchManually={() => {
          router.push('/location/saved-addresses');
        }}
        onContinueSaved={() => {
          if (useLocationStore.getState().lat) {
            setIsLocationSheetVisible(false);
          }
        }}
        onEnableLocation={handleEnableLocation}
        hasSavedAddresses={false}
      />
    </View>
  );
}

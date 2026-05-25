import React, { forwardRef } from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, type Provider } from 'react-native-maps';
import Constants from 'expo-constants';

interface InteractiveMapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChange?: () => void;
  onRegionChangeComplete?: (region: any) => void;
  mapPadding?: { top: number; right: number; bottom: number; left: number };
  scrollEnabled?: boolean;
}

// Fallback to PROVIDER_DEFAULT in Expo Go since Google Maps SDK isn't bundled.
const isExpoGo = Constants.appOwnership === 'expo';
const MAP_PROVIDER: Provider = isExpoGo ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

// Clean map style that keeps roads/landmarks visible
// Only hides business clutter — keeps the map looking like Google Maps
const CUSTOM_MAP_STYLE = [
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c8dff0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffd480' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e6a800' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#e8f5e9' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c8e6c9' }],
  },
];

export const InteractiveMap = forwardRef<MapView, InteractiveMapProps>(
  ({ region, onRegionChange, onRegionChangeComplete, mapPadding, scrollEnabled = true }, ref) => {
    // Only apply custom styling with Google provider on Android
    const useCustomStyle = Platform.OS === 'android';

    return (
      <MapView
        ref={ref}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={true}
        showsIndoors={false}
        showsTraffic={false}
        showsPointsOfInterest={true}
        scrollEnabled={scrollEnabled}
        customMapStyle={useCustomStyle ? CUSTOM_MAP_STYLE : undefined}
        mapPadding={mapPadding || { top: 0, right: 0, bottom: 0, left: 0 }}
        loadingEnabled={true}
        loadingIndicatorColor="#FF6B00"
        loadingBackgroundColor="#F8FAFC"
      />
    );
  }
);

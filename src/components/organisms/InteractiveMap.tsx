import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

interface InteractiveMapProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChange?: () => void;
  onRegionChangeComplete?: (region: any) => void;
}

export const InteractiveMap = forwardRef<MapView, InteractiveMapProps>(
  ({ region, onRegionChange, onRegionChangeComplete }, ref) => {
    return (
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        initialRegion={region} // Using initialRegion prevents render-loop stutters during manual drags
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      />
    );
  }
);

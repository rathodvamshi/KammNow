import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface StaticMapProps {
  latitude: number;
  longitude: number;
}

export const StaticMap: React.FC<StaticMapProps> = ({ latitude, longitude }) => {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      region={{ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );
};

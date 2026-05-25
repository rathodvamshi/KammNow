import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, type Provider } from 'react-native-maps';
import Constants from 'expo-constants';

interface StaticMapProps {
  latitude: number;
  longitude: number;
}

const isExpoGo = Constants.appOwnership === 'expo';
const MAP_PROVIDER: Provider = isExpoGo ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

export const StaticMap: React.FC<StaticMapProps> = ({ latitude, longitude }) => {
  return (
    <MapView
      provider={MAP_PROVIDER}
      style={StyleSheet.absoluteFill}
      region={{ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
      loadingEnabled={true}
      loadingIndicatorColor="#FF6B00"
      loadingBackgroundColor="#F8FAFC"
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );
};

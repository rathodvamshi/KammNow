import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, type Provider, type MapPressEvent } from 'react-native-maps';
import Constants from 'expo-constants';

interface JobPostMapProps {
  latitude: number;
  longitude: number;
  onSelect: (coords: { latitude: number; longitude: number }) => void;
}

const isExpoGo = Constants.appOwnership === 'expo';
const MAP_PROVIDER: Provider = isExpoGo ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

export const JobPostMap: React.FC<JobPostMapProps> = ({ latitude, longitude, onSelect }) => {
  return (
    <MapView
      provider={MAP_PROVIDER}
      style={styles.map}
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onPress={(event: MapPressEvent) => onSelect(event.nativeEvent.coordinate)}
      loadingEnabled={true}
      loadingIndicatorColor="#FF6B00"
      loadingBackgroundColor="#F8FAFC"
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

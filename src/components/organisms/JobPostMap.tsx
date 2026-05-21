import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';

interface JobPostMapProps {
  latitude: number;
  longitude: number;
  onSelect: (coords: { latitude: number; longitude: number }) => void;
}

export const JobPostMap: React.FC<JobPostMapProps> = ({ latitude, longitude, onSelect }) => {
  return (
    <MapView
      style={styles.map}
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onPress={(event: MapPressEvent) => onSelect(event.nativeEvent.coordinate)}
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

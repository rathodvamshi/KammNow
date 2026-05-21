import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../theme';

interface JobPostMapProps {
  latitude: number;
  longitude: number;
  onSelect: (coords: { latitude: number; longitude: number }) => void;
}

export const JobPostMap: React.FC<JobPostMapProps> = () => {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Map unavailable on web</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
});

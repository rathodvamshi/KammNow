import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme';

interface SkeletonAddressProps {
  count?: number;
}

const ShimmerBar = ({ width, height = 14, marginTop = 0 }: { width: string | number; height?: number; marginTop?: number }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: Radius.sm,
        backgroundColor: Colors.gray2,
        marginTop,
        opacity,
      } as any}
    />
  );
};

export const SkeletonAddress: React.FC<SkeletonAddressProps> = ({ count = 2 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.iconPlaceholder} />
          <View style={styles.textBlock}>
            <ShimmerBar width="40%" height={12} />
            <ShimmerBar width="80%" height={14} marginTop={8} />
            <ShimmerBar width="65%" height={12} marginTop={6} />
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray2,
    marginRight: 14,
  },
  textBlock: {
    flex: 1,
    paddingTop: 4,
  },
});

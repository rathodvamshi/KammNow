import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Shimmer skeleton with smooth wave-like pulse
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius, backgroundColor: Colors.gray2, opacity }, style]}
    />
  );
};

// Pre-built skeleton that exactly mirrors the new JobCard layout
export const JobCardSkeleton: React.FC = () => (
  <View style={styles.card}>
    {/* Top row: avatar + name */}
    <View style={styles.topRow}>
      <Skeleton width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton height={13} width="60%" />
        <Skeleton height={10} width="40%" />
      </View>
      <Skeleton width={60} height={22} borderRadius={99} />
    </View>

    {/* Title + price */}
    <View style={styles.titleRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={18} width="80%" />
        <Skeleton height={14} width="55%" />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Skeleton width={56} height={22} borderRadius={6} />
        <Skeleton width={36} height={10} borderRadius={4} />
      </View>
    </View>

    {/* Meta grid */}
    <View style={styles.metaGrid}>
      <Skeleton height={10} width="45%" />
      <Skeleton height={10} width="45%" />
      <Skeleton height={10} width="38%" />
      <Skeleton height={10} width="42%" />
    </View>

    {/* Perks */}
    <View style={styles.perksRow}>
      <Skeleton width={60} height={22} borderRadius={99} />
      <Skeleton width={50} height={22} borderRadius={99} />
      <Skeleton width={74} height={22} borderRadius={99} />
    </View>

    {/* Bottom row */}
    <View style={styles.bottomRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={5} width="100%" borderRadius={99} />
        <Skeleton height={10} width="40%" />
      </View>
      <Skeleton width={80} height={40} borderRadius={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.gray2,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: Colors.gray1,
    borderRadius: 12,
    padding: 10,
    rowGap: 8,
  },
  perksRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

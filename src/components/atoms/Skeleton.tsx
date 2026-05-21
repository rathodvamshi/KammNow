import React from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '../../theme';
import { useEffect, useRef } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: Colors.gray2,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton for job card
export const JobCardSkeleton: React.FC = () => (
  <View style={cardSkeletonStyles.card}>
    <View style={cardSkeletonStyles.row}>
      <Skeleton width={42} height={42} borderRadius={10} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={12} width="50%" />
      </View>
    </View>
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
      <Skeleton width={70} height={22} borderRadius={20} />
      <Skeleton width={60} height={22} borderRadius={20} />
      <Skeleton width={80} height={22} borderRadius={20} />
    </View>
    <View style={cardSkeletonStyles.bottom}>
      <Skeleton width={100} height={12} />
      <Skeleton width={70} height={28} borderRadius={8} />
    </View>
  </View>
);

const cardSkeletonStyles = StyleSheet.create({
  card: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray2,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});

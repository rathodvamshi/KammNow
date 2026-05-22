import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Radius } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 14,
  borderRadius = 6,
}) => {
  const opacity = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: Colors.gray2, opacity },
      ]}
    />
  );
};

/** Mirrors premium seeker JobCard */
export const JobCardSkeleton: React.FC = () => (
  <View style={sk.card}>
    <Skeleton height={3} width="100%" borderRadius={0} />
    <View style={sk.body}>
      <View style={sk.top}>
        <Skeleton width={90} height={24} borderRadius={99} />
        <Skeleton width={50} height={10} />
      </View>
      <Skeleton height={20} width="85%" />
      <Skeleton height={56} width="100%" borderRadius={14} />
      <Skeleton height={36} width="100%" borderRadius={10} />
      <View style={sk.stats}>
        <Skeleton height={48} width="30%" borderRadius={8} />
        <Skeleton height={48} width="30%" borderRadius={8} />
        <Skeleton height={48} width="30%" borderRadius={8} />
      </View>
      <View style={sk.footer}>
        <Skeleton width={36} height={36} borderRadius={12} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton height={12} width="55%" />
          <Skeleton height={8} width="80%" />
        </View>
        <Skeleton width={72} height={40} borderRadius={12} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <Skeleton height={12} width="40%" borderRadius={4} />
      </View>
    </View>
  </View>
);

const sk = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  body: { padding: 16, gap: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
});

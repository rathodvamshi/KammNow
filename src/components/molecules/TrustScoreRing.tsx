import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize } from '../../theme';
import { getTrustScoreColor } from '../../utils/trustScore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TrustScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const TrustScoreRing: React.FC<TrustScoreRingProps> = ({ 
  score, 
  size = 110, 
  strokeWidth = 8 
}) => {
  const animatedValue = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    animatedValue.value = withTiming(score, { 
      duration: 1500, 
      easing: Easing.out(Easing.cubic) 
    });
  }, [score, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedValue.value) / 100;
    return { strokeDashoffset };
  });

  const color = getTrustScoreColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.gray2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.centerTextContainer}>
          <Text style={[styles.scoreText, { color }]}>{score}%</Text>
          <Text style={styles.label}>Trust Score</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.inkSubtle,
    marginTop: -2,
    textAlign: 'center',
  }
});

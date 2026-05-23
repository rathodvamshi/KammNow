import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../theme';
import type { Feedback } from '../../types';

interface FeedbackSummaryCardProps {
  feedbacks: Feedback[];
}

const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percentage, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
};

export const FeedbackSummaryCard: React.FC<FeedbackSummaryCardProps> = ({ feedbacks }) => {
  const totalReviews = feedbacks.length;
  
  const averageRating = totalReviews > 0
    ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  const getPercentage = (stars: number) => {
    if (totalReviews === 0) return 0;
    const count = feedbacks.filter(f => f.rating === stars).length;
    return (count / totalReviews) * 100;
  };

  const breakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    percentage: getPercentage(stars),
  }));

  return (
    <View style={[styles.card, Shadow.md]}>
      <Text style={styles.title}>Rating Summary</Text>
      <View style={styles.row}>
        {/* Left Side: Average */}
        <View style={styles.averageSection}>
          <Text style={styles.averageValue}>{averageRating}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= Math.round(Number(averageRating)) ? 'star' : 'star-outline'}
                size={16}
                color={Colors.gold}
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
        </View>

        <View style={styles.divider} />

        {/* Right Side: Breakdown */}
        <View style={styles.breakdownSection}>
          {breakdown.map((item) => (
            <View key={item.stars} style={styles.breakdownRow}>
              <Text style={styles.starLabel}>{item.stars}★</Text>
              <ProgressBar 
                percentage={item.percentage} 
                color={item.stars >= 4 ? Colors.green : item.stars === 3 ? Colors.gold : Colors.red} 
              />
              <Text style={styles.percentageText}>{Math.round(item.percentage)}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageSection: {
    alignItems: 'center',
    width: 100,
  },
  averageValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 42,
    color: Colors.ink,
    lineHeight: 48,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  totalReviews: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.inkSubtle,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.gray2,
    marginHorizontal: Spacing.md,
  },
  breakdownSection: {
    flex: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  starLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.ink2,
    width: 24,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray2,
    borderRadius: Radius.round,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radius.round,
  },
  percentageText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.inkSubtle,
    width: 32,
    textAlign: 'right',
  },
});

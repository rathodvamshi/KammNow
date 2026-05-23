import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Spacing } from '../../theme';

export const EmptyFeedbackState: React.FC = () => {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="star-half-outline" size={48} color={Colors.saffron} />
      </View>
      <Text style={styles.title}>No feedback yet</Text>
      <Text style={styles.subtitle}>
        Complete jobs to receive ratings and reviews from providers.
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.inkSubtle,
    textAlign: 'center',
    lineHeight: 22,
  },
});

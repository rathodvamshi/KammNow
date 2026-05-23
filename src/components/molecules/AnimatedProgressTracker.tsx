import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius } from '../../theme/colors';
import type { ApplicationStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedProgressTrackerProps {
  status: ApplicationStatus | null;
}

const STEPS = [
  { id: 'sent', label: 'Applied', icon: 'paper-plane' },
  { id: 'review', label: 'Reviewing', icon: 'search' },
  { id: 'decision', label: 'Decision', icon: 'star' }, // We will dynamically change 'Decision' to 'Accepted' or 'Rejected' below
  { id: 'completed', label: 'Completed', icon: 'trophy' },
];

export const AnimatedProgressTracker: React.FC<AnimatedProgressTrackerProps> = ({ status }) => {
  let currentStep = 0;
  if (!status) currentStep = -1;
  else if (status === 'pending') currentStep = 1;
  else if (status === 'accepted') currentStep = 2;
  else if (status === 'rejected') currentStep = 2;
  else if (status === 'completed') currentStep = 3;

  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withSpring(Math.max(0, currentStep), {
      damping: 15,
      stiffness: 90,
    });

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, [currentStep, progress, pulseScale]);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isCompleted = currentStep >= index;
        const isCurrent = currentStep === index;
        const isLast = index === STEPS.length - 1;

        // Animate node size/glow
        const nodeStyle = useAnimatedStyle(() => {
          const isActive = progress.value >= index;
          return {
            transform: [
              {
                scale: isCurrent ? pulseScale.value : withTiming(isActive ? 1.05 : 1, { duration: 250 }),
              },
            ],
            shadowOpacity: withTiming(isCurrent ? 0.4 : 0),
            shadowRadius: withTiming(isCurrent ? 8 : 0),
            shadowColor: Colors.saffron,
            shadowOffset: { width: 0, height: 0 },
          };
        });

        // Animate line progress (fills left to right smoothly)
        const lineStyle = useAnimatedStyle(() => {
          const lineProgress = Math.max(0, Math.min(1, progress.value - index));
          return {
            width: `${lineProgress * 100}%`,
            backgroundColor: Colors.saffron,
          };
        });

        // Dynamic text color
        const textStyle = {
          color: isCompleted ? Colors.ink : Colors.gray4,
          fontWeight: isCurrent ? '700' : '500',
        } as const;

        const isActive = currentStep >= index;

        let label = step.label;
        let icon = step.icon;
        let gradientColors: string[] = isActive ? [Colors.saffron, Colors.saffronDark] : [Colors.gray2, Colors.gray2];

        if (index === 2) {
          if (status === 'rejected') {
            label = 'Rejected';
            icon = 'close-circle';
            gradientColors = isCurrent ? [Colors.red, Colors.redDark] : gradientColors;
          } else if (status === 'accepted' || status === 'completed') {
            label = 'Accepted';
            icon = 'checkmark-circle';
            gradientColors = isActive ? [Colors.green, Colors.greenDark] : gradientColors;
          }
        }
        if (index === 3 && status === 'completed') {
          gradientColors = [Colors.blue, Colors.blueDark];
        }

        const gradientProp = gradientColors as unknown as readonly [string, string, ...string[]];

        return (
          <View key={step.id} style={styles.stepContainer}>
            <View style={styles.nodeRow}>
              <Animated.View style={[styles.nodeContainer, nodeStyle]}>
                <LinearGradient
                  colors={gradientProp}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nodeGradient}
                >
                  <Ionicons
                    name={icon as any}
                    size={14}
                    color={isActive ? Colors.white : Colors.gray4}
                  />
                </LinearGradient>
              </Animated.View>
              {!isLast && (
                <View style={styles.lineTrack}>
                  <Animated.View style={[styles.lineFill, lineStyle]} />
                </View>
              )}
            </View>
            <Text style={[styles.label, textStyle]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  nodeContainer: {
    zIndex: 2,
  },
  nodeGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.gray2,
    marginLeft: -4,
    marginRight: -4,
    zIndex: 1,
  },
  lineFill: {
    height: '100%',
    borderRadius: Radius.round,
  },
  label: {
    fontSize: 12,
    marginTop: Spacing.xs,
    marginLeft: -Spacing.sm,
    width: 80,
    textAlign: 'center',
  },
});

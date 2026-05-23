import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../theme';

interface CategoryTabProps {
  label: string;
  count: number;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  isActive: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CategoryTab: React.FC<CategoryTabProps> = ({
  label,
  count,
  iconName,
  isActive,
  onPress,
}) => {
  const activeAnim = useSharedValue(isActive ? 1 : 0);
  const countScale = useSharedValue(1);

  // Pulse effect when count changes
  useEffect(() => {
    countScale.value = withTiming(1.2, { duration: 150 }, () => {
      countScale.value = withTiming(1, { duration: 150 });
    });
  }, [count, countScale]);

  useEffect(() => {
    activeAnim.value = withTiming(isActive ? 1 : 0, { duration: 250 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        activeAnim.value,
        [0, 1],
        [Colors.gray1, Colors.saffron]
      ),
      borderColor: interpolateColor(
        activeAnim.value,
        [0, 1],
        [Colors.gray2, Colors.saffronDark]
      ),
      transform: [{ scale: 1 + activeAnim.value * 0.03 }],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        activeAnim.value,
        [0, 1],
        [Colors.ink2, Colors.white]
      ),
    };
  });

  const countAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: countScale.value }],
    };
  });

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle, isActive ? Shadow.sm : null]}
      onPress={onPress}
    >
      <Animated.View style={styles.iconWrapper}>
        <Ionicons name={iconName} size={16} color={isActive ? Colors.white : Colors.ink2} />
      </Animated.View>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.Text style={[styles.text, textAnimatedStyle]}>
          {label} (
        </Animated.Text>
        <Animated.Text style={[styles.text, textAnimatedStyle, countAnimatedStyle]}>
          {count}
        </Animated.Text>
        <Animated.Text style={[styles.text, textAnimatedStyle]}>
          )
        </Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: Radius.round,
    borderWidth: 1,
    marginRight: 10,
  },
  iconWrapper: {
    marginRight: 6,
  },
  text: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
});

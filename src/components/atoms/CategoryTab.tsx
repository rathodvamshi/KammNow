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
  style?: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CategoryTab: React.FC<CategoryTabProps> = ({
  label,
  count,
  iconName,
  isActive,
  onPress,
  style,
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

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        activeAnim.value,
        [0, 1],
        [Colors.gray2, Colors.white]
      ),
    };
  });

  const badgeTextAnimatedStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        activeAnim.value,
        [0, 1],
        [Colors.ink2, Colors.saffronDark]
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
      style={[styles.container, style, animatedStyle, isActive ? Shadow.sm : null]}
      onPress={onPress}
    >
      <Animated.View style={styles.iconWrapper}>
        <Ionicons name={iconName} size={14} color={isActive ? Colors.white : Colors.ink2} />
      </Animated.View>
      <Animated.Text style={[styles.text, textAnimatedStyle]}>
        {label}
      </Animated.Text>
      {count >= 0 && (
        <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
          <Animated.Text style={[styles.badgeText, badgeTextAnimatedStyle, countAnimatedStyle]}>
            {count}
          </Animated.Text>
        </Animated.View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: Radius.round,
    borderWidth: 1,
  },
  iconWrapper: {
    marginRight: 6,
  },
  text: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 11,
  },
});

import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors, Radius, FontFamily, FontSize, Spacing } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  hint,
  error,
  prefix,
  suffix,
  containerStyle,
  style,
  ...rest
}) => {
  const hasError = !!error;

  const isFocused = useSharedValue(0);

  const handleFocus = (e: any) => {
    isFocused.value = withTiming(1, { duration: 250 });
    if (rest.onFocus) rest.onFocus(e);
  };

  const handleBlur = (e: any) => {
    isFocused.value = withTiming(0, { duration: 250 });
    if (rest.onBlur) rest.onBlur(e);
  };

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      isFocused.value,
      [0, 1],
      [hasError ? Colors.red : Colors.gray2, hasError ? Colors.red : Colors.saffron]
    );
    return { borderColor };
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputRow, animatedBorderStyle]}>
        {prefix && (
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, prefix && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, style]}
          placeholderTextColor={Colors.gray3}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {suffix && <View style={styles.suffix}>{suffix}</View>}
      </Animated.View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink2,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  errorBorder: {
    borderColor: Colors.red,
  },
  prefix: {
    backgroundColor: Colors.gray1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.gray2,
  },
  prefixText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink2,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.body,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  suffix: {
    justifyContent: 'center',
    paddingRight: Spacing.md,
  },
  hint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: Spacing.xs,
  },
  error: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.red,
    marginTop: Spacing.xs,
  },
});

import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Animated, StyleSheet, Text, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { Colors, FontFamily, FontSize, Radius } from '../../theme';

interface FloatingLabelInputProps extends Omit<TextInputProps, 'style'> {
  style?: StyleProp<ViewStyle>;

  label: string;
  value: string;
  error?: string;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({ label, value, error, style, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -10],
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 12],
  });

  const labelColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.gray4, Colors.ink2],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.labelContainer,
          { top: labelTop, zIndex: isFocused || value ? 2 : 0 },
        ]}
        pointerEvents="none"
      >
        <Animated.Text style={[styles.label, { fontSize: labelFontSize as any, color: error ? Colors.red : labelColor }]}>
          {label}
        </Animated.Text>
      </Animated.View>

      <TextInput
        {...props}
        value={value}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          props.multiline && { minHeight: 100, textAlignVertical: 'top', paddingTop: 16 },
        ]}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus && props.onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur && props.onBlur(e);
        }}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    position: 'relative',
  },
  labelContainer: {
    position: 'absolute',
    left: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    backgroundColor: Colors.white,
  },
  inputFocused: {
    borderColor: Colors.saffron,
    backgroundColor: '#FFFAF5',
  },
  inputError: {
    borderColor: Colors.red,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.red,
    marginTop: 4,
    marginLeft: 4,
  },
});

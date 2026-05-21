import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
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

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, hasError && styles.errorBorder]}>
        {prefix && (
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, prefix && { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, style]}
          placeholderTextColor={Colors.gray3}
          {...rest}
        />
        {suffix && <View style={styles.suffix}>{suffix}</View>}
      </View>
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

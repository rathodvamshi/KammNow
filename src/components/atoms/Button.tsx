import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Radius, FontFamily, FontSize } from '../../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'navy';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant;
  size?: Size;
  label: string;
  isLoading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { bg: string; border: string; text: string }> = {
  primary: { bg: Colors.saffron, border: Colors.saffron, text: Colors.white },
  secondary: { bg: Colors.white, border: Colors.gray2, text: Colors.ink },
  danger: { bg: Colors.redLight, border: Colors.red, text: Colors.red },
  ghost: { bg: 'transparent', border: Colors.gray3, text: Colors.ink2 },
  navy: { bg: Colors.navy, border: Colors.navy, text: Colors.white },
};

const sizeStyles: Record<Size, { pad: number; fontSize: number; height: number }> = {
  sm: { pad: 8, fontSize: FontSize.base, height: 34 },
  md: { pad: 12, fontSize: FontSize.lg, height: 42 },
  lg: { pad: 15, fontSize: FontSize['2xl'], height: 52 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  label,
  isLoading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
  disabled,
  ...rest
}) => {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          borderColor: vs.border,
          paddingVertical: ss.pad,
          height: ss.height,
          opacity: disabled || isLoading ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={vs.text} size="small" />
      ) : (
        <Text style={[styles.label, { color: vs.text, fontSize: ss.fontSize }, textStyle]}>
          {icon ? `${icon} ${label}` : label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    gap: 6,
  },
  label: {
    fontFamily: FontFamily.headingBold,
    letterSpacing: 0.2,
  },
});

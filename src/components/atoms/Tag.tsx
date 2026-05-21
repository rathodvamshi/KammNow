import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../theme';

type TagVariant = 'pay' | 'type' | 'dist' | 'urgent' | 'filled' | 'neutral';

interface TagProps {
  variant?: TagVariant;
  label: string;
  style?: ViewStyle;
}

const tagStyle: Record<TagVariant, { bg: string; text: string }> = {
  pay: { bg: Colors.greenLight, text: Colors.greenDark },
  type: { bg: Colors.blueLight, text: Colors.blue },
  dist: { bg: Colors.saffronLight, text: Colors.saffronDark },
  urgent: { bg: Colors.redLight, text: Colors.red },
  filled: { bg: Colors.gray2, text: Colors.gray4 },
  neutral: { bg: Colors.gray1, text: Colors.ink2 },
};

export const Tag: React.FC<TagProps> = ({ variant = 'neutral', label, style }) => {
  const { bg, text } = tagStyle[variant];
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
  },
});

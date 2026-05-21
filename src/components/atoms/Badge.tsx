import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../theme';

type BadgeVariant = 'pending' | 'accepted' | 'rejected' | 'review' | 'live' | 'paused' | 'filled' | 'urgent';

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
  style?: ViewStyle;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string; icon: string }> = {
  pending: { bg: '#FFF3E0', text: '#E65100', icon: '⏳' },
  accepted: { bg: Colors.greenLight, text: Colors.greenDark, icon: '✅' },
  rejected: { bg: Colors.redLight, text: Colors.red, icon: '❌' },
  review: { bg: Colors.blueLight, text: Colors.blue, icon: '⭐' },
  live: { bg: Colors.greenLight, text: Colors.greenDark, icon: '●' },
  paused: { bg: Colors.goldLight, text: '#7B5200', icon: '⏸' },
  filled: { bg: Colors.blueLight, text: Colors.blue, icon: '✓' },
  urgent: { bg: Colors.redLight, text: Colors.red, icon: '⚡' },
};

export const Badge: React.FC<BadgeProps> = ({ variant, label, style }) => {
  const { bg, text, icon } = variantMap[variant];
  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      <Text style={[styles.icon]}>{icon}</Text>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  icon: {
    fontSize: 11,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
});

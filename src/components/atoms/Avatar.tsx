import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../theme';
import { getInitials, avatarColor } from '../../utils/helpers';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: AvatarSize;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, { dim: number; fontSize: number; borderRadius: number }> = {
  xs: { dim: 22, fontSize: 9, borderRadius: 11 },
  sm: { dim: 32, fontSize: 11, borderRadius: 16 },
  md: { dim: 42, fontSize: 14, borderRadius: 21 },
  lg: { dim: 56, fontSize: 18, borderRadius: 28 },
  xl: { dim: 72, fontSize: 24, borderRadius: 36 },
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  uri,
  size = 'md',
  style,
}) => {
  const { dim, fontSize, borderRadius } = sizeMap[size];
  const initials = getInitials(name ?? null);
  const bg = avatarColor(name ?? null);

  const containerStyle = {
    width: dim,
    height: dim,
    borderRadius,
    backgroundColor: bg,
    ...StyleSheet.flatten(style),
  } as any;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[containerStyle, { resizeMode: 'cover' }]}
      />
    );
  }

  return (
    <View style={[styles.base, containerStyle]}>
      <Text style={[styles.initials, { fontSize, color: Colors.white }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: FontFamily.headingBold,
    color: Colors.white,
  },
});

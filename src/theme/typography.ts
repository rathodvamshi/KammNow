// KaamNow Typography System
// Roboto for all text

export const FontFamily = {
  heading: 'Roboto_700Bold',
  headingBold: 'Roboto_900Black',
  headingMedium: 'Roboto_500Medium',
  body: 'Roboto_400Regular',
  bodyMedium: 'Roboto_500Medium',
  bodySemiBold: 'Roboto_700Bold',
} as const;

export const FontSize = {
  xs: 10,
  sm: 11,
  base: 12,
  md: 13,
  lg: 14,
  xl: 15,
  '2xl': 16,
  '3xl': 18,
  '4xl': 20,
  '5xl': 24,
  '6xl': 28,
  '7xl': 32,
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

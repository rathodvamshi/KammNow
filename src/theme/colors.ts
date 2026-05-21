// KaamNow Design System — Colors
// Based on reference prototype CSS variables

export const Colors = {
  // Primary
  saffron: '#FF6B00',
  saffronLight: '#FFF0E5',
  saffronDark: '#CC5500',

  // Success
  green: '#00875A',
  greenLight: '#E6F7F1',
  greenDark: '#005C3C',

  // Gold / Warning
  gold: '#F0A500',
  goldLight: '#FFF8E8',

  // Navy / Brand Dark
  navy: '#1A2340',
  navy2: '#2D3A5C',

  // Text
  ink: '#1C1C2E',
  ink2: '#3D3D55',

  // Grays
  gray1: '#F7F6F3',
  gray2: '#EDEDEB',
  gray3: '#C8C6C0',
  gray4: '#8C8A84',

  // Whites & Pure
  white: '#FFFFFF',
  background: '#EEECEA',

  // Error
  red: '#E53935',
  redLight: '#FDEAEA',

  // Blue / Info
  blue: '#1565C0',
  blueLight: '#E3EEFF',

  // Transparent overlays
  overlayNavy: 'rgba(26,35,64,0.6)',
  overlayLight: 'rgba(255,255,255,0.08)',
  overlayBorder: 'rgba(255,255,255,0.2)',
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  round: 100,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 32,
    elevation: 10,
  },
} as const;

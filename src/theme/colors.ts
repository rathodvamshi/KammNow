// KaamNow Design System — Colors (Pro Upgraded)
// Inspired by Swiggy, Zomato, Uber-level design precision

export const Colors = {
  // ── Primary Brand ───────────────────────────────────────────────────────────
  saffron: '#FF6B00',
  saffronLight: '#FFF3EB',
  saffronLighter: '#FFF8F3',
  saffronDark: '#CC5500',
  saffronGlow: 'rgba(255, 107, 0, 0.15)',

  // ── Success / Positive ───────────────────────────────────────────────────────
  green: '#16A34A',
  greenLight: '#DCFCE7',
  greenDark: '#14532D',
  greenMid: '#22C55E',

  // ── Gold / Warning ──────────────────────────────────────────────────────────
  gold: '#F59E0B',
  goldLight: '#FEF3C7',
  goldDark: '#92400E',

  // ── Navy / Brand Dark ───────────────────────────────────────────────────────
  navy: '#0F172A',
  navy2: '#1E293B',
  navyMid: '#334155',

  // ── Text Hierarchy ──────────────────────────────────────────────────────────
  ink: '#0F172A',         // Primary text — near-black
  ink2: '#334155',        // Secondary text
  inkSubtle: '#64748B',   // Tertiary / captions

  // ── Surface / Background ────────────────────────────────────────────────────
  background: '#F8F9FB',  // App background
  surface: '#FFFFFF',     // Card / sheet surface
  surfaceRaised: '#FAFAFA',

  // ── Gray Scale ──────────────────────────────────────────────────────────────
  gray1: '#F1F5F9',
  gray2: '#E2E8F0',
  gray3: '#CBD5E1',
  gray4: '#94A3B8',
  gray5: '#64748B',

  // ── Legacy alias ────────────────────────────────────────────────────────────
  white: '#FFFFFF',

  // ── Error / Destructive ─────────────────────────────────────────────────────
  red: '#EF4444',
  redLight: '#FEE2E2',
  redDark: '#991B1B',

  // ── Info / Blue ─────────────────────────────────────────────────────────────
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  blueDark: '#1D4ED8',

  // ── Overlays ────────────────────────────────────────────────────────────────
  overlayNavy: 'rgba(15, 23, 42, 0.6)',
  overlayLight: 'rgba(255, 255, 255, 0.08)',
  overlayBorder: 'rgba(255, 255, 255, 0.15)',
  overlayDark: 'rgba(15, 23, 42, 0.85)',
} as const;

// ── Radius: 8pt Grid ────────────────────────────────────────────────────────
export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  round: 999,
} as const;

// ── Spacing: Strict 8pt Grid ────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

// ── Shadows: Layered depth (boxShadow for web + native compat) ──────────────
export const Shadow = {
  xs: {
    boxShadow: '0px 1px 8px rgba(0,0,0,0.04)',
  },
  sm: {
    boxShadow: '0px 2px 16px rgba(0,0,0,0.06)',
  },
  md: {
    boxShadow: '0px 4px 32px rgba(0,0,0,0.09)',
  },
  lg: {
    boxShadow: '0px 8px 64px rgba(0,0,0,0.12)',
  },
  xl: {
    boxShadow: '0px 16px 96px rgba(0,0,0,0.18)',
  },
  // Brand-tinted shadow for primary CTAs
  saffron: {
    boxShadow: '0px 6px 40px rgba(255,107,0,0.28)',
  },
} as const;

// ── Motion Timing (ms) ──────────────────────────────────────────────────────
export const Motion = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 350,
  spring: { friction: 8, tension: 60 },
  springSnappy: { friction: 6, tension: 80 },
} as const;

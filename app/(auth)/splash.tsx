import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { Colors, FontFamily } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: '⚡', label: 'Instant Hiring' },
  { icon: '📍', label: 'Near You' },
  { icon: '💰', label: 'Daily Pay' },
];

function FloatingOrb({ size, color, delay, startX, startY }: { size: number; color: string; delay: number; startX: number; startY: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.6, { duration: 1000 }));
    translateY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-20, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(20, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    ));
    translateX.value = withDelay(delay + 300, withRepeat(
      withSequence(
        withTiming(-12, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(12, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ), -1, true
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    position: 'absolute',
    left: startX,
    top: startY,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  }));

  return <Animated.View style={style} />;
}

function GlowRing({ delay, scale: scaleProp }: { delay: number; scale: number }) {
  const ringOpacity = useSharedValue(0.5);
  const ringScale = useSharedValue(scaleProp);

  useEffect(() => {
    ringOpacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 }),
      ), -1
    ));
    ringScale.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(scaleProp + 0.5, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(scaleProp, { duration: 0 }),
      ), -1
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.5)',
    alignSelf: 'center',
  }));

  return <Animated.View style={style} />;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function AnimatedLogo() {
  const glow = useSharedValue(0.3);
  const progress = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 107, 0, ${glow.value})`,
    shadowOpacity: glow.value * 0.8,
  }));

  const rectAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 160 * (1 - progress.value)
  }));

  const pathAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 80 * (1 - progress.value)
  }));

  return (
    <Animated.View style={[styles.logoContainer, animatedStyle]}>
      <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={Colors.saffron} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <AnimatedRect 
          x="2" y="7" width="20" height="14" rx="2" ry="2" 
          strokeDasharray="160"
          animatedProps={rectAnimatedProps as any} 
        />
        <AnimatedPath 
          d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
          strokeDasharray="80"
          animatedProps={pathAnimatedProps as any}
        />
      </Svg>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const { isAuthenticated } = useAuthStore();

  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const pillsOpacity = useSharedValue(0);
  const pillsTranslateY = useSharedValue(30);

  useEffect(() => {
    // Logo pop in
    logoScale.value = withSpring(1, { damping: 10, stiffness: 80 });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Title slides up
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(400, withSpring(0, { damping: 14, stiffness: 100 }));

    // Tagline
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(700, withSpring(0, { damping: 14 }));

    // Pills
    pillsOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    pillsTranslateY.value = withDelay(1000, withSpring(0, { damping: 12 }));

    // Smart navigate after animation
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        // Returning logged-in user — go straight to main app
        router.replace('/(tabs)');
      } else {
        // New / logged-out user — go to login
        router.replace('/(auth)/phone');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const pillsStyle = useAnimatedStyle(() => ({
    opacity: pillsOpacity.value,
    transform: [{ translateY: pillsTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Floating ambient orbs */}
      <FloatingOrb size={180} color="rgba(255,107,0,0.08)" delay={0} startX={-50} startY={height * 0.05} />
      <FloatingOrb size={140} color="rgba(255,107,0,0.06)" delay={400} startX={width * 0.6} startY={height * 0.02} />
      <FloatingOrb size={220} color="rgba(99,60,180,0.06)" delay={200} startX={-40} startY={height * 0.55} />
      <FloatingOrb size={160} color="rgba(255,107,0,0.05)" delay={600} startX={width * 0.65} startY={height * 0.65} />

      {/* Gradient accent bar at top */}
      <LinearGradient
        colors={['rgba(255,107,0,0.3)', 'transparent']}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.center}>
        {/* Logo Section */}
        <View style={styles.logoWrapper}>
          {/* Glow rings */}
          <GlowRing delay={800} scale={1} />
          <GlowRing delay={1400} scale={1.2} />

          <Animated.View style={logoStyle}>
            <AnimatedLogo />
          </Animated.View>
        </View>

        {/* Brand Name */}
        <Animated.View style={titleStyle}>
          <Text style={styles.appName}>KaamNow</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>Your next job is one tap away</Text>
        </Animated.View>

        {/* Feature Pills */}
        <Animated.View style={[styles.pillsRow, pillsStyle]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillIcon}>{f.icon}</Text>
              <Text style={styles.pillLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom divider glow */}
      <LinearGradient
        colors={['transparent', 'rgba(255,107,0,0.15)', 'transparent']}
        style={styles.bottomGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Connecting India's workforce</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#0A0A0A',
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 12,
  },
  appName: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 54,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tagline: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 70,
    left: 24,
    right: 24,
    height: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
  },
});

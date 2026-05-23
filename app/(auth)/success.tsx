import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';

const { width, height } = Dimensions.get('window');

const ACHIEVEMENT_CARDS = [
  {
    icon: 'person-circle-outline',
    color: Colors.saffron,
    bgColor: 'rgba(255,107,0,0.15)',
    title: 'Profile Created',
    subtitle: 'Your identity is verified',
  },
  {
    icon: 'briefcase-outline',
    color: '#22C55E',
    bgColor: 'rgba(34,197,94,0.15)',
    title: 'Ready to Work',
    subtitle: 'Jobs matching your skills',
  },
  {
    icon: 'cash-outline',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.15)',
    title: 'Daily Pay',
    subtitle: 'Get paid every day',
  },
];

function ConfettiParticle({ delay, startX }: { delay: number; startX: number }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(height * 0.55, {
      duration: 2000 + Math.random() * 1000,
      easing: Easing.out(Easing.ease),
    }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1400, withTiming(0, { duration: 400 }))
    ));
    rotate.value = withDelay(delay, withTiming(360 + Math.random() * 360, { duration: 2000 }));
  }, []);

  const colors = ['#FF6B00', '#FFD700', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 6 + Math.random() * 8;

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: startX,
    top: 0,
    width: size,
    height: size,
    borderRadius: Math.random() > 0.5 ? size / 2 : 2,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={style} />;
}

export default function AccountSuccessScreen() {
  const { user } = useAuthStore();
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ringScale1 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0.6);
  const ringScale2 = useSharedValue(1);
  const ringOpacity2 = useSharedValue(0.4);

  const firstName = user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    // Checkmark pop in
    checkOpacity.value = withTiming(1, { duration: 300 });
    checkScale.value = withSpring(1, { damping: 8, stiffness: 80 });

    // Pulse rings
    ringScale1.value = withRepeat(withSequence(
      withTiming(1.8, { duration: 1000, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 0 }),
    ), -1);
    ringOpacity1.value = withRepeat(withSequence(
      withTiming(0, { duration: 1000 }),
      withTiming(0.5, { duration: 0 }),
    ), -1);

    ringScale2.value = withDelay(500, withRepeat(withSequence(
      withTiming(1.8, { duration: 1000, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 0 }),
    ), -1));
    ringOpacity2.value = withDelay(500, withRepeat(withSequence(
      withTiming(0, { duration: 1000 }),
      withTiming(0.4, { duration: 0 }),
    ), -1));

    // Auto-navigate
    const timer = setTimeout(() => {
      router.replace('/(auth)/skills');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ringOpacity1.value,
    transform: [{ scale: ringScale1.value }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: ringOpacity2.value,
    transform: [{ scale: ringScale2.value }],
  }));

  const confettiParticles = Array.from({ length: 28 }, (_, i) => ({
    delay: Math.random() * 600,
    startX: Math.random() * width,
  }));

  return (
    <LinearGradient
      colors={['#0A0F1E', '#0F172A', '#1B1240']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Confetti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confettiParticles.map((p, i) => (
          <ConfettiParticle key={i} delay={p.delay} startX={p.startX} />
        ))}
      </View>

      {/* Background glow */}
      <View style={styles.greenGlow} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topSection}>
          {/* Check icon with rings */}
          <View style={styles.checkWrapper}>
            <Animated.View style={[styles.pulseRing, ring1Style]} />
            <Animated.View style={[styles.pulseRing, styles.pulseRing2, ring2Style]} />

            <Animated.View style={checkStyle}>
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.checkCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark-sharp" size={52} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.delay(400).duration(600).springify()} style={styles.heroText}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.welcomeText}>Welcome, {firstName}!</Text>
            <Text style={styles.subtitle}>Your account is all set up</Text>
          </Animated.View>
        </View>

        {/* Achievement Cards */}
        <View style={styles.cardsContainer}>
          {ACHIEVEMENT_CARDS.map((card, index) => (
            <Animated.View
              key={card.title}
              entering={FadeInDown.delay(500 + index * 120).duration(500).springify()}
              style={styles.achievementCard}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: card.bgColor }]}>
                <Ionicons name={card.icon as any} size={22} color={card.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </View>
              <View style={styles.cardCheck}>
                <Ionicons name="checkmark-circle" size={18} color={card.color} />
              </View>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(900).duration(600).springify()} style={styles.footer}>
          <Pressable
            style={styles.letsGoBtn}
            onPress={() => router.replace('/(auth)/skills')}
          >
            <LinearGradient
              colors={[Colors.saffron, '#FF5500']}
              style={styles.letsGoBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.letsGoBtnText}>Let's Find Jobs!</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </Pressable>
          <Text style={styles.autoSkipText}>Auto-continuing in a moment...</Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },

  greenGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34,197,94,0.07)',
    top: height * 0.1,
    alignSelf: 'center',
  },

  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },

  // ── Check Icon ────────────────────────────────
  checkWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  pulseRing2: {
    borderColor: 'rgba(34,197,94,0.25)',
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: "0px 12px 48px rgba(34,197,94,0.45)",
  },

  // ── Hero Text ─────────────────────────────────
  heroText: { alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 36, marginBottom: 10 },
  welcomeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // ── Achievement Cards ─────────────────────────
  cardsContainer: {
    gap: 12,
    paddingBottom: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  cardCheck: {},

  // ── Footer ────────────────────────────────────
  footer: {
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  letsGoBtn: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: "0px 8px 32px rgba(255,107,0,0.35)",
  },
  letsGoBtnGradient: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  letsGoBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  autoSkipText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/theme';
import { useUIStore } from '../../src/store/uiStore';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

const LANGUAGES = [
  { key: 'en' as const, label: 'English', native: 'English' },
  { key: 'hi' as const, label: 'Hindi', native: 'हिन्दी' },
  { key: 'te' as const, label: 'Telugu', native: 'తెలుగు' },
];

const TAGLINES: Record<string, string> = {
  en: 'Find work nearby. Fast. Easy.',
  hi: 'काम तुरंत मिले',
  te: 'పని వెంటనే దొరకండి',
};

const FEATURES: Record<string, string[]> = {
  en: ['📍 Nearest jobs first', '⚡ Instant hiring', '✅ Verified workers', '🎙️ Voice apply'],
  hi: ['📍 नजदीकी काम पहले', '⚡ तुरंत भर्ती', '✅ वेरिफाइड कामगार', '🎙️ आवाज से अप्लाई'],
  te: ['📍 దగ్గర పని ముందు', '⚡ తక్షణ నియామకం', '✅ ధృవీకరించబడింది', '🎙️ వాయిస్ అప్లై'],
};

export default function SplashScreen() {
  const { language, setLanguage } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // If already authenticated, go to home
    if (isAuthenticated) {
      router.replace('/(tabs)');
      return;
    }

    // Logo entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Content fade in
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

    // Floating logo animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -8,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isAuthenticated]);

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <LinearGradient
        colors={[Colors.navy, Colors.navy2, '#162038']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Pattern overlay */}
      <View style={styles.patternOverlay} pointerEvents="none" />

      {/* Language selector top-right */}
      <SafeAreaView style={styles.safeTop}>
        <TouchableOpacity
          style={styles.langTopBtn}
          onPress={() => setShowLangMenu(!showLangMenu)}
        >
          <Text style={styles.langTopBtnText}>🌐 {language.toUpperCase()} ▾</Text>
        </TouchableOpacity>
        {showLangMenu && (
          <View style={styles.langMenu}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langMenuItem, l.key === language && styles.langMenuItemActive]}
                onPress={() => {
                  setLanguage(l.key);
                  setShowLangMenu(false);
                }}
              >
                <Text style={[styles.langMenuText, l.key === language && styles.langMenuTextActive]}>
                  {l.native}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Animated logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: floatY }],
            },
          ]}
        >
          <View style={styles.logoGlow} />
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: contentOpacity }]}>
          {/* Brand */}
          <Text style={styles.brandName}>
            <Text style={{ color: Colors.saffron }}>Kaam</Text>Now
          </Text>
          <Text style={styles.tagline}>{TAGLINES[language]}</Text>

          {/* Language chips */}
          <View style={styles.langChips}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langChip, l.key === language && styles.langChipActive]}
                onPress={() => setLanguage(l.key)}
              >
                <Text style={[styles.langChipText, l.key === language && styles.langChipTextActive]}>
                  {l.native}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* City illustration */}
          <View style={styles.illustration}>
            <Text style={styles.illustrationEmoji}>🏙️</Text>
            <View style={styles.illustrationGlow} />
          </View>

          {/* Feature bullets */}
          <View style={styles.features}>
            {(FEATURES[language] ?? FEATURES.en).map((f, i) => (
              <Text key={i} style={styles.feature}>{f}</Text>
            ))}
          </View>

          {/* CTAs */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/phone')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {language === 'en' ? '🚀 Login / लॉगिन' : language === 'hi' ? '🚀 लॉगिन करें' : '🚀 లాగిన్ చేయండి'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/phone')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>
              {language === 'en' ? 'New? Sign Up Free →' : language === 'hi' ? 'नया? मुफ्त साइन अप →' : 'కొత్తవారా? ఉచితంగా →'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing you agree to Terms & Privacy Policy
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  patternOverlay: {
    position: 'absolute',
    inset: 0,
    // subtle diagonal grid
    opacity: 0.04,
  },
  safeTop: {
    position: 'absolute',
    top: 50,
    right: 14,
    zIndex: 20,
  },
  langTopBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  langTopBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  langMenu: {
    marginTop: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  langMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  langMenuItemActive: {
    backgroundColor: Colors.saffronLight,
  },
  langMenuText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  langMenuTextActive: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
  },
  logoWrap: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.saffron,
    opacity: 0.18,
  },
  logoBox: {
    width: 90,
    height: 90,
    backgroundColor: Colors.saffron,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 44,
  },
  textBlock: {
    width: '100%',
    alignItems: 'center',
  },
  brandName: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['6xl'],
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: 6,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 12,
  },
  langChips: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  langChip: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  langChipActive: {
    backgroundColor: Colors.saffron,
    borderColor: Colors.saffron,
  },
  langChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.75)',
  },
  langChipTextActive: {
    color: Colors.white,
    fontFamily: FontFamily.bodySemiBold,
  },
  illustration: {
    width: 200,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  illustrationEmoji: {
    fontSize: 60,
  },
  illustrationGlow: {
    position: 'absolute',
    bottom: -20,
    width: 150,
    height: 40,
    backgroundColor: Colors.saffron,
    opacity: 0.08,
    borderRadius: 75,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 24,
  },
  feature: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.saffron,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
  terms: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    marginTop: 4,
  },
});

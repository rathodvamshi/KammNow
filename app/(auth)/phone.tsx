import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily } from '../../src/theme';
import { firebaseAuth } from '../../src/services/firebaseAuth';
import { userService } from '../../src/services/userService';
import { checkOtpRateLimit, recordOtpRequest } from '../../src/utils/otpRateLimiter';

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

    // Continuous drawing animation
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
    strokeDashoffset: 80 * (1 - progress.value)
  }));

  const pathAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 40 * (1 - progress.value)
  }));

  return (
    <Animated.View style={[styles.logoContainer, animatedStyle]}>
      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={Colors.saffron} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <AnimatedRect 
          x="2" y="7" width="20" height="14" rx="2" ry="2" 
          strokeDasharray="80"
          animatedProps={rectAnimatedProps as any} 
        />
        <AnimatedPath 
          d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
          strokeDasharray="40"
          animatedProps={pathAnimatedProps as any}
        />
      </Svg>
    </Animated.View>
  );
}

export default function PhoneLoginScreen() {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    const checkLock = async () => {
      const { locked, lockUntil } = await checkOtpRateLimit();
      if (locked && lockUntil) setLockedUntil(lockUntil);
    };
    checkLock();
  }, []);

  const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
  const isValid = cleanPhone.length === 10;

  const handleContinue = async () => {
    if (!isValid || isLoading) {
      if (!isValid && phone.length > 0 && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (lockedUntil && Date.now() < lockedUntil) {
      const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
      Alert.alert('Too Many Requests', `Please wait ${mins} minutes before trying again.`);
      return;
    }

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError('');

    try {
      const phoneE164 = `+91${cleanPhone}`;
      
      console.log("Checking DB for user:", phoneE164);
      const userExists = await userService.checkUserExists(phoneE164);

      if (userExists) {
        // User exists -> send OTP directly
        const { locked, lockUntil } = await recordOtpRequest();
        if (locked && lockUntil) {
          setLockedUntil(lockUntil);
          throw { code: 'auth/too-many-requests', message: 'Maximum retries exceeded.' };
        }

        const verificationId = await firebaseAuth.sendOtp(phoneE164);

        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        router.push({
          pathname: '/(auth)/verify',
          params: {
            phone: cleanPhone,
            isNewUser: 'false',
            verificationId,
          },
        });
      } else {
        // New user -> navigate to registration details
        router.push({
          pathname: '/(auth)/signup',
          params: {
            phone: cleanPhone,
          },
        });
      }

    } catch (error: any) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const mappedMsg = firebaseAuth.parseFirebaseError(error.code) || error.message;
      setError(mappedMsg || "Failed to process request. Please try again.");

      Alert.alert(
        "Error",
        `${error.code ? `${error.code}\n` : ''}${mappedMsg}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Animated.View entering={FadeInDown.duration(800).springify()}>
              <AnimatedLogo />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(100).duration(800).springify()} style={styles.logoTitle}>
              KaamNow
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(200).duration(800).springify()} style={styles.subtitle}>
              Find work faster. Hire workers nearby.
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(300).duration(800).springify()} style={styles.modeTitle}>
              Welcome
            </Animated.Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Animated.Text entering={FadeInUp.delay(400).duration(800).springify()} style={styles.inputLabel}>
              Mobile Number
            </Animated.Text>
            
            <Animated.View entering={FadeInUp.delay(500).duration(800).springify()} style={[styles.inputOuter, isFocused && styles.inputOuterFocused]}>
              <Text style={styles.countryCode}>🇮🇳 +91 |</Text>
              <View style={styles.inputInner}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter mobile number"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  maxLength={10}
                  value={cleanPhone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (t.length === 10 && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoFocus
                  selectionColor={Colors.saffron}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(600).duration(800).springify()}>
              <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                (!isValid || isLoading) && styles.continueBtnDisabled,
                pressed && isValid && styles.continueBtnPressed,
              ]}
              onPress={handleContinue}
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.continueBtnText}>
                  Continue →
                </Text>
              )}
            </Pressable>
            </Animated.View>

            {/* Error message */}
            {!!error && (
              <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
                {error}
              </Animated.Text>
            )}
          </View>

          {/* Footer */}
          <Animated.View entering={FadeInUp.delay(800).duration(800).springify()} style={styles.footer}>
            <Text style={styles.legalText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 28, 
    paddingTop: 40, 
    paddingBottom: 40 
  },
  
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logoContainer: {
    width: 76,
    height: 76,
    backgroundColor: '#0A0A0A',
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
  },
  modeTitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 40,
    fontWeight: 'bold',
  },
  logoTitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 48,
    color: '#FFFFFF',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 15,
    color: '#CCCCCC',
  },

  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodySemiBold }),
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 16, // Rounded input boxes
    padding: 6,
    marginBottom: 24,
    shadowColor: '#000', // Shadow effects
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  inputOuterFocused: {
    borderColor: Colors.saffron,
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  countryCode: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodySemiBold }),
    fontSize: 16,
    color: '#FFFFFF',
    paddingHorizontal: 12,
  },
  inputInner: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  phoneInput: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 1,
    ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }),
  },
  
  continueBtn: {
    backgroundColor: '#333333',
    height: 60, // Large button
    width: '100%',
    borderRadius: 16, // Rounded
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000', // Shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }], // Small press animation effect
  },
  continueBtnText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodySemiBold }),
    fontSize: 18,
    color: '#FFFFFF',
  },
  errorText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodyMedium ?? FontFamily.body }),
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },

  footer: {
    marginTop: 'auto',
    paddingTop: 60,
  },
  legalText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

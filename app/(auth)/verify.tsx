import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedProps,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, Radius, Shadow } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
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

function BreathingBlob({ color, size, top, left, right, bottom, delay = 0 }: any) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          filter: 'blur(60px)' as any,
          top, left, right, bottom,
        },
        animatedStyle,
      ]}
    />
  );
}

function OtpBox({
  digit,
  index,
  isError,
  inputRef,
  onChange,
  onKeyPress,
}: {
  digit: string;
  index: number;
  isError: boolean;
  inputRef: (ref: TextInput | null) => void;
  onChange: (text: string, i: number) => void;
  onKeyPress: (e: any, i: number) => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.otpBox, isError && styles.otpBoxError, animStyle]}>
      <TextInput
        ref={inputRef}
        style={[styles.otpInput, isError && styles.otpInputError]}
        keyboardType="numeric"
        maxLength={1}
        value={digit}
        onChangeText={(t) => {
          if (t) {
            scale.value = withSequence(
              withSpring(1.15, { damping: 6, stiffness: 200 }),
              withSpring(1, { damping: 10 })
            );
          }
          onChange(t, index);
        }}
        onKeyPress={(e) => onKeyPress(e, index)}
        selectTextOnFocus
      />
    </Animated.View>
  );
}

export default function VerifyOTPScreen() {
  const { phone, isNewUser, verificationId: initialVerificationId, profileName, profileAge, profileRole, profileSkills } =
    useLocalSearchParams<{ phone: string; isNewUser: string; verificationId: string; profileName?: string; profileAge?: string; profileRole?: string; profileSkills?: string }>();
  const { setUser, setFirebaseSession } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationId, setVerificationId] = useState(initialVerificationId || '');
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    const checkLock = async () => {
      const { locked, lockUntil } = await checkOtpRateLimit();
      if (locked && lockUntil) setLockedUntil(lockUntil);
    };
    checkLock();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const isComplete = otp.every((d) => d !== '');

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    setError('');
    if (text && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Handle paste
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (pasted.length >= 6 && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const [attempts, setAttempts] = useState(0);

  const handleVerify = async (currentOtp?: string[]) => {
    const otpToVerify = currentOtp || otp;
    const otpCode = otpToVerify.join('');

    if (otpCode.length < 6 || isLoading) return;
    if (!verificationId) {
      setError('Session expired. Please go back and request a new OTP.');
      return;
    }
    
    if (attempts >= 5) {
      setError('Too many failed attempts. Please request a new code.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Step 1: Verify OTP with Firebase
      const firebaseUser = await firebaseAuth.verifyOtp(verificationId, otpCode);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Step 2: Create or get user in Supabase
      const phoneWithCode = `+91${phone}`;
      let user;

      if (isNewUser === 'true') {
        const roleToSet = (profileRole as 'seeker' | 'provider') || 'seeker';
        const result = await userService.createFullProfile(
          firebaseUser.uid,
          phoneWithCode,
          {
            name: profileName || '',
            age: parseInt(profileAge || '0', 10),
            role: roleToSet,
            skills: profileSkills ? JSON.parse(profileSkills) : [],
          }
        );
        user = result.user;
        useUIStore.getState().setRole(roleToSet);
      } else {
        const result = await userService.createOrGetUser(firebaseUser.uid, phoneWithCode);
        user = result.user;
        useUIStore.getState().setRole((user.role as 'seeker' | 'provider') || 'seeker');
      }

      // Step 3: Persist session keys to SecureStore
      await setFirebaseSession(firebaseUser.uid, user.id);

      // Step 4: Route straight to app
      setUser(user);
      router.replace('/(tabs)');
    } catch (error: any) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      console.log("FIREBASE OTP ERROR:", error);
      console.log("ERROR CODE:", error.code);
      console.log("ERROR MESSAGE:", error.message);

      setError(error.message || 'Verification failed. Please try again.');
      setAttempts((prev) => prev + 1);
      
      Alert.alert(
        "OTP Error",
        `${error.code}\n${error.message}`
      );
      
      triggerShake();
      // Reset OTP inputs so user can re-enter
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (isComplete && !error && !isLoading) {
      handleVerify(otp);
    }
  }, [otp]);

  const handleResend = async () => {
    if (countdown > 0) return;
    
    if (lockedUntil && Date.now() < lockedUntil) {
      const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
      Alert.alert('Too Many Requests', `Please wait ${mins} minutes before trying again.`);
      return;
    }

    if (Platform.OS !== 'web') Haptics.selectionAsync();

    setCountdown(30);
    setOtp(['', '', '', '', '', '']);
    setError('');

    try {
      const { locked, lockUntil } = await recordOtpRequest();
      if (locked && lockUntil) {
        setLockedUntil(lockUntil);
        throw { code: 'auth/too-many-requests', message: 'Maximum retries exceeded.' };
      }

      const newVerificationId = await firebaseAuth.sendOtp(`+91${phone}`);
      setVerificationId(newVerificationId);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const mappedMsg = firebaseAuth.parseFirebaseError(err.code) || err.message;
      setError(mappedMsg || 'Failed to resend OTP. Please try again.');
      Alert.alert("OTP Error", `${err.code ? `${err.code}\n` : ''}${mappedMsg}`);
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Cinematic Breathing Backgrounds */}
      <BreathingBlob color="rgba(255,107,0,0.15)" size={280} top={-50} left={-100} />
      <BreathingBlob color="rgba(59,130,246,0.1)" size={220} bottom={100} right={-50} delay={1500} />

      <View style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Animated.View entering={FadeInDown.duration(800).springify()}>
              <AnimatedLogo />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(100).duration(800).springify()} style={styles.logoTitle}>
              KaamNow
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(200).duration(800).springify()} style={styles.appSubtitle}>
              Find work faster. Hire workers nearby.
            </Animated.Text>
          </View>

          <Animated.View entering={FadeInUp.delay(300).duration(800).springify()}>
            <Text style={styles.title}>Verify Phone</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to +91 {phone || '7569408235'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(800).springify()} style={[styles.otpContainer, shakeStyle]}>
            {otp.map((digit, i) => (
              <OtpBox
                key={i}
                index={i}
                digit={digit}
                isError={!!error}
                inputRef={(r) => (inputRefs.current[i] = r)}
                onChange={handleOtpChange}
                onKeyPress={handleKeyPress}
              />
            ))}
          </Animated.View>

          {error ? (
            <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
              {error}
            </Animated.Text>
          ) : null}

          <Animated.View entering={FadeInUp.delay(500).duration(800).springify()} style={styles.btnWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.verifyBtn,
                (!isComplete || isLoading) && styles.verifyBtnDisabled,
                pressed && isComplete && styles.verifyBtnPressed,
              ]}
              onPress={() => handleVerify()}
              disabled={!isComplete || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify & Continue</Text>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(600).duration(800).springify()} style={styles.resendContainer}>
            <Text style={styles.resendHint}>Didn't receive the code?</Text>
            <Pressable onPress={handleResend} disabled={countdown > 0}>
              <Text style={[styles.resendAction, countdown > 0 && styles.resendDisabled]}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0A0A0A' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  logoTitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 48,
    color: '#FFFFFF',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  appSubtitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 15,
    color: '#CCCCCC',
  },

  title: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 42,
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 40,
    lineHeight: 20,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxError: {
    borderColor: Colors.red,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  otpInput: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  otpInputError: {
    color: Colors.red,
  },
  errorText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodyMedium }),
    fontSize: 13,
    color: Colors.red,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -10,
  },

  btnWrapper: {
    marginBottom: 40,
  },
  verifyBtn: {
    backgroundColor: '#333333',
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnPressed: {
    backgroundColor: '#444444',
  },
  verifyBtnText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 18,
    color: '#FFFFFF',
  },

  resendContainer: {
    alignItems: 'center',
    gap: 16,
  },
  resendHint: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  resendAction: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 14,
    color: '#FFFFFF',
  },
  resendDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
});

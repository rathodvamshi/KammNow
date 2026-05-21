import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { MOCK_USER } from '../../src/services/mockData';

export default function VerifyOTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setUser } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Shake animation for wrong OTP
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const shake = () => {
    Vibration.vibrate(300);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[idx] = value;
    setOtp(next);
    setError('');
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
    // Auto-submit when all 6 digits filled
    if (next.every((d) => d !== '') && next.join('').length === 6) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      // Simulate Firebase verification — accept any 6-digit code for demo
      await new Promise((r) => setTimeout(r, 1200));

      if (code === '000000') {
        // Demo wrong OTP
        shake();
        setError('Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        // Success — set user and navigate
        setSuccess(true);
        setUser(MOCK_USER);
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 800);
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const otpComplete = otp.every((d) => d !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Navy header */}
      <LinearGradient colors={[Colors.navy, Colors.navy2]} style={styles.header}>
        <SafeAreaView>
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backBtn}>← Change Number</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Text>💼</Text></View>
            <Text style={styles.logoText}>
              Kaam<Text style={{ color: Colors.saffron }}>Now</Text>
            </Text>
          </View>

          {/* Progress dots */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotDone]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepLabel}>Step 2 of 3 — Verify OTP</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          6-digit OTP sent to{'\n'}
          <Text style={styles.phoneHighlight}>{phone}</Text>
        </Text>

        {/* Success / Error banners */}
        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✅ Verified! Logging you in...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* OTP boxes */}
        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeX }] }]}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              style={[
                styles.otpBox,
                digit && styles.otpBoxFilled,
                error && styles.otpBoxError,
                success && styles.otpBoxSuccess,
              ]}
              value={digit}
              onChangeText={(v) => handleDigit(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        {/* Countdown + resend */}
        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendBtn}>🔄 Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownText}>
              Resend in{' '}
              <Text style={{ color: Colors.saffron, fontFamily: FontFamily.bodySemiBold }}>
                {countdown}s
              </Text>
            </Text>
          )}
        </View>

        {/* Demo hint */}
        <View style={styles.demoHint}>
          <Text style={styles.demoText}>
            💡 Demo: Enter any 6 digits (except 000000) to login
          </Text>
        </View>

        {/* Manual verify button */}
        {otpComplete && !isLoading && !success && (
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => handleVerify(otp.join(''))}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyBtnText}>✅ Verify & Login</Text>
          </TouchableOpacity>
        )}

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.saffron} />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { paddingHorizontal: 16, paddingBottom: 20 },
  topNav: { paddingTop: 50, marginBottom: 14 },
  backBtn: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  logoIcon: {
    width: 28, height: 28,
    backgroundColor: Colors.saffron,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    color: Colors.white,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotDone: { backgroundColor: Colors.saffron },
  progressDotActive: { backgroundColor: Colors.white, transform: [{ scale: 1.3 }] },
  progressLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.5)',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    lineHeight: 22,
    marginBottom: 20,
  },
  phoneHighlight: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },
  successBanner: {
    backgroundColor: Colors.greenLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.greenDark,
  },
  errorBanner: {
    backgroundColor: Colors.redLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.red,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: 10,
    backgroundColor: Colors.white,
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.ink,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
  },
  otpBoxError: {
    borderColor: Colors.red,
    backgroundColor: Colors.redLight,
  },
  otpBoxSuccess: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenLight,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
  resendBtn: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.saffron,
  },
  demoHint: {
    backgroundColor: Colors.blueLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  demoText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.blue,
    textAlign: 'center',
  },
  verifyBtn: {
    backgroundColor: Colors.saffron,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  verifyBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.saffron,
  },
});

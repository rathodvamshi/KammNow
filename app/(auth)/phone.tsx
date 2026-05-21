import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../src/theme';
import { useUIStore } from '../../src/store/uiStore';
import { isValidIndianPhone } from '../../src/utils/helpers';

export default function PhoneScreen() {
  const { language } = useUIStore();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = isValidIndianPhone(phone);

  const handleSendOTP = async () => {
    if (!isValid) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // In production: call Firebase signInWithPhoneNumber
      // For demo: navigate with phone number
      await new Promise((r) => setTimeout(r, 1200)); // Simulate network
      router.push({ pathname: '/(auth)/verify', params: { phone: `+91${phone}` } });
    } catch (e) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Navy top section */}
      <LinearGradient
        colors={[Colors.navy, Colors.navy2]}
        style={styles.topSection}
      >
        <SafeAreaView>
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.langLabel}>🌐 {language.toUpperCase()}</Text>
          </View>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Text style={styles.logoEmoji}>💼</Text></View>
            <Text style={styles.logoText}>
              Kaam<Text style={{ color: Colors.saffron }}>Now</Text>
            </Text>
          </View>
          <Text style={styles.topSubtitle}>Welcome back! Wapas aa gaye 👋</Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formTitle}>Login / Sign Up</Text>
        <Text style={styles.formSub}>Enter your mobile number to receive OTP</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Phone input */}
        <Text style={styles.fieldLabel}>📱 Mobile Number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, error && styles.inputError]}
            value={phone}
            onChangeText={(t) => {
              setPhone(t.replace(/\D/g, '').slice(0, 10));
              setError('');
            }}
            keyboardType="number-pad"
            placeholder="98765 43210"
            placeholderTextColor={Colors.gray3}
            maxLength={10}
          />
          {phone.length === 10 && (
            <View style={styles.validIcon}>
              <Text>{isValid ? '✅' : '❌'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.fieldHint}>
          {isValid && phone.length === 10
            ? '✅ Valid mobile number'
            : 'Aapka registered mobile number'}
        </Text>

        {/* OTP button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || isLoading) && styles.submitBtnDisabled]}
          onPress={handleSendOTP}
          disabled={!isValid || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>📲 Send OTP →</Text>
          )}
        </TouchableOpacity>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔐 Phone OTP Login</Text>
          <Text style={styles.infoText}>
            {'1. Enter your 10-digit mobile number\n2. Receive OTP via SMS\n3. Verify and you\'re in!\n\nNo password needed. 100% secure.'}
          </Text>
        </View>

        {/* Privacy */}
        <Text style={styles.privacy}>
          We'll never share your number. OTP valid for 60 seconds.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 14,
  },
  backBtn: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  langLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  logoIcon: {
    width: 30,
    height: 30,
    backgroundColor: Colors.saffron,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 16 },
  logoText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    color: Colors.white,
  },
  topSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.5)',
  },
  form: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  formContent: {
    padding: 18,
    paddingBottom: 40,
  },
  formTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.ink,
    marginBottom: 4,
  },
  formSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    marginBottom: 20,
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
  fieldLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  prefix: {
    backgroundColor: Colors.gray1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.gray2,
    justifyContent: 'center',
  },
  prefixText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink2,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink,
    letterSpacing: 2,
  },
  inputError: {
    borderColor: Colors.red,
  },
  validIcon: {
    paddingRight: 12,
    justifyContent: 'center',
  },
  fieldHint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 5,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: Colors.saffron,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
  infoBox: {
    backgroundColor: Colors.saffronLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.15)',
    marginBottom: 16,
  },
  infoTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.saffronDark,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.ink2,
    lineHeight: 20,
  },
  privacy: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textAlign: 'center',
  },
});

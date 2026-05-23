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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming, Easing, FadeOutLeft, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily } from '../../src/theme';
import { firebaseAuth } from '../../src/services/firebaseAuth';
import { recordOtpRequest } from '../../src/utils/otpRateLimiter';

const SKILLS = [
  { id: '1', name: 'Delivery', emoji: '🚴', color: '#FF6B00', bgColor: 'rgba(255,107,0,0.15)' },
  { id: '2', name: 'Driving', emoji: '🚗', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
  { id: '3', name: 'Warehousing', emoji: '📦', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.15)' },
  { id: '4', name: 'Waitstaff', emoji: '🍽️', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.15)' },
  { id: '5', name: 'Retail', emoji: '🛍️', color: '#EC4899', bgColor: 'rgba(236,72,153,0.15)' },
  { id: '6', name: 'Cleaning', emoji: '🧹', color: '#06B6D4', bgColor: 'rgba(6,182,212,0.15)' },
  { id: '7', name: 'Electrician', emoji: '⚡', color: '#EAB308', bgColor: 'rgba(234,179,8,0.15)' },
  { id: '8', name: 'Plumber', emoji: '🔧', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.15)' },
  { id: '9', name: 'Painter', emoji: '🎨', color: '#EC4899', bgColor: 'rgba(236,72,153,0.15)' },
  { id: '10', name: 'Carpenter', emoji: '🔨', color: '#F97316', bgColor: 'rgba(249,115,22,0.15)' },
  { id: '11', name: 'Cook', emoji: '🍳', color: '#EF4444', bgColor: 'rgba(239,68,68,0.15)' },
  { id: '12', name: 'Mechanic', emoji: '⚙️', color: '#64748B', bgColor: 'rgba(100,116,139,0.15)' },
];
const MAX_SKILLS = 3;

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

function SkillChip({ skill, isSelected, isDisabled, onToggle }: any) {
  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = () => {
    if (isDisabled && !isSelected) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, { damping: 10 }, () => { scale.value = withSpring(1, { damping: 8 }); });
    onToggle();
  };
  return (
    <Animated.View style={[cardStyle, styles.skillChipWrapper]}>
      <Pressable
        onPress={handlePress}
        style={[styles.skillChip, isSelected && { borderColor: skill.color, backgroundColor: skill.bgColor }, isDisabled && !isSelected && { opacity: 0.5 }]}
      >
        <Text style={styles.skillEmoji}>{skill.emoji}</Text>
        <Text style={[styles.skillName, isSelected && { color: skill.color }]}>{skill.name}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SignUpDetailsScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [roleSelection, setRoleSelection] = useState<'seeker' | 'provider' | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isStep1Complete = name.trim().length >= 3 && age.length >= 1 && roleSelection !== null;
  const isStep2Complete = selectedSkills.length > 0;

  const toggleSkill = (id: string) => {
    if (selectedSkills.includes(id)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== id));
    } else if (selectedSkills.length < MAX_SKILLS) {
      setSelectedSkills([...selectedSkills, id]);
    } else {
      Alert.alert('Limit Reached', 'You can select maximum 3 skills.');
    }
  };

  const selectRole = (role: 'seeker' | 'provider') => {
    if (roleSelection !== role && Platform.OS !== 'web') Haptics.selectionAsync();
    setRoleSelection(role);
    setError('');
  };

  const handleNext = async () => {
    setError('');
    
    // Validate age
    if (parseInt(age, 10) < 18) {
      setError('You must be 18 years or older');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (step === 1 && roleSelection === 'seeker') {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(2);
      return;
    }

    // Otherwise, we finish (either step 2 for seeker, or step 1 for provider)
    handleFinish();
  };

  const handleFinish = async () => {
    if (isLoading) return;

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError('');

    try {
      const phoneE164 = `+91${phone}`;

      const { locked, lockUntil } = await recordOtpRequest();
      if (locked && lockUntil) {
        throw { code: 'auth/too-many-requests', message: 'Maximum retries exceeded.' };
      }

      console.log("Sending OTP for new user:", phoneE164);
      const verificationId = await firebaseAuth.sendOtp(phoneE164);

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Convert skills to names
      const skillNames = SKILLS
        .filter((s) => selectedSkills.includes(s.id))
        .map((s) => s.name.toLowerCase());

      router.push({
        pathname: '/(auth)/verify',
        params: {
          phone,
          isNewUser: 'true',
          verificationId,
          profileName: name.trim(),
          profileAge: age,
          profileRole: roleSelection,
          profileSkills: JSON.stringify(skillNames),
        },
      });
    } catch (err: any) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const mappedMsg = firebaseAuth.parseFirebaseError(err.code) || err.message;
      setError(mappedMsg || 'Failed to send OTP. Please try again.');
      Alert.alert("Error", `${err.code ? `${err.code}\n` : ''}${mappedMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Cinematic Breathing Backgrounds */}
      <BreathingBlob color="rgba(255,107,0,0.15)" size={280} top={-50} right={-100} />
      <BreathingBlob color="rgba(59,130,246,0.1)" size={220} bottom={100} left={-50} delay={1500} />

      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

          {step === 1 ? (
            <Animated.View key="step1" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
              <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
                <Text style={styles.stepIndicator}>Step 1 of {roleSelection === 'provider' ? '1' : '2'}</Text>
                <Text style={styles.title}>Registration Details</Text>
                <Text style={styles.subtitle}>Let's get to know you</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.form}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={name}
                    onChangeText={setName}
                    selectionColor={Colors.saffron}
                  />
                </View>

                {/* Age */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Age"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    maxLength={2}
                    value={age}
                    onChangeText={(text) => {
                      setAge(text);
                      setError('');
                    }}
                    selectionColor={Colors.saffron}
                  />
                </View>

                {/* Role */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>I want to...</Text>
                  <View style={styles.roleRow}>
                    <Pressable
                      style={[styles.roleCard, roleSelection === 'seeker' && styles.roleCardActive]}
                      onPress={() => selectRole('seeker')}
                    >
                      <Ionicons name="search-outline" size={28} color={roleSelection === 'seeker' ? '#FFFFFF' : '#64748B'} />
                      <Text style={[styles.roleText, roleSelection === 'seeker' && styles.roleTextActive]}>FIND WORK</Text>
                      <Text style={[styles.roleSubtext, roleSelection === 'seeker' && styles.roleTextActive]}>Seeker</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.roleCard, roleSelection === 'provider' && styles.roleCardActive]}
                      onPress={() => selectRole('provider')}
                    >
                      <Ionicons name="construct-outline" size={28} color={roleSelection === 'provider' ? '#FFFFFF' : '#64748B'} />
                      <Text style={[styles.roleText, roleSelection === 'provider' && styles.roleTextActive]}>HIRE WORKERS</Text>
                      <Text style={[styles.roleSubtext, roleSelection === 'provider' && styles.roleTextActive]}>Provider</Text>
                    </Pressable>
                  </View>
                </View>

              </Animated.View>

              <View style={styles.spacer} />

              <Animated.View entering={FadeInDown.delay(300).duration(600).springify()} style={styles.footer}>
                {!!error && (
                  <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
                    {error}
                  </Animated.Text>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.continueBtn,
                    (!isStep1Complete || isLoading) && styles.continueBtnDisabled,
                    pressed && isStep1Complete && styles.continueBtnPressed,
                  ]}
                  onPress={handleNext}
                  disabled={!isStep1Complete || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.continueBtnText}>Continue →</Text>
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>
          ) : (
            <Animated.View key="step2" entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
              <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
                <Pressable onPress={() => setStep(1)} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.stepIndicator}>Step 2 of 2</Text>
                <Text style={styles.title}>Select your skills</Text>
                <Text style={styles.subtitle}>Choose up to 3 skills</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.form}>
                <View style={styles.skillsGrid}>
                  {SKILLS.map((skill) => (
                    <SkillChip
                      key={skill.id}
                      skill={skill}
                      isSelected={selectedSkills.includes(skill.id)}
                      isDisabled={selectedSkills.length >= MAX_SKILLS}
                      onToggle={() => toggleSkill(skill.id)}
                    />
                  ))}
                </View>
              </Animated.View>

              <View style={styles.spacer} />

              <Animated.View entering={FadeInUp.delay(200).duration(600).springify()} style={styles.footer}>
                {!!error && (
                  <Animated.Text entering={FadeInDown.duration(300)} style={styles.errorText}>
                    {error}
                  </Animated.Text>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.continueBtn,
                    (!isStep2Complete || isLoading) && styles.continueBtnDisabled,
                    pressed && isStep2Complete && styles.continueBtnPressed,
                  ]}
                  onPress={handleFinish}
                  disabled={!isStep2Complete || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.continueBtnText}>Continue →</Text>
                  )}
                </Pressable>
              </Animated.View>
            </Animated.View>
          )}

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#050505' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  stepContainer: { flex: 1 },

  header: {
    marginBottom: 32,
  },
  backBtn: {
    marginBottom: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodySemiBold }),
    fontSize: 14,
    color: Colors.saffron,
    marginBottom: 8,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 36,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },

  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16, // Rounded
    paddingHorizontal: 16,
    height: 56, // Large
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },

  roleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  roleCard: {
    flex: 1,
    height: 120,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  roleCardActive: {
    borderColor: Colors.saffron,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    transform: [{ scale: 1.02 }],
  },
  roleText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.headingBold }),
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  roleSubtext: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 13,
    color: '#64748B',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },

  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChipWrapper: {
    width: '31%', // roughly 3 per row
  },
  skillChip: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#333333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  skillEmoji: {
    fontSize: 22,
  },
  skillName: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodySemiBold }),
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  spacer: {
    flex: 1,
    minHeight: 40,
  },
  footer: {
    marginTop: 'auto',
  },
  errorText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.body }),
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  continueBtn: {
    backgroundColor: '#333333',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    transform: [{ scale: 0.98 }],
  },
  continueBtnText: {
    fontFamily: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: FontFamily.bodySemiBold }),
    fontSize: 18,
    color: '#FFFFFF',
  },
});

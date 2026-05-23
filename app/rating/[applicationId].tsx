import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';

const RATING_TAGS = {
  employer: [
    'Paid on time',
    'Friendly',
    'Work as described',
    'Would hire again',
    'Safe workplace',
  ],
  worker: [
    'Punctual',
    'Hard worker',
    'Honest',
    'Reliable',
    'Would hire again',
  ],
};

export default function RatingScreen() {
  const [stars, setStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for demo
  const targetType: 'worker' | 'employer' = 'worker';
  const targetName = 'Ramesh Kumar';
  const jobTitle = 'Delivery Partner Needed';
  const tagsList = RATING_TAGS[targetType];

  const handleToggleTag = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (stars === 0) {
      Alert.alert('Rating Required', 'Please select a star rating first.');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ backgroundColor: Colors.navy }}>
        <TopBar title="Rate Experience" showBack showPostJob={false} />
      </SafeAreaView>

      <View style={styles.content}>
        <View style={styles.headerBox}>
          <Text style={styles.headerLabel}>Rating {targetType === 'worker' ? 'Worker' : 'Employer'}</Text>
          <Text style={styles.targetName}>{targetName}</Text>
          <Text style={styles.jobTitle}>For job: {jobTitle}</Text>
        </View>

        {/* Stars */}
        <Animated.View entering={FadeInDown.springify()} style={styles.starsContainer}>
          <Text style={styles.starsPrompt}>How was your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setStars(s);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.star, stars >= s ? styles.starActive : styles.starInactive]}>
                  {stars >= s ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.starsLabel}>
            {stars === 1 ? 'Terrible 😞' :
             stars === 2 ? 'Poor 😕' :
             stars === 3 ? 'Okay 😐' :
             stars === 4 ? 'Good 🙂' :
             stars === 5 ? 'Excellent! 🤩' : 'Select rating'}
          </Text>
        </Animated.View>

        {/* Tags */}
        {stars > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>What stood out?</Text>
            <View style={styles.tagsContainer}>
              {tagsList.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, active && styles.tagActive]}
                    onPress={() => handleToggleTag(tag)}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Review input */}
        {stars > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
            <Text style={styles.sectionLabel}>Write a review (Optional)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Share details about your experience..."
              placeholderTextColor={Colors.gray3}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Animated.View>
        )}

        <View style={styles.spacer} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, stars === 0 && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={stars === 0 || isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, padding: 20 },
  headerBox: {
    backgroundColor: Colors.gray1,
    padding: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.gray4, textTransform: 'uppercase', letterSpacing: 0.5 },
  targetName: { fontFamily: FontFamily.headingBold, fontSize: FontSize['3xl'], color: Colors.ink, marginTop: 4, marginBottom: 2 },
  jobTitle: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.ink2 },
  starsContainer: { alignItems: 'center', marginBottom: 32 },
  starsPrompt: { fontFamily: FontFamily.headingBold, fontSize: FontSize.xl, color: Colors.ink, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  star: { fontSize: 48 },
  starActive: { opacity: 1 },
  starInactive: { color: Colors.gray3 },
  starsLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.saffron },
  section: { marginBottom: 24 },
  animateIn: { /* Could add entry animation here */ },
  sectionLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.ink2, marginBottom: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  tagActive: { borderColor: Colors.saffron, backgroundColor: Colors.saffronLight },
  tagText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.base, color: Colors.ink2 },
  tagTextActive: { color: Colors.saffronDark, fontFamily: FontFamily.bodySemiBold },
  textarea: {
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.sm,
    padding: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    minHeight: 100,
    backgroundColor: Colors.gray1,
  },
  spacer: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  skipBtn: {
    flex: 0.3,
    paddingVertical: 15,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.gray4 },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.saffron,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.xl, color: Colors.white },
});

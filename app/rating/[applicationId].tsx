import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '../../src/utils/navigation';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';

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

  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const { user } = useAuthStore();
  const [targetType, setTargetType] = useState<'worker' | 'employer'>('worker');
  const [targetName, setTargetName] = useState('Loading...');
  const [jobTitle, setJobTitle] = useState('Loading...');
  const [targetId, setTargetId] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs(title, provider_id),
          seeker:users!seeker_id(name),
          provider:users!jobs!job_applications_job_id_fkey(name)
        `)
        .eq('id', applicationId)
        .single();
        
      if (!error && data) {
        const d = data as any;
        setJobTitle(d.job?.title || 'Job');
        // If current user is the provider, we are rating the worker (seeker)
        if (user?.id === d.job?.provider_id) {
          setTargetType('worker');
          setTargetName(d.seeker?.name || 'Worker');
          setTargetId(d.applicant_id);
        } else {
          // We are rating the employer
          setTargetType('employer');
          // In this simple query, we need to fetch provider name separately if it didn't join well
          const { data: prov } = await supabase.from('users').select('name').eq('id', d.job?.provider_id).single();
          setTargetName(prov?.name || 'Employer');
          setTargetId(d.job?.provider_id);
        }
        
        // Stash job ID for our API call
        (global as any).currentRatingJobId = d.job_id;
      }
    };
    if (applicationId && user?.id) fetchDetails();
  }, [applicationId, user]);

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
    if (reviewText.length < 20) {
      Alert.alert('Review Too Short', 'Please write at least 20 characters detailing your experience.');
      return;
    }
    if (!targetId || !user?.id) return;
    
    setIsSubmitting(true);
    
    // Construct full review text including tags
    const fullReview = selectedTags.length > 0 
      ? `[Tags: ${selectedTags.join(', ')}] ${reviewText}` 
      : reviewText;
      
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to_user_id: targetId,
          job_id: (global as any).currentRatingJobId,
          application_id: applicationId,
          rating: stars,
          review: fullReview
        })
      });

      const result = await response.json();
      setIsSubmitting(false);

      if (!response.ok || !result.success) {
        Alert.alert('Notice', result.error || 'Failed to submit review');
        if (result.error?.includes('already rated')) {
          safeGoBack();
        }
      } else {
        Alert.alert('Success', 'Thank you for your feedback!');
        safeGoBack();
      }
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Network error while submitting rating.');
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report User',
      'What is the reason for reporting this user?',
      [
        { text: 'Fraud / Scam', onPress: () => submitReport('fraud') },
        { text: 'No-Show', onPress: () => submitReport('no-show') },
        { text: 'Unsafe Behavior', onPress: () => submitReport('unsafe') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      await fetch(`${apiUrl}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reported_user_id: targetId,
          job_id: (global as any).currentRatingJobId,
          application_id: applicationId,
          reason,
          details: 'Reported from rating screen.'
        })
      });
      Alert.alert('Reported', 'Our trust & safety team will review this shortly.');
    } catch (e) {
      Alert.alert('Error', 'Could not submit report.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      
        <TopBar title="Rate Experience" showBack showPostJob={false} />
      

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
            <Text style={styles.sectionLabel}>Write a review (Required)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Share details about your experience... (Min 20 characters)"
              placeholderTextColor={Colors.gray3}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={{ fontSize: FontSize.sm, color: reviewText.length < 20 ? Colors.red : Colors.green, marginTop: 8 }}>
              {reviewText.length}/20 characters
            </Text>
          </Animated.View>
        )}

        <View style={styles.spacer} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleReport}
          >
            <Text style={styles.skipText}>Report User</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, (stars === 0 || reviewText.length < 20) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={stars === 0 || reviewText.length < 20 || isSubmitting}
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

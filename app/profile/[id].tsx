import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeGoBack } from '../../src/utils/navigation';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {  } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../src/theme';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../src/services/userService';
import type { User } from '../../src/types';
import { ActivityIndicator, Linking, FlatList } from 'react-native';
import { useApplicationStore } from '../../src/store/applicationStore';
import { supabase } from '../../src/services/supabase';
import { calculateTrustScore, getTrustBadgeEmoji, getTrustScoreColor } from '../../src/utils/trustScore';

export default function ProfilePreviewScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  
  const { myApplications, receivedApplications } = useApplicationStore();

  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: () => userService.getUserById(id as string),
    enabled: !!id,
  });

  React.useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      const { data } = await supabase
        .from('reviews')
        .select(`
          id, rating, review, created_at,
          reviewer:users!from_user_id(name)
        `)
        .eq('to_user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setRecentReviews(data);
    };
    fetchReviews();
  }, [id]);
  
  if (isLoading || !user) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.saffron} />
      </View>
    );
  }

  const roleLabel = user.role?.toUpperCase() || 'SEEKER';
  
  const isProviderProfile = id?.toString().startsWith('p') || user.role === 'provider';
  
  // Check if contact info should be unlocked (accepted application exists between them)
  const isUnlocked = isProviderProfile 
    ? myApplications.some(app => app.job?.poster_id === id && app.status === 'accepted')
    : receivedApplications.some(app => app.applicant_id === id && app.status === 'accepted');

  const displayProfile = {
    name: user.name || 'Anonymous User',
    avatar: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`,
    role: roleLabel,
    phone: user.phone,
    rating: user.worker_rating || 0,
    reviews: user.total_reviews || 0,
    completedJobs: user.jobs_completed || 0,
    isVerified: user.is_verified || false,
    skills: user.skills || [],
    languages: [user.language === 'hi' ? 'Hindi' : user.language === 'te' ? 'Telugu' : 'English'],
    memberSince: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    locationName: user.location_name || 'Location N/A',
    trustScore: user.trust_score !== undefined ? user.trust_score : calculateTrustScore(user),
  };

  return (
    <View style={styles.screen}>
      
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.springify()} style={[styles.profileCard, Shadow.md]}>
          <Image source={{ uri: displayProfile.avatar }} style={styles.avatarLarge} />
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{displayProfile.name}</Text>
            {displayProfile.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.blue} style={{ marginLeft: 4 }} />
            )}
          </View>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{displayProfile.role}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
            <Ionicons name="location-outline" size={16} color={Colors.gray4} style={{ marginRight: 4 }} />
            <Text style={{ fontFamily: FontFamily.body, color: Colors.gray4, fontSize: 13 }}>{displayProfile.locationName}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {displayProfile.rating.toFixed(1)} <Ionicons name="star" size={16} color={Colors.gold} />
              </Text>
              <Text style={styles.statLabel}>{displayProfile.reviews} Reviews</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{displayProfile.completedJobs}</Text>
              <Text style={styles.statLabel}>{isProviderProfile ? 'Seekers Hired' : 'Jobs Completed'}</Text>
            </View>
          </View>

          {isUnlocked && (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.saffronLight, paddingVertical: 12, paddingHorizontal: 24, borderRadius: Radius.round, marginTop: Spacing.lg, gap: 8 }}
              onPress={() => Linking.openURL(`tel:${displayProfile.phone}`)}
            >
              <Ionicons name="call" size={18} color={Colors.saffronDark} />
              <Text style={{ fontFamily: FontFamily.headingBold, color: Colors.saffronDark }}>Call {displayProfile.phone}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Skills & Details */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.detailsCard, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Skills</Text>
          {displayProfile.skills.length > 0 ? (
            <View style={styles.chipRow}>
              {displayProfile.skills.map(skill => (
                <View key={skill} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: FontFamily.body, color: Colors.gray4 }}>No skills listed.</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Languages</Text>
          <View style={styles.chipRow}>
            {displayProfile.languages.map(lang => (
              <View key={lang} style={[styles.chip, { backgroundColor: Colors.gray1 }]}>
                <Text style={styles.chipText}>{lang}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.gray4} />
            <Text style={styles.infoText}>Member since {displayProfile.memberSince}</Text>
          </View>

          {/* Contact Actions (Unlocked when Accepted) */}
          {isUnlocked ? (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => Linking.openURL(`tel:${displayProfile.phone}`)}
              >
                <Ionicons name="call" size={20} color={Colors.white} />
                <Text style={styles.actionText}>Call {displayProfile.phone}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.lockedBox}>
              <Ionicons name="lock-closed" size={24} color={Colors.gray4} />
              <Text style={styles.lockedText}>Contact info hidden. Accept an application to view.</Text>
            </View>
          )}

          {/* Trust Score & Badges */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginTop: 24, padding: 16, backgroundColor: Colors.gray1, borderRadius: Radius.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink }}>Trust Score</Text>
              <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 28, color: getTrustScoreColor(displayProfile.trustScore) }}>
                {displayProfile.trustScore.toFixed(0)} <Text style={{ fontSize: 20 }}>{getTrustBadgeEmoji(displayProfile.trustScore)}</Text>
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
        
        {/* Recent Feedback */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginBottom: 12 }]}>Recent Feedback</Text>
          
          {recentReviews.length > 0 ? (
            <View style={[styles.detailsCard, Shadow.sm, { padding: 0, overflow: 'hidden' }]}>
              {recentReviews.map((review, idx) => (
                <React.Fragment key={review.id}>
                  <View style={styles.feedbackItem}>
                    <View style={styles.feedbackHeader}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons 
                          key={star} 
                          name={star <= review.rating ? "star" : "star-outline"} 
                          size={14} 
                          color={Colors.gold} 
                        />
                      ))}
                    </View>
                    <Text style={styles.feedbackText}>"{review.review}"</Text>
                    <Text style={styles.feedbackAuthor}>- {(review.reviewer as any)?.name || 'User'}</Text>
                  </View>
                  {idx < recentReviews.length - 1 && <View style={styles.dividerH} />}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={[styles.detailsCard, Shadow.sm, { alignItems: 'center', paddingVertical: 24 }]}>
              <Text style={{ fontFamily: FontFamily.body, color: Colors.gray4 }}>No reviews yet.</Text>
            </View>
          )}
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.navy,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
  content: {
    padding: 16,
    paddingTop: 32,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginTop: 20,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray2,
    marginTop: -50,
    borderWidth: 4,
    borderColor: Colors.white,
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  roleBadge: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
  },
  roleBadgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkSubtle,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.gray2,
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  sectionTitle: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.saffronLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.round,
  },
  chipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
  },
  infoText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.ink2,
    marginLeft: 8,
  },
  feedbackItem: {
    padding: 16,
    backgroundColor: Colors.white,
  },
  feedbackHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  feedbackText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    color: Colors.ink,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  feedbackAuthor: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.gray4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    gap: 8,
  },
  callBtn: {
    flex: 1,
    backgroundColor: Colors.saffron,
    ...Shadow.sm,
  },
  actionText: {
    fontFamily: FontFamily.headingBold,
    color: Colors.white,
    fontSize: FontSize.md,
  },
  lockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray1,
    padding: 16,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    gap: 12,
  },
  lockedText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    flex: 1,
  },
  dividerH: {
    height: 1,
    backgroundColor: Colors.gray2,
    width: '100%',
  },
});

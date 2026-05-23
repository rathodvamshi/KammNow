import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../src/theme';

export default function ProfilePreviewScreen() {
  const { id } = useLocalSearchParams();
  
  // MOCK DATA based on ID (In a real app, fetch from userStore or API)
  const isProvider = id?.toString().startsWith('p');
  const roleLabel = isProvider ? 'PROVIDER' : 'SEEKER';
  
  const mockProfile = {
    name: isProvider ? 'Ramesh Singh' : 'Rahul Kumar',
    avatar: `https://i.pravatar.cc/300?u=${id}`,
    role: roleLabel,
    rating: 4.8,
    reviews: 124,
    completedJobs: 45,
    isVerified: true,
    skills: isProvider ? ['Event Management', 'Catering'] : ['Driving', 'Delivery', 'Warehouse'],
    languages: ['English', 'Hindi', 'Telugu'],
    memberSince: 'March 2024',
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.navy }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.springify()} style={[styles.profileCard, Shadow.md]}>
          <Image source={{ uri: mockProfile.avatar }} style={styles.avatarLarge} />
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{mockProfile.name}</Text>
            {mockProfile.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.blue} style={{ marginLeft: 4 }} />
            )}
          </View>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{mockProfile.role}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {mockProfile.rating} <Ionicons name="star" size={16} color={Colors.gold} />
              </Text>
              <Text style={styles.statLabel}>{mockProfile.reviews} Reviews</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{mockProfile.completedJobs}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
          </View>
        </Animated.View>

        {/* Skills & Details */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.detailsCard, Shadow.sm]}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.chipRow}>
            {mockProfile.skills.map(skill => (
              <View key={skill} style={styles.chip}>
                <Text style={styles.chipText}>{skill}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Languages</Text>
          <View style={styles.chipRow}>
            {mockProfile.languages.map(lang => (
              <View key={lang} style={[styles.chip, { backgroundColor: Colors.gray1 }]}>
                <Text style={styles.chipText}>{lang}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.gray4} />
            <Text style={styles.infoText}>Member since {mockProfile.memberSince}</Text>
          </View>
        </Animated.View>
        
        {/* Recent Feedback */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginBottom: 12 }]}>Recent Feedback</Text>
          <View style={[styles.detailsCard, Shadow.sm, { padding: 0, overflow: 'hidden' }]}>
            <View style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
              </View>
              <Text style={styles.feedbackText}>"Very punctual and hardworking. Completed the job before time!"</Text>
              <Text style={styles.feedbackAuthor}>- Provider 002</Text>
            </View>
            <View style={styles.dividerH} />
            <View style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Ionicons name="star-outline" size={14} color={Colors.gold} />
              </View>
              <Text style={styles.feedbackText}>"Good behavior and followed instructions perfectly."</Text>
              <Text style={styles.feedbackAuthor}>- Provider 089</Text>
            </View>
          </View>
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
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.gray5,
    textAlign: 'right',
  },
  dividerH: {
    height: 1,
    backgroundColor: Colors.gray2,
    width: '100%',
  },
});

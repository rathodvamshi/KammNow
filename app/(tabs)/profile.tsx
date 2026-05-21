import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Animated,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow } from '../../src/theme';
import { Avatar } from '../../src/components/atoms/Avatar';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { useAuthStore } from '../../src/store/authStore';
import { MOCK_RATINGS } from '../../src/services/mockData';

const { width } = Dimensions.get('window');
const TABS = ['Overview', 'Skills', 'Reviews'];
const TAB_WIDTH = (width - 32) / 3;

const SKILL_OPTIONS = [
  'Delivery', 'Driver', 'Shop Helper', 'Labour', 'Events',
  'Restaurant', 'Construction', 'Cleaning', 'Security', 'Other',
];

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit State
  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(String(user?.age ?? ''));
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [locationName, setLocationName] = useState(user?.location_name ?? '');

  // Animation Refs
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleTabPress = (index: number) => {
    // Fade out content
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(index);
      // Fade in content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    // Move Indicator
    Animated.spring(tabIndicatorPos, {
      toValue: index * TAB_WIDTH,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const handleSave = () => {
    updateUser({ name, age: parseInt(age) || undefined, skills, location_name: locationName });
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/splash'); } },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${user?.name}'s professional profile on KaamNow!`,
      });
    } catch (error) {
      console.log('Share failed', error);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  // Rating Stats
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star, count: MOCK_RATINGS.filter((r) => r.stars === star).length,
  }));
  const maxCount = Math.max(...starCounts.map((s) => s.count), 1);

  // --- Render Functions ---

  const renderOverview = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.statsGrid}>
        <View style={styles.statBoxLarge}>
          <Ionicons name="briefcase" size={24} color={Colors.saffron} />
          <Text style={styles.statBoxLargeVal}>{user?.jobs_completed ?? 0}</Text>
          <Text style={styles.statBoxLargeLbl}>Jobs Completed</Text>
        </View>
        <View style={styles.statBoxLarge}>
          <Ionicons name="star" size={24} color={Colors.gold} />
          <Text style={styles.statBoxLargeVal}>{user?.worker_rating?.toFixed(1) ?? '0.0'}</Text>
          <Text style={styles.statBoxLargeLbl}>Worker Rating</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
        </View>
        
        {[
          { icon: 'person-outline', label: 'Full Name', value: name, editable: true, onEdit: setName },
          { icon: 'calendar-outline', label: 'Age', value: age, editable: true, onEdit: setAge, numeric: true },
          { icon: 'call-outline', label: 'Phone', value: user?.phone ?? '+91 ---', editable: false, note: 'Contact support to change' },
          { icon: 'location-outline', label: 'Location', value: locationName, editable: true, onEdit: setLocationName },
        ].map((row, idx) => (
          <View key={idx} style={[styles.infoRow, idx === 3 && { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name={row.icon as any} size={18} color={Colors.navy} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              {isEditing && row.editable ? (
                <TextInput
                  style={styles.infoInput}
                  value={row.value}
                  onChangeText={row.onEdit}
                  keyboardType={(row as any).numeric ? 'number-pad' : 'default'}
                  placeholder={`Enter ${row.label.toLowerCase()}`}
                />
              ) : (
                <Text style={styles.infoValue}>{row.value || 'Not provided'}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.red} />
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderSkills = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expertise</Text>
          {isEditing && <Text style={styles.sectionSubtitle}>Tap to select</Text>}
        </View>
        <View style={styles.skillsContainer}>
          {SKILL_OPTIONS.map((skill) => {
            const active = skills.includes(skill);
            if (!isEditing && !active) return null;
            return (
              <TouchableOpacity
                key={skill}
                style={[styles.skillPill, active && styles.skillPillActive]}
                onPress={() => isEditing && toggleSkill(skill)}
                disabled={!isEditing}
                activeOpacity={0.7}
              >
                {active && <Ionicons name="checkmark" size={14} color={Colors.saffronDark} style={{ marginRight: 4 }} />}
                <Text style={[styles.skillPillText, active && styles.skillPillTextActive]}>{skill}</Text>
              </TouchableOpacity>
            );
          })}
          {!isEditing && skills.length === 0 && (
            <Text style={styles.emptyText}>No skills added yet. Tap Edit Profile to add some.</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderReviews = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Rating Breakdown</Text>
        <View style={styles.ratingOverview}>
          <View style={styles.bigRatingBox}>
            <Text style={styles.bigRatingNum}>{user?.worker_rating?.toFixed(1) ?? '0.0'}</Text>
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons key={i} name={i < Math.round(user?.worker_rating ?? 0) ? "star" : "star-outline"} size={12} color={Colors.gold} />
              ))}
            </View>
            <Text style={styles.totalReviewsText}>{user?.total_reviews ?? 0} total</Text>
          </View>
          <View style={styles.barsContainer}>
            {starCounts.map(({ star, count }) => (
              <View key={star} style={styles.barRow}>
                <Text style={styles.barStarNum}>{star}</Text>
                <Ionicons name="star" size={10} color={Colors.gray3} />
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(count / maxCount) * 100}%` }]} />
                </View>
                <Text style={styles.barCountNum}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.reviewsTitle}>Recent Reviews</Text>
      {MOCK_RATINGS.map((rating) => (
        <View key={rating.id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Avatar name={rating.rater?.name} size="sm" />
            <View style={styles.reviewMeta}>
              <Text style={styles.reviewerName}>{rating.rater?.name}</Text>
              <Text style={styles.reviewDate}>{new Date(rating.created_at).toLocaleDateString('en-IN')}</Text>
            </View>
            <View style={styles.reviewStarsRight}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons key={i} name={i < rating.stars ? "star" : "star-outline"} size={12} color={Colors.gold} />
              ))}
            </View>
          </View>
          {rating.review_text && <Text style={styles.reviewText}>{rating.review_text}</Text>}
        </View>
      ))}
    </Animated.View>
  );

  return (
    <View style={styles.screen}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Cover Photo */}
        <View style={styles.coverPhoto}>
          <LinearGradient
            colors={['#1E293B', Colors.navy]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView>
            <View style={styles.coverNav}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings' as any)}>
                <Ionicons name="settings-outline" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Identity & Actions */}
        <View style={styles.identitySection}>
          <View style={styles.avatarWrapper}>
            <Avatar name={user?.name} size="xl" />
            <TouchableOpacity style={styles.camBadge}>
              <Ionicons name="camera" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.identityName}>{user?.name || 'Complete Profile'}</Text>
            {user?.is_verified && <Ionicons name="checkmark-circle" size={22} color={Colors.green} />}
          </View>
          <Text style={styles.identityLocation}>
            <Ionicons name="location" size={14} color={Colors.gray4} /> {user?.location_name || 'Add Location'}
          </Text>

          <View style={styles.actionButtonsRow}>
            {isEditing ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                <Ionicons name="checkmark" size={18} color={Colors.white} />
                <Text style={styles.primaryBtnText}>Save Changes</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={18} color={Colors.white} />
                <Text style={styles.primaryBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
              <Ionicons name="share-social" size={18} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs System */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            {TABS.map((tab, idx) => (
              <TouchableOpacity key={tab} style={styles.tabBtn} onPress={() => handleTabPress(idx)}>
                <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tabIndicatorContainer}>
            <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: tabIndicatorPos }] }]} />
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.contentWrapper}>
          {activeTab === 0 && renderOverview()}
          {activeTab === 1 && renderSkills()}
          {activeTab === 2 && renderReviews()}
        </View>

      </Animated.ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 100 },
  coverPhoto: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  coverNav: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? Spacing.xl : Spacing.sm,
  },
  settingsBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  identitySection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: -50, // Pulls the avatar up over the cover photo
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: Colors.background, // Match background to create cutout effect
    borderRadius: 100,
  },
  camBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.saffron,
    borderWidth: 3, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm,
  },
  identityName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 26, color: Colors.ink,
  },
  identityLocation: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md, color: Colors.gray4,
    marginTop: 2, marginBottom: Spacing.lg,
  },
  actionButtonsRow: {
    flexDirection: 'row', gap: Spacing.md, width: '100%',
    marginBottom: Spacing.xl,
  },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.navy,
    paddingVertical: 14, borderRadius: Radius.round,
    ...Shadow.sm,
  },
  primaryBtnText: {
    fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.white,
  },
  secondaryBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  tabsContainer: {
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.gray2,
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tabBtn: {
    width: TAB_WIDTH,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md, color: Colors.gray4,
  },
  tabTextActive: { color: Colors.navy },
  tabIndicatorContainer: {
    height: 3, width: '100%',
  },
  tabIndicator: {
    height: '100%', width: TAB_WIDTH,
    backgroundColor: Colors.navy,
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },
  contentWrapper: {
    padding: Spacing.lg,
    minHeight: 400,
  },
  tabContent: { flex: 1 },
  statsGrid: {
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg,
  },
  statBoxLarge: {
    flex: 1, backgroundColor: Colors.white,
    padding: Spacing.lg, borderRadius: Radius.xl,
    alignItems: 'center', ...Shadow.sm,
    borderWidth: 1, borderColor: Colors.gray1,
  },
  statBoxLargeVal: {
    fontFamily: FontFamily.headingBold, fontSize: 24, color: Colors.ink,
    marginTop: 8,
  },
  statBoxLargeLbl: {
    fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.gray4,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.lg, ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink,
  },
  sectionSubtitle: {
    fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.gray1,
  },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: {
    fontFamily: FontFamily.body, fontSize: 12, color: Colors.gray4, marginBottom: 2,
  },
  infoValue: {
    fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink,
  },
  infoInput: {
    borderWidth: 1, borderColor: Colors.saffron, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
    fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink,
    backgroundColor: Colors.saffronLight, marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.redLight,
    ...Shadow.sm,
  },
  logoutBtnText: {
    fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.red,
  },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.gray1, borderWidth: 1, borderColor: Colors.gray2,
  },
  skillPillActive: { backgroundColor: Colors.saffronLight, borderColor: Colors.saffron },
  skillPillText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.gray4 },
  skillPillTextActive: { color: Colors.saffronDark, fontFamily: FontFamily.bodySemiBold },
  emptyText: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.gray4, fontStyle: 'italic' },
  ratingOverview: { flexDirection: 'row', gap: 20, alignItems: 'center', marginTop: Spacing.md },
  bigRatingBox: { alignItems: 'center', minWidth: 90 },
  bigRatingNum: { fontFamily: FontFamily.headingBold, fontSize: 48, color: Colors.ink, lineHeight: 52 },
  starsRow: { flexDirection: 'row', gap: 2, marginVertical: 4 },
  totalReviewsText: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.gray4 },
  barsContainer: { flex: 1, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barStarNum: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.gray4 },
  barTrack: { flex: 1, height: 6, backgroundColor: Colors.gray2, borderRadius: 3 },
  barFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  barCountNum: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4, width: 20, textAlign: 'right' },
  reviewsTitle: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink, marginBottom: Spacing.sm },
  reviewCard: {
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.gray1,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewMeta: { flex: 1, marginLeft: 10 },
  reviewerName: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink },
  reviewDate: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.gray4 },
  reviewStarsRight: { flexDirection: 'row', gap: 2 },
  reviewText: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.ink2, lineHeight: 20 },
});

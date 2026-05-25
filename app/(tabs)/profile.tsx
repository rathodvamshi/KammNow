import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow } from '../../src/theme';
import { Avatar } from '../../src/components/atoms/Avatar';
import { BlurView } from 'expo-blur';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useApplicationStore } from '../../src/store/applicationStore';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { TrustScoreRing } from '../../src/components/molecules/TrustScoreRing';
import { calculateTrustScore, generateBadges } from '../../src/utils/trustScore';

const { width } = Dimensions.get('window');

const SKILL_OPTIONS = [
  'Delivery', 'Driver', 'Shop Helper', 'Labour', 'Events',
  'Restaurant', 'Construction', 'Cleaning', 'Security', 'Other',
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuthStore();
  const { currentRole, showToast } = useUIStore();
  const { myApplications } = useApplicationStore();
  const isSeeker = currentRole === 'seeker';

  // Compute Verified Skills based on completed jobs
  const verifiedSkills = React.useMemo(() => {
    const skills = new Set<string>();
    myApplications.forEach(app => {
      if (app.status === 'completed' && app.job?.required_skills) {
        app.job.required_skills.forEach(s => skills.add(s));
      }
    });
    return Array.from(skills);
  }, [myApplications]);

  const TABS = isSeeker ? ['Overview', 'Earnings', 'Reviews'] : ['Company', 'Listings', 'Team'];
  const tabWidth = (width - 32) / TABS.length;

  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // Seeker Edit State
  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(String(user?.age ?? ''));
  const [bio, setBio] = useState(user?.bio ?? '');
  const [language, setLanguage] = useState(user?.language ?? 'en');
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [locationName, setLocationName] = useState(user?.location_name ?? '');

  // Provider Edit State
  const [companyName, setCompanyName] = useState('Sai Enterprises');
  const [businessCategory, setBusinessCategory] = useState('Retail & Logistics');
  const [branchLocation, setBranchLocation] = useState('Ameerpet, Hyderabad');
  const [gstin, setGstin] = useState('36AAAAA1111A1Z1');

  // Animation Refs
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Reset tab index on role switch to avoid out of bounds
  useEffect(() => {
    setActiveTab(0);
    tabIndicatorPos.setValue(0);
  }, [currentRole]);

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
      toValue: index * tabWidth,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const handleSave = () => {
    if (isSeeker) {
      updateUser({ name, age: parseInt(age) || undefined, bio, language: language as any, skills, location_name: locationName });
    } else {
      showToast('Company profile details updated', 'success');
    }
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/phone');
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${isSeeker ? user?.name : companyName}'s professional profile on KaamNow!`,
      });
    } catch (error) {
      console.log('Share failed', error);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  // Rating Stats
  const MOCK_RATINGS: any[] = [];
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star, count: MOCK_RATINGS.filter((r) => r.stars === star).length,
  }));
  const maxCount = Math.max(...starCounts.map((s) => s.count), 1);

  // --- Render Functions (Seeker) ---

  const renderOverview = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* Seeker Greeting inside Seeker Profile */}
      <View style={styles.seekerGreetingCard}>
        <Text style={styles.seekerGreetingText}>Good Morning, Raju 👋</Text>
        <Text style={styles.seekerSubText}>Your profile is looking great today</Text>
      </View>

      {/* Seeker Completeness Progress Setup inside Seeker Profile */}
      <View style={styles.seekerProgressCard}>
        <View style={styles.progressCardHeader}>
          <Text style={styles.progressCardTitle}>📈 Complete Profile Setup</Text>
          <Text style={styles.progressPercent}>80% Completed</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '80%' }]} />
        </View>
        <Text style={styles.progressTip}>Almost done! Add work history to secure gigs 3x faster.</Text>
      </View>

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
          { icon: 'document-text-outline', label: 'Bio', value: bio, editable: true, onEdit: setBio },
          { icon: 'language-outline', label: 'Language', value: language, editable: true, onEdit: setLanguage },
          { icon: 'call-outline', label: 'Phone', value: user?.phone ?? '+91 ---', editable: false, note: 'Contact support to change' },
          { icon: 'location-outline', label: 'Location', value: locationName, editable: true, onEdit: setLocationName },
        ].map((row, idx) => (
          <View key={idx} style={[styles.infoRow, idx === 5 && { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name={row.icon as any} size={18} color={Colors.navy} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              {isEditing && row.editable ? (
                <TextInput
                  style={styles.infoInput}
                  value={row.value}
                  onChangeText={row.onEdit as any}
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

      {/* Expertise / Skills moved into Overview */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expertise</Text>
          {isEditing && <Text style={styles.sectionSubtitle}>Tap to select</Text>}
        </View>
        <View style={styles.skillsContainer}>
          {SKILL_OPTIONS.map((skill) => {
            const active = skills.includes(skill);
            const isVerified = verifiedSkills.includes(skill);
            
            if (!isEditing && !active) return null;
            return (
              <TouchableOpacity
                key={skill}
                style={[styles.skillPill, active && styles.skillPillActive, isVerified && !isEditing && { borderColor: Colors.green, backgroundColor: Colors.green + '1A' }]}
                onPress={() => isEditing && toggleSkill(skill)}
                disabled={!isEditing}
                activeOpacity={0.7}
              >
                {isVerified && !isEditing ? (
                  <Ionicons name="shield-checkmark" size={14} color={Colors.green} style={{ marginRight: 4 }} />
                ) : active && isEditing ? (
                  <Ionicons name="checkmark" size={14} color={Colors.saffronDark} style={{ marginRight: 4 }} />
                ) : null}
                <Text style={[styles.skillPillText, active && styles.skillPillTextActive, isVerified && !isEditing && { color: Colors.green }]}>
                  {skill}
                </Text>
              </TouchableOpacity>
            );
          })}
          {!isEditing && skills.length === 0 && (
            <Text style={styles.emptyText}>No skills added yet. Tap Edit Profile to add some.</Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.red} />
        <Text style={styles.logoutBtnText}>Logout</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEarnings = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* Total Earnings Balance Card */}
      <View style={[styles.seekerEarningsBalanceCard, Shadow.md]}>
        <Text style={styles.earningsLabel}>TOTAL LIFE-TIME EARNINGS</Text>
        <Text style={styles.earningsBalanceValue}>₹2,550</Text>
        <View style={styles.earningsDivider} />
        <View style={styles.earningsRow}>
          <View>
            <Text style={styles.earningSubLabel}>Current Month</Text>
            <Text style={styles.earningSubVal}>₹1,050</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View>
            <Text style={styles.earningSubLabel}>Pending Clearance</Text>
            <Text style={[styles.earningSubVal, { color: Colors.gold }]}>₹450</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.earningsWithdrawBtn}
          onPress={() => showToast('Withdrawal successful! Amount credited to your UPI ID.', 'success')}
        >
          <Text style={styles.earningsWithdrawText}>Withdraw to UPI / Bank ⚡</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.earningsHistoryTitle}>Earning Transactions</Text>
      <View style={styles.earningsHistoryList}>
        {[
          { id: 'earn-001', jobTitle: 'Store Delivery Gig', date: 'May 18, 2026', amount: '₹450', status: 'Pending' },
          { id: 'earn-002', jobTitle: 'Festival Event Host', date: 'May 12, 2026', amount: '₹1,500', status: 'Paid' },
          { id: 'earn-003', jobTitle: 'Boutique Delivery Assistant', date: 'May 08, 2026', amount: '₹600', status: 'Paid' },
        ].map((earn, index) => (
          <Reanimated.View entering={FadeInDown.delay(index * 150).springify()} key={earn.id} style={[styles.earningRowCard, Shadow.xs]}>
            <View style={styles.earningIconWrap}>
              <Ionicons name={earn.status === 'Paid' ? "cash-outline" : "time-outline"} size={20} color={earn.status === 'Paid' ? Colors.green : Colors.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.earningCardTitle}>{earn.jobTitle}</Text>
              <Text style={styles.earningCardDate}>{earn.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.earningCardAmount}>{earn.amount}</Text>
              <View style={styles.earningCardStatus}>
                <View style={[styles.liveDotCircle, { backgroundColor: earn.status === 'Paid' ? Colors.green : Colors.gold }]} />
                <Text style={styles.earningCardStatusText}>{earn.status}</Text>
              </View>
            </View>
          </Reanimated.View>
        ))}
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
      {MOCK_RATINGS.length > 0 ? MOCK_RATINGS.map((rating) => (
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
      )) : (
        <Text style={styles.emptyText}>No reviews yet.</Text>
      )}
    </Animated.View>
  );

  // --- Render Functions (Provider) ---

  const renderCompanyOverview = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.statsGrid}>
        <View style={styles.statBoxLarge}>
          <Ionicons name="flash-outline" size={24} color={Colors.saffron} />
          <Text style={styles.statBoxLargeVal}>94%</Text>
          <Text style={styles.statBoxLargeLbl}>Response Rate</Text>
        </View>
        <View style={styles.statBoxLarge}>
          <Ionicons name="checkmark-circle-outline" size={24} color={Colors.green} />
          <Text style={styles.statBoxLargeVal}>GSTIN</Text>
          <Text style={styles.statBoxLargeLbl}>Verified Account</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business details</Text>
        </View>

        {[
          { icon: 'business-outline', label: 'Company Name', value: companyName, editable: true, onEdit: setCompanyName },
          { icon: 'grid-outline', label: 'Industry Sector', value: businessCategory, editable: true, onEdit: setBusinessCategory },
          { icon: 'location-outline', label: 'Headquarters', value: branchLocation, editable: true, onEdit: setBranchLocation },
          { icon: 'ribbon-outline', label: 'GSTIN Registration', value: gstin, editable: true, onEdit: setGstin, note: 'Taxes auto-deducted' },
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

  const renderActiveListingsSummary = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Posted Gigs (Live Summary)</Text>
        </View>

        {[
          { title: 'Delivery Partner Needed', date: 'Posted 2 hours ago', count: '14 Applicants', active: true },
          { title: 'Warehouse Helper Needed', date: 'Posted Yesterday', count: '3 Applicants', active: true },
          { title: 'Store Event Host', date: 'Filled 3 days ago', count: '5 Workers Hired', active: false, filled: true },
        ].map((lst, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.listingRowItem, idx === 2 && { borderBottomWidth: 0 }]}
            onPress={() => router.push('/(tabs)/my-jobs' as any)}
          >
            <View style={styles.listingRowContent}>
              <Text style={styles.listingRowTitle}>{lst.title}</Text>
              <Text style={styles.listingRowSub}>{lst.date} • <Text style={{ color: Colors.saffron, fontFamily: FontFamily.bodySemiBold }}>{lst.count}</Text></Text>
            </View>
            <View style={[
              styles.seekerBadge,
              lst.active ? styles.seekerBadgeGreen : styles.seekerBadgeBlue
            ]}>
              <Text style={[
                styles.seekerBadgeText,
                lst.active ? styles.seekerBadgeTextGreen : styles.seekerBadgeTextBlue
              ]}>
                {lst.active ? 'LIVE' : lst.filled ? 'FILLED' : 'CLOSED'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderTeamAndBilling = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* Recruiter / Managers List */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recruiters & Managers</Text>
          <TouchableOpacity onPress={() => showToast('Manager invites coming soon!', 'info')}>
            <Text style={{ color: Colors.saffron, fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {[
          { name: 'Sai (Owner)', role: 'Administrator', avatar: 'S' },
          { name: 'Kalyan Dev', role: 'Branch Recruiter', avatar: 'K' },
        ].map((rec, idx) => (
          <View key={idx} style={[styles.recruiterRow, idx === 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.recruiterAvatar}>
              <Text style={styles.recruiterAvatarText}>{rec.avatar}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.recruiterNameText}>{rec.name}</Text>
              <Text style={styles.recruiterRoleText}>{rec.role}</Text>
            </View>
            <Ionicons name="shield-checkmark" size={16} color={Colors.green} />
          </View>
        ))}
      </View>

      {/* Billing summaries */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment & Wallet Account</Text>
        <View style={styles.billingWalletRow}>
          <View>
            <Text style={styles.billingWalletLabel}>ESCROW BALANCE</Text>
            <Text style={styles.billingWalletVal}>₹12,400</Text>
          </View>
          <TouchableOpacity
            style={styles.billingTopupBtn}
            onPress={() => showToast('Top-up wallet gateway coming soon!', 'info')}
          >
            <Text style={styles.billingTopupBtnText}>Top-up ⚡</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Cover Photo */}
        <View style={styles.coverPhoto}>
          <LinearGradient
            colors={isSeeker ? ['#1E293B', '#0F172A'] : ['#004DEB', '#0039B3']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View>
            <View style={[styles.coverNav, { paddingTop: insets.top + 8 }]}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings' as any)}>
                <Ionicons name="settings-outline" size={24} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Identity & Actions */}
        <View style={styles.identitySection}>
          <View style={styles.avatarWrapper}>
            <Avatar name={isSeeker ? user?.name : companyName} size="xl" />
            <TouchableOpacity style={styles.camBadge}>
              <Ionicons name="camera" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.identityName}>{isSeeker ? (user?.name || 'Complete Profile') : companyName}</Text>
            {user?.is_verified && <Ionicons name="checkmark-circle" size={22} color={Colors.green} />}
          </View>
          <Text style={styles.identityLocation}>
            <Ionicons name="location" size={14} color={Colors.gray4} /> {isSeeker ? (user?.location_name || 'Add Location') : branchLocation}
          </Text>

          {/* Premium Trust & Badge Section */}
          <View style={styles.trustSection}>
            <View style={styles.badgesWrapper}>
              <View style={styles.badgesRow}>
                {generateBadges(user).slice(0, 3).map(badge => (
                  <View key={badge} style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.ratingOverviewRow}>
                <Text style={styles.hugeRating}>{Math.max(user?.worker_rating || 0, user?.employer_rating || 0).toFixed(1)}</Text>
                <View style={{ marginLeft: 8 }}>
                  <View style={{ flexDirection: 'row', marginBottom: 2 }}>
                    {[1, 2, 3, 4, 5].map(s => <Ionicons key={s} name="star" size={12} color={Colors.gold} />)}
                  </View>
                  <Text style={styles.reviewsCountTxt}>{user?.total_reviews || 0} Reviews</Text>
                </View>
              </View>
            </View>

            <View style={styles.trustRingWrapper}>
              <TrustScoreRing score={calculateTrustScore(user)} size={90} strokeWidth={8} />
            </View>
          </View>

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

            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 16, borderRadius: Radius.lg, width: 'auto' }]} onPress={() => useUIStore.getState().setRole(isSeeker ? 'provider' : 'seeker')}>
              <Ionicons name="swap-horizontal" size={18} color={Colors.navy} />
              <Text style={{ fontFamily: FontFamily.bodySemiBold, color: Colors.navy, fontSize: 13 }}>Switch Role</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
              <Ionicons name="share-social" size={18} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs System */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            {TABS.map((tab, idx) => (
              <TouchableOpacity key={tab} style={[styles.tabBtn, { width: tabWidth }]} onPress={() => handleTabPress(idx)}>
                <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tabIndicatorContainer}>
            <Animated.View style={[
              styles.tabIndicator,
              {
                width: tabWidth,
                transform: [{ translateX: tabIndicatorPos }],
                backgroundColor: isSeeker ? Colors.navy : Colors.saffron
              }
            ]} />
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.contentWrapper}>
          {isSeeker ? (
            <>
              {activeTab === 0 && renderOverview()}
              {activeTab === 1 && renderEarnings()}
              {activeTab === 2 && renderReviews()}
            </>
          ) : (
            <>
              {activeTab === 0 && renderCompanyOverview()}
              {activeTab === 1 && renderActiveListingsSummary()}
              {activeTab === 2 && renderTeamAndBilling()}
            </>
          )}
        </View>

      </ScrollView>
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
    paddingTop: 0,
  },
  settingsBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
  },
  identitySection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: -50,
  },
  avatarWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: Colors.background,
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
    fontSize: 24, color: Colors.ink,
  },
  identityLocation: {
    fontFamily: FontFamily.bodyMedium,
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
    height: '100%',
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
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  // Premium Trust UI
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  badgesWrapper: {
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  premiumBadge: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  premiumBadgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 9,
    color: Colors.goldDark,
  },
  ratingOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hugeRating: {
    fontFamily: FontFamily.headingBold,
    fontSize: 32,
    color: Colors.ink,
    lineHeight: 36,
  },
  reviewsCountTxt: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.inkSubtle,
  },
  trustRingWrapper: {
    marginLeft: Spacing.md,
  },
  infoInput: {
    borderWidth: 1, borderColor: Colors.saffron, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: FontSize.md,
    fontFamily: FontFamily.bodyMedium, color: Colors.ink,
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

  // Provider Specific Styles
  listingRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray1,
  },
  listingRowContent: {
    flex: 1,
    marginRight: 10,
  },
  listingRowTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  listingRowSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    marginTop: 4,
  },
  seekerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  seekerBadgeGreen: { backgroundColor: Colors.greenLight },
  seekerBadgeBlue: { backgroundColor: Colors.blueLight },
  seekerBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
  },
  seekerBadgeTextGreen: { color: Colors.greenDark },
  seekerBadgeTextBlue: { color: Colors.blueDark },
  recruiterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray1,
  },
  recruiterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recruiterAvatarText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
    color: Colors.saffronDark,
  },
  recruiterNameText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.base,
    color: Colors.ink,
  },
  recruiterRoleText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray4,
    marginTop: 2,
  },
  billingWalletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray1,
    borderRadius: Radius.sm,
    padding: 16,
    marginTop: 10,
  },
  billingWalletLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.gray4,
    letterSpacing: 0.5,
  },
  billingWalletVal: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.navy,
    marginTop: 2,
  },
  billingTopupBtn: {
    backgroundColor: Colors.saffron,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  billingTopupBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  seekerGreetingCard: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  seekerGreetingText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  seekerSubText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.gray5,
    marginTop: 2,
  },
  seekerProgressCard: {
    backgroundColor: Colors.white,
    marginVertical: 12,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressCardTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  progressPercent: {
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
    color: Colors.saffron,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.gray1,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: 4,
  },
  progressTip: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.gray5,
    lineHeight: 14,
  },
  seekerEarningsBalanceCard: {
    margin: 20,
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    padding: 20,
  },
  earningsLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  earningsBalanceValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 32,
    color: Colors.white,
    marginTop: 4,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningSubLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  earningSubVal: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: Colors.white,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningsWithdrawBtn: {
    backgroundColor: Colors.saffron,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    ...Shadow.sm,
  },
  earningsWithdrawText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: Colors.white,
  },
  earningsHistoryTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: Colors.ink,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  earningsHistoryList: {
    paddingHorizontal: 20,
  },
  earningRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  earningIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningCardTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.base,
    color: Colors.ink,
  },
  earningCardDate: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray4,
    marginTop: 2,
  },
  earningCardAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.green,
  },
  earningCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveDotCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
    marginRight: 4,
  },
  earningCardStatusText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: Colors.green,
  },
});

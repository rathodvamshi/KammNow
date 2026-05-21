import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  Dimensions,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow } from '../../src/theme';
import { Avatar } from '../../src/components/atoms/Avatar';
import { MOCK_JOBS } from '../../src/services/mockData';
import {
  formatPay,
  formatDistance,
  formatRelativeTime,
} from '../../src/utils/helpers';

const { width } = Dimensions.get('window');

// Generate 12 mock reviews for pagination demonstration
const MOCK_REVIEWS = Array.from({ length: 12 }).map((_, i) => ({
  id: `r${i + 1}`,
  name: i === 0 ? 'Arjun R.' : i === 1 ? 'Suresh K.' : `Worker ${i + 1}`,
  stars: 5 - (i % 2),
  text: i === 0
    ? 'Very good employer. Pay on time, fair work hours. Highly recommend!'
    : i === 1
      ? 'Good work, paid on time. Route was a bit far but manageable.'
      : 'Great experience working here. Helpful environment and timely payments.',
  date: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  bg: i % 2 === 0 ? Colors.blueLight : Colors.greenLight,
  text_color: i % 2 === 0 ? Colors.blue : Colors.greenDark,
}));

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [description, setDescription] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [visibleReviews, setVisibleReviews] = useState(5);
  const [isInputModalVisible, setInputModalVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animation Refs
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Staggered Entrance Animations
    Animated.stagger(150, [
      Animated.timing(fadeAnim1, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnim2, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    // 2. Pulse Animation for Apply button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const bgTranslateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, -100], // Parallax effect
    extrapolate: 'clamp',
  });

  // Find job from mock data
  const job = MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0];
  const slotsLeft = job.quantity_total - job.quantity_hired;

  const handleApply = async () => {
    if (!description.trim()) return;
    setIsApplying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsApplying(false);
    setApplied(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Ionicons
        key={i}
        name={i < Math.round(rating) ? 'star' : 'star-outline'}
        size={14}
        color={Colors.gold}
      />
    ));
  };

  const getWorkTiming = (hours: number) => {
    const startHour = 9; // assume 9 AM start
    const endHour = startHour + hours;
    const format = (h: number) => {
      if (h === 12) return `12:00 PM`;
      return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
    };
    return `${format(startHour)} - ${format(endHour)}`;
  };

  const openDirections = () => {
    if (job.location_name) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location_name)}`);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header Background (Absolute, with Parallax) */}
      <Animated.View style={[styles.headerBg, { transform: [{ translateY: bgTranslateY }] }]}>
        <LinearGradient
          colors={[Colors.navy, '#111827']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Subtle overlay shape */}
        <View style={styles.headerShape} />
      </Animated.View>

      {/* Animated Sticky Header (Fades in on scroll) */}
      <Animated.View style={[styles.dynamicStickyHeader, { opacity: headerOpacity }]}>
        <SafeAreaView>
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            
            <View style={styles.stickyTitleContainer}>
              <Text style={styles.stickyTitleText} numberOfLines={1}>
                {job.title}
              </Text>
            </View>
            
            <View style={styles.topNavRight}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="share-social-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="bookmark-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: Platform.OS !== 'web' })}
        scrollEventThrottle={16}
      >
        <SafeAreaView>
          {/* Normal Top Navigation */}
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.topNavRight}>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="share-social-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Ionicons name="bookmark-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Hero Content */}
        <Animated.View 
          style={[
            styles.heroContent, 
            { 
              opacity: fadeAnim1, 
              transform: [{ translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
            }
          ]}
        >
          <View style={styles.heroTags}>
            {job.is_urgent && (
              <View style={[styles.tag, styles.urgentTag]}>
                <Ionicons name="flash" size={12} color="#FF8A8A" />
                <Text style={styles.urgentTagText}>Urgent Need</Text>
              </View>
            )}
            <View style={[styles.tag, styles.typeTag]}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.typeTagText}>
                {job.pay_type === 'day' ? 'Daily Work' : job.pay_type === 'hour' ? 'Hourly' : 'Monthly'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{job.title}</Text>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroMetaText}>{job.location_name}</Text>
            </View>
          </View>

          <View style={styles.payCard}>
            <View>
              <Text style={styles.payLabel}>Salary</Text>
              <Text style={styles.payAmount}>
                {formatPay(job.pay_amount, job.pay_type)}
              </Text>
            </View>
            <View style={styles.payIconWrapper}>
              <Ionicons name="wallet-outline" size={24} color={Colors.saffron} />
            </View>
          </View>
        </Animated.View>

        {/* Main Content Area */}
        <Animated.View 
          style={[
            styles.contentArea,
            {
              opacity: fadeAnim2,
              transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
            }
          ]}
        >

          {/* Work Schedule Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Work Schedule</Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="today-outline" size={18} color={Colors.saffron} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Start Date</Text>
                  <Text style={styles.detailValue}>{job.work_start_date || 'ASAP'}</Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="calendar-clear-outline" size={18} color={Colors.saffron} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>End Date</Text>
                  <Text style={styles.detailValue}>{job.work_end_date || 'Ongoing'}</Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="time-outline" size={18} color={Colors.saffron} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Timings</Text>
                  <Text style={styles.detailValue}>{job.work_start_time} - {job.work_end_time}</Text>
                </View>
              </View>
              <View style={[styles.detailBox, { backgroundColor: Colors.saffronLight }]}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="hourglass-outline" size={18} color={Colors.saffronDark} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={[styles.detailLabel, { color: Colors.saffronDark }]}>Duration</Text>
                  <Text style={[styles.detailValue, { color: Colors.saffronDark }]}>{job.duration_text || 'See Description'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pay & Benefits Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="wallet-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Pay & Benefits</Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="cash-outline" size={18} color={Colors.green} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Payout</Text>
                  <Text style={styles.detailValue}>{job.payment_schedule ? `Paid ${job.payment_schedule}` : 'After Work'}</Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="restaurant-outline" size={18} color={job.food_included ? Colors.green : Colors.gray4} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Food</Text>
                  <Text style={styles.detailValue}>{job.food_included ? 'Provided' : 'Not Included'}</Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="home-outline" size={18} color={job.stay_included ? Colors.green : Colors.gray4} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Stay</Text>
                  <Text style={styles.detailValue}>{job.stay_included ? 'Provided' : 'Not Included'}</Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="bus-outline" size={18} color={job.travel_allowance ? Colors.green : Colors.gray4} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Travel Allowance</Text>
                  <Text style={styles.detailValue}>{job.travel_allowance ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Requirements Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Requirements</Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="star-outline" size={18} color={Colors.blue} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Skill Level</Text>
                  <Text style={styles.detailValue}>
                    {job.skill_level === 'beginner' ? 'Beginner OK' : job.skill_level === 'skilled' ? 'Skilled Only' : job.skill_level === 'heavy' ? 'Heavy Lifting' : 'Any'}
                  </Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.blue} />
                </View>
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Language</Text>
                  <Text style={styles.detailValue}>{job.language_pref || 'Any'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Slots Progress Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Workers Needed</Text>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  <Text style={{ fontFamily: FontFamily.bodySemiBold, color: Colors.ink }}>{job.quantity_hired}</Text> of {job.quantity_total} filled
                </Text>
                <Text style={styles.slotsLeftText}>
                  {slotsLeft <= 0 ? 'All slots full' : `${slotsLeft} left`}
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min((job.quantity_hired / job.quantity_total) * 100, 100)}%`, backgroundColor: slotsLeft <= 0 ? Colors.gray4 : Colors.green }]} />
              </View>
            </View>
          </View>

          {/* Description Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>About the Work</Text>
            </View>
            <Text style={styles.descText}>{job.description}</Text>
          </View>

          {/* Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="map-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            <TouchableOpacity style={styles.locationContainer} onPress={openDirections}>
              <View style={styles.locationIconBox}>
                <Ionicons name="location" size={24} color={Colors.red} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{job.location_name}</Text>
                <Text style={styles.locationSub}>Tap for exact map location</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={openDirections}>
              <Ionicons name="navigate" size={18} color={Colors.navy} />
              <Text style={styles.secondaryBtnText}>Get Directions</Text>
            </TouchableOpacity>
          </View>

          {/* Employer Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Posted By</Text>
            </View>
            <View style={styles.employerHeader}>
              <Avatar name={job.poster_name} size="lg" />
              <View style={styles.employerInfo}>
                <View style={styles.employerNameRow}>
                  <Text style={styles.employerName}>{job.poster_name}</Text>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                </View>
                <Text style={styles.employerSub}>Verified Employer</Text>
                <View style={styles.ratingRow}>
                  {renderStars(job.poster_rating ?? 0)}
                  <Text style={styles.ratingText}>
                    {job.poster_rating?.toFixed(1)} <Text style={styles.ratingCount}>({MOCK_REVIEWS.length} reviews)</Text>
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>45</Text>
                <Text style={styles.statLbl}>Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>12</Text>
                <Text style={styles.statLbl}>Posted</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{job.poster_rating?.toFixed(1)}★</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>98%</Text>
                <Text style={styles.statLbl}>On Time</Text>
              </View>
            </View>
          </View>

          {/* Reviews Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubbles-outline" size={20} color={Colors.ink} />
              <Text style={styles.cardTitle}>Worker Reviews</Text>
            </View>
            {MOCK_REVIEWS.slice(0, visibleReviews).map((rev, index) => (
              <View key={rev.id} style={[styles.reviewItem, index === visibleReviews - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.reviewHead}>
                  <View style={[styles.reviewAv, { backgroundColor: rev.bg }]}>
                    <Text style={[styles.reviewAvText, { color: rev.text_color }]}>
                      {rev.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{rev.name}</Text>
                    <View style={styles.reviewStarsRow}>
                      {renderStars(rev.stars)}
                      <Text style={styles.reviewDate}> • {formatRelativeTime(rev.date)}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>{rev.text}</Text>
              </View>
            ))}

            {visibleReviews < MOCK_REVIEWS.length && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => setVisibleReviews(prev => prev + 10)}
              >
                <Text style={styles.viewAllBtnText}>Load 10 More Reviews</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.navy} />
              </TouchableOpacity>
            )}
          </View>

          {/* Report */}
          <TouchableOpacity style={styles.reportBtn}>
            <Ionicons name="flag-outline" size={16} color={Colors.gray4} />
            <Text style={styles.reportBtnText}>Report this posting</Text>
          </TouchableOpacity>
          </Animated.View>
      </Animated.ScrollView>

      {/* Floating Apply Strip */}
      <View style={styles.floatingApplyStrip}>
        {applied ? (
          <View style={styles.appliedBanner}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.greenDark} />
            <Text style={styles.appliedText}>Application Sent Successfully!</Text>
          </View>
        ) : slotsLeft <= 0 ? (
          <View style={styles.fullBanner}>
            <Ionicons name="sad-outline" size={24} color={Colors.gray4} />
            <Text style={styles.fullText}>All slots filled for this job</Text>
          </View>
        ) : (
          <View style={styles.applyContainer}>
            <TouchableOpacity
              style={styles.fakeInput}
              onPress={() => setInputModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.fakeInputText, description ? { color: Colors.ink } : { color: Colors.gray4 }]}>
                {description || "Why are you a good fit? (Tap to write)"}
              </Text>
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.primaryBtn, isApplying && styles.primaryBtnDisabled]}
                onPress={handleApply}
                disabled={isApplying}
              >
                <LinearGradient
                  colors={[Colors.saffron, Colors.saffronDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnGradient}
                >
                  {isApplying ? (
                    <Text style={styles.primaryBtnText}>Sending...</Text>
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Apply Now</Text>
                      <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Input Modal */}
      <Modal
        visible={isInputModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setInputModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Why are you a good fit?</Text>
              <TouchableOpacity onPress={() => setInputModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={Colors.gray4} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.popupInput}
              placeholder="Type your message here..."
              placeholderTextColor={Colors.gray4}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              maxLength={300}
              autoFocus={true}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length} / 300</Text>

            <TouchableOpacity style={styles.popupSaveBtn} onPress={() => setInputModalVisible(false)}>
              <Text style={styles.popupSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    overflow: 'hidden',
  },
  headerShape: {
    position: 'absolute',
    bottom: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dynamicStickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  stickyTitleContainer: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyTitleText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? Spacing.xl : Spacing.sm,
    paddingBottom: Spacing.md,
  },
  topNavRight: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heroTags: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  urgentTag: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  urgentTagText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: '#FF8A8A',
  },
  typeTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeTagText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  heroTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: Spacing.md,
  },
  payCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.md,
  },
  payLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  payAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
    color: Colors.greenDark,
  },
  payPeriod: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
  payIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailBox: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gray1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  detailIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  detailTexts: { flex: 1 },
  detailLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.gray4,
    marginBottom: 0,
  },
  detailValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.ink,
  },
  descText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink2,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  locationIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: { flex: 1 },
  locationName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  locationSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.blueLight,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  secondaryBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.navy,
  },
  employerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  employerInfo: { flex: 1 },
  employerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employerName: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
  },
  employerSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.green,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink,
    marginLeft: 4,
  },
  ratingCount: {
    fontFamily: FontFamily.body,
    color: Colors.gray4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray1,
    borderRadius: Radius.md,
    padding: Spacing.xs, // Reduced padding to fit perfectly
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  slotsLeftText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.saffron,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.gray2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.gray3,
  },
  statVal: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md, // Smaller text to fit all 4
    color: Colors.ink,
  },
  statLbl: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    marginTop: 2,
  },
  reviewItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reviewAv: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.sm,
  },
  reviewMeta: { flex: 1 },
  reviewName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.gray4,
  },
  reviewText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink2,
    lineHeight: 22,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.gray1,
    borderRadius: Radius.sm,
  },
  viewAllBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.navy,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  reportBtnText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
  floatingApplyStrip: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    zIndex: 10,
    ...Shadow.lg,
  },
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.greenLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  appliedText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.greenDark,
  },
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  fullText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.gray4,
  },
  applyContainer: { gap: Spacing.sm },
  fakeInput: {
    minHeight: 48,
    backgroundColor: Colors.gray1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
    justifyContent: 'center',
  },
  fakeInputText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  popupCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: 230, // pushed up higher!
    ...Shadow.lg,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  popupTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
  },
  popupInput: {
    height: 160,
    backgroundColor: '#F8FAFC', // Premium Slate-50 light gray
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    borderWidth: 1.5,
    borderColor: '#E2E8F0', // Slate-200 border
  },
  popupSaveBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    ...Shadow.sm,
  },
  popupSaveBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  charCount: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  primaryBtn: {
    height: 54,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
});


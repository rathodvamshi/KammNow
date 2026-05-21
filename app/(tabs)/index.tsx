import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  SafeAreaView,
  Animated,
  Modal,
  Pressable,
  AppState,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../../src/theme';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { JobCard } from '../../src/components/molecules/JobCard';
import { PaginationBar } from '../../src/components/molecules/PaginationBar';
import { JobCardSkeleton } from '../../src/components/atoms/Skeleton';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useUIStore } from '../../src/store/uiStore';
import { useAddressStore } from '../../src/store/addressStore';
import { LocationPromptBottomSheet } from '../../src/components/organisms/LocationPromptBottomSheet';
import { reverseGeocode } from '../../src/utils/geocoding';

import { MOCK_JOBS } from '../../src/services/mockData';
import { formatDistance, haversineDistance } from '../../src/utils/helpers';
import type { Job, JobCategory } from '../../src/types';
import { CategorySection, CategoryItem } from '../../src/components/molecules/CategorySection';
import { FilterBar } from '../../src/components/molecules/FilterBar';
import { useFilterStore } from '../../src/store/filterStore';

const LANGUAGES = [
  { key: 'en' as const, label: 'English', glyph: 'A', native: 'EN', sub: 'English' },
  { key: 'hi' as const, label: 'हिन्दी', glyph: 'अ', native: 'हि', sub: 'Hindi' },
  { key: 'te' as const, label: 'తెలుగు', glyph: 'అ', native: 'తె', sub: 'Telugu' },
];

const CATEGORIES: CategoryItem[] = [
  { id: 'all', name: 'All Gigs', iconName: 'grid-outline', bgColor: '#E3F2FD', iconColor: '#1E88E5' },
  { id: 'urgent', name: 'Urgent', iconName: 'flash-outline', bgColor: '#FFF8E1', iconColor: '#FFB300', badge: 'HOT' },
  { id: 'delivery', name: 'Delivery', iconName: 'bicycle-outline', bgColor: '#FFF3E0', iconColor: '#F57C00', badge: 'FAST' },
  { id: 'events', name: 'Event Crew', iconName: 'sparkles-outline', bgColor: '#F3E5F5', iconColor: '#8E24AA', badge: 'NEW' },
  { id: 'shop', name: 'Shop Help', iconName: 'storefront-outline', bgColor: '#E8F5E9', iconColor: '#43A047' },
  { id: 'construction', name: 'Labour', iconName: 'hammer-outline', bgColor: '#EFEBE9', iconColor: '#6D4C41' },
  { id: 'restaurant', name: 'Restaurant', iconName: 'fast-food-outline', bgColor: '#FFEBEE', iconColor: '#E53935' },
  { id: 'office', name: 'Office Help', iconName: 'desktop-outline', bgColor: '#E0F7FA', iconColor: '#00ACC1' },
  { id: 'cleaning', name: 'House Help', iconName: 'brush-outline', bgColor: '#FFFDE7', iconColor: '#FBC02D' },
  { id: 'security', name: 'Security', iconName: 'shield-checkmark-outline', bgColor: '#ECEFF1', iconColor: '#37474F' },
  { id: 'driver', name: 'Drivers', iconName: 'car-outline', bgColor: '#E0F2F1', iconColor: '#00695C', badge: 'DRIVE' },
  { id: 'tech', name: 'Tech Help', iconName: 'code-slash-outline', bgColor: '#EDE7F6', iconColor: '#5E35B1' },
  { id: 'salon', name: 'Salon Care', iconName: 'cut-outline', bgColor: '#FCE4EC', iconColor: '#C2185B', badge: 'PRO' },
  { id: 'tutor', name: 'Tutors', iconName: 'book-outline', bgColor: '#F1F8E9', iconColor: '#558B2F' },
];

const PAGE_LIMIT = 10;

const SEARCH_PLACEHOLDERS = [
  '"delivery jobs..."',
  '"helper jobs..."',
  '"event jobs..."',
  '"restaurant jobs..."',
];

const AnimatedPlaceholder = ({ active }: { active: boolean }) => {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) return;
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        translateY.setValue(20);
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [active, translateY, opacity]);

  if (active) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholderWrap]} pointerEvents="none">
      <Text style={styles.placeholderStatic}>Search </Text>
      <Animated.View style={{ transform: [{ translateY }], opacity, flex: 1 }}>
        <Text style={styles.placeholderAnimated}>
          {SEARCH_PLACEHOLDERS[index]}
        </Text>
      </Animated.View>
    </View>
  );
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { lat, lng, locationName } = useLocationStore();
  const { language, setLanguage } = useUIStore();
  const { savedAddresses, getActive, isLoaded, loadFromStorage } = useAddressStore();

  const [showLangModal, setShowLangModal] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [promptSheetMode, setPromptSheetMode] = useState<'gps_off' | 'permission_needed'>('gps_off');

  const checkLocationLifecycle = async () => {
    try {
      // 1. Restore persisted state (only if not already loaded)
      const locState = useLocationStore.getState();
      const addrState = useAddressStore.getState();

      const loadPromises: Promise<any>[] = [];
      if (!locState.lat && !locState.locationName) {
        loadPromises.push(useLocationStore.getState().loadFromStorage());
      }
      if (!addrState.isLoaded) {
        loadPromises.push(loadFromStorage());
      }
      if (loadPromises.length > 0) await Promise.all(loadPromises);

      // 2. Check GPS hardware
      const gpsEnabled = await ExpoLocation.hasServicesEnabledAsync();
      if (!gpsEnabled) {
        // Only show sheet if user has no saved address to fall back on
        const hasData = !!useAddressStore.getState().getActive() ||
          useAddressStore.getState().savedAddresses.length > 0 ||
          !!useLocationStore.getState().lat;
        if (!hasData) {
          setPromptSheetMode('gps_off');
          setShowPromptSheet(true);
        }
        return;
      }

      // 3. Check permission
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      const hasPerm = status === 'granted';
      useLocationStore.getState().setPermission(hasPerm);

      const currentLat = useLocationStore.getState().lat;
      const hasActiveAddr = !!useAddressStore.getState().getActive() ||
        useAddressStore.getState().savedAddresses.length > 0;
      const hasLocationData = currentLat !== null || hasActiveAddr;

      if (!hasPerm && !hasLocationData) {
        setPromptSheetMode('permission_needed');
        setShowPromptSheet(true);
        return;
      }

      // 4. Hide sheet if showing
      setShowPromptSheet(false);

      // 5. Auto-detect if permission granted but no coords yet
      if (hasPerm && !currentLat) {
        try {
          const loc = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          });
          const { latitude, longitude, accuracy } = loc.coords;
          const geo = await reverseGeocode(latitude, longitude);
          useLocationStore.getState().updateLocation(
            latitude,
            longitude,
            geo.formattedLine2 || geo.area || geo.city || 'Current Location',
            accuracy ?? undefined
          );
        } catch {
          // GPS fix failed — use saved address as fallback, no crash
        }
      }
    } catch (error) {
      console.warn('HomeScreen checkLocationLifecycle error:', error);
    }
  };

  const openLangModal = () => {
    setShowLangModal(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeLangModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowLangModal(false);
    });
  };

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);

  // ── Filter store (sort + pay type) ──────────────────────────────────────────
  const {
    sortBy,
    payTypeFilter,
    activeFilterCount,
    setSortBy,
    setPayTypeFilter,
    resetFilters,
  } = useFilterStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animated values for premium stagger transitions
  const greetingFade = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(15)).current;
  const locationFade = useRef(new Animated.Value(0)).current;
  const locationSlide = useRef(new Animated.Value(15)).current;
  const searchFade = useRef(new Animated.Value(0)).current;
  const searchScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    checkLocationLifecycle();
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(greetingFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(greetingSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(locationFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(locationSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(searchFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(searchScale, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: any) => {
      if (nextAppState === 'active') {
        await checkLocationLifecycle();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const currentLang = LANGUAGES.find((l) => l.key === language);
  const currentLangLabel = currentLang ? `🌐 ${currentLang.native}` : '🌐 EN';

  const activeAddr = getActive();

  const userLat = lat ?? 17.4344;
  const userLng = lng ?? 78.4497;

  // Dynamic skill matching for categories (memoized to maintain list reference and prevent scroll resets)
  const dynamicCategories = useMemo(() => {
    return CATEGORIES.map(cat => {
      const userSkills = user?.skills ?? [];
      const isMatched = userSkills.some(skill =>
        cat.name.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cat.name.toLowerCase()) ||
        cat.id.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cat.id.toLowerCase())
      );
      if (isMatched && cat.id !== 'all') {
        return { ...cat, badge: 'MATCH' };
      }
      return cat;
    });
  }, [user?.skills]);

  // Calculate the suggested jobs for Raju based on his skills
  const suggestedJobs = useMemo(() => {
    const userSkills = user?.skills ?? [];
    return MOCK_JOBS
      .map((job) => ({
        ...job,
        distance_km: haversineDistance(userLat, userLng, job.location_lat, job.location_lng),
      }))
      .filter((job) => {
        if (job.status !== 'live') return false;
        return userSkills.some(skill =>
          job.category.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(job.category.toLowerCase()) ||
          job.title.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(job.title.toLowerCase())
        );
      })
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [user?.skills, userLat, userLng]);

  const filteredJobs = MOCK_JOBS
    .map((job) => ({
      ...job,
      distance_km: haversineDistance(userLat, userLng, job.location_lat, job.location_lng),
    }))
    .filter((job) => {
      // Category filter
      if (selectedCategory === 'urgent') return job.is_urgent;
      if (selectedCategory !== 'all' && job.category !== selectedCategory) return false;
      // Pay type filter
      if (payTypeFilter !== 'all' && job.pay_type !== payTypeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return a.distance_km - b.distance_km;
      if (sortBy === 'pay') return b.pay_amount - a.pay_amount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalPages = Math.ceil(filteredJobs.length / PAGE_LIMIT);
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsRefreshing(false);
  }, []);

  const greetingIcon = () => {
    const h = new Date().getHours();
    if (h < 17) return 'sunny';
    return 'moon';
  };



  // ── Scroll-driven animations ──────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const navTranslateY = useRef(new Animated.Value(0)).current;
  // Height of the banner (measured on layout)
  const bannerHeight = useRef(0);
  // Whether category bar is currently stuck
  const categoryStuck = useRef(false);
  const [catBarTop, setCatBarTop] = useState(0); // px from top of scroll content

  const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 82 : 62;
  const CATEGORY_BAR_HEIGHT = 82; // approximate

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const dy = y - lastScrollY.current;

        // Hide nav on scroll down, show on scroll up
        if (dy > 4 && y > 60) {
          Animated.spring(navTranslateY, {
            toValue: BOTTOM_NAV_HEIGHT,
            useNativeDriver: true,
            friction: 10,
            tension: 80,
          }).start();
        } else if (dy < -4) {
          Animated.spring(navTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 10,
            tension: 80,
          }).start();
        }

        lastScrollY.current = y;
      },
    }
  );

  const renderFooter = () => (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      total={filteredJobs.length}
      limit={PAGE_LIMIT}
      onPageChange={(p) => setPage(p)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>No jobs found nearby</Text>
      <Text style={styles.emptySub}>Try changing filters or search terms</Text>
      <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedCategory('all')}>
        <Text style={styles.clearBtnText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: Colors.navy }} />

      {/* ── Single scrollable surface ── */}
      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BOTTOM_NAV_HEIGHT + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.saffron}
            colors={[Colors.saffron]}
          />
        }
        // Sticky index: 2 = premium sticky header (index 0 = banner, index 1 = suggestions)
        stickyHeaderIndices={[2]}
      >
        {/* ── 0: Hero banner — scrolls away ── */}
        <View onLayout={(e) => { bannerHeight.current = e.nativeEvent.layout.height; }}>
          <View style={styles.heroBannerAiry}>
            {/* Top Row: Location & Actions */}
            <View style={styles.headerTopRowAiry}>
              {/* Left: Location */}
              <TouchableOpacity
                style={styles.locationAiry}
                activeOpacity={0.7}
                onPress={() => router.push('/location/saved-addresses')}
              >
                <View style={styles.locationIconWrapAiry}>
                  <Ionicons name="location" size={22} color={Colors.saffron} />
                </View>
                <View style={styles.locationTextWrapAiry}>
                  <Text style={styles.locationLabelAiry}>YOUR LOCATION</Text>
                  <View style={styles.locationTitleRowAiry}>
                    <Text style={styles.locationTitleAiry} numberOfLines={1}>
                      {activeAddr ? (activeAddr.label === 'home' ? 'Home' : activeAddr.label === 'work' ? 'Work' : activeAddr.label === 'family' ? 'Family' : activeAddr.label.toUpperCase()) : 'Current Location'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={Colors.white} style={{ marginLeft: 4, marginTop: 2 }} />
                  </View>
                  <Text style={styles.locationSubtitleAiry} numberOfLines={1}>
                    {activeAddr ? activeAddr.area : (locationName ?? 'Ameerpet, Hyderabad')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Right: Language */}
              <TouchableOpacity style={styles.langBtnAiry} activeOpacity={0.8} onPress={openLangModal}>
                <Text style={styles.langBtnTextAiry}>{currentLang?.native ?? 'EN'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Overlapping Floating Search Bar */}
          <Animated.View style={[styles.searchContainerAiry, { opacity: searchFade, transform: [{ scale: searchScale }] }]}>
            <TouchableOpacity
              style={styles.searchBarAiry}
              activeOpacity={0.85}
              onPress={() => router.push('/search')}
            >
              <Ionicons name="search" size={22} color={Colors.saffron} style={styles.searchIconAiry} />
              <AnimatedPlaceholder active={false} />

              <View style={styles.jobsBadgeAiry}>
                <View style={styles.pulseDotAiry} />
                <Text style={styles.jobsBadgeTextAiry}>{filteredJobs.length} nearby</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── 1: Suggestions (Always rendered node to keep sticky indices stable) ── */}
        <View>
          {suggestedJobs.length > 0 && (
            <View style={styles.spotlightContainer}>
              <Text style={styles.spotlightTitle}>✨ Suggestions For You</Text>
              <FlatList
                horizontal
                data={suggestedJobs}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                snapToInterval={262}
                decelerationRate="fast"
                snapToAlignment="start"
                contentContainerStyle={styles.spotlightList}
                renderItem={({ item, index }) => {
                  const matchPercent = index === 0 ? '98%' : index === 1 ? '95%' : '90%';
                  return (
                    <TouchableOpacity
                      style={styles.spotlightCard}
                      activeOpacity={0.9}
                      onPress={() => router.push(`/job/${item.id}` as any)}
                    >
                      <View style={styles.spotlightHeader}>
                        <View style={styles.spotlightCircle}>
                          <Ionicons
                            name={item.category === 'delivery' ? 'bicycle' : item.category === 'driver' ? 'car' : 'storefront'}
                            size={15}
                            color="#FFB300"
                          />
                        </View>
                        <View style={styles.spotlightBadge}>
                          <Text style={styles.spotlightBadgeText}>{matchPercent} Match</Text>
                        </View>
                      </View>
                      <View style={styles.spotlightContent}>
                        <Text style={styles.spotlightJobTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.spotlightPoster} numberOfLines={1}>{item.poster_name} • ⭐ {item.poster_rating}</Text>
                      </View>
                      <View style={styles.spotlightFooter}>
                        <View>
                          <Text style={styles.spotlightPay}>₹{item.pay_amount}<Text style={styles.spotlightPaySub}>/{item.pay_type}</Text></Text>
                          <Text style={styles.spotlightDistance}>📍 {item.distance_km?.toFixed(1)} km</Text>
                        </View>
                        <Text style={styles.spotlightAction}>Apply ⚡</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </View>

        {/* ── 2: Premium Sticky Header (Categories + Jobs Header + Dropdowns) ── */}
        <View style={styles.premiumStickyHeader}>
          <CategorySection
            categories={dynamicCategories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id);
              setPage(1);
            }}
          />

          {/* Section header row: title left, filter dropdowns right */}
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="location" size={14} color="#E91E63" />
              </View>
              <Text style={styles.sectionTitle}>Jobs Near You</Text>
            </View>

            {/* Filter dropdowns — right-aligned */}
            <FilterBar
              sortBy={sortBy}
              payTypeFilter={payTypeFilter}
              onSortChange={(s) => { setSortBy(s); setPage(1); }}
              onPayTypeChange={(t) => { setPayTypeFilter(t); setPage(1); }}
            />
          </View>
        </View>

        {/* ── Job cards — rendered inline, no nested scroll ── */}
        {isLoading
          ? [1, 2, 3].map((i) => <JobCardSkeleton key={i} />)
          : paginatedJobs.length === 0
            ? renderEmpty()
            : paginatedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPress={(j) => router.push(`/job/${j.id}` as any)}
                onApply={(j) => router.push(`/job/${j.id}` as any)}
              />
            ))
        }

        {/* ── Pagination ── */}
        {renderFooter()}
      </Animated.ScrollView>

      {/* ── Bottom nav — hides on scroll down, shows on scroll up ── */}
      <Animated.View
        style={[styles.bottomNavWrapper, { transform: [{ translateY: navTranslateY }] }]}
      >
        <BottomNav />
      </Animated.View>

      {/* Language bottom sheet dropdown */}
      {showLangModal && (
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeLangModal} />

          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: modalAnim }
            ]}
            pointerEvents="box-none"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeLangModal} />

            <Animated.View
              style={[
                styles.langSheet,
                {
                  transform: [{
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0]
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.langSheetTitle}>Select Language / भाषा चुनें</Text>
              <View style={styles.langSheetDivider} />
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.key}
                  style={[
                    styles.langOption,
                    language === lang.key && styles.langOptionActive
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setLanguage(lang.key);
                    closeLangModal();
                  }}
                >
                  <View style={[
                    styles.langGlyphCircle,
                    language === lang.key && styles.langGlyphCircleActive
                  ]}>
                    <Text style={[
                      styles.langGlyphText,
                      language === lang.key && styles.langGlyphTextActive
                    ]}>
                      {lang.glyph}
                    </Text>
                  </View>

                  <View style={styles.langTextContainer}>
                    <Text style={[
                      styles.langOptionLabel,
                      language === lang.key && styles.langOptionLabelActive
                    ]}>
                      {lang.label}
                    </Text>
                    <Text style={styles.langOptionSub}>{lang.sub}</Text>
                  </View>

                  {language === lang.key && (
                    <Ionicons name="checkmark-circle" size={22} color="#E91E63" />
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          </Animated.View>
        </View>
      )}

      {/* Location Access & GPS sheet interceptor */}
      <LocationPromptBottomSheet
        mode={promptSheetMode}
        visible={showPromptSheet}
        onClose={() => setShowPromptSheet(false)}
        onSelectOnMap={() => {
          setShowPromptSheet(false);
          router.push('/location/map-picker');
        }}
        onSearchManually={() => {
          setShowPromptSheet(false);
          router.push('/location/saved-addresses');
        }}
        onContinueSaved={() => {
          setShowPromptSheet(false);
          if (savedAddresses.length > 0) {
            const def = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
            useAddressStore.getState().setActive(def.id);
            useLocationStore.getState().updateLocation(def.lat, def.lng, def.street || def.area);
          }
        }}
        onEnableLocation={async () => {
          if (promptSheetMode === 'gps_off') {
            if (Platform.OS === 'web') {
              alert('Please turn on location access in your browser settings.');
              await checkLocationLifecycle();
            } else {
              Linking.openSettings();
            }
          } else {
            try {
              const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
              const hasPerm = status === 'granted';
              useLocationStore.getState().setPermission(hasPerm);
              if (hasPerm) {
                setShowPromptSheet(false);
                const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
                const { latitude, longitude } = loc.coords;
                const geo = await reverseGeocode(latitude, longitude);
                useLocationStore.getState().updateLocation(
                  latitude,
                  longitude,
                  geo.formattedLine2 || geo.area || geo.city || 'Current Location'
                );
              } else {
                // Permission denied — let user use saved address or map
                setShowPromptSheet(false);
                if (savedAddresses.length === 0) {
                  router.push('/location/saved-addresses');
                }
              }
            } catch (err) {
              console.warn('Request permission error:', err);
            }
          }
        }}
        hasSavedAddresses={savedAddresses.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white, // unified background — no gray/white contrast lines
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  premiumStickyHeader: {
    backgroundColor: Colors.white,
    zIndex: 10,
    elevation: 0,
    paddingBottom: 0,
  },
  heroBannerAiry: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerTopRowAiry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationAiry: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  locationIconWrapAiry: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 0, 0.15)', // transparent saffron on navy
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  locationTextWrapAiry: {
    flex: 1,
  },
  locationLabelAiry: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  locationTitleRowAiry: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitleAiry: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.4,
  },
  locationSubtitleAiry: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  langBtnAiry: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  langBtnTextAiry: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: Colors.white,
  },
  searchContainerAiry: {
    marginTop: -28, // Negative margin pulls it up over the banner
    paddingHorizontal: 20,
    marginBottom: 20, // Space below it for the next section
    zIndex: 10,
  },
  searchBarAiry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.round, // Pill shape
    paddingHorizontal: 16,
    height: 58, // Plush, tall search bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8, // Very strong shadow to look like it's floating high
  },
  searchIconAiry: {
    marginRight: 12,
  },
  jobsBadgeAiry: {
    position: 'absolute',
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.saffronLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.round,
  },
  pulseDotAiry: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.saffron,
    marginRight: 4,
  },
  jobsBadgeTextAiry: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.saffronDark,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  langSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  langSheetTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  langSheetDivider: {
    height: 1,
    backgroundColor: Colors.gray2,
    marginBottom: 16,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: Colors.gray1,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  langOptionActive: {
    backgroundColor: Colors.saffronLight,
    borderColor: Colors.saffron,
  },
  langGlyphCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  langGlyphCircleActive: {
    backgroundColor: Colors.saffron,
  },
  langGlyphText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink2,
  },
  langGlyphTextActive: {
    color: Colors.white,
  },
  langTextContainer: {
    flex: 1,
  },
  langOptionSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    marginTop: 2,
  },
  langOptionLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
    flex: 1,
  },
  langOptionLabelActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.saffron,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.round,
    paddingHorizontal: 18,
    height: 54,
    position: 'relative',
    borderWidth: 0,
    ...Shadow.lg,
    marginTop: 0,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    height: '100%',
    zIndex: 2,
  },
  placeholderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 46,
    zIndex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  placeholderStatic: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.gray4,
  },
  placeholderAnimated: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.saffron,
  },
  chipsContainer: { marginVertical: 4 },
  chipsInner: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  chipActive: {
    backgroundColor: Colors.saffronLight,
    borderColor: Colors.saffron,
  },
  chipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.ink2,
  },
  chipTextActive: {
    color: Colors.saffronDark,
    fontFamily: FontFamily.bodySemiBold,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  sortLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  sortOptions: { flexDirection: 'row', gap: 6 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  sortChipActive: {
    backgroundColor: Colors.saffronLight,
    borderColor: Colors.saffron,
  },
  sortChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  sortChipTextActive: {
    color: Colors.saffronDark,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
    paddingTop: 6,   // tighter — closer to CategorySection
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    color: Colors.ink,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  jobCountBadge: {
    backgroundColor: Colors.saffronLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
  },
  jobCountText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: Colors.saffronDark,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    textAlign: 'center',
    marginBottom: 16,
  },
  clearBtn: {
    backgroundColor: Colors.saffron,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  clearBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.white,
  },
  spotlightContainer: {
    paddingVertical: 14,
    backgroundColor: Colors.white, // already white — matches screen now
  },
  spotlightTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  spotlightList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  spotlightCard: {
    width: 250,
    backgroundColor: '#0F172A', // Deep slate dark
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.25)', // glowing gold accent border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  spotlightCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,179,0,0.12)', // glowing gold background
  },
  spotlightBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.round,
  },
  spotlightBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 8.5,
    color: '#2E7D32',
  },
  spotlightContent: {
    marginBottom: 10,
  },
  spotlightJobTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: Colors.white, // bright white title
  },
  spotlightPoster: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10.5,
    color: '#94A3B8', // sleek slate grey
    marginTop: 1,
  },
  spotlightPay: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: '#FFB300', // Saffron Gold
  },
  spotlightPaySub: {
    fontFamily: FontFamily.body,
    fontSize: 8.5,
    color: '#94A3B8',
  },
  spotlightFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)', // micro clean line
    paddingTop: 8,
  },
  spotlightDistance: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: '#38BDF8', // soft sky blue for location
    marginTop: 1,
  },
  spotlightAction: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10.5,
    color: '#FFB300', // gold apply action
  },
});

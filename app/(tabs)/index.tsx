import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
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
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { useQuery } from '@tanstack/react-query';
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

import { useApplicationStore } from '../../src/store/applicationStore';
import { useJobStore } from '../../src/store/jobStore';
import { formatDistance, haversineDistance } from '../../src/utils/helpers';
import type { Job, JobCategory } from '../../src/types';
import { CategorySection, CategoryItem } from '../../src/components/molecules/CategorySection';
import { FilterBar } from '../../src/components/molecules/FilterBar';
import { useFilterStore } from '../../src/store/filterStore';
import { fetchRecommendedJobs } from '../../src/services/api';
import { RoleSwitcher } from '../../src/components/atoms/RoleSwitcher';
import { CommonNavbar } from '../../src/components/organisms/CommonNavbar';
import Reanimated, { FadeInDown, FadeOutLeft, SlideInDown, SlideOutUp } from 'react-native-reanimated';

const LANGUAGES = [
  { key: 'en' as const, label: 'English', glyph: 'A', native: 'EN', sub: 'English' },
  { key: 'hi' as const, label: 'हिन्दी', glyph: 'अ', native: 'हि', sub: 'Hindi' },
  { key: 'te' as const, label: 'తెలుగు', glyph: 'అ', native: 'తె', sub: 'Telugu' },
];

const CATEGORIES: CategoryItem[] = [
  { id: 'all', name: 'All Gigs', iconName: 'grid-outline', bgColor: '#E3F2FD', iconColor: '#1E88E5' },
  { id: 'urgent', name: 'Urgent', iconName: 'flash-outline', bgColor: '#FFF8E1', iconColor: '#FFB300', badge: 'HOT' },
  { id: 'delivery', name: 'Delivery', iconName: 'bicycle-outline', bgColor: '#FFF3E0', iconColor: '#F57C00' },
  { id: 'driver', name: 'Driver', iconName: 'car-outline', bgColor: '#E0F2F1', iconColor: '#00695C' },
  { id: 'warehouse', name: 'Warehouse', iconName: 'cube-outline', bgColor: '#FBE9E7', iconColor: '#D84315' },
  { id: 'construction', name: 'Construction', iconName: 'hammer-outline', bgColor: '#EFEBE9', iconColor: '#6D4C41' },
  { id: 'cleaning', name: 'Cleaning', iconName: 'brush-outline', bgColor: '#FFFDE7', iconColor: '#FBC02D' },
  { id: 'cooking', name: 'Cooking', iconName: 'restaurant-outline', bgColor: '#FCE4EC', iconColor: '#C2185B' },
  { id: 'security', name: 'Security', iconName: 'shield-checkmark-outline', bgColor: '#ECEFF1', iconColor: '#37474F' },
  { id: 'shop_helper', name: 'Shop', iconName: 'storefront-outline', bgColor: '#E8F5E9', iconColor: '#43A047' },
  { id: 'office_assistant', name: 'Office', iconName: 'desktop-outline', bgColor: '#E0F7FA', iconColor: '#00ACC1' },
  { id: 'electrician', name: 'Electrician', iconName: 'flash-outline', bgColor: '#FFF8E1', iconColor: '#FBC02D' },
  { id: 'plumber', name: 'Plumber', iconName: 'water-outline', bgColor: '#E3F2FD', iconColor: '#1976D2' },
  { id: 'mechanic', name: 'Mechanic', iconName: 'construct-outline', bgColor: '#ECEFF1', iconColor: '#546E7A' },
  { id: 'painter', name: 'Painter', iconName: 'color-palette-outline', bgColor: '#F3E5F5', iconColor: '#8E24AA' },
  { id: 'carpenter', name: 'Carpenter', iconName: 'cut-outline', bgColor: '#EFEBE9', iconColor: '#8D6E63' },
  { id: 'event_staff', name: 'Events', iconName: 'sparkles-outline', bgColor: '#F3E5F5', iconColor: '#8E24AA' },
  { id: 'hotel_staff', name: 'Hotel', iconName: 'bed-outline', bgColor: '#E8EAF6', iconColor: '#558B2F' },
  { id: 'restaurant_staff', name: 'Food', iconName: 'fast-food-outline', bgColor: '#FFEBEE', iconColor: '#E53935' },
  { id: 'factory_worker', name: 'Factory', iconName: 'business-outline', bgColor: '#ECEFF1', iconColor: '#455A64' },
  { id: 'household_work', name: 'Household', iconName: 'home-outline', bgColor: '#E8F5E9', iconColor: '#2E7D32' },
  { id: 'gardening', name: 'Gardening', iconName: 'leaf-outline', bgColor: '#F1F8E9', iconColor: '#33691E' },
  { id: 'caregiver', name: 'Caregiver', iconName: 'heart-outline', bgColor: '#FCE4EC', iconColor: '#D81B60' },
  { id: 'technician', name: 'Tech', iconName: 'hardware-chip-outline', bgColor: '#E8EAF6', iconColor: '#3F51B5' },
  { id: 'sales_promoter', name: 'Sales', iconName: 'megaphone-outline', bgColor: '#FFF3E0', iconColor: '#EF6C00' },
  { id: 'loading_unloading', name: 'Cargo', iconName: 'cart-outline', bgColor: '#FFF8E1', iconColor: '#F57F17' },
  { id: 'other', name: 'Other', iconName: 'ellipsis-horizontal-outline', bgColor: '#FAFAFA', iconColor: '#616161' },
];

const PAGE_LIMIT = 10;

/** Fixed layout — pinned chrome must never change height on category switch */
const JOB_LIST_TOP_GAP = 10;
/** Title block: gap below categories + row — used for scroll collapse */
const STICKY_TITLE_ROW_HEIGHT = 48;
const STICKY_STACK_VISIBLE_HEIGHT = 130;
const SCROLL_ABOVE_STICKY_ESTIMATE = 380;
/** Categories + filters only (no title) — fixed overlay when scrolled past header */
const PINNED_CHROME_HEIGHT = 114;

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
    <View style={[[StyleSheet.absoluteFill, styles.placeholderWrap], { pointerEvents: "none" }]}>
      <Text style={styles.placeholderStatic}>Search </Text>
      <Animated.View style={{ transform: [{ translateY }], opacity, flex: 1 }}>
        <Text style={styles.placeholderAnimated}>
          {SEARCH_PLACEHOLDERS[index]}
        </Text>
      </Animated.View>
    </View>
  );
};

interface ApplicationStep {
  label: string;
  status: 'completed' | 'active' | 'pending';
  date: string;
  iconName: string;
}

interface ActiveApplication {
  id: string;
  title: string;
  company: string;
  pay: string;
  statusText: string;
  statusType: 'interview' | 'review' | 'offer';
  steps: ApplicationStep[];
  alertIcon: string;
  alertTitle: string;
  alertText: string;
  ctaText: string;
  ctaAction: string;
  hasActionBadge?: boolean;
}

// Mock active applications array removed. 
// We will rely on real data from useApplicationStore.

// Staggered premium entrance animation card
const StaggeredCard = React.memo(({ children, index, style, activeOpacity, onPress }: {
  children: React.ReactNode;
  index: number;
  style: any;
  activeOpacity: number;
  onPress: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.90)).current;
  // Subtle glowing border pulse
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.min(index * 90, 450);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 7,
        tension: 52,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 52,
        delay,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After entrance, run a gentle glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    });
  }, [index]);

  const borderOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.65],
  });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: translateYAnim },
          { scale: scaleAnim }
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { lat, lng, locationName } = useLocationStore();
  const { language, setLanguage, currentRole, setRole } = useUIStore();
  const { savedAddresses, getActive, isLoaded, loadFromStorage } = useAddressStore();
  const { myApplications, receivedApplications, fetchReceivedApplications, fetchMyApplications, updateApplicationStatus } = useApplicationStore();
  const { myPostedJobs, fetchMyJobs, cachedFeed, setCachedFeed } = useJobStore();
  // ── Realtime: track new job toast ─────────────────────────────────────────
  const [newJobCount, setNewJobCount] = useState(0);
  const newJobTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When cachedFeed changes (via prependToFeed), check for _isNew entries
  const prevFeedLengthRef = useRef(cachedFeed.length);
  useEffect(() => {
    if (cachedFeed.length > prevFeedLengthRef.current) {
      const diff = cachedFeed.length - prevFeedLengthRef.current;
      setNewJobCount((c) => c + diff);
      // Auto-dismiss badge after 4 seconds
      if (newJobTimerRef.current) clearTimeout(newJobTimerRef.current);
      newJobTimerRef.current = setTimeout(() => setNewJobCount(0), 4000);
    }
    prevFeedLengthRef.current = cachedFeed.length;
  }, [cachedFeed.length]);
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleJobPress = useCallback((job: any) => {
    router.push(`/job/${job.id}` as any);
  }, []);

  const renderSpotlightItem = useCallback(({ item, index }: { item: any, index: number }) => {
    const matchPct = [98, 95, 92, 88][index] ?? 85;
    const catInfo = CATEGORIES.find(c => c.id === item.category) || { iconName: 'briefcase-outline' };
    return (
      <StaggeredCard
        index={index}
        style={styles.spotlightCard}
        activeOpacity={0.88}
        onPress={() => handleJobPress(item)}
      >
        {/* Glowing top accent bar */}
        <View style={styles.scAccentBar} />

        <View style={styles.scRow1}>
          <View style={styles.scIconBox}>
            <Ionicons name={catInfo.iconName as any} size={18} color={Colors.saffron} />
          </View>
          <Text style={styles.scTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        <View style={styles.scRow2}>
          <View style={styles.scProviderGroup}>
            <Text style={styles.scProvider} numberOfLines={1}>{item.poster_name}</Text>
            <View style={styles.scRating}>
              <Ionicons name="star" size={10} color={Colors.gold} />
              <Text style={styles.scRatingText}> {item.poster_rating}</Text>
            </View>
          </View>
          <View style={styles.scMatchBadge}>
            <Text style={styles.scMatchText}>{matchPct}% match</Text>
          </View>
        </View>
        <View style={styles.scDivider} />
        <View style={styles.scFooter}>
          <View style={styles.scPayBlock}>
            <Text style={styles.scPay}>₹{item.pay_amount}</Text>
            <Text style={styles.scPaySub}>/{item.pay_type}</Text>
          </View>
          <View style={styles.scDistBlock}>
            <Ionicons name="location-outline" size={10} color="#FF9A50" />
            <Text style={styles.scDist}>{item.distance_km != null ? Number(item.distance_km).toFixed(1) : 'N/A'}km</Text>
          </View>
          <TouchableOpacity
            style={styles.scApplyBtn}
            activeOpacity={0.82}
            onPress={() => handleJobPress(item)}
          >
            <Text style={styles.scApplyText}>Apply</Text>
            <Ionicons name="arrow-forward" size={11} color={Colors.white} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </StaggeredCard>
    );
  }, [handleJobPress]);

  // ── Scroll-driven animations ──────────────────────────────────────────────
  const { height: windowHeight } = useWindowDimensions();
  const mainScrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const navTranslateY = useRef(new Animated.Value(0)).current;
  const isNavHiddenRef = useRef(false);
  // Height of the banner (measured on layout)
  const bannerHeight = useRef(0);

  // Dynamic header stuck tracking for sizing transitions
  const [stickyHeaderY, setStickyHeaderY] = useState(380);
  const stickyHeaderYRef = useRef(380);
  const stickyHeaderMeasuredRef = useRef(false);
  const inlineChromeHeightRef = useRef(0);
  const isHeaderStuckRef = useRef(false);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);

  // Smooth collapse/fade animations for the "Jobs Near You" title row
  const titleStartShrink = Math.max(0, stickyHeaderY - 80);
  const titleEndShrink = Math.max(0, stickyHeaderY);

  const animatedTitleOpacity = scrollY.interpolate({
    inputRange: [0, titleStartShrink, titleEndShrink - 20],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  

  const BOTTOM_NAV_HEIGHT = Platform.OS === 'ios' ? 82 : 62;

  const [activeViewRole, setActiveViewRole] = useState(currentRole);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<'seeker' | 'provider'>('seeker');
  const transitionFade = useRef(new Animated.Value(0)).current;
  const transitionScale = useRef(new Animated.Value(0.9)).current;
  const transitionSlide = useRef(new Animated.Value(20)).current;

  const handleRoleSwitchRequest = (role: 'seeker' | 'provider') => {
    if (role === currentRole || isTransitioning) return;
    
    setTransitionTarget(role);
    setIsTransitioning(true);
    
    Animated.parallel([
      Animated.timing(transitionFade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(transitionScale, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.timing(transitionSlide, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setRole(role);
      setActiveViewRole(role);
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(transitionFade, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.timing(transitionScale, { toValue: 1.1, duration: 350, useNativeDriver: true }),
          Animated.timing(transitionSlide, { toValue: -20, duration: 350, useNativeDriver: true }),
        ]).start(() => {
          setIsTransitioning(false);
          transitionScale.setValue(0.9);
          transitionSlide.setValue(20);
        });
      }, 600);
    });
  };

  

  useEffect(() => {
      if (currentRole === 'provider' && user?.id) {
        fetchReceivedApplications(user.id);
        fetchMyJobs(user.id);
      } else if (currentRole === 'seeker' && user?.id) {
        fetchMyApplications(user.id);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole, user?.id]);

  const [showLangModal, setShowLangModal] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const trackerModalAnim = useRef(new Animated.Value(0)).current;
  const [activeAppIndex, setActiveAppIndex] = useState(0);

  const openTrackerModal = () => {
    setShowTrackerModal(true);
    Animated.timing(trackerModalAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeTrackerModal = () => {
    Animated.timing(trackerModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowTrackerModal(false);
    });
  };

  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [promptSheetMode, setPromptSheetMode] = useState<'gps_off' | 'permission_needed'>('gps_off');

  const [searchQuery, setSearchQuery] = useState('');

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
  const [radiusKm, setRadiusKm] = useState(10); // default 10 km radius

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

  // ── Live radar pulse animation loop ──
  const radarPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(radarPulse, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      })
    ).start();
  }, [radarPulse]);

  // Interpolated scaling and opacity for dual rings
  const pulseScale1 = radarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });
  const pulseOpacity1 = radarPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  const pulseScale2 = radarPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });
  const pulseOpacity2 = radarPulse.interpolate({
    inputRange: [0, 0.4, 0.8, 1],
    outputRange: [0.4, 0.3, 0.1, 0],
  });

  const liveDotOpacity = radarPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  // Assembly of full detailed location details on a single line
  const completeAddress = useMemo(() => {
    if (activeAddr) {
      const parts = [
        activeAddr.flatHouse,
        activeAddr.floor ? `${activeAddr.floor}F` : null,
        activeAddr.street,
        activeAddr.area,
        activeAddr.landmark ? `nr ${activeAddr.landmark}` : null,
        activeAddr.city,
        activeAddr.pincode
      ].filter(Boolean);

      const labelSymbol = activeAddr.label === 'home' ? '🏠 Home' : activeAddr.label === 'work' ? '💼 Work' : '📍 ' + activeAddr.label.toUpperCase();
      return `${labelSymbol} • ${parts.join(', ')}`;
    }
    return `📍 ${locationName ?? 'Ameerpet, Hyderabad'}`;
  }, [activeAddr, locationName]);

  const userLat = lat ?? 17.4344;
  const userLng = lng ?? 78.4497;

  // Dynamic skill matching for categories
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

  // React Query for matching engine
  const { isPending: isLoadingJobs, isFetching: isFetchingJobs, error, data: jobsData, refetch } = useQuery({
    queryKey: ['recommendedJobs', userLat, userLng, sortBy, payTypeFilter, selectedCategory, user, searchQuery],
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      // In a real app we'd get the user from auth state
      const matchingParams = {
        user: user || {},
        location: { latitude: userLat, longitude: userLng },
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        searchTerm: searchQuery, // Passing search query to Trigger FTS search matching
        filters: {
          sort_by: sortBy === 'pay' ? 'pay_high_to_low' : sortBy === 'distance' ? 'distance' : 'date_posted',
          min_pay: undefined,
        },
      };
      return fetchRecommendedJobs(matchingParams as any); // Type cast due to simplified properties
    },
    // Don't run query if location relies on it
    enabled: true,
  });

  // Calculate matching jobs count based on filter matches, not display count.
  useEffect(() => {
    // Cache the latest successful fetch for offline support
    if (jobsData && jobsData.length > 0) {
      setCachedFeed(jobsData);
    }
  }, [jobsData, setCachedFeed]);

  // Merge real-time cachedFeed updates with fetched data (cachedFeed is prepended by socket events)
  const processedJobs = cachedFeed.length > 0 ? cachedFeed : (jobsData || []);

  // Constant suggestions based on matching jobs
  const suggestedJobs = useMemo(() => {
    return jobsData ? jobsData.slice(0, 4) : [];
  }, [jobsData]);

  // Filter by radius then apply pagination
  const filteredJobs = useMemo(() => {
    return processedJobs.filter((job: any) =>
      job.distance_km == null || job.distance_km <= radiusKm
    );
  }, [processedJobs, radiusKm]);

  const totalPages = Math.ceil(filteredJobs.length / PAGE_LIMIT);
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const scrollContainerMinHeight = useMemo(() => {
    const isSearchOrEmpty = filteredJobs.length === 0;
    if (isSearchOrEmpty && !isLoadingJobs && !isFetchingJobs) {
      return stickyHeaderYRef.current + windowHeight - BOTTOM_NAV_HEIGHT;
    }
    return windowHeight + (stickyHeaderYRef.current > 0 ? stickyHeaderYRef.current : 300) + 100;
  }, [filteredJobs.length, isLoadingJobs, isFetchingJobs, windowHeight, BOTTOM_NAV_HEIGHT]);

  const jobListMinHeight = useMemo(() => {
    const headerOffset = isHeaderStuck
      ? STICKY_STACK_VISIBLE_HEIGHT
      : SCROLL_ABOVE_STICKY_ESTIMATE;
    return windowHeight - headerOffset - BOTTOM_NAV_HEIGHT;
  }, [windowHeight, BOTTOM_NAV_HEIGHT, isHeaderStuck]);

  useEffect(() => {
    stickyHeaderYRef.current = stickyHeaderY;
  }, [stickyHeaderY]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const greetingIcon = () => {
    const h = new Date().getHours();
    if (h < 17) return 'sunny';
    return 'moon';
  };





  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const dy = y - lastScrollY.current;

        // Hide nav on scroll down, show on scroll up (with stability guards to prevent animation bridges flooding)
        if (dy > 4 && y > 60) {
          if (!isNavHiddenRef.current) {
            isNavHiddenRef.current = true;
            Animated.spring(navTranslateY, {
              toValue: BOTTOM_NAV_HEIGHT,
              useNativeDriver: true,
              friction: 10,
              tension: 80,
            }).start();
          }
        } else if (dy < -4) {
          if (isNavHiddenRef.current) {
            isNavHiddenRef.current = false;
            Animated.spring(navTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 10,
              tension: 80,
            }).start();
          }
        }

        // Dynamically track stuck state for categories size transitions
        const stuck = y >= stickyHeaderY - 2;
        if (stuck !== isHeaderStuckRef.current) {
          isHeaderStuckRef.current = stuck;
          setIsHeaderStuck(stuck);
        }

        lastScrollY.current = y;
      },
    }
  );

  const handleSelectCategory = useCallback((id: string) => {
    if (id === selectedCategory) return;
    setSelectedCategory(id);
    setPage(1);
    // Do not scroll when pinned — overlay is position:fixed, not ScrollView sticky
  }, [selectedCategory]);

  const renderSeekerChrome = useCallback((mode: 'inline' | 'pinned') => {
    const isPinned = mode === 'pinned';
    return (
      <View
        style={[
          styles.premiumStickyHeader,
          isPinned ? styles.seekerChromePinned : styles.seekerChromeInline,
        ]}
        onLayout={isPinned ? undefined : (e) => {
          const { y: layoutY, height } = e.nativeEvent.layout;
          if (height > 0) {
            inlineChromeHeightRef.current = height;
          }
          if (layoutY > 0 && !stickyHeaderMeasuredRef.current) {
            stickyHeaderMeasuredRef.current = true;
            stickyHeaderYRef.current = layoutY;
            setStickyHeaderY(layoutY);
          }
        }}
      >
        <CategorySection
          categories={dynamicCategories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={handleSelectCategory}
          isCompact={isPinned}
          scrollY={isPinned ? undefined : scrollY}
          stickyHeaderY={stickyHeaderY}
          freezeLayout={isPinned}
        />

        {!isPinned && (
          <Animated.View
            style={[
              styles.sectionHead,
              {
                opacity: animatedTitleOpacity,
                
                overflow: 'hidden',
              },
            ]}
          >
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="location" size={14} color="#E91E63" />
              </View>
              <Text style={styles.sectionTitle}>Jobs Near You</Text>
              <View style={styles.radiusDistanceBadge}>
                <Text style={styles.radiusDistanceBadgeText}>within {radiusKm} km</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={[styles.combinedFiltersRow, isPinned && styles.combinedFiltersRowPinned]}>
          <FilterBar
            sortBy={sortBy}
            payTypeFilter={payTypeFilter}
            onSortChange={(s) => { setSortBy(s); setPage(1); }}
            onPayTypeChange={(t) => { setPayTypeFilter(t); setPage(1); }}
            radiusKm={radiusKm}
            onRadiusDecrement={() => { if (radiusKm > 1) { setRadiusKm((prev) => prev - 1); setPage(1); } }}
            onRadiusIncrement={() => { if (radiusKm < 20) { setRadiusKm((prev) => prev + 1); setPage(1); } }}
            minRadiusKm={1}
            maxRadiusKm={20}
            onReset={() => { resetFilters(); setPage(1); }}
          />
        </View>
      </View>
    );
  }, [
    dynamicCategories,
    selectedCategory,
    handleSelectCategory,
    scrollY,
    stickyHeaderY,
    animatedTitleOpacity,
    radiusKm,
    sortBy,
    payTypeFilter,
    setSortBy,
    setPayTypeFilter,
    setRadiusKm,
    setPage,
    resetFilters,
  ]);

  const renderFooter = () => (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      total={filteredJobs.length}
      limit={PAGE_LIMIT}
      onPageChange={(p) => setPage(p)}
    />
  );

  const renderEmpty = () => {
    const emptyHeight = jobListMinHeight - 40;
    return (
      <View style={[styles.emptyState, { minHeight: Math.max(emptyHeight, 300), justifyContent: 'center' }]}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>No jobs found nearby</Text>
        <Text style={styles.emptySub}>Try changing filters or search terms</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedCategory('all')}>
          <Text style={styles.clearBtnText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      

      <View style={styles.scrollHost}>
        {/* ── Single scrollable surface ── */}
        <Animated.ScrollView
          style={styles.mainScroll}
          ref={mainScrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: BOTTOM_NAV_HEIGHT + 40,
            minHeight: scrollContainerMinHeight,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.saffron}
              colors={[Colors.saffron]}
            />
          }
        // No stickyHeaderIndices — pinned chrome uses a fixed overlay to avoid layout drift
        >
          {/* ── 0: Hero banner ── */}
          <View onLayout={(e) => { bannerHeight.current = e.nativeEvent.layout.height; }}>
                        <LinearGradient
              colors={activeViewRole === 'seeker' ? ['#1E293B', '#0F172A'] : ['#004DEB', '#0039B3']}
              style={[styles.heroBannerPremium, { paddingTop: Math.max(insets.top, 10) + 4, paddingBottom: 16 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <CommonNavbar />

              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <RoleSwitcher onSwitchRequest={handleRoleSwitchRequest} />
              </View>

              {/* Row 2: Location Capsule */}
              <TouchableOpacity
                style={styles.locationCapsulePremium}
                activeOpacity={0.85}
                onPress={() => router.push('/location/saved-addresses')}
              >
                <View style={styles.locationCapsuleLeft}>
                  <View style={styles.locationPinCirclePremium}>
                    <Ionicons name="compass" size={15} color={Colors.saffron} />
                  </View>

                  <View style={styles.locationDetails}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.locationLabelTextPremium}>YOUR ACTIVE GIG ZONE</Text>
                      <Animated.View style={[styles.locationLivePulseDot, { opacity: liveDotOpacity }]} />
                    </View>
                    <Text style={styles.locationAddressTextPremium} numberOfLines={1} ellipsizeMode="tail">
                      {completeAddress}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Seeker search bar or spacer */}
            {activeViewRole === 'seeker' ? (
              <Animated.View style={[styles.searchContainerAiry, { opacity: searchFade, transform: [{ scale: searchScale }] }]}>
                <TouchableOpacity
                  style={styles.searchBarAiry}
                  activeOpacity={0.85}
                  onPress={() => router.push('/search')}
                >
                  <Ionicons name="search" size={20} color={Colors.saffron} style={styles.searchIconAiry} />
                  <AnimatedPlaceholder active={false} />

                  <View style={styles.jobsBadgeAiry}>
                    <View style={styles.pulseDotAiry} />
                    <Text style={styles.jobsBadgeTextAiry}>{filteredJobs.length} nearby</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={{ height: 16 }} />
            )}
          </View>

          {/* Dynamic content wrapper — child[1]: pre-sticky content with role crossfade */}
          <View>
            {activeViewRole === 'seeker' ? (
              // Seeker: show suggestions only (rest moves to child[2] and child[3])
              suggestedJobs.length > 0 ? (
                <View style={styles.spotlightContainer}>
                  {/* Header */}
                  <View style={styles.spotlightTitleRow}>
                    <View>
                      <Text style={styles.spotlightTitle}>💡 Suggested For You</Text>
                      <Text style={styles.spotlightSubtitle}>Based on your skills & location</Text>
                    </View>
                    <TouchableOpacity style={styles.spotlightTrackerWidget} activeOpacity={0.8} onPress={openTrackerModal}>
                      <View style={styles.spotlightTrackerIconCircle}>
                        <Ionicons name="briefcase-outline" size={13} color={Colors.saffron} />
                        <View style={styles.spotlightBtnBadgeDot} />
                      </View>
                      <Text style={styles.spotlightTrackerLabel}>My Status</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Card list */}
                  <FlatList
                    horizontal
                    data={suggestedJobs}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={252}
                    decelerationRate="fast"
                    snapToAlignment="start"
                    initialNumToRender={2}
                    windowSize={3}
                    removeClippedSubviews={true}
                    contentContainerStyle={styles.spotlightList}
                    renderItem={renderSpotlightItem}
                  />
                </View>
              ) : null
            ) : (
              // ============ JOB PROVIDER WORKFLOW ============
              <View style={styles.providerContainer}>
                {/* Personalized Greeting */}
                <View style={styles.providerGreetingCard}>
                  <Text style={styles.providerGreetingText}>Welcome Back, Sai 💼</Text>
                  <Text style={styles.providerSubText}>Here is your real-time recruitment overview</Text>
                </View>

                {/* Hiring Overview Metric Grid */}
                <View style={styles.metricsGrid}>
                  {[
                    { label: 'Active Jobs', value: `${(myPostedJobs || []).filter(j => j?.status === 'active').length} Active`, color: '#92763B', bg: '#F5F1E6', icon: 'briefcase' },
                    { label: 'Applicants', value: `${(receivedApplications || []).length} Total`, color: '#9A3412', bg: '#FFEDD5', icon: 'people' },
                    { label: 'Pending Reviews', value: `${(receivedApplications || []).filter(a => a?.status === 'pending').length} Review`, color: '#4D5D3B', bg: '#EAF0E1', icon: 'time' },
                    { label: 'Hiring Speed', value: '92% Rate', color: '#57534E', bg: '#F5F5F4', icon: 'flash' },
                  ].map((metric) => (
                    <View key={metric.label} style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <Text style={styles.metricLabel}>{metric.label}</Text>
                        <View style={[styles.metricIconBox, { backgroundColor: metric.bg }]}>
                          <Ionicons name={metric.icon as any} size={16} color={metric.color} />
                        </View>
                      </View>
                      <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={[styles.providerPostCta, Shadow.sm]} activeOpacity={0.85} onPress={() => router.push('/job/post' as any)}>
                  <View style={styles.providerCtaIcon}>
                    <Ionicons name="add" size={24} color={'#005B5C'} />
                  </View>
                  <Text style={styles.providerCtaText}>Post a New Gig Listing Instantly</Text>
                </TouchableOpacity>

                <View style={styles.providerSectionHeader}>
                  <Text style={styles.providerSectionTitle}>Recent Applicants</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/my-jobs' as any)}>
                    <Text style={styles.providerViewAll}>View All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.applicantsList}>
                  {receivedApplications.slice(0, 3).map((appl) => {
                    const applicantUser = (appl.applicant as any) || (user as any) || {};
                    return (
                      <View key={appl.id} style={styles.applicantRowCard}>
                        <View style={styles.applicantRowHeader}>
                          <View style={styles.applicantAvatarBox}>
                            <Text style={styles.applicantAvatarText}>{applicantUser?.name?.charAt(0) ?? 'U'}</Text>
                          </View>
                          <View style={styles.applicantRowInfo}>
                            <Text style={styles.applicantRowName}>{applicantUser?.name}</Text>
                            <Text style={styles.applicantRowMeta}>⭐ {applicantUser.worker_rating ? parseFloat(applicantUser.worker_rating).toFixed(1) : '4.5'} • {applicantUser.jobs_completed || 0} Gigs Completed • 1.2 km away</Text>
                          </View>
                        </View>
                        <View style={styles.applicantSkillsGrid}>
                          {(applicantUser.skills || []).slice(0, 3).map((sk: string) => (
                            <View key={sk} style={styles.skillPillBox}>
                              <Text style={styles.skillPillText}>{sk}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.applicantRowActions}>
                          <TouchableOpacity style={[styles.applicantRowBtn, styles.btnShortlist]} onPress={() => {
                            updateApplicationStatus(appl.id, 'accepted');
                            useUIStore.getState().showToast(`${applicantUser.name} Accepted!`, 'success');
                          }}>
                            <Text style={styles.btnShortlistText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.applicantRowBtn} onPress={() => useUIStore.getState().showToast(`Calling ${applicantUser.name}...`, 'info')}>
                            <Text style={styles.btnActionText}>Call</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.applicantRowBtn} onPress={() => router.push('/(tabs)/inbox' as any)}>
                            <Text style={styles.btnActionText}>Chat</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.applicantRowBtn, styles.btnReject]} onPress={() => {
                            updateApplicationStatus(appl.id, 'rejected');
                            useUIStore.getState().showToast('Application rejected', 'info');
                          }}>
                            <Text style={styles.btnRejectText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  })}
                </View>


              </View>
            )}
          </View>

          {/* child[2]: Inline header OR fixed spacer — spacer keeps scroll offset stable when pinned */}
          {activeViewRole === 'seeker' ? (
            isHeaderStuck ? (
              <View style={{ height: PINNED_CHROME_HEIGHT }} />
            ) : (
              renderSeekerChrome('inline')
            )
          ) : (
            <View />
          )}

          {/* child[3]: Job cards — only for seeker */}
          {activeViewRole === 'seeker' && (
            <View
              style={[
                styles.jobListContainer,
                {
                  minHeight: jobListMinHeight,
                  paddingTop: JOB_LIST_TOP_GAP,
                }
              ]}
            >
              {isLoadingJobs && !jobsData
                ? [1, 2, 3].map((i) => <JobCardSkeleton key={i} />)
                : paginatedJobs.length === 0
                  ? renderEmpty()
                  : paginatedJobs.map((job: any) => (
                    <Reanimated.View
                      key={job.id}
                      entering={job._isNew ? FadeInDown.springify().damping(14) : undefined}
                      exiting={FadeOutLeft.duration(300)}
                    >
                      <JobCard
                        job={job}
                        onPress={handleJobPress}
                        onApply={handleJobPress}
                      />
                    </Reanimated.View>
                  ))
              }
              {renderFooter()}
            </View>
          )}
        </Animated.ScrollView>

        {/* ── Realtime: "New Nearby Job" floating badge ───────────────────── */}
        {newJobCount > 0 && (
          <Reanimated.View
            entering={SlideInDown.springify().damping(16)}
            exiting={SlideOutUp.duration(250)}
            style={{
              position: 'absolute',
              top: 16,
              alignSelf: 'center',
              backgroundColor: Colors.saffron,
              borderRadius: 24,
              paddingHorizontal: 18,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 999,
            }}
          >
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: Colors.white, marginRight: 8, opacity: 0.9
            }} />
            <Text style={{
              color: Colors.white,
              fontFamily: FontFamily.headingBold,
              fontSize: 14,
            }}>
              {newJobCount === 1 ? '1 New Nearby Job!' : `${newJobCount} New Nearby Jobs!`}
            </Text>
          </Reanimated.View>
        )}
        {/* ────────────────────────────────────────────────────────────────── */}

        {/* Fixed chrome — outside ScrollView so category taps never shift layout */}
        {activeViewRole === 'seeker' && isHeaderStuck && (
          <View style={[styles.pinnedChromeOverlay, { pointerEvents: "box-none" }]}>
            <View style={[styles.pinnedChromeOverlayInner, { pointerEvents: "auto" }]}>
              {renderSeekerChrome('pinned')}
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom nav — hides on scroll down, shows on scroll up ── */}
      <Animated.View
        style={[styles.bottomNavWrapper, { transform: [{ translateY: navTranslateY }] }]}
      >
        <BottomNav />
      </Animated.View>

      {/* Application tracker modal bottom sheet */}
      {showTrackerModal && (
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTrackerModal} />

          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: trackerModalAnim }
              , { pointerEvents: "box-none" }]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeTrackerModal} />

            <Animated.View
              style={[
                styles.trackerSheet,
                {
                  transform: [{
                    translateY: trackerModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.trackerSheetHandle} />

              <View style={styles.trackerSheetHeader}>
                <Ionicons name="briefcase" size={20} color={Colors.saffron} style={{ marginRight: 8 }} />
                <Text style={styles.trackerSheetTitle}>Application Status</Text>
                <TouchableOpacity style={styles.trackerCloseBtn} onPress={closeTrackerModal}>
                  <Ionicons name="close-circle" size={24} color={Colors.gray4} />
                </TouchableOpacity>
              </View>

              <View style={styles.trackerSheetDivider} />

              {/* Horizontal scrollable app selection tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trackerTabsScroll}
                style={{ marginBottom: 16 }}
              >
                {(useApplicationStore.getState().myApplications || []).slice(0, 5).map((app, idx) => (
                  <TouchableOpacity
                    key={app?.id || idx}
                    style={[
                      styles.trackerTabBtn,
                      activeAppIndex === idx && styles.trackerTabBtnActive
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setActiveAppIndex(idx)}
                  >
                    <Text style={[
                      styles.trackerTabBtnText,
                      activeAppIndex === idx && styles.trackerTabBtnTextActive
                    ]}>
                      {app?.job?.title || 'Job Application'}
                    </Text>
                    {app?.status === 'accepted' && (
                      <View style={styles.trackerTabBadgePulse} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Application Details */}
              {(() => {
                const currentApp = useApplicationStore.getState().myApplications[activeAppIndex] || useApplicationStore.getState().myApplications[0];
                if (!currentApp) return <Text style={{padding: 20, textAlign: 'center'}}>No active applications</Text>;
                return (
                  <View style={styles.trackerJobCard}>
                    <View style={styles.trackerJobHeader}>
                      <Text style={styles.trackerJobTitle}>{currentApp.job?.title || 'Unknown Job'}</Text>
                      <View style={[
                        styles.trackerStatusBadge,
                        currentApp?.status === 'pending' && styles.trackerBadgeBlue,
                        currentApp?.status === 'accepted' && styles.trackerBadgeGreen,
                      ]}>
                        <Text style={[
                          styles.trackerStatusText,
                          currentApp?.status === 'pending' && styles.trackerStatusTextBlue,
                          currentApp?.status === 'accepted' && styles.trackerStatusTextGreen,
                        ]}>
                          {currentApp?.status?.toUpperCase() || ''}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.trackerJobCompany}>
                      <Ionicons name="business-outline" size={12} color={Colors.gray2} /> {currentApp?.job?.poster_name || 'Employer'} • {currentApp?.job?.pay_amount ? `₹${currentApp?.job?.pay_amount}` : 'TBD'}
                    </Text>

                    {/* Visual Timeline (Horizontal Stepper) */}
                    <View style={styles.stepperContainerHorizontal}>
                      <View style={styles.stepperProgressTrack}>
                        <View style={[
                          styles.stepperProgressFill,
                          { width: currentApp?.status === 'accepted' ? '100%' : '50%' },
                          currentApp?.status === 'accepted' && styles.stepperFillGreen,
                        ]} />
                      </View>

                      <View style={styles.stepperStepItem}>
                        <View style={[styles.stepperIconCircle, styles.stepperIconCircleCompleted]}>
                          <Ionicons name="document-text-outline" size={15} color={Colors.white} />
                        </View>
                        <Text style={[styles.stepperStepLabel, styles.stepperStepLabelCompleted]} numberOfLines={1}>Applied</Text>
                      </View>

                      <View style={styles.stepperStepItem}>
                        <View style={[
                          styles.stepperIconCircle,
                          currentApp?.status === 'accepted' ? styles.stepperIconCircleCompletedGreen : styles.stepperIconCircleActive
                        ]}>
                          <Ionicons name={currentApp?.status === 'accepted' ? "gift-outline" : "hourglass-outline"} size={15} color={currentApp?.status === 'accepted' ? Colors.white : Colors.saffronDark} />
                        </View>
                        <Text style={[
                          styles.stepperStepLabel,
                          currentApp?.status === 'accepted' ? styles.stepperStepLabelCompleted : styles.stepperStepLabelActive
                        ]} numberOfLines={1}>{currentApp?.status === 'accepted' ? 'Accepted' : currentApp?.status === 'rejected' ? 'Rejected' : 'Pending'}</Text>
                      </View>
                    </View>

                    {/* Footer scheduled details card */}
                    <View style={[
                      styles.trackerScheduleAlert,
                      currentApp?.status === 'pending' && styles.trackerAlertBlue,
                      currentApp?.status === 'accepted' && styles.trackerAlertGreen,
                    ]}>
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={
                          currentApp?.status === 'pending' ? '#1E88E5' :
                            currentApp?.status === 'accepted' ? '#2E7D32' :
                              Colors.saffronDark
                        }
                        style={{ marginRight: 8, marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.trackerAlertTitle,
                          currentApp?.status === 'pending' && styles.trackerAlertTitleBlue,
                          currentApp?.status === 'accepted' && styles.trackerAlertTitleGreen,
                        ]}>Application Status</Text>
                        <Text style={[
                          styles.trackerAlertText,
                          currentApp?.status === 'pending' && styles.trackerAlertTextBlue,
                          currentApp?.status === 'accepted' && styles.trackerAlertTextGreen,
                        ]}>
                          {currentApp?.status === 'pending' ? 'Your application has been received and is waiting for employer review.' : `The employer has marked your application as ${currentApp?.status || 'unknown'}.`}
                        </Text>
                      </View>
                    </View>

                    {/* Action button */}
                    <TouchableOpacity
                      style={[
                        styles.trackerActionBtn,
                        currentApp?.status === 'pending' && styles.trackerActionBtnBlue,
                        currentApp?.status === 'accepted' && styles.trackerActionBtnGreen,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        closeTrackerModal();
                      }}
                    >
                      <Text style={styles.trackerActionBtnText}>Close</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.white} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </Animated.View>
          </Animated.View>
        </View>
      )}

      {/* Language bottom sheet dropdown */}
      {showLangModal && (
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeLangModal} />

          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: modalAnim }
              , { pointerEvents: "box-none" }]}
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
      />
    
      {isTransitioning && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.transitionOverlay, { opacity: transitionFade }]}>
          <Animated.View style={[styles.transitionContent, { transform: [{ scale: transitionScale }, { translateY: transitionSlide }] }]}>
            <Animated.View style={styles.transitionIconWrap}>
              <Ionicons 
                name={transitionTarget === 'seeker' ? 'person' : 'business'} 
                size={48} 
                color={Colors.white} 
              />
            </Animated.View>
            <Text style={styles.transitionTitle}>
              Switching to {transitionTarget === 'seeker' ? 'Seeker' : 'Provider'}...
            </Text>
            <Text style={styles.transitionSub}>
              {transitionTarget === 'seeker' ? 'Finding opportunities' : 'Loading your workspace'}
            </Text>
            <ActivityIndicator size="large" color={Colors.saffron} style={{ marginTop: 24 }} />
          </Animated.View>
        </Animated.View>
      )}

    </View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background, // upgraded token: #F8F9FB
    overflow: 'hidden',
  },
  scrollHost: {
    flex: 1,
    position: 'relative',
  },
  mainScroll: {
    flex: 1,
  },
  jobListContainer: {
    backgroundColor: Colors.background,
    paddingTop: JOB_LIST_TOP_GAP,
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
    zIndex: 100,
    marginTop: 0,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.04)",
  },
  seekerChromeInline: {
    paddingTop: 6,
    paddingBottom: 0,
  },
  seekerChromePinned: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  pinnedChromeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PINNED_CHROME_HEIGHT,
    zIndex: 200,
  },
  pinnedChromeOverlayInner: {
    flex: 1,
    backgroundColor: Colors.white,
    boxShadow: "0px 2px 16px rgba(0,0,0,0.06)",
    overflow: 'visible',
  },
  radiusDistanceBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusDistanceBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.saffronDark,
  },
  heroBannerAiry: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 48,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroBannerPremium: {
    paddingHorizontal: 20,
    paddingTop: 12, 
    paddingBottom: 24, 
    borderBottomLeftRadius: 28, 
    borderBottomRightRadius: 28, 
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: "0px 4px 16px rgba(0,0,0,0.1)",
  },
  
  controlsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRoleSwitcherRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  transitionOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionContent: {
    alignItems: 'center',
  },
  transitionIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  transitionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
    color: Colors.white,
    marginBottom: 8,
  },
  transitionSub: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },

  headerTopRowPremium: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
    marginTop: 2,
    marginBottom: 4,
  },
  headerTopRowAiry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Colors.saffron,
  },
  brandIconPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    boxShadow: "0px 0px 12px rgba(255,107,0,0.6)",
  },
  brandTextPremium: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandAccentPremium: {
    color: Colors.saffron,
    textShadowColor: 'rgba(255, 107, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandIconPulsePremium: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    boxShadow: "0px 0px 16px rgba(255,107,0,0.8)",
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  roleSwitcherWrapper: {
    marginRight: 8,
  },
  langBtnAiry: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  langBtnTextAiry: {
    fontFamily: FontFamily.headingBold,
    fontSize: 12,
    color: Colors.white,
  },
  langBtnPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // High-end glassmorphism for dark UI
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  langBtnTextPremium: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xs,
    color: Colors.white,
  },
  controlsRowPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBtnPremium: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444', // Hot notification red
  },
  locationCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  locationCapsulePremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)', // Translucent glassmorphism for dark UI
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12, // Slightly moved up to optimize spacing
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: "0px 4px 16px rgba(0,0,0,0.12)",
    zIndex: 2,
  },
  locationCapsuleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationPinCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRadarWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.saffron,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  locationPinCirclePremium: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    zIndex: 3,
  },
  locationDetails: {
    marginLeft: 10,
    flex: 1,
  },
  locationLabelText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.6,
  },
  locationLabelTextPremium: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 7.5,
    color: 'rgba(255, 255, 255, 0.45)', // Translucent white caption
    letterSpacing: 0.8,
  },
  locationLivePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981', // Premium active emerald green
    marginLeft: 5,
    boxShadow: "0px 0px 6px rgba(16,185,129,0.6)",
  },
  locationAddressText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.white,
    marginTop: 1,
  },
  locationAddressTextPremium: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9.8,
    color: Colors.white, // Solid white text for dark UI readability
    marginTop: 1,
    letterSpacing: 0.15,
  },
  searchContainerAiry: {
    marginTop: -12, // Less negative margin to keep a premium visual gap below the location capsule
    paddingHorizontal: 20,
    marginBottom: 4, // Reduced space to pull suggestions closer
    zIndex: 10,
  },
  searchBarAiry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.round, // Pill shape
    paddingHorizontal: 16,
    height: 48, // Compact and sleek height
    boxShadow: "0px 8px 40px rgba(0,0,0,0.08)", // Floating high-depth shadow
  },
  searchIconAiry: {
    marginRight: 12,
  },
  jobsBadgeAiry: {
    position: 'absolute',
    right: 8,
    top: 9, // Centered vertically: (48 - badgeHeight) / 2
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.saffronLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    boxShadow: "0px -4px 20px rgba(0,0,0,0.1)",
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
    paddingLeft: 40, // Reduced from 46 for sleeker layout
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
    paddingTop: 8,
    paddingBottom: 6,
    height: 34,
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
  // ── Combined Filters Row ──────────────────────────────────────────
  combinedFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
  },
  combinedFiltersRowPinned: {
    paddingTop: 4,
    paddingBottom: 4,
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
  // ─────────────────────────────────────────────────────────────────
  // Spotlight / Suggestion Cards
  // ─────────────────────────────────────────────────────────────────
  spotlightContainer: {
    paddingTop: 20,
    paddingBottom: 22,
    // Rich deep navy premium gradient-like bg via solid deep tone
    backgroundColor: '#0F172A',
    marginTop: -3,
    borderBottomWidth: 0,
  },
  spotlightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  spotlightTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  spotlightSubtitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
  },
  spotlightTrackerWidget: {
    alignItems: 'center',
  },
  spotlightTrackerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,107,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.45)',
    marginBottom: 3,
  },
  spotlightTrackerLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
  },
  spotlightBtnBadgeDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.greenMid,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  spotlightList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  // ── Card itself ──────────────────────────────────────────────────
  spotlightCard: {
    width: 248,
    // Deep dark glass card with subtle warm tint
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.22)',
    boxShadow: "0px 8px 32px rgba(0,0,0,0.35), 0px 0px 0px 1px rgba(255,255,255,0.04)",
    overflow: 'hidden',
  },
  scAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.saffron,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.85,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spotlightIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 107, 0, 0.12)', // deeper saffron tint icon bg
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  spotlightMatchBadge: {
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.round,
  },
  spotlightMatchText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.green,
  },
  spotlightJobTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
    color: Colors.ink,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  spotlightCompanyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spotlightPoster: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray5,
    flex: 1,
    marginRight: 6,
  },
  spotlightRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotlightRating: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.goldDark,
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  spotlightPay: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: Colors.navy,
  },
  spotlightPaySub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
  },
  spotlightDistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.07)', // warm tinted chip
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.15)',
  },
  spotlightDist: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.saffronDark,
  },
  spotlightCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 107, 0, 0.1)', // warm amber divider
    marginBottom: 10,
  },
  spotlightApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.saffron,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    boxShadow: "0px 5px 24px rgba(255,107,0,0.3)",
  },
  spotlightApplyText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.1,
  },
  // ── NEW card layout styles ──────────────────────────────────────
  scRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
    gap: 10,
  },
  scIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scTitle: {
    flex: 1,
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  scRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  scProviderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 5,
    marginRight: 6,
  },
  scProvider: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    flexShrink: 1,
  },
  scRating: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  scRatingText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.gold,
  },
  scMatchBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    flexShrink: 0,
  },
  scMatchText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: '#4ADE80',
  },
  scDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 10,
  },
  scFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scPayBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  scPay: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  scPaySub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    marginLeft: 2,
  },
  scDistBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,0,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.30)',
    gap: 2,
  },
  scDist: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: '#FF9A50',
  },
  scApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.saffron,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    boxShadow: "0px 4px 16px rgba(255,107,0,0.45)",
  },
  scApplyText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  // ── Keep legacy aliases so existing code doesn't break ──────────
  spotlightCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightBadge: {
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.round,
  },
  spotlightBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.green,
  },
  spotlightBadgePercent: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: Colors.green,
  },
  spotlightContent: { marginBottom: 8 },
  spotlightFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spotlightLeftBar: { width: 4, backgroundColor: Colors.saffron },
  spotlightCardInner: { flex: 1, padding: 12 },
  spotlightAccentStrip: { height: 4, width: '100%' },
  spotlightPayPill: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  spotlightPayAmount: { fontFamily: FontFamily.headingBold, fontSize: 15, color: Colors.navy },
  spotlightPayPer: { fontFamily: FontFamily.bodyMedium, fontSize: 10, color: Colors.gray4, marginLeft: 1 },
  spotlightPayBlock: { flexDirection: 'row', alignItems: 'baseline' },
  spotlightDistPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.round },
  spotlightDistance: { fontFamily: FontFamily.bodySemiBold, fontSize: 11, color: Colors.gray5 },
  spotlightInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  spotlightDivider: { height: 1, backgroundColor: Colors.gray1, marginBottom: 10 },
  spotlightRatingChip: { flexDirection: 'row', alignItems: 'center' },
  spotlightRatingSep: { fontSize: 11, color: Colors.gray3 },
  spotlightActionBtn: { backgroundColor: Colors.saffron, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.round },
  spotlightActionText: { fontFamily: FontFamily.bodySemiBold, fontSize: 10, color: Colors.white },
  seekerGreetingCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
    marginHorizontal: 20,
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
  quickActionsContainer: {
    paddingVertical: 12,
  },
  seekerSectionHeader: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '22%',
  },
  quickActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadow.sm,
  },
  quickActionText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.ink2,
    textAlign: 'center',
  },
  miniMapContainer: {
    paddingVertical: 12,
  },
  mapCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  mockMapArea: {
    height: 140,
    backgroundColor: '#E0F2F1',
    position: 'relative',
  },
  clusterMarker: {
    position: 'absolute',
    top: '40%',
    left: '40%',
    backgroundColor: 'rgba(255, 107, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadow.sm,
  },
  clusterText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 12,
    color: Colors.white,
  },
  salaryMarker: {
    position: 'absolute',
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  salaryMarkerText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.saffronDark,
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  mapFooterText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray5,
    marginLeft: 6,
  },
  activeAppsContainer: {
    paddingVertical: 12,
  },
  appStatusCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  appStatusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appStatusTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  statusBadgeYellow: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  statusBadgeTextYellow: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.goldDark,
  },
  appStatusCompany: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: Colors.gray5,
    marginBottom: 16,
  },
  appStatusTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  timelinePointActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
  },
  timelinePointYellow: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gold,
  },
  timelinePoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gray3,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.gray2,
  },
  appStatusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray1,
    padding: 10,
    borderRadius: Radius.sm,
  },
  appStatusFooterText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.ink2,
    marginLeft: 6,
    flex: 1,
  },
  providerContainer: {
    paddingBottom: 20,
  },
  providerGreetingCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  providerGreetingText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.ink,
  },
  providerSubText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.gray5,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray5,
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
  },
  providerPostCta: {
    marginHorizontal: 20,
    backgroundColor: '#005B5C',
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
  },
  providerCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerCtaText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.white,
  },
  providerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  providerSectionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  providerViewAll: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: '#004DEB',
  },
  applicantsList: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  applicantRowCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  applicantRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  applicantAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applicantAvatarText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    color: Colors.saffronDark,
  },
  applicantRowInfo: {
    flex: 1,
  },
  applicantRowName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: Colors.ink,
  },
  applicantRowMeta: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray5,
    marginTop: 2,
  },
  applicantSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  skillPillBox: {
    backgroundColor: Colors.gray1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  skillPillText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.ink2,
  },
  applicantRowActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  applicantRowBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  btnShortlist: {
    backgroundColor: '#005B5C',
    borderColor: '#005B5C',
  },
  btnShortlistText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.white,
  },
  btnActionText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.ink2,
  },
  btnReject: {
    backgroundColor: Colors.redLight,
    borderColor: 'transparent',
  },
  btnRejectText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.redDark,
  },
  listingsGrid: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listingMetricCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  listingMetricHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listingMetricTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
    marginRight: 10,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.round,
  },
  liveDotCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
    marginRight: 4,
  },
  liveIndicatorText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.greenDark,
  },
  listingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray1,
    borderRadius: Radius.sm,
    padding: 12,
  },
  statMetric: {
    alignItems: 'center',
    flex: 1,
  },
  statMetricVal: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: Colors.ink,
  },
  statMetricLbl: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray5,
    marginTop: 2,
  },
  analyticsBarCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  analyticsBarCardSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray5,
    marginBottom: 16,
  },
  barGraphContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  graphCol: {
    alignItems: 'center',
    width: '16%',
  },
  graphColVal: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.gray5,
    marginBottom: 4,
  },
  graphBarBody: {
    width: 14,
    backgroundColor: Colors.saffron,
    borderRadius: Radius.round,
  },
  graphColDay: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray5,
    marginTop: 6,
  },
  trackerBtnPremium: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  trackerBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B', // Saffron / Gold dot to highlight active applications
  },
  trackerSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
    ...Shadow.lg,
  },
  trackerSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  trackerSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackerSheetTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    flex: 1,
  },
  trackerCloseBtn: {
    padding: 2,
  },
  trackerSheetDivider: {
    height: 1,
    backgroundColor: Colors.gray1,
    marginVertical: 14,
  },
  trackerJobCard: {
    width: '100%',
  },
  trackerJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trackerJobTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  trackerStatusBadge: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  trackerStatusText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.goldDark,
  },
  trackerJobCompany: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray5,
    marginBottom: 20,
  },
  stepperContainerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 24,
  },
  stepperProgressTrack: {
    position: 'absolute',
    top: 17,
    left: 36,
    right: 36,
    height: 3,
    backgroundColor: Colors.gray2,
    zIndex: 1,
  },
  stepperProgressFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    width: '0%',
  },
  stepperFillBlue: {
    backgroundColor: '#1E88E5',
  },
  stepperFillGreen: {
    backgroundColor: '#43A047',
  },
  stepperStepItem: {
    alignItems: 'center',
    width: 64,
    zIndex: 2,
  },
  stepperIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.gray1,
    borderWidth: 2,
    borderColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepperIconCircleCompleted: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  stepperIconCircleCompletedBlue: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  stepperIconCircleCompletedGreen: {
    backgroundColor: '#43A047',
    borderColor: '#43A047',
  },
  stepperIconCircleActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.saffron,
  },
  stepperIconCircleActiveBlue: {
    backgroundColor: Colors.white,
    borderColor: '#1E88E5',
  },
  stepperIconCircleActiveGreen: {
    backgroundColor: Colors.white,
    borderColor: '#43A047',
  },
  stepperStepLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
    textAlign: 'center',
    marginBottom: 2,
  },
  stepperStepLabelActive: {
    fontFamily: FontFamily.headingBold,
    color: Colors.goldDark,
  },
  stepperStepLabelActiveBlue: {
    fontFamily: FontFamily.headingBold,
    color: '#1E88E5',
  },
  stepperStepLabelActiveGreen: {
    fontFamily: FontFamily.headingBold,
    color: '#2E7D32',
  },
  stepperStepLabelCompleted: {
    color: Colors.ink,
    fontFamily: FontFamily.bodySemiBold,
  },
  stepperStepDate: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.gray4,
    textAlign: 'center',
  },
  trackerScheduleAlert: {
    flexDirection: 'row',
    backgroundColor: Colors.goldLight,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.goldLight,
  },
  trackerAlertTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.sm,
    color: Colors.goldDark,
    marginBottom: 2,
  },
  trackerAlertText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.ink2,
    lineHeight: 16,
  },
  trackerActionBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  trackerActionBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  trackerTabsScroll: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    flexDirection: 'row',
  },
  trackerTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.gray2,
    backgroundColor: Colors.gray1,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerTabBtnActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  trackerTabBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  trackerTabBtnTextActive: {
    color: Colors.white,
  },
  trackerTabBadgePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.saffron,
    marginLeft: 6,
  },
  trackerBadgeBlue: {
    backgroundColor: '#E3F2FD',
  },
  trackerBadgeGreen: {
    backgroundColor: '#E8F5E9',
  },
  trackerStatusTextBlue: {
    color: '#1E88E5',
  },
  trackerStatusTextGreen: {
    color: '#2E7D32',
  },
  timelineActiveDotBlue: {
    backgroundColor: '#1E88E5',
  },
  timelineActiveDotGreen: {
    backgroundColor: '#2E7D32',
  },
  timelineStepLabelActiveBlue: {
    fontFamily: FontFamily.headingBold,
    color: '#1E88E5',
  },
  timelineStepLabelActiveGreen: {
    fontFamily: FontFamily.headingBold,
    color: '#2E7D32',
  },
  trackerAlertBlue: {
    backgroundColor: '#E3F2FD',
    borderColor: '#E3F2FD',
  },
  trackerAlertGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#E8F5E9',
  },
  trackerAlertTitleBlue: {
    color: '#1E88E5',
  },
  trackerAlertTitleGreen: {
    color: '#2E7D32',
  },
  trackerAlertTextBlue: {
    color: Colors.ink2,
  },
  trackerAlertTextGreen: {
    color: Colors.ink2,
  },
  trackerActionBtnBlue: {
    backgroundColor: '#1E88E5',
  },
  trackerActionBtnGreen: {
    backgroundColor: '#43A047',
  },
});

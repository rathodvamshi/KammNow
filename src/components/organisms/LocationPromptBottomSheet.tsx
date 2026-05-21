import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../theme';
import { useAddressStore, type SavedAddress } from '../../store/addressStore';
import { useLocationStore } from '../../store/locationStore';
import { formatSavedAddress } from '../../utils/geocoding';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACCENT = '#E91E63';

interface LocationPromptBottomSheetProps {
  mode: 'gps_off' | 'permission_needed';
  visible: boolean;
  onClose: () => void;
  onSelectOnMap: () => void;
  onSearchManually: () => void;
  onContinueSaved: () => void;
  onEnableLocation: () => Promise<void>;
  hasSavedAddresses: boolean;
}

// ─── Animated pin illustration ───────────────────────────────────────────────
const LocationPinIllustration = ({ mode }: { mode: 'gps_off' | 'permission_needed' }) => {
  const bounce = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 700, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    const doPulse = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };
    doPulse(pulse1, 0);
    doPulse(pulse2, 600);
  }, []);

  return (
    <View style={ilStyles.container}>
      <View style={ilStyles.skyBg}>
        {/* Clouds */}
        <View style={[ilStyles.cloud, { top: 18, left: 20, width: 60, height: 22 }]} />
        <View style={[ilStyles.cloud, { top: 10, left: 50, width: 40, height: 16 }]} />
        <View style={[ilStyles.cloud, { top: 24, right: 24, width: 50, height: 18 }]} />
        <View style={[ilStyles.cloud, { top: 14, right: 55, width: 30, height: 12 }]} />

        {/* Pulse rings */}
        <Animated.View style={[ilStyles.pulseRing, {
          transform: [{ scale: pulse1 }],
          opacity: pulse1.interpolate({ inputRange: [1, 1.6], outputRange: [0.4, 0] }),
        }]} />
        <Animated.View style={[ilStyles.pulseRing, {
          transform: [{ scale: pulse2 }],
          opacity: pulse2.interpolate({ inputRange: [1, 1.6], outputRange: [0.3, 0] }),
        }]} />

        {/* Animated pin */}
        <Animated.View style={[ilStyles.pinWrap, { transform: [{ translateY: bounce }] }]}>
          <View style={ilStyles.pinHead}>
            <View style={ilStyles.pinInner} />
          </View>
          <View style={ilStyles.pinTail} />
        </Animated.View>
        <View style={ilStyles.pinShadow} />
      </View>
    </View>
  );
};

const ilStyles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 8 },
  skyBg: {
    width: '100%',
    height: 130,
    backgroundColor: '#EEF6FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: ACCENT,
    top: '50%',
    marginTop: -40,
  },
  pinWrap: { alignItems: 'center', zIndex: 2 },
  pinHead: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  pinInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ACCENT,
    marginTop: -2,
  },
  pinShadow: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginTop: 4,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
export const LocationPromptBottomSheet: React.FC<LocationPromptBottomSheetProps> = ({
  mode,
  visible,
  onClose,
  onSelectOnMap,
  onSearchManually,
  onContinueSaved,
  onEnableLocation,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const [isEnabling, setIsEnabling] = useState(false);

  const { savedAddresses, activeAddressId, setActive } = useAddressStore();
  const { updateLocation } = useLocationStore();

  // Always show max 2, sorted: active first → most recently used
  const sortedAddresses = [...savedAddresses].sort((a, b) => {
    if (a.id === activeAddressId) return -1;
    if (b.id === activeAddressId) return 1;
    return b.lastUsed - a.lastUsed;
  });
  const previewAddresses = sortedAddresses.slice(0, 2);
  const hasMore = savedAddresses.length > 2;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 45, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(contentAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      contentAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleEnable = async () => {
    if (isEnabling) return;
    setIsEnabling(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onEnableLocation();
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSelectSaved = (addr: SavedAddress) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setActive(addr.id);
    updateLocation(addr.lat, addr.lng, addr.area || addr.street);
    onClose();
  };

  const handleViewMore = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Small delay so sheet closes before navigation
    setTimeout(() => router.push('/location/saved-addresses'), 150);
  };

  const handleSearchLocation = () => {
    onClose();
    setTimeout(() => router.push('/location/saved-addresses'), 150);
  };

  const getLabelIcon = (label: string) => {
    switch (label) {
      case 'home':   return 'home-outline';
      case 'work':   return 'business-outline';
      case 'family': return 'people-outline';
      default:       return 'location-outline';
    }
  };

  const titleText = mode === 'gps_off'
    ? 'Your device location is off'
    : 'Allow location access';

  const subtitleText = mode === 'gps_off'
    ? 'Enabling location helps us reach you quickly with accurate delivery'
    : 'KaamNow needs your location to show nearby jobs and accurate availability';

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Backdrop */}
      {Platform.OS === 'web' ? (
        <div style={styles.webBackdrop as any} onClick={onClose} />
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        </Pressable>
      )}

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={{ opacity: contentAnim }}>

            {/* Illustration */}
            <LocationPinIllustration mode={mode} />

            {/* Title + subtitle */}
            <Text style={styles.title}>{titleText}</Text>
            <Text style={styles.subtitle}>{subtitleText}</Text>

            {/* ── Use Current Location card ── */}
            <View style={styles.optionsCard}>
              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIconWrap, { backgroundColor: '#FFF0F4' }]}>
                    <Ionicons name="locate" size={20} color={ACCENT} />
                  </View>
                  <Text style={styles.optionLabel}>Use my Current Location</Text>
                </View>
                <TouchableOpacity
                  style={[styles.enableBtn, isEnabling && { opacity: 0.7 }]}
                  onPress={handleEnable}
                  disabled={isEnabling}
                  activeOpacity={0.8}
                >
                  {isEnabling
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={styles.enableBtnText}>Enable</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Saved Addresses section — always shown ── */}
            <View style={styles.savedSection}>
              <View style={styles.savedHeader}>
                <Text style={styles.savedTitle}>Saved Addresses</Text>
                {savedAddresses.length > 0 && (
                  <TouchableOpacity onPress={handleViewMore} activeOpacity={0.7}>
                    <Text style={styles.seeAllText}>See All →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {savedAddresses.length === 0 ? (
                /* Empty state */
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="location-outline" size={28} color={Colors.gray3} />
                  </View>
                  <Text style={styles.emptyTitle}>No saved addresses</Text>
                  <Text style={styles.emptySub}>Add an address to quickly select it next time</Text>
                  <TouchableOpacity
                    style={styles.addAddressBtn}
                    onPress={() => { onClose(); setTimeout(() => router.push('/location/map-picker'), 150); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color={ACCENT} style={{ marginRight: 4 }} />
                    <Text style={styles.addAddressBtnText}>Add New Address</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Address list */
                <View style={styles.savedCard}>
                  {previewAddresses.map((addr, index) => (
                    <React.Fragment key={addr.id}>
                      <TouchableOpacity
                        style={styles.savedAddrRow}
                        onPress={() => handleSelectSaved(addr)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.savedAddrIcon}>
                          <Ionicons name={getLabelIcon(addr.label) as any} size={20} color={Colors.ink2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.savedAddrLabelRow}>
                            <Text style={styles.savedAddrLabel}>
                              {addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}
                            </Text>
                            {addr.id === activeAddressId && (
                              <View style={styles.selectedBadge}>
                                <Text style={styles.selectedBadgeText}>Selected</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.savedAddrText} numberOfLines={2}>
                            {formatSavedAddress(addr)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.gray4} />
                      </TouchableOpacity>

                      {/* Divider between rows */}
                      {index < previewAddresses.length - 1 && (
                        <View style={styles.addrDivider} />
                      )}
                    </React.Fragment>
                  ))}

                  {/* View More row — only when there are more than 2 */}
                  {hasMore && (
                    <>
                      <View style={styles.addrDivider} />
                      <TouchableOpacity
                        style={styles.viewMoreRow}
                        onPress={handleViewMore}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="list-outline" size={18} color={ACCENT} style={{ marginRight: 8 }} />
                        <Text style={styles.viewMoreText}>
                          View {savedAddresses.length - 2} more address{savedAddresses.length - 2 > 1 ? 'es' : ''}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={ACCENT} style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>

            {/* ── Search your location bottom bar ── */}
            <TouchableOpacity
              style={styles.searchBar}
              onPress={handleSearchLocation}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={20} color={Colors.ink2} style={{ marginRight: 10 }} />
              <Text style={styles.searchBarText}>Search your Location</Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  webBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer',
  } as any,
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: SCREEN_HEIGHT * 0.92,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Title
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 8,
  },

  // Options card (Use Current Location only)
  optionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
    flex: 1,
  },
  enableBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },

  // Saved addresses section
  savedSection: {
    marginBottom: 16,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savedTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink,
  },
  seeAllText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: ACCENT,
  },

  // Empty state
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  emptyTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  emptySub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 18,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  addAddressBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: ACCENT,
  },

  // Address list card
  savedCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  savedAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  savedAddrIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  savedAddrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  savedAddrLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  selectedBadge: {
    backgroundColor: '#E6F4EA',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  selectedBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: '#137333',
  },
  savedAddrText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    lineHeight: 17,
  },
  addrDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },

  // View more row
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAFBFC',
  },
  viewMoreText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: ACCENT,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8EDF2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBarText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink2,
  },
});

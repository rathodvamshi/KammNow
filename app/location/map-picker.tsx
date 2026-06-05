import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeGoBack } from '../../src/utils/navigation';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily, FontSize, Shadow, Radius } from '../../src/theme';
import { useLocationStore } from '../../src/store/locationStore';
import { useAddressStore, type AddressLabel } from '../../src/store/addressStore';
import { useUIStore } from '../../src/store/uiStore';
import {
  reverseGeocode,
  searchLocations,
  type SearchResult,
  type GeocodedAddress,
} from '../../src/utils/geocoding';
import { InteractiveMap } from '../../src/components/organisms/InteractiveMap';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_LAT = 17.4344;
const DEFAULT_LNG = 78.4497;
const DEBOUNCE_MS = 400;

const LABELS: { key: AddressLabel; icon: string; text: string }[] = [
  { key: 'home',   icon: 'home-outline',       text: 'Home' },
  { key: 'work',   icon: 'business-outline',   text: 'Work' },
  { key: 'family', icon: 'people-outline',     text: 'Family' },
  { key: 'other',  icon: 'location-outline',   text: 'Other' },
];

// Map search result type to icon
const getResultIcon = (type: string): string => {
  switch (type) {
    case 'area': return 'map-outline';
    case 'street': return 'navigate-outline';
    case 'pincode': return 'mail-outline';
    default: return 'location-outline';
  }
};

export default function MapPickerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; editId?: string }>();
  const { lat: storedLat, lng: storedLng, updateLocation } = useLocationStore();
  const { recentSearches, addRecentSearch, savedAddresses, addAddress, editAddress, setActive } = useAddressStore();
  const { currentRole } = useUIStore();
  const ACCENT = currentRole === 'seeker' ? Colors.saffron : '#005B5C';

  const editTarget = params.editId ? savedAddresses.find(a => a.id === params.editId) : null;

  const initialLat = editTarget ? editTarget.lat : (params.lat ? parseFloat(params.lat) : (storedLat ?? DEFAULT_LAT));
  const initialLng = editTarget ? editTarget.lng : (params.lng ? parseFloat(params.lng) : (storedLng ?? DEFAULT_LNG));

  const [region, setRegion] = useState({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.006,
    longitudeDelta: 0.006,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Details Sheet State
  const [showDetails, setShowDetails] = useState(false);
  const [flatHouse, setFlatHouse] = useState(editTarget?.flatHouse || '');
  const [floor, setFloor] = useState(editTarget?.floor || '');
  const [landmark, setLandmark] = useState(editTarget?.landmark || '');
  const [addressLabel, setAddressLabel] = useState<AddressLabel>(editTarget?.label || 'home');
  const [isSaving, setIsSaving] = useState(false);

  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Animations
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(1)).current;
  const pinTranslateY = useRef(new Animated.Value(0)).current;
  const geocodeOpacity = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const radarScale = useRef(new Animated.Value(0.4)).current;
  const radarOpacity = useRef(new Animated.Value(0.6)).current;
  const gradientOpacity = useRef(new Animated.Value(0)).current;

  // Pulsing radar animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(radarScale, { toValue: 2.5, duration: 1800, useNativeDriver: true }),
          Animated.timing(radarOpacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(radarScale, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          Animated.timing(radarOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Auto-hide hint after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(hintOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowHint(false));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    doGeocode(initialLat, initialLng);
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      Animated.timing(gradientOpacity, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const doGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    Animated.timing(geocodeOpacity, { toValue: 0.4, duration: 150, useNativeDriver: true }).start();
    try {
      const result = await reverseGeocode(lat, lng);
      setGeocoded(result);
      // Pre-fill landmark if available
      if (result.landmark && !landmark) {
        setLandmark(result.landmark);
      }
    } catch {
      // keep previous
    } finally {
      setIsGeocoding(false);
      Animated.timing(geocodeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, []);

  const handleRegionChange = useCallback(() => {
    if (showDetails) return;
    setIsDragging(true);
    Animated.parallel([
      Animated.spring(pinScale, { toValue: 1.25, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.spring(pinTranslateY, { toValue: -18, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [showDetails]);

  const handleRegionChangeComplete = useCallback((newRegion: typeof region) => {
    if (showDetails) return;
    setRegion(newRegion);
    setIsDragging(false);
    Animated.parallel([
      Animated.spring(pinScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.spring(pinTranslateY, { toValue: 0, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();

    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
    geocodeDebounceRef.current = setTimeout(() => {
      doGeocode(newRegion.latitude, newRegion.longitude);
    }, 300);
  }, [doGeocode, showDetails]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(text, region.latitude, region.longitude);
      setSearchResults(results);
      setIsSearching(false);
    }, DEBOUNCE_MS);
  }, [region]);

  const selectSearchResult = useCallback((result: SearchResult) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    if (Platform.OS !== 'web') Haptics.selectionAsync();

    const newRegion = { latitude: result.lat, longitude: result.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 };
    setRegion(newRegion);
    mapRef.current?.animateToRegion?.(newRegion, 600);
    doGeocode(result.lat, result.lng);
    addRecentSearch({ query: result.name, address: result.address, lat: result.lat, lng: result.lng });
  }, [doGeocode]);

  const goToCurrentLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const newRegion = { latitude, longitude, latitudeDelta: 0.006, longitudeDelta: 0.006 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion?.(newRegion, 600);
      doGeocode(latitude, longitude);
    } catch {
      // silently fail
    } finally {
      setIsLocating(false);
    }
  };

  // removed confirmLocation and closeDetails as we save directly

  const saveAddress = async () => {
    setIsSaving(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const addressData = {
        label: addressLabel,
        // flatHouse = user-entered flat/house/building number, or fallback to geocoded value
        flatHouse: flatHouse.trim() || geocoded?.flatHouse || '',
        floor: floor.trim(),
        street: geocoded?.street || '',
        area: geocoded?.area || '',
        landmark: landmark.trim() || geocoded?.landmark || '',
        city: geocoded?.city || '',
        state: geocoded?.state || '',
        pincode: geocoded?.pincode || '',
        lat: region.latitude,
        lng: region.longitude,
        receiverName: '',
        receiverPhone: '',
        notes: '',
        isDefault: editTarget ? editTarget.isDefault : false,
      };

      let savedId: string;
      if (editTarget) {
        await editAddress(editTarget.id, addressData);
        savedId = editTarget.id;
      } else {
        savedId = await addAddress(addressData);
      }

      setActive(savedId);
      // Update location display name to the most descriptive available field
      const displayName = addressData.area || addressData.city || 'Saved Location';
      updateLocation(region.latitude, region.longitude, displayName);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      router.replace('/location/saved-addresses');
    } catch (e) {
      alert('Failed to save address. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    Keyboard.dismiss();
  };

  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] });

  const areaName = isGeocoding ? 'Locating...' : geocoded?.area || geocoded?.street || geocoded?.city || 'Selected Location';
  const fullAddressLine = isGeocoding ? 'Fetching address details...' : geocoded?.fullAddress || `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`;

  const showRecents = searchFocused && !searchQuery.trim() && recentSearches.length > 0;
  const showResults = searchFocused && searchResults.length > 0;
  const showDropdown = showRecents || showResults;

  return (
    <View style={styles.screen}>
      <InteractiveMap
        ref={mapRef}
        region={region}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        scrollEnabled={!showDetails}
        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
      />

      {/* Gradient fade at bottom of map */}
      <Animated.View style={[styles.bottomGradient, { opacity: gradientOpacity }]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(248,250,252,0.3)', 'rgba(248,250,252,0.8)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Center Pin with Radar Ring */}
      <View style={[styles.centerPinWrapper, { pointerEvents: 'none' }]}>
        {/* Pulsing Radar Ring */}
        {!showDetails && (
          <Animated.View style={[styles.radarRing, {
            borderColor: ACCENT,
            transform: [{ scale: radarScale }],
            opacity: radarOpacity,
          }]} />
        )}

        <Animated.View style={[styles.pinContainer, { transform: [{ scale: pinScale }, { translateY: pinTranslateY }] }]}>
          {/* Tooltip */}
          {!isDragging && !showDetails && (
            <View style={styles.tooltipBubble}>
              <Text style={styles.tooltipText}>Deliver here</Text>
              <View style={styles.tooltipArrow} />
            </View>
          )}
          {/* Pin Head */}
          <View style={styles.pinHead}>
            <View style={[styles.pinDot, { backgroundColor: ACCENT }]} />
          </View>
          {/* Pin Tail */}
          <View style={[styles.pinTail, { borderTopColor: Colors.ink }]} />
        </Animated.View>

        {/* Pin Ground Shadow */}
        <Animated.View style={[styles.pinShadow, {
          opacity: pinScale.interpolate({ inputRange: [1, 1.25], outputRange: [0.3, 0.08] }),
          transform: [
            { scaleX: pinScale.interpolate({ inputRange: [1, 1.25], outputRange: [1, 0.5] }) },
            { scaleY: pinScale.interpolate({ inputRange: [1, 1.25], outputRange: [1, 0.6] }) },
          ],
        }]} />
      </View>

      {/* "Move map" hint */}
      {showHint && !showDetails && (
        <Animated.View style={[styles.hintContainer, { opacity: hintOpacity }]} pointerEvents="none">
          <View style={styles.hintBubble}>
            <Ionicons name="hand-left-outline" size={14} color={Colors.white} />
            <Text style={styles.hintText}>Move map to adjust pin</Text>
          </View>
        </Animated.View>
      )}

      {/* Top Overlay: Search */}
      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack()}>
            <Ionicons name="chevron-back" size={24} color={Colors.ink} />
          </TouchableOpacity>
          <View style={[styles.searchBox, searchFocused && { borderColor: ACCENT, borderWidth: 1.5 }]}>
            <Ionicons name="search-outline" size={20} color={searchFocused ? ACCENT : Colors.gray4} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search area, building, landmark..."
              placeholderTextColor={Colors.gray4}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 6 }} />}
            {(searchQuery.length > 0 || searchFocused) && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={20} color={Colors.gray4} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Dropdown */}
        {showDropdown && (
          <View style={styles.dropdown}>
            {showRecents && (
              <>
                <View style={styles.dropdownHeader}>
                  <Ionicons name="time-outline" size={14} color={Colors.gray4} />
                  <Text style={styles.dropdownHeaderText}>Recent Searches</Text>
                </View>
                <FlashList estimatedItemSize={56} data={recentSearches.slice(0, 5)} keyExtractor={r => r.id} keyboardShouldPersistTaps="handled" scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => selectSearchResult({ id: item.id, name: item.query, address: item.address, lat: item.lat, lng: item.lng, type: 'place' })}>
                      <View style={[styles.resultIconBox, { backgroundColor: Colors.gray1 }]}>
                        <Ionicons name="time-outline" size={16} color={Colors.gray4} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownItemName} numberOfLines={1}>{item.query}</Text>
                        <Text style={styles.dropdownItemAddr} numberOfLines={1}>{item.address}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
            {showResults && (
              <>
                <FlashList estimatedItemSize={56} data={searchResults} keyExtractor={r => r.id} keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => selectSearchResult(item)}>
                      <View style={[styles.resultIconBox, { backgroundColor: ACCENT + '15' }]}>
                        <Ionicons name={getResultIcon(item.type) as any} size={16} color={ACCENT} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dropdownItemAddr} numberOfLines={1}>{item.address}</Text>
                      </View>
                      <Ionicons name="arrow-forward-outline" size={14} color={Colors.gray3} />
                    </TouchableOpacity>
                  )}
                />
                {/* Powered by attribution */}
                <View style={styles.attribution}>
                  <Text style={styles.attributionText}>Powered by OpenStreetMap</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Floating Action Buttons */}
      {!showDetails && (
        <View style={styles.floatingBtns}>
          <TouchableOpacity style={[styles.floatBtn, isLocating && { opacity: 0.7 }]} onPress={goToCurrentLocation} disabled={isLocating}>
            {isLocating ? <ActivityIndicator size="small" color={ACCENT} /> : <Ionicons name="locate" size={22} color={ACCENT} />}
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Main Confirm Sheet ─── */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]} pointerEvents={showDetails ? 'none' : 'auto'}>
        <View style={styles.sheetHandle} />
        <Animated.View style={{ opacity: geocodeOpacity }}>
          <View style={styles.addressBlock}>
            <View style={[styles.addressIconWrap, { backgroundColor: ACCENT + '15' }]}>
              <Ionicons name="location" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              {isGeocoding ? (
                <View>
                  <View style={styles.skeletonLine1} />
                  <View style={styles.skeletonLine2} />
                </View>
              ) : (
                <>
                  <Text style={styles.areaTitle} numberOfLines={1}>{areaName}</Text>
                  <Text style={styles.fullAddressText} numberOfLines={2}>{fullAddressLine}</Text>
                </>
              )}
            </View>
            {isGeocoding && <ActivityIndicator size="small" color={ACCENT} />}
          </View>
        </Animated.View>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: ACCENT }, (isGeocoding || isSaving) && styles.confirmBtnDisabled]}
          activeOpacity={0.85}
          onPress={saveAddress}
          disabled={isGeocoding || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>Save Location</Text>
              <Ionicons name="checkmark" size={18} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8EDF2' },

  // ── Bottom Gradient ──
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 3,
  },

  // ── Center Pin & Radar ──
  centerPinWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  radarRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    marginBottom: 52,
  },
  pinContainer: { alignItems: 'center', marginBottom: 52 },
  tooltipBubble: {
    backgroundColor: '#1E2A3A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 8,
    ...Shadow.sm,
  },
  tooltipText: { fontFamily: FontFamily.bodySemiBold, fontSize: 11, color: Colors.white, letterSpacing: 0.3 },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E2A3A',
  },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadow.md,
  },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -4,
    zIndex: 1,
  },
  pinShadow: {
    position: 'absolute',
    width: 18,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    marginTop: 42,
  },

  // ── Hint ──
  hintContainer: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 6,
  },
  hintBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 42, 58, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  hintText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.2,
  },

  // ── Top Overlay (Search) ──
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
    height: '100%',
  },
  clearBtn: { padding: 4, marginLeft: 4 },

  // ── Dropdown ──
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginTop: 8,
    paddingBottom: 8,
    ...Shadow.md,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dropdownHeaderText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginBottom: 2,
  },
  dropdownItemAddr: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  attribution: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
    alignItems: 'center',
  },
  attributionText: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.gray3,
    letterSpacing: 0.3,
  },

  // ── Floating Buttons ──
  floatingBtns: { position: 'absolute', bottom: 210, right: 16, zIndex: 10 },
  floatBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
    marginBottom: 12,
  },

  // ── Bottom Sheet (Confirm) ──
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...Shadow.lg,
    zIndex: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  addressBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  addressIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    marginBottom: 4,
  },
  fullAddressText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    lineHeight: 20,
  },
  // Skeleton loading
  skeletonLine1: {
    width: 140,
    height: 16,
    backgroundColor: Colors.gray1,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLine2: {
    width: 200,
    height: 12,
    backgroundColor: Colors.gray1,
    borderRadius: 4,
  },
  confirmBtn: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },

  // ── Details Sheet ──
  detailsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...Shadow.lg,
    zIndex: 11,
  },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailsBackBtn: { padding: 4, marginRight: 12 },
  detailsHeaderTitle: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink },

  detailsAddressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gray1,
  },
  detailsAreaTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginBottom: 2,
  },
  detailsAddressText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    marginLeft: 12,
  },
  changeBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },

  // ── Input Fields ──
  inputGroup: { marginBottom: 20, gap: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    height: 50,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
    backgroundColor: Colors.white,
  },
  inputFieldSecondary: {
    flex: 1,
    height: 50,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.gray2,
    paddingHorizontal: 14,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
    backgroundColor: '#FAFAFA',
  },

  // ── Labels ──
  labelSectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
  },
  labelChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink,
  },

  // ── Save ──
  saveBtn: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },
});

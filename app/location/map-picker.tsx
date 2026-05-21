import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { useLocationStore } from '../../src/store/locationStore';
import { useAddressStore } from '../../src/store/addressStore';
import {
  reverseGeocode,
  searchLocations,
  type SearchResult,
  type GeocodedAddress,
} from '../../src/utils/geocoding';
import { InteractiveMap } from '../../src/components/organisms/InteractiveMap';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_LAT = 17.4344;
const DEFAULT_LNG = 78.4497;
const DEBOUNCE_MS = 450;
const ACCENT = '#E91E63';

export default function MapPickerScreen() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string; fromPermission?: string }>();
  const { lat: storedLat, lng: storedLng, updateLocation } = useLocationStore();
  const { recentSearches, addRecentSearch } = useAddressStore();

  const initialLat = params.lat ? parseFloat(params.lat) : (storedLat ?? DEFAULT_LAT);
  const initialLng = params.lng ? parseFloat(params.lng) : (storedLng ?? DEFAULT_LNG);

  const [region, setRegion] = useState({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState<GeocodedAddress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const mapRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(1)).current;
  const pinTranslateY = useRef(new Animated.Value(0)).current;
  const geocodeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    doGeocode(initialLat, initialLng);
    Animated.timing(sheetAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }).start();
  }, []);

  const doGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    Animated.timing(geocodeOpacity, { toValue: 0.4, duration: 150, useNativeDriver: true }).start();
    try {
      const result = await reverseGeocode(lat, lng);
      setGeocoded(result);
    } catch {
      // keep previous geocoded
    } finally {
      setIsGeocoding(false);
      Animated.timing(geocodeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, []);

  const handleRegionChange = useCallback(() => {
    setIsDragging(true);
    Animated.parallel([
      Animated.spring(pinScale, { toValue: 1.2, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.spring(pinTranslateY, { toValue: -14, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegionChangeComplete = useCallback((newRegion: typeof region) => {
    setRegion(newRegion);
    setIsDragging(false);
    Animated.parallel([
      Animated.spring(pinScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.spring(pinTranslateY, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();

    // Debounce geocode on drag end
    if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
    geocodeDebounceRef.current = setTimeout(() => {
      doGeocode(newRegion.latitude, newRegion.longitude);
    }, 300);
  }, [doGeocode]);

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

    const newRegion = {
      latitude: result.lat,
      longitude: result.lng,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion?.(newRegion, 600);
    doGeocode(result.lat, result.lng);

    // Save to recent searches
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
      const newRegion = { latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion?.(newRegion, 600);
      doGeocode(latitude, longitude);
    } catch {
      // silently fail
    } finally {
      setIsLocating(false);
    }
  };

  const confirmLocation = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateLocation(region.latitude, region.longitude, geocoded?.formattedLine2 || geocoded?.area || geocoded?.city);
    router.push({
      pathname: '/location/address-form',
      params: {
        lat: region.latitude.toString(),
        lng: region.longitude.toString(),
        street: geocoded?.street || '',
        area: geocoded?.area || '',
        city: geocoded?.city || '',
        state: geocoded?.state || '',
        pincode: geocoded?.pincode || '',
        landmark: geocoded?.landmark || '',
      },
    });
  };

  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [220, 0] });

  const areaName = isGeocoding
    ? 'Locating...'
    : geocoded?.area || geocoded?.street || geocoded?.city || 'Selected Location';

  const fullAddressLine = isGeocoding
    ? 'Fetching address details...'
    : geocoded?.fullAddress || `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`;

  const showRecents = searchFocused && !searchQuery.trim() && recentSearches.length > 0;
  const showResults = searchFocused && searchResults.length > 0;
  const showDropdown = showRecents || showResults;

  return (
    <View style={styles.screen}>
      {/* Map */}
      <InteractiveMap
        ref={mapRef}
        region={region}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      />

      {/* Center pin — works on both native and web */}
      <View style={styles.centerPinWrapper} pointerEvents="none">
        <Animated.View
          style={[
            styles.pinContainer,
            { transform: [{ scale: pinScale }, { translateY: pinTranslateY }] },
          ]}
        >
          {/* Tooltip bubble */}
          {!isDragging && (
            <View style={styles.tooltipBubble}>
              <Text style={styles.tooltipText}>Deliver here</Text>
              <View style={styles.tooltipArrow} />
            </View>
          )}

          {/* Pin head */}
          <View style={styles.pinHead}>
            <View style={styles.pinDot} />
          </View>
          {/* Pin tail */}
          <View style={styles.pinTail} />
        </Animated.View>

        {/* Shadow under pin */}
        <Animated.View
          style={[
            styles.pinShadow,
            {
              opacity: pinScale.interpolate({ inputRange: [1, 1.2], outputRange: [0.3, 0.1] }),
              transform: [{ scaleX: pinScale.interpolate({ inputRange: [1, 1.2], outputRange: [1, 0.7] }) }],
            },
          ]}
        />
      </View>

      {/* Top overlay: back + search */}
      <SafeAreaView style={styles.topOverlay}>
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.ink} />
          </TouchableOpacity>

          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
            <Ionicons name="search-outline" size={20} color={searchFocused ? ACCENT : Colors.gray4} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street, landmark..."
              placeholderTextColor={Colors.gray4}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 6 }} />}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={Colors.gray4} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dropdown: search results or recent searches */}
        {showDropdown && (
          <View style={styles.dropdown}>
            {showRecents && (
              <>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownHeaderText}>Recent Searches</Text>
                </View>
                <FlatList
                  data={recentSearches.slice(0, 5)}
                  keyExtractor={(r) => r.id}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => selectSearchResult({ id: item.id, name: item.query, address: item.address, lat: item.lat, lng: item.lng, type: 'place' })}
                    >
                      <Ionicons name="time-outline" size={18} color={Colors.gray4} style={{ marginRight: 10 }} />
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
              <FlatList
                data={searchResults}
                keyExtractor={(r) => r.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => selectSearchResult(item)}>
                    <Ionicons name="location-outline" size={18} color={ACCENT} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.dropdownItemAddr} numberOfLines={1}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </SafeAreaView>

      {/* GPS button */}
      <View style={styles.floatingBtns}>
        <TouchableOpacity
          style={[styles.floatBtn, isLocating && { opacity: 0.7 }]}
          onPress={goToCurrentLocation}
          disabled={isLocating}
        >
          {isLocating
            ? <ActivityIndicator size="small" color={ACCENT} />
            : <Ionicons name="locate" size={22} color={ACCENT} />
          }
        </TouchableOpacity>
      </View>

      {/* Bottom confirmation sheet */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
        <View style={styles.sheetHandle} />

        <Animated.View style={{ opacity: geocodeOpacity }}>
          <View style={styles.addressBlock}>
            <View style={styles.addressIconWrap}>
              <Ionicons name="location" size={22} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.areaTitle} numberOfLines={1}>{areaName}</Text>
              <Text style={styles.fullAddressText} numberOfLines={2}>{fullAddressLine}</Text>
            </View>
            {isGeocoding && <ActivityIndicator size="small" color={ACCENT} />}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.confirmBtn, isGeocoding && styles.confirmBtnDisabled]}
          activeOpacity={0.85}
          onPress={confirmLocation}
          disabled={isGeocoding}
        >
          <Text style={styles.confirmBtnText}>Confirm Location</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E8EDF2' },

  // Center pin — absolutely centered on screen
  centerPinWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  pinContainer: {
    alignItems: 'center',
    // Offset upward so pin TIP is at center, not pin body
    marginBottom: 52,
  },
  tooltipBubble: {
    backgroundColor: '#1E2A3A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.white,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E2A3A',
  },
  pinHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ACCENT,
    marginTop: -2,
  },
  pinShadow: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 6,
  },

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.round,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBoxFocused: {
    borderColor: ACCENT,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },

  // Dropdown
  dropdown: {
    marginHorizontal: 14,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: 16,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownHeaderText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemName: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  dropdownItemAddr: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 1,
  },

  // GPS button
  floatingBtns: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    zIndex: 5,
  },
  floatBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  areaTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    color: Colors.ink,
    marginBottom: 4,
  },
  fullAddressText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    lineHeight: 18,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: Radius.round,
    height: 54,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
});

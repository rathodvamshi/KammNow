import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  Animated,
  Alert,
  Platform,
  Share,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ExpoLocation from 'expo-location';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../src/theme';
import { useAddressStore, type SavedAddress } from '../../src/store/addressStore';
import { useLocationStore } from '../../src/store/locationStore';
import { formatSavedAddress, reverseGeocode } from '../../src/utils/geocoding';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { useUIStore } from '../../src/store/uiStore';

const ACCENT_COLOR = '#E91E63'; // Hot Pink / Rose Zepto theme color

const BOTTOM_NAV_PAD = Platform.OS === 'ios' ? 100 : 80;

export default function SavedAddressesScreen() {
  const { currentRole } = useUIStore();
  const { savedAddresses, deleteAddress, setDefault, setActive, activeAddressId, isLoaded, loadFromStorage, addAddress } = useAddressStore();
  const { updateLocation } = useLocationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenuAddress, setSelectedMenuAddress] = useState<SavedAddress | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoaded) loadFromStorage();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filteredAddresses = useMemo(() => {
    let list = [...savedAddresses];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.flatHouse.toLowerCase().includes(q) ||
          a.area.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.street.toLowerCase().includes(q) ||
          a.pincode.includes(q) ||
          a.label.includes(q)
      );
    }

    // Sort: active / activeAddressId first, then by lastUsed
    return list.sort((a, b) => {
      if (a.id === activeAddressId && b.id !== activeAddressId) return -1;
      if (a.id !== activeAddressId && b.id === activeAddressId) return 1;
      return b.lastUsed - a.lastUsed;
    });
  }, [savedAddresses, searchQuery, activeAddressId]);

  const handleEnableLocation = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLocating(true);
    try {
      // 1. Request permission
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          alert('Location permission denied. Please allow location access in your browser.');
        } else {
          Alert.alert('Permission Denied', 'Please enable location permissions in settings to use current location.');
        }
        return;
      }

      // 2. Get current GPS position
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // 3. Reverse geocode to get address details
      const geo = await reverseGeocode(latitude, longitude);

      // 4. Save as a new address in the store
      const savedId = await addAddress({
        label: 'other',
        flatHouse: geo.flatHouse || '',
        floor: '',
        street: geo.street,
        area: geo.area,
        landmark: geo.landmark || '',
        city: geo.city,
        state: geo.state,
        pincode: geo.pincode,
        lat: latitude,
        lng: longitude,
        receiverName: '',
        receiverPhone: '',
        notes: '',
        isDefault: false,
      });

      // 5. Set as active address and update location store
      setActive(savedId);
      updateLocation(latitude, longitude, geo.formattedLine2 || geo.area || 'Current Location');

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 6. Navigate back to home
      router.replace('/(tabs)');
    } catch (err) {
      console.warn('handleEnableLocation error:', err);
      if (Platform.OS === 'web') {
        alert('Unable to retrieve your current location. Please try again.');
      } else {
        Alert.alert('Error', 'Unable to retrieve your current location. Please try again.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelect = (addr: SavedAddress) => {
    setActive(addr.id);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    router.replace('/(tabs)');
  };

  const handleShare = async (addr: SavedAddress) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const fullAddr = formatSavedAddress(addr);
    try {
      await Share.share({
        message: `Here is my address:\n${fullAddr}`,
      });
    } catch (error) {
      console.log('Error sharing address:', error);
    }
  };

  const handleAddressMenu = (addr: SavedAddress) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMenuAddress(addr);
    setMenuVisible(true);
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return 'home-outline';
      case 'work':
        return 'business-outline';
      default:
        return 'location-outline';
    }
  };

  return (
    <View style={styles.screenRoot}>
    <SafeAreaView style={styles.screen}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/'))}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={Colors.gray4} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Address"
              placeholderTextColor={Colors.gray4}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <FlatList
          data={filteredAddresses}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: 16, marginBottom: 24 }}>
              {/* Option Cards block */}
              <View style={styles.optionsBlock}>
                {/* 1. Use My Current Location */}
                <View style={[styles.optionItem, { borderBottomWidth: 1, borderBottomColor: Colors.gray2 }]}>
                  <View style={styles.optionLeft}>
                    <Ionicons name="locate" size={22} color={ACCENT_COLOR} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.currentLocTitle}>Use my Current Location</Text>
                      <Text style={styles.currentLocSub}>Enable your current location for better services</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.enableBtn} onPress={handleEnableLocation} disabled={isLocating}>
                    {isLocating ? (
                      <ActivityIndicator size="small" color={ACCENT_COLOR} />
                    ) : (
                      <Text style={styles.enableBtnText}>Enable</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 2. Add New Address */}
                <TouchableOpacity
                  style={styles.optionItem}
                  activeOpacity={0.8}
                  onPress={() => router.push('/location/map-picker')}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons name="add" size={24} color={ACCENT_COLOR} />
                    <Text style={styles.addNewAddrText}>Add New Address</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.gray4} />
                </TouchableOpacity>
              </View>


              {/* Saved Addresses header — always visible */}
              <Text style={styles.sectionHeader}>Saved Addresses</Text>

              {/* Empty state when no addresses saved */}
              {savedAddresses.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="location-outline" size={48} color={Colors.gray3} />
                  <Text style={styles.emptyTitle}>No saved addresses yet</Text>
                  <Text style={styles.emptySub}>Add a new address or use your current location to get started</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.addressListWrapper}>
              {index === 0 && <View style={styles.listTopRounded} />}
              <View style={styles.addressCard}>
                <TouchableOpacity
                  style={styles.cardPressable}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={getLabelIcon(item.label) as any}
                    size={22}
                    color={Colors.ink}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.labelRow}>
                      <Text style={styles.addressLabel}>{item.label}</Text>
                      {item.id === activeAddressId && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>Selected</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {formatSavedAddress(item)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Right side actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                    <Ionicons name="share-outline" size={20} color={Colors.ink2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleAddressMenu(item)}>
                    <Ionicons name="ellipsis-vertical" size={20} color={Colors.ink2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dotted Divider */}
              {index < filteredAddresses.length - 1 && (
                <View style={styles.dottedDivider} />
              )}
              {index === filteredAddresses.length - 1 && <View style={styles.listBottomRounded} />}
            </View>
          )}
          contentContainerStyle={[
            styles.scrollContent,
            currentRole === 'seeker' && { paddingBottom: BOTTOM_NAV_PAD },
          ]}
        />

        {/* Custom Premium Options Bottom Sheet */}
        {menuVisible && selectedMenuAddress && (
          <View style={styles.menuOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuVisible(false)} />
            <View style={styles.menuSheet}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  {selectedMenuAddress.label.toUpperCase()} OPTIONS
                </Text>
              </View>

              <TouchableOpacity
                style={styles.sheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuVisible(false);
                  router.push({
                    pathname: '/location/address-form',
                    params: {
                      editId: selectedMenuAddress.id,
                      lat: selectedMenuAddress.lat,
                      lng: selectedMenuAddress.lng,
                      street: selectedMenuAddress.street,
                      area: selectedMenuAddress.area,
                      landmark: selectedMenuAddress.landmark,
                      city: selectedMenuAddress.city,
                      state: selectedMenuAddress.state,
                      pincode: selectedMenuAddress.pincode,
                      label: selectedMenuAddress.label,
                    },
                  });
                }}
              >
                <Ionicons name="create-outline" size={22} color={ACCENT_COLOR} />
                <Text style={styles.sheetOptionText}>Edit Address</Text>
              </TouchableOpacity>

              <View style={styles.sheetDivider} />

              <TouchableOpacity
                style={styles.sheetOption}
                activeOpacity={0.7}
                onPress={() => {
                  const addrId = selectedMenuAddress.id;
                  const addrLabel = selectedMenuAddress.label;
                  setMenuVisible(false);
                  setSelectedMenuAddress(null);

                  if (Platform.OS === 'web') {
                    // Small timeout so the sheet closes before confirm dialog appears
                    setTimeout(() => {
                      if (window.confirm(`Delete "${addrLabel}" address?`)) {
                        deleteAddress(addrId);
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      }
                    }, 150);
                  } else {
                    Alert.alert(
                      'Delete Address',
                      `Delete "${addrLabel}" address? This cannot be undone.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            deleteAddress(addrId);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          },
                        },
                      ]
                    );
                  }
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.sheetOptionText, { color: '#EF4444' }]}>Delete Address</Text>
              </TouchableOpacity>

              <View style={styles.sheetDivider} />

              <TouchableOpacity
                style={[styles.sheetOption, styles.cancelOption]}
                activeOpacity={0.7}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
    {currentRole === 'seeker' && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: '#F5F6F8' },
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F6F8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    ...Shadow.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.ink,
  },

  // Search
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Options block
  optionsBlock: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Shadow.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentLocTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: ACCENT_COLOR,
  },
  currentLocSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 2,
    lineHeight: 18,
  },
  enableBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ACCENT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: ACCENT_COLOR,
  },
  addNewAddrText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: ACCENT_COLOR,
    marginLeft: 12,
  },

  // Whatsapp
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  whatsappText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginLeft: 12,
  },

  // Saved Addresses
  sectionHeader: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink,
    marginTop: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Address List (grouped in white capsule card with dotted dividers)
  addressListWrapper: {
    backgroundColor: Colors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  listTopRounded: {
    height: 16,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  listBottomRounded: {
    height: 16,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardPressable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    textTransform: 'capitalize',
  },
  selectedBadge: {
    backgroundColor: '#E6F4EA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: '#137333',
  },
  addressText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 4,
    lineHeight: 18,
    paddingRight: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    padding: 4,
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },

  // Premium Custom Menu sheet styles
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 2000,
  },
  menuSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    letterSpacing: 1.2,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  sheetOptionText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  cancelOption: {
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  sheetCancelText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
});

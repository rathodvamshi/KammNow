import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Alert, TouchableOpacity, ActivityIndicator, FlatList, Animated } from 'react-native';
import { router, Stack } from 'expo-router';
import { safeGoBack } from '../../src/utils/navigation';
import { BlurView } from 'expo-blur';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Shadow } from '../../src/theme';
import { useAddressStore, type SavedAddress } from '../../src/store/addressStore';
import { useLocationStore } from '../../src/store/locationStore';
import { formatSavedAddress, reverseGeocode } from '../../src/utils/geocoding';
import * as Sentry from '@sentry/react-native';
import { useUIStore } from '../../src/store/uiStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

const GOOGLE_PLACES_API_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 'YOUR_KEY';

export default function SavedAddressesScreen() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Mount animation for Add New Address card
  const addCardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(addCardAnim, { toValue: 1, friction: 7, tension: 40, delay: 200, useNativeDriver: true }).start();
  }, []);
  
  // Action menu state
  const menuSheetRef = useRef<BottomSheetModal>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const { savedAddresses, setActive, deleteAddress } = useAddressStore();
  const { updateLocation, detectCurrentLocation, sessionLocationConfirmed } = useLocationStore();
  const { currentRole } = useUIStore();

  // Check if we are in initial session setup
  const isInitialSetup = !sessionLocationConfirmed;
  const themeColor = currentRole === 'seeker' ? Colors.saffron : '#005B5C';
  const themeText = currentRole === 'seeker' ? Colors.saffron : '#004DEB';

  const handleClose = () => {
    if (isInitialSetup) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return; // Block close during initial setup
    }
    safeGoBack();
  };

  const handleSelectAddress = (addr: SavedAddress) => {
    setActive(addr.id);
    updateLocation(addr.lat, addr.lng, addr.flatHouse || addr.area || 'Saved Location');
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    
    // Close regardless of initial setup because they successfully picked one
    safeGoBack();
  };

  const handleCurrentLocation = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDetecting(true);
    const success = await detectCurrentLocation();
    setIsDetecting(false);
    if (success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      safeGoBack();
    }
  };

  const handlePlaceSelect = async (data: any, details: any = null) => {
    if (!details) return;
    const { lat, lng } = details.geometry.location;

    try {
      const geo = await reverseGeocode(lat, lng);
      // Don't auto-add to saved addresses on mere search, just update location.
      // Wait, let's keep the user's requirement. "Only after location selection -> Save location"
      updateLocation(lat, lng, geo.formattedLine2 || geo.area || 'Searched Location');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      safeGoBack();
    } catch (err) {
      Sentry.captureMessage(`Place select geocoding error: ${err}`);
    }
  };

  const openMenu = (id: string) => {
    setSelectedAddressId(id);
    menuSheetRef.current?.present();
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeMenu = () => {
    menuSheetRef.current?.dismiss();
  };

  const handleEdit = () => {
    if (selectedAddressId) {
      closeMenu();
      router.push(`/location/map-picker?editId=${selectedAddressId}`);
    }
  };

  const handleDelete = () => {
    if (selectedAddressId) {
      const id = selectedAddressId;
      closeMenu();
      Alert.alert(
        'Delete Address',
        'Are you sure you want to delete this address?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              await deleteAddress(id);
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        ]
      );
    }
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return 'home-outline';
      case 'work': return 'business-outline';
      default: return 'location-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ gestureEnabled: !isInitialSetup }} />
      
      {/* Header */}
      <View style={styles.header}>
        {!isInitialSetup && (
          <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.ink} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, isInitialSetup && { marginLeft: 16 }]}>Select Location</Text>
      </View>

      <View style={styles.sheetContent}>
        <View style={[styles.searchContainer, searchFocused && { borderColor: themeColor, borderWidth: 1 }]}>
          <GooglePlacesAutocomplete
            placeholder="Search Address"
            fetchDetails={true}
            onPress={handlePlaceSelect}
            query={{
              key: GOOGLE_PLACES_API_KEY,
              language: 'en',
              components: 'country:in',
            }}
            styles={{
              textInputContainer: styles.autocompleteContainer,
              textInput: styles.autocompleteInput,
              listView: styles.autocompleteListView,
            }}
            renderLeftButton={() => (
              <View style={styles.searchIconWrap}>
                <Ionicons name="search" size={20} color={searchFocused ? themeColor : Colors.gray4} />
              </View>
            )}
            textInputProps={{
              placeholderTextColor: Colors.gray4,
              onFocus: () => setSearchFocused(true),
              onBlur: () => setSearchFocused(false),
            }}
          />
        </View>

        {/* Current Location Card */}
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <Ionicons name="locate" size={24} color="#FF2C65" />
            <View>
              <Text style={[styles.cardTitle, { color: '#FF2C65' }]}>Use my Current Location</Text>
              <Text style={styles.cardSub}>Enable your current location for better services</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.enableBtn, { borderColor: '#FF2C65' }]} onPress={handleCurrentLocation}>
            {isDetecting ? <ActivityIndicator size="small" color="#FF2C65" /> : <Text style={[styles.enableBtnText, { color: '#FF2C65' }]}>Enable</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Add New Address Card */}
        <Animated.View style={{ opacity: addCardAnim, transform: [{ translateY: addCardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <TouchableOpacity style={styles.cardRow} activeOpacity={0.7} onPress={() => router.push('/location/map-picker')}>
            <View style={styles.cardLeftRow}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF0F4', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={22} color="#FF2C65" />
              </View>
              <Text style={[styles.cardTextRow, { color: '#FF2C65' }]}>Add New Address</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray4} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.recentHeader}>
        <Text style={styles.recentHeaderText}>Saved Addresses</Text>
      </View>

      <FlatList
          style={styles.listContainer}
          data={savedAddresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <View style={[styles.savedCard, index !== 0 && styles.savedCardBorder]}>
              <TouchableOpacity style={styles.savedCardContent} onPress={() => handleSelectAddress(item)} activeOpacity={0.7}>
                <View style={styles.savedIconBox}>
                  <Ionicons name={getLabelIcon(item.label)} size={24} color={Colors.ink} />
                </View>
                <View style={styles.savedDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.savedLabel}>{item.label.charAt(0).toUpperCase() + item.label.slice(1)}</Text>
                    {useAddressStore.getState().activeAddressId === item.id && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.savedAddressText} numberOfLines={2}>{formatSavedAddress(item)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actionsBox}>
                <TouchableOpacity onPress={() => {/* Handle Share */}} style={styles.iconBtn}>
                  <Ionicons name="share-outline" size={20} color={Colors.gray4} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openMenu(item.id)} style={styles.iconBtn}>
                  <Ionicons name="ellipsis-vertical" size={20} color={Colors.gray4} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't saved any addresses yet.</Text>
            </View>
          )}
        />

      {/* Action Menu Bottom Sheet */}
      <BottomSheetModal
        ref={menuSheetRef}
        snapPoints={['20%']}
        index={0}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} opacity={0.5} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
            <Ionicons name="create-outline" size={24} color={Colors.ink} />
            <Text style={styles.menuText}>Edit Address</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={Colors.red} />
            <Text style={[styles.menuText, { color: Colors.red }]}>Delete Address</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
  },
  title: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink },
  
  sheetContent: { paddingHorizontal: 20, paddingTop: 12 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  searchIconWrap: { paddingLeft: 16, paddingTop: 14 },
  autocompleteContainer: { flex: 1, backgroundColor: 'transparent' },
  autocompleteInput: {
    backgroundColor: 'transparent',
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    paddingVertical: 14,
    height: 50,
  },
  autocompleteListView: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    ...Shadow.md,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, marginBottom: 2 },
  cardSub: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.gray4, paddingRight: 10 },
  enableBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  enableBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardLeftRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTextRow: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink },

  recentHeader: { paddingHorizontal: 20, marginBottom: 12 },
  recentHeaderText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink },
  listContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  savedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savedCardBorder: { borderTopWidth: 1, borderTopColor: Colors.gray1 },
  savedIconBox: { marginRight: 16 },
  savedDetails: { flex: 1 },
  savedLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink },
  savedAddressText: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4, marginTop: 4, lineHeight: 20 },
  
  selectedBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: '#0284C7',
  },
  actionsBox: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
  },
  emptyContainer: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.gray4, textAlign: 'center' },
  
  menuContainer: {
    padding: 16,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  menuText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.gray1,
  },
});

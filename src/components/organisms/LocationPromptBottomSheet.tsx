import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Shadow } from '../../theme';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useUIStore } from '../../store/uiStore';
import { useAddressStore } from '../../store/addressStore';
import { useLocationStore } from '../../store/locationStore';
import { formatSavedAddress } from '../../utils/geocoding';

interface Props {
  mode: 'gps_off' | 'permission_needed';
  visible: boolean;
  isMandatory?: boolean;
  onClose: () => void;
  onEnableLocation: () => Promise<void>;
}

export const LocationPromptBottomSheet: React.FC<Props> = ({
  mode,
  visible,
  isMandatory = false,
  onClose,
  onEnableLocation,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [isEnabling, setIsEnabling] = useState(false);
  const { currentRole } = useUIStore();
  const { savedAddresses, setActive } = useAddressStore();
  const { updateLocation } = useLocationStore();

  const themeColor = currentRole === 'seeker' ? Colors.saffron : '#005B5C';

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [visible]);

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

  const handleSelectSaved = (id: string) => {
    setActive(id);
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) {
      updateLocation(addr.lat, addr.lng, addr.flatHouse || addr.area || 'Saved Location');
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={!isMandatory ? onClose : undefined} />
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={!isMandatory}
        onClose={!isMandatory ? onClose : undefined}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, width: '100%' }}>
            
            {/* Header Area with Illustration */}
            <View style={styles.illustrationHeader}>
              <View style={styles.cloud1} />
              <View style={styles.cloud2} />
              <View style={styles.cloud3} />
              <Ionicons name="location" size={60} color="#FF2C65" style={{ zIndex: 2 }} />
            </View>

            <View style={styles.headerArea}>
              <Text style={styles.title}>
                {mode === 'gps_off' ? 'Your device location is off' : 'Your device location is off'}
              </Text>
              <Text style={styles.subtitle}>
                Enabling location helps us reach you quickly with accurate delivery
              </Text>
            </View>

            {/* Current Location Card */}
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Ionicons name="locate" size={24} color="#FF2C65" />
                <Text style={styles.cardText}>Use my Current Location</Text>
              </View>
              <TouchableOpacity style={styles.enableBtn} onPress={handleEnable}>
                {isEnabling ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.enableBtnText}>Enable</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Add New Address Card */}
            <TouchableOpacity style={[styles.card, { marginTop: 8 }]} activeOpacity={0.7} onPress={() => { router.push('/location/map-picker'); }}>
              <View style={styles.cardLeft}>
                <Ionicons name="add-circle-outline" size={24} color={Colors.gray4} />
                <Text style={styles.cardText}>Add New Address</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray4} />
            </TouchableOpacity>

            {/* Saved Addresses Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select your address</Text>
              {savedAddresses.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/location/saved-addresses')}>
                  <Text style={[styles.seeAllText, { color: '#FF2C65' }]}>See All <Ionicons name="chevron-forward" size={12} /></Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.savedList}>
              {savedAddresses.length === 0 ? (
                <Text style={styles.emptyText}>No saved addresses found.</Text>
              ) : (
                savedAddresses.slice(0, 3).map((addr, index) => (
                  <TouchableOpacity key={addr.id} style={[styles.savedCard, index !== 0 && styles.savedCardBorder]} onPress={() => handleSelectSaved(addr.id)}>
                    <View style={styles.savedIconBox}>
                      <Ionicons name={addr.label === 'home' ? 'home-outline' : addr.label === 'work' ? 'business-outline' : 'location-outline'} size={24} color={Colors.ink} />
                    </View>
                    <View style={styles.savedDetails}>
                      <Text style={styles.savedLabel}>{addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}</Text>
                      <Text style={styles.savedAddressText} numberOfLines={2}>{formatSavedAddress(addr)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.gray4} />
                  </TouchableOpacity>
                ))
              )}
            </View>

          </ScrollView>

          {/* Sticky Search Button */}
          <View style={styles.searchWrap}>
            <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={() => router.push('/location/saved-addresses')}>
              <Ionicons name="search" size={20} color={Colors.ink} />
              <Text style={styles.searchText}>Search your Location</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetBackground: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: '#CBD5E1',
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  illustrationHeader: {
    height: 120,
    backgroundColor: '#E6F4FB',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cloud1: {
    position: 'absolute',
    width: 100,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 30,
    top: 20,
    left: -20,
  },
  cloud2: {
    position: 'absolute',
    width: 120,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 35,
    top: 10,
    right: -30,
  },
  cloud3: {
    position: 'absolute',
    width: 80,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    top: 60,
    left: 80,
  },
  headerArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray1,
    marginHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  enableBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF2C65',
  },
  enableBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  seeAllText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
  },
  savedList: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    textAlign: 'center',
    padding: 24,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  savedCardBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
  },
  savedIconBox: {
    marginRight: 16,
  },
  savedDetails: {
    flex: 1,
  },
  savedLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    marginBottom: 2,
  },
  savedAddressText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    lineHeight: 20,
  },
  searchWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  searchText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
});

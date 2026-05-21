import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { useAddressStore } from '../../src/store/addressStore';
import { formatSavedAddress } from '../../src/utils/geocoding';
import { StaticMap } from '../../src/components/organisms/StaticMap';

const ACCENT_COLOR = '#E91E63'; // Hot Pink / Rose Zepto theme color

const LABEL_CONFIG: Record<string, { icon: string; color: string; text: string }> = {
  home:   { icon: 'home-outline',       color: ACCENT_COLOR, text: 'Home'   },
  work:   { icon: 'business-outline',   color: Colors.navy,  text: 'Work'   },
  family: { icon: 'people-outline',     color: Colors.green, text: 'Family' },
  other:  { icon: 'location-outline',   color: Colors.ink2,  text: 'Other'  },
};

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    addressId?: string; lat?: string; lng?: string; fullAddress?: string;
  }>();

  const { savedAddresses, setActive } = useAddressStore();
  const address = params.addressId ? savedAddresses.find((a) => a.id === params.addressId) : null;

  const lat = params.lat ? parseFloat(params.lat) : 17.4344;
  const lng = params.lng ? parseFloat(params.lng) : 78.4497;

  const cfg = address ? LABEL_CONFIG[address.label] : LABEL_CONFIG.other;
  const fullAddr = address ? formatSavedAddress(address) : (params.fullAddress ?? '');

  // Animations
  const mapAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(mapAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(cardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(checkAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  }, []);

  const handleConfirm = () => {
    if (address) setActive(address.id);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.screen}>
      {/* Map preview */}
      <Animated.View style={[styles.mapContainer, { opacity: mapAnim }]}>
        <StaticMap latitude={lat} longitude={lng} />

        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.95)', Colors.white]}
          style={styles.mapGradient}
        />

        {/* Success check */}
        <Animated.View
          style={[
            styles.successCircle,
            { opacity: checkAnim, transform: [{ scale: checkScale }] },
          ]}
        >
          <Ionicons name="checkmark" size={36} color={Colors.white} />
        </Animated.View>
      </Animated.View>

      {/* Content card */}
      <Animated.View
        style={[styles.card, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}
      >
        <Text style={styles.successLabel}>Address Saved! 🎉</Text>

        {/* Address display */}
        <View style={styles.addrBox}>
          <View style={[styles.addrIconBadge, { backgroundColor: cfg.color + '12' }]}>
            <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addrTypeLabel}>{cfg.text}</Text>
            <Text style={styles.addrText} numberOfLines={3}>{fullAddr}</Text>
          </View>
        </View>

        {/* Delivery info */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="flash" size={18} color={ACCENT_COLOR} />
            <Text style={styles.infoValue}>Jobs Available</Text>
            <Text style={styles.infoSub}>In your area</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCard}>
            <Ionicons name="location" size={18} color={Colors.navy} />
            <Text style={styles.infoValue}>Pinned</Text>
            <Text style={styles.infoSub}>On map</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>Go to Home</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              router.replace({
                pathname: '/location/map-picker',
                params: { lat, lng },
              })
            }
          >
            <Ionicons name="pencil" size={15} color={Colors.navy} />
            <Text style={styles.secondaryBtnText}>Edit Pin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/location/saved-addresses')}
          >
            <Ionicons name="list" size={15} color={Colors.navy} />
            <Text style={styles.secondaryBtnText}>All Addresses</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },

  // Map
  mapContainer: { height: 340, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  mapGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  successCircle: {
    position: 'absolute', width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center',
    ...Shadow.lg, borderWidth: 4, borderColor: Colors.white,
  },

  // Card
  card: {
    flex: 1, backgroundColor: Colors.white, paddingHorizontal: 24, paddingTop: 4,
  },
  successLabel: {
    fontFamily: FontFamily.headingBold, fontSize: FontSize['5xl'], color: Colors.ink,
    marginBottom: 16, textAlign: 'center',
  },
  addrBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.gray1, borderRadius: Radius.lg,
    padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.gray2,
  },
  addrIconBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  addrTypeLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.gray4, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  addrText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.ink, lineHeight: 20 },

  // Info cards
  infoRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray1,
    borderRadius: Radius.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.gray2,
  },
  infoCard: { flex: 1, alignItems: 'center', gap: 4 },
  infoValue: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink },
  infoSub: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4 },
  infoDivider: { width: 1, height: 36, backgroundColor: Colors.gray2 },

  // Buttons
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT_COLOR, borderRadius: Radius.round, height: 56, gap: 8, ...Shadow.md,
  },
  confirmBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize['2xl'], color: Colors.white },
  secondaryActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.gray1, borderRadius: Radius.round, height: 44,
    borderWidth: 1.5, borderColor: Colors.gray2,
  },
  secondaryBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.navy },
});

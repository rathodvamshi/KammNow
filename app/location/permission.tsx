import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../src/theme';
import { useLocationStore } from '../../src/store/locationStore';
import { reverseGeocode } from '../../src/utils/geocoding';

const FEATURES = [
  { icon: 'flash',          color: '#FF6B00', label: 'Faster Job Matching',       sub: 'Get real-time jobs near you instantly' },
  { icon: 'map',            color: '#1565C0', label: 'Accurate Job Availability',  sub: 'See only available jobs in your area' },
  { icon: 'star',           color: '#F0A500', label: 'Personalised Picks',         sub: 'Jobs recommended just for you' },
  { icon: 'bookmark',       color: '#00875A', label: 'Saved Locations',            sub: 'Switch between Home, Work & more' },
  { icon: 'time',           color: '#9C27B0', label: 'Delivery ETA',               sub: 'Know when your payment arrives' },
];

// Radar pulse animation rings
const RadarRing = ({ delay, size }: { delay: number; size: number }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animate = () => {
      scale.setValue(0);
      opacity.setValue(0.6);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 2200, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 2200, delay, useNativeDriver: true }),
      ]).start(animate);
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: 'rgba(255,107,0,0.5)',
        transform: [{ scale }],
        opacity,
      }}
    />
  );
};

export default function PermissionScreen() {
  const { setPermission, updateLocation, setDetecting } = useLocationStore();
  const [isRequesting, setIsRequesting] = useState(false);

  // Stagger animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const featureAnims = FEATURES.map(() => useRef(new Animated.Value(0)).current);
  const btnAnim = useRef(new Animated.Value(0)).current;
  const pinBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pin bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pinBounce, { toValue: -8, duration: 600, useNativeDriver: true }),
        Animated.timing(pinBounce, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Stagger entrance
    Animated.stagger(100, [
      Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ...featureAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true })
      ),
      Animated.timing(btnAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const requestAndDetect = async () => {
    setIsRequesting(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission(false);
        if (Platform.OS === 'web') {
          alert('Location permission denied. Please select your address manually on the map.');
          router.replace('/location/map-picker');
        } else {
          Alert.alert(
            'Location Required',
            'Please enable location in your device settings or use our manual picker.',
            [
              { text: 'Select on Map', onPress: () => router.replace('/location/map-picker') },
              { text: 'Enter Manually', onPress: () => router.replace('/location/address-form') },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }
        return;
      }
      setPermission(true);
      setDetecting(true);

      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const { latitude, longitude, accuracy } = loc.coords;

      const geo = await reverseGeocode(latitude, longitude);
      updateLocation(latitude, longitude, geo.formattedLine2 || geo.city, accuracy ?? undefined);

      router.replace({
        pathname: '/location/map-picker',
        params: { lat: latitude, lng: longitude, fromPermission: '1' },
      });
    } catch (e) {
      Alert.alert('Error', 'Could not detect location. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.navy, Colors.navy2, '#1E2D50']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* Hero */}
        <Animated.View
          style={[styles.hero, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [30, 0] }) }] }]}
        >
          {/* Radar rings */}
          <View style={styles.radarContainer}>
            <RadarRing delay={0}    size={220} />
            <RadarRing delay={700}  size={160} />
            <RadarRing delay={1400} size={100} />

            {/* Center pin icon */}
            <Animated.View style={[styles.pinCircle, { transform: [{ translateY: pinBounce }] }]}>
              <Ionicons name="location" size={32} color={Colors.white} />
            </Animated.View>
          </View>

          <Text style={styles.title}>Find Jobs Near You</Text>
          <Text style={styles.subtitle}>
            Enable location to discover gigs{'\n'}exactly where you need them
          </Text>
        </Animated.View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.label}
              style={[
                styles.featureRow,
                {
                  opacity: featureAnims[i],
                  transform: [{ translateX: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
                <Ionicons name={f.icon as any} size={18} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* CTAs */}
        <Animated.View
          style={[styles.ctaBlock, { opacity: btnAnim, transform: [{ translateY: btnAnim.interpolate({ inputRange: [0,1], outputRange: [20, 0] }) }] }]}
        >
          <TouchableOpacity
            style={[styles.btnPrimary, isRequesting && styles.btnDisabled]}
            activeOpacity={0.85}
            onPress={requestAndDetect}
            disabled={isRequesting}
          >
            <Ionicons name="locate" size={20} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>
              {isRequesting ? 'Detecting...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            onPress={() => router.push('/location/map-picker')}
          >
            <Ionicons name="map-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.btnSecondaryText}>Select on Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGhost}
            activeOpacity={0.7}
            onPress={() => router.push('/location/address-form')}
          >
            <Text style={styles.btnGhostText}>Enter Address Manually</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },

  // Hero
  hero: { alignItems: 'center', marginTop: 32, marginBottom: 20 },
  radarContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pinCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['6xl'],
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize['2xl'],
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },

  // Features
  featureList: { flex: 1, gap: 8, justifyContent: 'center' },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  featureSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },

  // CTAs
  ctaBlock: { gap: 10, paddingBottom: 24 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.saffron,
    borderRadius: Radius.round,
    height: 54,
    ...Shadow.md,
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.round,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  btnSecondaryText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize['2xl'],
    color: Colors.white,
  },
  btnGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  btnGhostText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
});

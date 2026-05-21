import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { useAddressStore, type AddressLabel } from '../../src/store/addressStore';
import { useLocationStore } from '../../src/store/locationStore';
import { StaticMap } from '../../src/components/organisms/StaticMap';

const ACCENT_COLOR = '#E91E63'; // Hot Pink / Rose Zepto theme color

const LABELS: { key: AddressLabel; icon: string; text: string }[] = [
  { key: 'home',   icon: 'home-outline',       text: 'Home' },
  { key: 'work',   icon: 'business-outline',   text: 'Work' },
  { key: 'family', icon: 'people-outline',     text: 'Family' },
  { key: 'other',  icon: 'location-outline',   text: 'Other' },
];

const Field = ({
  label: fieldLabel,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default' as any,
}: any) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{fieldLabel}</Text>
    <TextInput
      style={[styles.fieldInput, multiline && styles.fieldMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.gray4}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      keyboardType={keyboardType}
    />
  </View>
);

export default function AddressFormScreen() {
  const params = useLocalSearchParams<{
    lat?: string; lng?: string;
    street?: string; area?: string; city?: string;
    state?: string; pincode?: string; landmark?: string;
    label?: string;
    editId?: string;
  }>();

  const { addAddress, editAddress, savedAddresses, setActive } = useAddressStore();
  const { lat: storeLat, lng: storeLng } = useLocationStore();

  const editTarget = params.editId ? savedAddresses.find((a) => a.id === params.editId) : undefined;

  // Prioritize editTarget lat/lng, then params lat/lng, then store lat/lng
  const lat = editTarget ? editTarget.lat : (params.lat ? parseFloat(params.lat) : (storeLat ?? 17.4344));
  const lng = editTarget ? editTarget.lng : (params.lng ? parseFloat(params.lng) : (storeLng ?? 78.4497));

  // Form state
  const [label, setLabel] = useState<AddressLabel>((editTarget?.label as any) ?? (params.label as any) ?? 'other');
  const [street, setStreet] = useState(editTarget?.street ?? params.street ?? '');
  const [area, setArea] = useState(editTarget?.area ?? params.area ?? '');
  const [landmark, setLandmark] = useState(editTarget?.landmark ?? params.landmark ?? '');
  const [city, setCity] = useState(editTarget?.city ?? params.city ?? '');
  const [state, setState] = useState(editTarget?.state ?? params.state ?? '');
  const [pincode, setPincode] = useState(editTarget?.pincode ?? params.pincode ?? '');
  const [isDefault, setIsDefault] = useState(editTarget?.isDefault ?? false);
  const [isSaving, setIsSaving] = useState(false);

  // Animations
  const formAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(formAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleSave = async () => {
    if (!area.trim() && !street.trim()) {
      if (Platform.OS === 'web') alert('Required: Please enter your Street or Area.');
      else Alert.alert('Required', 'Please enter your Street or Area.');
      return;
    }

    setIsSaving(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const addressData = {
        label,
        flatHouse: '',
        floor: '',
        street: street.trim(),
        area: area.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        lat,
        lng,
        receiverName: '',
        receiverPhone: '',
        notes: '',
        isDefault,
      };

      let savedId: string;
      if (editTarget) {
        await editAddress(editTarget.id, addressData);
        savedId = editTarget.id;
      } else {
        savedId = await addAddress(addressData);
      }

      // Mark the newly saved address as active immediately
      setActive(savedId);

      // Route directly to the saved-addresses list screen
      router.replace('/location/saved-addresses');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Animated.View style={[styles.container, { opacity: formAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editTarget ? 'Edit Address' : 'Add Address Details'}</Text>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Small Premium Map Preview of Selected Address */}
            <View style={styles.mapCard}>
              <View style={styles.mapHeaderRow}>
                <Ionicons name="map-outline" size={18} color={ACCENT_COLOR} />
                <Text style={styles.mapHeaderTitle}>Selected Location Preview</Text>
              </View>
              <View style={styles.mapContainer}>
                <StaticMap latitude={lat} longitude={lng} />
                {/* Center teardrop pin overlay */}
                <View style={styles.mapMarkerOverlay} pointerEvents="none">
                  <Ionicons name="location" size={32} color={ACCENT_COLOR} />
                  <View style={styles.markerDot} />
                </View>
              </View>
            </View>

            {/* Save As / Label Picker */}
            <Text style={styles.sectionTitle}>Save As</Text>
            <View style={styles.labelRow}>
              {LABELS.map((l) => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.labelChip, label === l.key && { backgroundColor: ACCENT_COLOR + '12', borderColor: ACCENT_COLOR }]}
                  onPress={() => {
                    setLabel(l.key);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={l.icon as any} size={18} color={label === l.key ? ACCENT_COLOR : Colors.gray4} />
                  <Text style={[styles.labelChipText, label === l.key && { color: ACCENT_COLOR, fontFamily: FontFamily.bodySemiBold }]}>
                    {l.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Address fields */}
            <Text style={styles.sectionTitle}>Address Details</Text>

            <Field label="Street / Road / Area *" value={street} onChangeText={setStreet} placeholder="Street name / Landmark nearby" />
            <Field label="Area / Locality" value={area} onChangeText={setArea} placeholder="e.g. Ameerpet" />
            <Field label="Landmark (Optional)" value={landmark} onChangeText={setLandmark} placeholder="e.g. Near Metro Station" />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="City" value={city} onChangeText={setCity} placeholder="City" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Pincode" value={pincode} onChangeText={setPincode} placeholder="500001" keyboardType="numeric" />
              </View>
            </View>

            <Field label="State" value={state} onChangeText={setState} placeholder="State" />

            {/* Default toggle */}
            <TouchableOpacity
              style={styles.defaultToggle}
              onPress={() => {
                setIsDefault((v) => !v);
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.defaultToggleLabel}>Set as Default Address</Text>
                <Text style={styles.defaultToggleSub}>This address will be pre-selected every time</Text>
              </View>
              <View style={[styles.toggle, isDefault && { backgroundColor: ACCENT_COLOR }]}>
                <View style={[styles.toggleThumb, isDefault && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={isSaving}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : (editTarget ? 'Update Address' : 'Save Address')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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

  scrollContent: { padding: 16, paddingBottom: 60 },

  // Map Card styles
  mapCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    ...Shadow.sm,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  mapHeaderTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink,
  },
  mapContainer: {
    height: 150,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    bottom: '50%', // align pin tip to middle
    marginBottom: -16,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -4,
  },

  // Label Title
  sectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 20,
  },
  labelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  labelChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.gray4 },

  // Fields styling
  row2: { flexDirection: 'row', gap: 10 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.ink2, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    ...Shadow.sm,
  },
  fieldMultiline: { height: 80, textAlignVertical: 'top' },

  // Default toggle
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 4,
    ...Shadow.sm,
  },
  defaultToggleLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink },
  defaultToggleSub: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4, marginTop: 2 },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: Colors.gray3, justifyContext: 'center', padding: 2 } as any,
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white, ...Shadow.sm },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Save button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_COLOR,
    borderRadius: Radius.round,
    height: 54,
    marginTop: 24,
    ...Shadow.md,
  },
  saveBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize['2xl'], color: Colors.white },
});

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FloatingLabelInput } from '../../src/components/atoms/FloatingLabelInput';
import { router } from 'expo-router';
import { safeGoBack } from '../../src/utils/navigation';
import { useJobStore } from '../../src/store/jobStore';
import { useAddressStore } from '../../src/store/addressStore';
import { useLocationStore } from '../../src/store/locationStore';
import { reverseGeocode } from '../../src/utils/geocoding';
import { formatForApi, formatForDisplay } from '../../src/utils/date';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow, Motion } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';
import { QuantityEditor } from '../../src/components/molecules/QuantityEditor';
import { JobPostMap } from '../../src/components/organisms/JobPostMap';
import { Toggle } from '../../src/components/atoms/Toggle';
import type { JobCategory } from '../../src/types';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: JobCategory; label: string; icon: string }[] = [
  { key: 'delivery', label: 'Delivery', icon: '🚚' },
  { key: 'driver', label: 'Driver', icon: '🚗' },
  { key: 'warehouse', label: 'Warehouse', icon: '📦' },
  { key: 'construction', label: 'Construction', icon: '🏗️' },
  { key: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { key: 'cooking', label: 'Cooking', icon: '🍳' },
  { key: 'security', label: 'Security', icon: '🛡️' },
  { key: 'shop_helper', label: 'Shop Helper', icon: '🏪' },
  { key: 'office_assistant', label: 'Office Asst.', icon: '💼' },
  { key: 'electrician', label: 'Electrician', icon: '⚡' },
  { key: 'plumber', label: 'Plumber', icon: '🚰' },
  { key: 'mechanic', label: 'Mechanic', icon: '🔧' },
  { key: 'painter', label: 'Painter', icon: '🎨' },
  { key: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { key: 'event_staff', label: 'Event Staff', icon: '🎪' },
  { key: 'hotel_staff', label: 'Hotel Staff', icon: '🛏️' },
  { key: 'restaurant_staff', label: 'Restaurant', icon: '🍽️' },
  { key: 'factory_worker', label: 'Factory', icon: '🏭' },
  { key: 'household_work', label: 'Household', icon: '🏠' },
  { key: 'gardening', label: 'Gardening', icon: '🌿' },
  { key: 'caregiver', label: 'Caregiver', icon: '❤️' },
  { key: 'technician', label: 'Technician', icon: '🧰' },
  { key: 'sales_promoter', label: 'Sales', icon: '📣' },
  { key: 'loading_unloading', label: 'Loading', icon: '🛒' },
  { key: 'other', label: 'Other', icon: '➕' },
];

const COMMON_SKILLS = [
  'Bike Riding', 'Driving', 'Packing', 'Cleaning',
  'Cooking', 'Communication', 'Heavy Lifting', 'Customer Handling',
];

const ALL_SKILLS = [
  ...COMMON_SKILLS,
  'English Speaking', 'Hindi Speaking', 'Regional Language', 'Basic Computer',
  'Excel/Data Entry', 'Forklift Operation', 'Welding', 'Carpentry',
  'Electrical Work', 'Plumbing', 'Painting', 'Event Management',
  'Serving/Waiting', 'Cash Handling', 'Inventory Management'
];

const STEPS = [
  { id: 1, label: 'Details', icon: 'document-text-outline' },
  { id: 2, label: 'Work', icon: 'time-outline' },
  { id: 3, label: 'Location', icon: 'location-outline' },
  { id: 4, label: 'Workers', icon: 'people-outline' },
  { id: 5, label: 'Review', icon: 'checkmark-circle-outline' },
];

const PLACEHOLDER_COLOR = Colors.gray3;

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseTimeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  if (timeStr.includes(':') && !timeStr.toLowerCase().includes('m')) {
    const [h, m] = timeStr.split(':');
    return parseInt(h) * 60 + parseInt(m);
  }
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const isPM = match[3].toUpperCase() === 'PM';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }
  return 0;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const FieldLabel = ({ children }: { children: string }) => (
  <Text style={styles.fieldLabel}>{children}</Text>
);

// Inline error message shown below a field
const ErrorMsg = ({ msg }: { msg?: string }) =>
  msg ? (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={13} color={Colors.red} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  ) : null;

const StyledInput = ({
  value, onChangeText, placeholder, keyboardType, multiline, maxLength, editable, hasError,
}: any) => (
  <TextInput
    style={[
      styles.input,
      multiline && styles.textarea,
      !editable && styles.inputDisabled,
      hasError && styles.inputError,
    ]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={hasError ? Colors.red + '88' : PLACEHOLDER_COLOR}
    keyboardType={keyboardType}
    multiline={multiline}
    maxLength={maxLength}
    editable={editable !== false}
    textAlignVertical={multiline ? 'top' : 'center'}
  />
);

const ChipSelector = ({
  options, value, onChange, multiSelect = false,
}: {
  options: { key: string; label: string }[];
  value: string | string[];
  onChange: (v: any) => void;
  multiSelect?: boolean;
}) => (
  <View style={styles.chipGrid}>
    {options.map(opt => {
      const isActive = multiSelect
        ? (value as string[]).includes(opt.key)
        : value === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[styles.chip, isActive && styles.chipActive]}
          onPress={() => {
            if (multiSelect) {
              const arr = value as string[];
              onChange(isActive ? arr.filter(v => v !== opt.key) : [...arr, opt.key]);
            } else {
              onChange(opt.key);
            }
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// Web date/time input fallback
const WebInput = ({ mode, value, onChange }: { mode: 'date' | 'time'; value: string; onChange: (v: string) => void }) =>
  Platform.OS === 'web'
    ? React.createElement('input', {
        type: mode, value,
        onChange: (e: any) => onChange(e.target.value),
        style: {
          width: '100%', boxSizing: 'border-box',
          padding: '13px 16px', border: `1.5px solid ${Colors.gray2}`,
          borderRadius: 12, fontSize: 15,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: Colors.white, outline: 'none',
          color: value ? Colors.ink : PLACEHOLDER_COLOR,
        },
      })
    : null;

// Touchable date/time picker button
const PickerButton = ({
  label, value, onPress, hasError,
}: { label: string; value: string; onPress: () => void; hasError?: boolean }) => (
  <TouchableOpacity
    style={[styles.pickerBtn, hasError && styles.pickerBtnError]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={value ? styles.pickerBtnText : (hasError ? styles.pickerBtnPlaceholderError : styles.pickerBtnPlaceholder)}>
      {value || label}
    </Text>
    <Ionicons name="calendar-outline" size={16} color={hasError ? Colors.red : Colors.gray4} />
  </TouchableOpacity>
);

const AlarmPickerButton = ({
  label, value, onPress, hasError,
}: { label: string; value: string; onPress: () => void; hasError?: boolean }) => {
  const parts = value ? value.split(' ') : null;
  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1.5,
          borderColor: hasError ? Colors.red : Colors.gray2, paddingVertical: 14, paddingHorizontal: 16
        },
        hasError && { backgroundColor: Colors.red + '0A' }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="alarm-outline" size={24} color={value ? Colors.saffron : (hasError ? Colors.red : Colors.gray4)} />
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 24, color: Colors.ink, letterSpacing: -0.5 }}>{parts?.[0]}</Text>
          <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 14, color: Colors.saffron }}>{parts?.[1]}</Text>
        </View>
      ) : (
        <Text style={{ fontFamily: FontFamily.bodyMedium, fontSize: 16, color: hasError ? Colors.red : Colors.gray4 }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function PostJobScreen() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // STEP 1: Basic Details
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JobCategory>('delivery');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [description, setDescription] = useState('');

  // STEP 2: Work Type
  const [workType, setWorkType] = useState<'hour' | 'day' | 'month'>('day');
  const [hourlyRate, setHourlyRate] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [sameDayPayment, setSameDayPayment] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [dailyWage, setDailyWage] = useState('');
  const [numberOfDays, setNumberOfDays] = useState('');
  const [dailyShiftStart, setDailyShiftStart] = useState('');
  const [dailyShiftEnd, setDailyShiftEnd] = useState('');
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [accommodationIncluded, setAccommodationIncluded] = useState(false);
  const [overtimeAvailable, setOvertimeAvailable] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState('6 Days');
  const [monthlyShiftStart, setMonthlyShiftStart] = useState('');
  const [monthlyShiftEnd, setMonthlyShiftEnd] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('No Experience');
  const [salaryNegotiable, setSalaryNegotiable] = useState(false);
  const [pfEsiIncluded, setPfEsiIncluded] = useState(false);

  // STEP 3: Location
  const [locationCoords, setLocationCoords] = useState({ latitude: 17.3850, longitude: 78.4867 });
  const [fullAddress, setFullAddress] = useState('');

  // STEP 4: Workers
  const [workersNeeded, setWorkersNeeded] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [genderPref, setGenderPref] = useState<'any' | 'male' | 'female'>('any');
  const [contactMethod, setContactMethod] = useState<'in_app_chat' | 'phone_call' | 'whatsapp'>('in_app_chat');

  const { savedAddresses } = useAddressStore();
  const { lat, lng } = useLocationStore();

  // STEP 5: Review
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // ── Inline field errors ──────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) => setErrors(prev => {
    if (!prev[key]) return prev;
    const next = { ...prev }; delete next[key]; return next;
  });

  // Picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [pickerTarget, setPickerTarget] = useState<string>('');
  const [tempDate, setTempDate] = useState(new Date());

  // Auto-calculate hours
  useEffect(() => {
    if (workType === 'hour' && shiftStart && shiftEnd) {
      const diff = parseTimeToMinutes(shiftEnd) - parseTimeToMinutes(shiftStart);
      const hours = (diff < 0 ? diff + 1440 : diff) / 60;
      setTotalHours(hours > 0 ? Number(hours.toFixed(1)).toString() : '');
    }
  }, [shiftStart, shiftEnd, workType]);

  const openPicker = (mode: 'date' | 'time', target: string) => {
    setPickerMode(mode); setPickerTarget(target); setShowPicker(true);
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  };

  const handleDateSelect = (selectedDate: Date) => {
    if (pickerMode === 'time') {
      const t = formatTime(selectedDate);
      if (pickerTarget === 'hourlyStart') setShiftStart(t);
      else if (pickerTarget === 'hourlyEnd') setShiftEnd(t);
      else if (pickerTarget === 'dailyStart') setDailyShiftStart(t);
      else if (pickerTarget === 'dailyEnd') setDailyShiftEnd(t);
      else if (pickerTarget === 'monthlyStart') setMonthlyShiftStart(t);
      else if (pickerTarget === 'monthlyEnd') setMonthlyShiftEnd(t);
    } else {
      const apiDate = formatForApi(selectedDate);
      if (!apiDate) return; // Prevent saving invalid dates
      if (pickerTarget === 'dailyDate') setDailyStartDate(apiDate);
      else if (pickerTarget === 'monthlyDate') setJoiningDate(apiDate);
    }
  };

  const animateToStep = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setCurrentStep(next);
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!title.trim()) newErrors.title = 'Job title is required';
      if (description.length < 30) newErrors.description = description.length === 0
        ? 'Job description is required'
        : `Too short — add ${30 - description.length} more characters`;
    }

    if (currentStep === 2) {
      if (workType === 'hour') {
        if (!shiftStart) newErrors.shiftStart = 'Shift start time is required';
        if (!shiftEnd) newErrors.shiftEnd = 'Shift end time is required';
        if (!hourlyRate) newErrors.hourlyRate = 'Total pay amount is required';
      }
      if (workType === 'day') {
        if (!dailyWage) newErrors.dailyWage = 'Daily wage is required';
        if (!numberOfDays) newErrors.numberOfDays = 'Number of days is required';
        if (!dailyShiftStart) newErrors.dailyShiftStart = 'Shift start time is required';
        if (!dailyShiftEnd) newErrors.dailyShiftEnd = 'Shift end time is required';
        if (!dailyStartDate) newErrors.dailyStartDate = 'Start date is required';
      }
      if (workType === 'month') {
        if (!monthlySalary) newErrors.monthlySalary = 'Monthly salary is required';
        if (!monthlyShiftStart) newErrors.monthlyShiftStart = 'Shift start time is required';
        if (!monthlyShiftEnd) newErrors.monthlyShiftEnd = 'Shift end time is required';
        if (!joiningDate) newErrors.joiningDate = 'Joining date is required';
      }
    }

    if (currentStep === 3) {
      if (!fullAddress.trim()) newErrors.fullAddress = 'Full address is required';
    }

    if (currentStep === 5) {
      if (!acceptTerms) newErrors.acceptTerms = 'You must accept the terms to post this job';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const isStepValid = (): boolean => {
    if (currentStep === 1) {
      if (!title.trim() || description.length < 30) return false;
    }
    if (currentStep === 2) {
      if (workType === 'hour' && (!shiftStart || !shiftEnd || !hourlyRate)) return false;
      if (workType === 'day' && (!dailyWage || !numberOfDays || !dailyShiftStart || !dailyShiftEnd || !dailyStartDate)) return false;
      if (workType === 'month' && (!monthlySalary || !monthlyShiftStart || !monthlyShiftEnd || !joiningDate)) return false;
    }
    if (currentStep === 3) {
      if (!fullAddress.trim()) return false;
    }
    return true;
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = () => {
    if (!validateStep()) {
      triggerShake();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (currentStep < 5) animateToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) animateToStep(currentStep - 1);
    else safeGoBack();
  };

  const handlePost = async () => {
    if (!validateStep()) return;
    setIsPosting(true);
    
    try {
      const jobData: Record<string, any> = {
        // ── Step 1: Basic Details ───────────────────────────────────────
        title,
        description,
        category_id: category,

        // ── Step 2: Work Type ───────────────────────────────────────────
        job_type: workType,
        salary_type: workType,
        is_urgent: isUrgent,

        // Pay amount (one of the three types)
        salary:
          workType === 'hour'
            ? parseFloat(hourlyRate) || 0
            : workType === 'day'
            ? parseFloat(dailyWage) || 0
            : parseFloat(monthlySalary) || 0,

        // Common shift times (mapped per work type)
        shift_start:
          workType === 'hour' ? shiftStart
          : workType === 'day' ? dailyShiftStart
          : monthlyShiftStart,
        shift_end:
          workType === 'hour' ? shiftEnd
          : workType === 'day' ? dailyShiftEnd
          : monthlyShiftEnd,

        // Hourly-specific
        total_hours: workType === 'hour' ? parseFloat(totalHours) || null : null,
        same_day_payment: workType === 'hour' ? sameDayPayment : false,

        // Daily-specific
        number_of_days: workType === 'day' ? parseInt(numberOfDays) || null : null,
        start_date: workType === 'day' ? dailyStartDate || null : null,
        food_included: workType === 'day' ? foodIncluded : false,
        accommodation_included: workType === 'day' ? accommodationIncluded : false,
        overtime_available: workType === 'day' ? overtimeAvailable : false,

        // Monthly-specific
        joining_date: workType === 'month' ? joiningDate || null : null,
        working_days_per_week: workType === 'month' ? workingDaysPerWeek : null,
        experience_required: experienceRequired,
        salary_negotiable: workType === 'month' ? salaryNegotiable : false,
        pf_esi_included: workType === 'month' ? pfEsiIncluded : false,

        // ── Step 3: Location ────────────────────────────────────────────
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        location_name: fullAddress.split(',')[0]?.trim() || 'Location',
        full_address: fullAddress,

        // ── Step 4: Workers ─────────────────────────────────────────────
        required_skills: selectedSkills,
        quantity_total: workersNeeded,
        gender_preference: genderPref,
        contact_method: contactMethod,
      };
      
      await useJobStore.getState().createJob(jobData);
      setPosted(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post job');
    } finally {
      setIsPosting(false);
    }
  };

  const getEstimatedCost = () => {
    if (workType === 'hour') return (parseFloat(hourlyRate) || 0) * workersNeeded;
    if (workType === 'day') return (parseFloat(dailyWage) || 0) * (parseFloat(numberOfDays) || 0) * workersNeeded;
    return (parseFloat(monthlySalary) || 0) * workersNeeded;
  };

  // ── Success Screen ───────────────────────────────────────────────────────
  if (posted) {
    return (
      <View style={styles.successScreen}>
        
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Job is Live!</Text>
          <Text style={styles.successSub}>Workers are being notified nearby. You'll hear back shortly.</Text>

          <View style={styles.successStats}>
            <View style={styles.successStat}>
              <Text style={styles.successStatValue}>~12</Text>
              <Text style={styles.successStatLabel}>Nearby Workers</Text>
            </View>
            <View style={styles.successStatDivider} />
            <View style={styles.successStat}>
              <Text style={styles.successStatValue}>&lt;2h</Text>
              <Text style={styles.successStatLabel}>Avg Response</Text>
            </View>
            <View style={styles.successStatDivider} />
            <View style={styles.successStat}>
              <Text style={styles.successStatValue}>100%</Text>
              <Text style={styles.successStatLabel}>Free to Post</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.successBtn} onPress={() => router.replace('/(tabs)/my-jobs')}>
            <Ionicons name="briefcase-outline" size={18} color={Colors.white} />
            <Text style={styles.successBtnText}>View My Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.successBtn2} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.successBtn2Text}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step Content ─────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's the job?</Text>
            <Text style={styles.stepSubtitle}>Clear titles get 3× more applicants</Text>

            {/* Smart Suggestions for Title */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
              {['Delivery Executive', 'Warehouse Helper', 'Office Assistant', 'Driver'].map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={styles.suggestionChip}
                  onPress={() => { setTitle(sug); clearError('title'); }}
                >
                  <Text style={styles.suggestionChipText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FloatingLabelInput
              label="Job Title *"
              value={title}
              onChangeText={(v: string) => { setTitle(v); clearError('title'); }}
              placeholder="e.g. Delivery Boy Needed Urgently"
              error={errors.title}
            />

            <View style={[styles.field, { marginTop: 12 }]}>
              <Text style={styles.sectionLabelPremium}>Select Category *</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingTop: 4 }}>
                {CATEGORIES.slice(0, 10).map((cat) => {
                  const isActive = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        { alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: isActive ? Colors.saffron : Colors.gray2, backgroundColor: isActive ? Colors.saffronLight : Colors.white },
                        isActive && Shadow.sm
                      ]}
                      onPress={() => setCategory(cat.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>{cat.icon}</Text>
                      <Text style={{ fontFamily: isActive ? FontFamily.bodySemiBold : FontFamily.bodyMedium, fontSize: 10, color: isActive ? Colors.saffronDark : Colors.ink2, textAlign: 'center' }} numberOfLines={1}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={{ alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.gray2, backgroundColor: Colors.gray1 }}
                  onPress={() => setShowAllCategories(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="grid" size={24} color={Colors.gray4} />
                  <Text style={{ fontFamily: FontFamily.bodyMedium, fontSize: 10, color: Colors.ink2, textAlign: 'center', marginTop: 4 }}>View More</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <View style={[styles.field, { marginTop: 12 }]}>
              <Text style={styles.sectionLabelPremium}>Job Description *</Text>
              <View style={[
                {
                  borderColor: description.length > 0 && description.length < 30 ? Colors.red : (description.length >= 30 ? Colors.green : Colors.gray2),
                  borderWidth: 1.5,
                  borderRadius: Radius.lg,
                  backgroundColor: Colors.white,
                  padding: 12
                }
              ]}>
                <TextInput
                  style={[styles.textarea, { borderBottomWidth: 0, paddingHorizontal: 0, paddingTop: 0, minHeight: 100 }]}
                  value={description}
                  onChangeText={(v: string) => { setDescription(v); clearError('description'); }}
                  placeholder={'Describe the work clearly...\\n• What work is needed?\\n• When and how long?\\n• Any requirements?'}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontFamily: FontFamily.bodyMedium, fontSize: 12, color: description.length > 0 && description.length < 30 ? Colors.red : Colors.gray4 }}>
                    {description.length < 30 ? `Min 30 chars required (${description.length}/30)` : 'Looks good!'}
                  </Text>
                  <Text style={[styles.charCountPremium, description.length > 450 && { color: Colors.red }]}>
                    {description.length}/500
                  </Text>
                </View>
              </View>
              <ErrorMsg msg={errors.description} />
            </View>

            {/* View More Categories Modal */}
            <Modal visible={showAllCategories} animationType="slide" transparent={true} onRequestClose={() => setShowAllCategories(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 20, color: Colors.ink }}>All Categories</Text>
                    <TouchableOpacity onPress={() => setShowAllCategories(false)}>
                      <Ionicons name="close" size={24} color={Colors.ink} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 40 }}>
                      {CATEGORIES.map((cat) => {
                        const isActive = category === cat.key;
                        return (
                          <TouchableOpacity
                            key={cat.key}
                            style={[
                              { alignItems: 'center', justifyContent: 'center', width: '30%', height: 80, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: isActive ? Colors.saffron : Colors.gray2, backgroundColor: isActive ? Colors.saffronLight : Colors.white },
                              isActive && Shadow.sm
                            ]}
                            onPress={() => { setCategory(cat.key); setShowAllCategories(false); }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 24, marginBottom: 4 }}>{cat.icon}</Text>
                            <Text style={{ fontFamily: isActive ? FontFamily.bodySemiBold : FontFamily.bodyMedium, fontSize: 11, color: isActive ? Colors.saffronDark : Colors.ink2, textAlign: 'center' }} numberOfLines={1}>
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pay & Schedule</Text>
            <Text style={styles.stepSubtitle}>Fair pay attracts better workers faster</Text>

            <View style={styles.field}>
              <FieldLabel>Work Type</FieldLabel>
              <View style={styles.segmentControl}>
                {[
                  { key: 'hour', label: '⏱ Hourly' },
                  { key: 'day', label: '📅 Daily' },
                  { key: 'month', label: '📆 Monthly' },
                ].map(wt => (
                  <TouchableOpacity
                    key={wt.key}
                    style={[styles.segment, workType === wt.key && styles.segmentActive]}
                    onPress={() => setWorkType(wt.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, workType === wt.key && styles.segmentTextActive]}>
                      {wt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {workType === 'hour' && (
              <>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift Start *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={shiftStart} onChange={(v) => { setShiftStart(v); clearError('shiftStart'); }} />
                      : <AlarmPickerButton label="Set Start" value={shiftStart} hasError={!!errors.shiftStart} onPress={() => { openPicker('time', 'hourlyStart'); clearError('shiftStart'); }} />}
                    <ErrorMsg msg={errors.shiftStart} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift End *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={shiftEnd} onChange={(v) => { setShiftEnd(v); clearError('shiftEnd'); }} />
                      : <AlarmPickerButton label="Set End" value={shiftEnd} hasError={!!errors.shiftEnd} onPress={() => { openPicker('time', 'hourlyEnd'); clearError('shiftEnd'); }} />}
                    <ErrorMsg msg={errors.shiftEnd} />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Total Hours</FieldLabel>
                    <StyledInput value={totalHours ? `${totalHours} hrs` : ''} placeholder="Auto-calculated" editable={false} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Total Pay (₹) *</FieldLabel>
                    <StyledInput
                      value={hourlyRate}
                      onChangeText={(v: string) => { setHourlyRate(v); clearError('hourlyRate'); }}
                      placeholder="e.g. 500"
                      keyboardType="number-pad"
                      hasError={!!errors.hourlyRate}
                    />
                    <ErrorMsg msg={errors.hourlyRate} />
                  </View>
                </View>
                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardRow}>
                    <Text style={styles.toggleLabel}>Same Day Payment</Text>
                    <Toggle value={sameDayPayment} onToggle={setSameDayPayment} />
                  </View>
                  <View style={[styles.toggleCardRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.toggleLabel}>Mark as Urgent</Text>
                    <Toggle value={isUrgent} onToggle={setIsUrgent} />
                  </View>
                </View>
              </>
            )}

            {workType === 'day' && (
              <>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Daily Wage (₹) *</FieldLabel>
                    <StyledInput
                      value={dailyWage}
                      onChangeText={(v: string) => { setDailyWage(v); clearError('dailyWage'); }}
                      placeholder="₹800/day"
                      keyboardType="number-pad"
                      hasError={!!errors.dailyWage}
                    />
                    <ErrorMsg msg={errors.dailyWage} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Number of Days *</FieldLabel>
                    <StyledInput
                      value={numberOfDays}
                      onChangeText={(v: string) => { setNumberOfDays(v); clearError('numberOfDays'); }}
                      placeholder="e.g. 5"
                      keyboardType="number-pad"
                      hasError={!!errors.numberOfDays}
                    />
                    <ErrorMsg msg={errors.numberOfDays} />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift Start *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={dailyShiftStart} onChange={(v) => { setDailyShiftStart(v); clearError('dailyShiftStart'); }} />
                      : <AlarmPickerButton label="Set Start" value={dailyShiftStart} hasError={!!errors.dailyShiftStart} onPress={() => { openPicker('time', 'dailyStart'); clearError('dailyShiftStart'); }} />}
                    <ErrorMsg msg={errors.dailyShiftStart} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift End *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={dailyShiftEnd} onChange={(v) => { setDailyShiftEnd(v); clearError('dailyShiftEnd'); }} />
                      : <AlarmPickerButton label="Set End" value={dailyShiftEnd} hasError={!!errors.dailyShiftEnd} onPress={() => { openPicker('time', 'dailyEnd'); clearError('dailyShiftEnd'); }} />}
                    <ErrorMsg msg={errors.dailyShiftEnd} />
                  </View>
                </View>
                <View style={styles.field}>
                  <FieldLabel>Start Date *</FieldLabel>
                  {Platform.OS === 'web'
                    ? <WebInput mode="date" value={dailyStartDate ? dailyStartDate.split('T')[0] : ''} onChange={(v) => { setDailyStartDate(formatForApi(v) || ''); clearError('dailyStartDate'); }} />
                    : <PickerButton label="Select Date" value={formatForDisplay(dailyStartDate) || ''} hasError={!!errors.dailyStartDate} onPress={() => { openPicker('date', 'dailyDate'); clearError('dailyStartDate'); }} />}
                  <ErrorMsg msg={errors.dailyStartDate} />
                </View>
                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardRow}>
                    <Text style={styles.toggleLabel}>🍱 Food Provided</Text>
                    <Toggle value={foodIncluded} onToggle={setFoodIncluded} />
                  </View>
                  <View style={styles.toggleCardRow}>
                    <Text style={styles.toggleLabel}>🛏 Accommodation</Text>
                    <Toggle value={accommodationIncluded} onToggle={setAccommodationIncluded} />
                  </View>
                  <View style={[styles.toggleCardRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.toggleLabel}>⏰ Overtime Available</Text>
                    <Toggle value={overtimeAvailable} onToggle={setOvertimeAvailable} />
                  </View>
                </View>
              </>
            )}

            {workType === 'month' && (
              <>
                <View style={styles.field}>
                  <FieldLabel>Monthly Salary (₹) *</FieldLabel>
                  <StyledInput
                    value={monthlySalary}
                    onChangeText={(v: string) => { setMonthlySalary(v); clearError('monthlySalary'); }}
                    placeholder="₹18,000/month"
                    keyboardType="number-pad"
                    hasError={!!errors.monthlySalary}
                  />
                  <ErrorMsg msg={errors.monthlySalary} />
                </View>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift Start *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={monthlyShiftStart} onChange={(v) => { setMonthlyShiftStart(v); clearError('monthlyShiftStart'); }} />
                      : <AlarmPickerButton label="Set Start" value={monthlyShiftStart} hasError={!!errors.monthlyShiftStart} onPress={() => { openPicker('time', 'monthlyStart'); clearError('monthlyShiftStart'); }} />}
                    <ErrorMsg msg={errors.monthlyShiftStart} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift End *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={monthlyShiftEnd} onChange={(v) => { setMonthlyShiftEnd(v); clearError('monthlyShiftEnd'); }} />
                      : <AlarmPickerButton label="Set End" value={monthlyShiftEnd} hasError={!!errors.monthlyShiftEnd} onPress={() => { openPicker('time', 'monthlyEnd'); clearError('monthlyShiftEnd'); }} />}
                    <ErrorMsg msg={errors.monthlyShiftEnd} />
                  </View>
                </View>
                <View style={styles.field}>
                  <FieldLabel>Joining Date *</FieldLabel>
                  {Platform.OS === 'web'
                    ? <WebInput mode="date" value={joiningDate ? joiningDate.split('T')[0] : ''} onChange={(v) => { setJoiningDate(formatForApi(v) || ''); clearError('joiningDate'); }} />
                    : <PickerButton label="Select Date" value={formatForDisplay(joiningDate) || ''} hasError={!!errors.joiningDate} onPress={() => { openPicker('date', 'monthlyDate'); clearError('joiningDate'); }} />}
                  <ErrorMsg msg={errors.joiningDate} />
                </View>
                <View style={styles.field}>
                  <FieldLabel>Working Days/Week</FieldLabel>
                  <ChipSelector
                    options={['5 Days', '6 Days', '7 Days'].map(d => ({ key: d, label: d }))}
                    value={workingDaysPerWeek}
                    onChange={setWorkingDaysPerWeek}
                  />
                </View>
                <View style={styles.field}>
                  <FieldLabel>Experience Required</FieldLabel>
                  <ChipSelector
                    options={['No Experience', '0–1 Years', '1–3 Years', '3–5 Years', '5+ Years'].map(e => ({ key: e, label: e }))}
                    value={experienceRequired}
                    onChange={setExperienceRequired}
                  />
                </View>
                <View style={styles.toggleCard}>
                  <View style={styles.toggleCardRow}>
                    <Text style={styles.toggleLabel}>Salary Negotiable</Text>
                    <Toggle value={salaryNegotiable} onToggle={setSalaryNegotiable} />
                  </View>
                  <View style={[styles.toggleCardRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.toggleLabel}>PF / ESI Included</Text>
                    <Toggle value={pfEsiIncluded} onToggle={setPfEsiIncluded} />
                  </View>
                </View>
              </>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Job Location</Text>
            <Text style={styles.stepSubtitle}>Workers within 5km will see this first</Text>

            <View style={[styles.field, { marginBottom: 16 }]}>
              <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 13, color: Colors.ink2, marginBottom: 8 }}>Quick Select</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.saffronLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.round, borderWidth: 1, borderColor: Colors.saffron }}
                  onPress={async () => {
                    if (lat && lng) {
                      setLocationCoords({ latitude: lat, longitude: lng });
                      const geo = await reverseGeocode(lat, lng);
                      if (geo.fullAddress) {
                        setFullAddress(geo.fullAddress);
                        clearError('fullAddress');
                      }
                    } else {
                      Alert.alert('Location not available', 'Please enable location permissions.');
                    }
                  }}
                >
                  <Ionicons name="navigate" size={16} color={Colors.saffronDark} style={{ marginRight: 6 }} />
                  <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 13, color: Colors.saffronDark }}>Current Location</Text>
                </TouchableOpacity>

                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.round, borderWidth: 1, borderColor: Colors.gray2 }}
                    onPress={() => {
                      setLocationCoords({ latitude: addr.lat, longitude: addr.lng });
                      const addressStr = [addr.flatHouse, addr.street, addr.area, addr.city].filter(Boolean).join(', ');
                      setFullAddress(addressStr);
                      clearError('fullAddress');
                    }}
                  >
                    <Ionicons name={addr.label === 'home' ? 'home-outline' : addr.label === 'work' ? 'briefcase-outline' : 'location-outline'} size={16} color={Colors.ink2} style={{ marginRight: 6 }} />
                    <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 13, color: Colors.ink2 }}>
                      {addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <FieldLabel>📍 Pin Job Location</FieldLabel>
              <View style={styles.mapPreview}>
                <JobPostMap
                  latitude={locationCoords.latitude}
                  longitude={locationCoords.longitude}
                  onSelect={(coords) => {
                    setLocationCoords(coords);
                    reverseGeocode(coords.latitude, coords.longitude).then(geo => {
                      if (geo.fullAddress) {
                        setFullAddress(geo.fullAddress);
                        clearError('fullAddress');
                      }
                    });
                  }}
                />
              </View>
            </View>

            <View style={styles.field}>
              <FieldLabel>Full Address *</FieldLabel>
              <StyledInput
                value={fullAddress}
                onChangeText={(v: string) => { setFullAddress(v); clearError('fullAddress'); }}
                placeholder="Enter building, street, area..."
                multiline
                hasError={!!errors.fullAddress}
              />
              <ErrorMsg msg={errors.fullAddress} />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Worker Requirements</Text>
            <Text style={styles.stepSubtitle}>Be specific to get the right candidates</Text>

            <View style={styles.field}>
              <FieldLabel>Workers Needed</FieldLabel>
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                <QuantityEditor value={workersNeeded} onChange={setWorkersNeeded} min={1} max={100} />
              </View>
            </View>

            <View style={styles.field}>
              <FieldLabel>Skills Preferred (Max 10)</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {COMMON_SKILLS.map((skill) => {
                  const isActive = selectedSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.round,
                        backgroundColor: isActive ? Colors.saffron : Colors.gray1,
                        borderWidth: 1, borderColor: isActive ? Colors.saffronDark : Colors.gray2,
                      }}
                      onPress={() => {
                        if (!isActive && selectedSkills.length >= 10) {
                          Alert.alert('Limit Reached', 'You can select up to 10 skills per job.');
                          return;
                        }
                        setSelectedSkills(isActive ? selectedSkills.filter(s => s !== skill) : [...selectedSkills, skill]);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontFamily: isActive ? FontFamily.bodySemiBold : FontFamily.bodyMedium, fontSize: 14, color: isActive ? Colors.white : Colors.ink2 }}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.round,
                    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray2,
                    flexDirection: 'row', alignItems: 'center'
                  }}
                  onPress={() => setShowAllSkills(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="apps-outline" size={14} color={Colors.ink2} style={{ marginRight: 4 }} />
                  <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 14, color: Colors.ink2 }}>View More</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <View style={styles.field}>
              <FieldLabel>Gender Preference</FieldLabel>
              <ChipSelector
                options={[
                  { key: 'any', label: 'No Preference' },
                  { key: 'male', label: 'Male' },
                  { key: 'female', label: 'Female' },
                ]}
                value={genderPref}
                onChange={setGenderPref}
              />
            </View>

            <View style={styles.field}>
              <FieldLabel>Contact Preference</FieldLabel>
              <ChipSelector
                options={[
                  { key: 'in_app_chat', label: '💬 Chat' },
                  { key: 'phone_call', label: '📞 Call' },
                  { key: 'whatsapp', label: '💚 WhatsApp' },
                ]}
                value={contactMethod}
                onChange={setContactMethod}
              />
            </View>
          </View>
        );

      case 5:
        const cost = getEstimatedCost();
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Post</Text>
            <Text style={styles.stepSubtitle}>Double-check before going live</Text>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text" size={18} color={Colors.saffron} />
                <Text style={styles.summaryHeaderText}>Job Summary</Text>
              </View>
              {[
                { label: 'Title', value: title || '--' },
                { label: 'Category', value: category.replace('_', ' ') },
                { label: 'Work Type', value: workType === 'hour' ? 'Hourly' : workType === 'day' ? 'Daily' : 'Monthly' },
                { label: 'Workers', value: `${workersNeeded}` },
              ].map(row => (
                <View key={row.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{row.value}</Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Est. Total Cost</Text>
                <Text style={styles.summaryTotalValue}>
                  {cost > 0 ? `₹${cost.toLocaleString('en-IN')}` : '--'}
                </Text>
              </View>
            </View>

            {/* Trust badges */}
            <View style={styles.trustRow}>
              {[
                { icon: 'call-outline', text: 'Phone Verified' },
                { icon: 'person-outline', text: 'ID Verified' },
                { icon: 'shield-checkmark-outline', text: 'Trusted Employer' },
              ].map(b => (
                <View key={b.text} style={styles.trustBadge}>
                  <Ionicons name={b.icon as any} size={12} color={Colors.green} />
                  <Text style={styles.trustBadgeText}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* Visibility toggle */}
            <View style={styles.toggleCard}>
              <View style={[styles.toggleCardRow, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.toggleLabel}>Job Visibility</Text>
                  <Text style={styles.toggleSub}>{visibility === 'public' ? 'Visible to all nearby workers' : 'Link-only access'}</Text>
                </View>
                <Toggle value={visibility === 'public'} onToggle={v => setVisibility(v ? 'public' : 'private')} />
              </View>
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity
              style={[styles.termsRow, !!errors.acceptTerms && styles.termsRowError]}
              onPress={() => { setAcceptTerms(!acceptTerms); clearError('acceptTerms'); }}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, acceptTerms && styles.checkboxActive, !!errors.acceptTerms && styles.checkboxError]}>
                {acceptTerms && <Ionicons name="checkmark" size={14} color={Colors.white} />}
              </View>
              <Text style={styles.termsText}>
                I confirm this is a genuine job posting and accept the{' '}
                <Text style={styles.termsLink}>Terms & Conditions</Text>
              </Text>
            </TouchableOpacity>
            <ErrorMsg msg={errors.acceptTerms} />
          </View>
        );
    }
  };

  // ── Layout ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        style={[styles.premiumHeader, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRowPremium}>
          <TouchableOpacity style={styles.headerBackPremium} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={{flex: 1, marginLeft: 16}}>
            <Text style={styles.headerTitlePremium}>Post a Job</Text>
            <Text style={styles.headerSubtitlePremium}>Create a job posting and find workers faster</Text>
          </View>
          <View style={styles.progressPctBox}>
            <Text style={styles.progressPctText}>{Math.round(((currentStep - 1) / 4) * 100)}%</Text>
          </View>
        </View>

        <View style={styles.premiumProgressSection}>
          <View style={styles.stepsRowPremium}>
            <View style={styles.progressTrackLinePremium} />
            <Animated.View
              style={[
                styles.progressActiveLinePremium,
                { width: `${((currentStep - 1) / 4) * 100}%` as any },
              ]}
            />
            {STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <View key={step.id} style={styles.stepNodeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.stepDotCirclePremium,
                      isDone && styles.stepDotDonePremium,
                      isCurrent && styles.stepDotCurrentPremium,
                    ]}
                    onPress={() => currentStep > step.id && animateToStep(step.id)}
                    activeOpacity={0.7}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={14} color={Colors.white} />
                    ) : (
                      <Text style={[styles.stepNumberPremium, isCurrent && { color: Colors.white }]}>{step.id}</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.stepLabelPremium, isCurrent && styles.stepLabelCurrentPremium, isDone && styles.stepLabelDonePremium]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
        <View style={styles.ctaRow}>
          {/* Previous button — always visible */}
          <TouchableOpacity
            style={styles.prevBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.ink2} />
            <Text style={styles.prevBtnText}>
              {currentStep === 1 ? 'Exit' : 'Back'}
            </Text>
          </TouchableOpacity>

          {/* Primary action */}
          {currentStep === 5 ? (
            <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnim }] }}>
              <TouchableOpacity
                style={[styles.ctaBtn, styles.ctaBtnPrimary, (!acceptTerms || isPosting) && { opacity: 0.5 }]}
                onPress={handlePost}
                disabled={!acceptTerms || isPosting}
                activeOpacity={0.88}
              >
                {isPosting ? (
                  <>
                    <Ionicons name="hourglass-outline" size={18} color={Colors.white} />
                    <Text style={styles.ctaBtnText}>Posting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color={Colors.white} />
                    <Text style={styles.ctaBtnText}>Post Job</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnim }] }}>
              <TouchableOpacity
                style={[styles.ctaBtn, styles.ctaBtnPrimary, !isStepValid() && { opacity: 0.6 }]}
                onPress={handleNext}
                activeOpacity={0.88}
              >
                <Text style={styles.ctaBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        <Text style={styles.stepCounter}>Step {currentStep} of 5</Text>
      </View>

      </KeyboardAvoidingView>

      
      {showPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showPicker}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerSheetHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { handleDateSelect(tempDate); setShowPicker(false); }}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode={pickerMode}
                display="spinner"
                onChange={(_, d) => { if (d) setTempDate(d); }}
              />
            </View>
          </View>
        </Modal>
      )}

      {showPicker && Platform.OS !== 'ios' && Platform.OS !== 'web' && (
        <DateTimePicker
          value={new Date()}
          mode={pickerMode}
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) handleDateSelect(selectedDate);
          }}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Premium Header
  premiumHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: "0px 4px 16px rgba(0,0,0,0.1)",
    zIndex: 10,
  },
  headerTopRowPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBackPremium: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitlePremium: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitlePremium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  progressPctBox: {
    backgroundColor: Colors.saffron,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressPctText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: Colors.white,
  },
  premiumProgressSection: {
    marginTop: 8,
  },
  stepsRowPremium: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 10,
  },
  progressTrackLinePremium: {
    position: 'absolute',
    top: 14,
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1.5,
  },
  progressActiveLinePremium: {
    position: 'absolute',
    top: 14,
    left: 24,
    height: 3,
    backgroundColor: Colors.saffron,
    borderRadius: 1.5,
    zIndex: 1,
  },
  stepNodeContainer: {
    alignItems: 'center',
    width: 60,
    zIndex: 2,
  },
  stepDotCirclePremium: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 6,
  },
  stepDotDonePremium: {
    backgroundColor: Colors.saffron,
    borderColor: Colors.saffron,
  },
  stepDotCurrentPremium: {
    backgroundColor: Colors.saffron,
    borderColor: Colors.white,
    boxShadow: "0px 0px 8px rgba(255, 107, 0, 0.5)",
  },
  stepNumberPremium: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  stepLabelPremium: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  stepLabelCurrentPremium: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.white,
  },
  stepLabelDonePremium: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.saffron,
  },

  // Step 1 UI
  suggestionScroll: {
    paddingBottom: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.saffronLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.saffron,
    marginRight: 8,
  },
  suggestionChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.saffronDark,
  },
  sectionLabelPremium: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.gray4,
    marginBottom: 12,
  },
  categoryGridPremium: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryCardPremium: {
    width: '30%',
    margin: '1.5%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  categoryCardActivePremium: {
    borderColor: Colors.saffron,
    backgroundColor: '#FFFAF5',
  },
  categoryIconWrapPremium: {
    position: 'relative',
    marginBottom: 8,
  },
  categoryIconPremium: {
    fontSize: 32,
  },
  categoryCheckBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.saffron,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  categoryLabelPremium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.ink2,
    textAlign: 'center',
  },
  categoryLabelActivePremium: {
    fontFamily: FontFamily.headingBold,
    color: Colors.saffron,
  },
  charCountPremium: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    textAlign: 'right',
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  stickyBottomBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
    boxShadow: "0px -4px 16px rgba(0,0,0,0.05)",
  },

  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.white,
    letterSpacing: -0.3,
  },

  // Progress
  progressSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
    ...Shadow.xs,
  },
  progressTrackLine: {
    position: 'absolute',
    top: 14,
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: Colors.gray2,
    zIndex: 1,
  },
  progressActiveLine: {
    position: 'absolute',
    top: 14,
    left: '10%',
    height: 3,
    backgroundColor: Colors.saffron,
    zIndex: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%',
  },
  stepDotContainer: {
    alignItems: 'center',
    gap: 6,
    zIndex: 3,
  },
  stepDotCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: "0px 2px 4px rgba(0,0,0,0.05)",
  },
  stepDotDone: { backgroundColor: Colors.saffron },
  stepDotCurrent: { backgroundColor: Colors.saffron, borderWidth: 2, borderColor: '#FFE4D6' },
  stepDotLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
  },
  stepDotLabelActive: { color: Colors.ink, fontFamily: FontFamily.headingBold },
  stepDotLabelDone: { color: Colors.saffron, fontFamily: FontFamily.bodySemiBold },

  // Step content
  stepContent: { gap: 0 },
  stepTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 26,
    color: Colors.ink,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.gray4,
    marginBottom: 28,
    lineHeight: 22,
  },
  field: { marginBottom: 20 },
  fieldRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  fieldCol: { flex: 1 },
  fieldLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink2,
    marginBottom: 8,
  },

  // Inputs
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
    minHeight: 50,
  },
  textarea: {
    minHeight: 110,
    paddingTop: 14,
  },
  inputDisabled: {
    backgroundColor: Colors.gray1,
    color: Colors.gray4,
  },
  inputError: {
    borderColor: Colors.red,
    backgroundColor: Colors.redLight,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  errorText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.red,
    flex: 1,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  charHint: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
  },
  charCount: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
  },

  // Category cards
  categoryCard: {
    width: 80,
    height: 80,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryCardActive: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
    ...Shadow.sm,
  },
  categoryIcon: { fontSize: 26 },
  categoryLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.ink2,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: Colors.saffronDark,
    fontFamily: FontFamily.bodySemiBold,
  },

  // Segment control (work type)
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: Colors.gray1,
    borderRadius: Radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  segmentText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
  segmentTextActive: {
    color: Colors.ink,
    fontFamily: FontFamily.bodySemiBold,
  },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
  },
  chipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  chipTextActive: {
    color: Colors.saffronDark,
    fontFamily: FontFamily.bodySemiBold,
  },

  // Picker button
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    height: 50,
  },
  pickerBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  pickerBtnPlaceholder: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.gray3,
  },
  pickerBtnError: {
    borderColor: Colors.red,
    backgroundColor: Colors.redLight,
  },
  pickerBtnPlaceholderError: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.red + 'AA',
  },

  // Toggle card
  toggleCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  toggleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray1,
  },
  toggleLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink2,
  },
  toggleSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 2,
  },

  // Map preview
  mapPreview: {
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray2,
  },

  // Review / Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginBottom: 16,
    
    ...Shadow.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryHeaderText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  summaryValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink,
    maxWidth: '60%',
    textTransform: 'capitalize',
  },
  summaryDivider: { height: 1, backgroundColor: Colors.gray2 },
  summaryTotalLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  summaryTotalValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    color: Colors.saffron,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.round,
  },
  trustBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.greenDark,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: Colors.saffron,
    borderColor: Colors.saffron,
  },
  checkboxError: {
    borderColor: Colors.red,
    backgroundColor: Colors.redLight,
  },
  termsRowError: {
    borderColor: Colors.red,
    backgroundColor: Colors.redLight,
  },

  termsText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink2,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },

  // Bottom CTA
  bottomCTA: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
    alignItems: 'center',
    gap: 10,
    ...Shadow.md,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    
    width: '100%',
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 54,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray1,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
  },
  prevBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink2,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: Radius.lg,
  },
  ctaBtnPrimary: {
    backgroundColor: Colors.saffron,
    ...Shadow.saffron,
  },
  ctaBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.white,
    letterSpacing: 0.3,
  },
  stepCounter: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },

  // Picker Modal
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingBottom: 32,
  },
  pickerSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  pickerCancel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.gray4,
  },
  pickerDone: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.saffron,
  },

  // Success screen
  successScreen: { flex: 1, backgroundColor: Colors.white },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 32,
    color: Colors.ink,
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  successSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 280,
  },
  successStats: {
    flexDirection: 'row',
    backgroundColor: Colors.gray1,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  successStat: { alignItems: 'center', gap: 4 },
  successStatValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['5xl'],
    color: Colors.saffron,
    letterSpacing: -0.5,
  },
  successStatLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
    textAlign: 'center',
  },
  successStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.gray2,
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: Colors.saffron,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    justifyContent: 'center' as any,
    marginBottom: 12,
    ...Shadow.saffron,
  },
  successBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['4xl'],
    color: Colors.white,
  },
  successBtn2: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray2,
  },
  successBtn2Text: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink2,
  },
});

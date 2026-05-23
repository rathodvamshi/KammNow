import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow, Motion } from '../../../src/theme';
import { TopBar } from '../../../src/components/organisms/TopBar';
import { QuantityEditor } from '../../../src/components/molecules/QuantityEditor';
import { JobPostMap } from '../../../src/components/organisms/JobPostMap';
import { Toggle } from '../../../src/components/atoms/Toggle';
import type { JobCategory, Job } from '../../../src/types';
import { useJobStore } from '../../../src/store/jobStore';

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
    <Ionicons name="chevron-down" size={16} color={hasError ? Colors.red : Colors.gray4} />
  </TouchableOpacity>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function EditJobScreen() {
  const { id } = useLocalSearchParams();
  const { myPostedJobs } = useJobStore();
  const jobToEdit = myPostedJobs.find((j: any) => j.id === id);

  const [currentStep, setCurrentStep] = useState(1);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // STEP 1: Basic Details
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JobCategory>('delivery');
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

  // Pre-fill data
  useEffect(() => {
    if (jobToEdit) {
      setTitle(jobToEdit.title);
      setCategory(jobToEdit.category);
      setDescription(jobToEdit.description || '');
      setWorkType(jobToEdit.pay_type as any || 'day');
      setFullAddress(jobToEdit.location_name);
      setWorkersNeeded(jobToEdit.quantity_total);
      
      if (jobToEdit.pay_type === 'hour') setHourlyRate(jobToEdit.pay_amount.toString());
      if (jobToEdit.pay_type === 'day') setDailyWage(jobToEdit.pay_amount.toString());
      if (jobToEdit.pay_type === 'month') setMonthlySalary(jobToEdit.pay_amount.toString());
    }
  }, [jobToEdit]);

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
      const d = selectedDate.toLocaleDateString();
      if (pickerTarget === 'dailyDate') setDailyStartDate(d);
      else if (pickerTarget === 'monthlyDate') setJoiningDate(d);
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
      if (description.length < 20) newErrors.description = description.length === 0
        ? 'Job description is required'
        : `Too short — add ${20 - description.length} more characters`;
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

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < 5) animateToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) animateToStep(currentStep - 1);
    else router.back();
  };

  const handlePost = async () => {
    if (!validateStep()) return;
    setIsPosting(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsPosting(false);
    setPosted(true);
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
        <SafeAreaView style={{ backgroundColor: Colors.navy }} />
        <View style={styles.successContent}>
          <View style={styles.successIconWrap}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Job Updated!</Text>
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

            <View style={styles.field}>
              <FieldLabel>Job Title *</FieldLabel>
              <StyledInput
                value={title}
                onChangeText={(v: string) => { setTitle(v); clearError('title'); }}
                placeholder="e.g. Delivery Boy Needed Urgently"
                hasError={!!errors.title}
              />
              <ErrorMsg msg={errors.title} />
            </View>

            <View style={styles.field}>
              <FieldLabel>Category *</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.categoryCard, category === cat.key && styles.categoryCardActive]}
                    onPress={() => setCategory(cat.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <FieldLabel>Description *</FieldLabel>
              <StyledInput
                value={description}
                onChangeText={(v: string) => { setDescription(v); clearError('description'); }}
                placeholder={'Describe the work clearly...\n• What work is needed?\n• When and how long?\n• Any requirements?'}
                multiline
                maxLength={500}
                hasError={!!errors.description}
              />
              <View style={styles.charCountRow}>
                <ErrorMsg msg={errors.description} />
                <Text style={[styles.charCount, description.length > 450 && { color: Colors.red }]}>
                  {description.length}/500
                </Text>
              </View>
            </View>
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
                      : <PickerButton label="Select Time" value={shiftStart} hasError={!!errors.shiftStart} onPress={() => { openPicker('time', 'hourlyStart'); clearError('shiftStart'); }} />}
                    <ErrorMsg msg={errors.shiftStart} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift End *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={shiftEnd} onChange={(v) => { setShiftEnd(v); clearError('shiftEnd'); }} />
                      : <PickerButton label="Select Time" value={shiftEnd} hasError={!!errors.shiftEnd} onPress={() => { openPicker('time', 'hourlyEnd'); clearError('shiftEnd'); }} />}
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
                      : <PickerButton label="Select Time" value={dailyShiftStart} hasError={!!errors.dailyShiftStart} onPress={() => { openPicker('time', 'dailyStart'); clearError('dailyShiftStart'); }} />}
                    <ErrorMsg msg={errors.dailyShiftStart} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift End *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={dailyShiftEnd} onChange={(v) => { setDailyShiftEnd(v); clearError('dailyShiftEnd'); }} />
                      : <PickerButton label="Select Time" value={dailyShiftEnd} hasError={!!errors.dailyShiftEnd} onPress={() => { openPicker('time', 'dailyEnd'); clearError('dailyShiftEnd'); }} />}
                    <ErrorMsg msg={errors.dailyShiftEnd} />
                  </View>
                </View>
                <View style={styles.field}>
                  <FieldLabel>Start Date *</FieldLabel>
                  {Platform.OS === 'web'
                    ? <WebInput mode="date" value={dailyStartDate} onChange={(v) => { setDailyStartDate(v); clearError('dailyStartDate'); }} />
                    : <PickerButton label="Select Date" value={dailyStartDate} hasError={!!errors.dailyStartDate} onPress={() => { openPicker('date', 'dailyDate'); clearError('dailyStartDate'); }} />}
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
                      : <PickerButton label="Select Time" value={monthlyShiftStart} hasError={!!errors.monthlyShiftStart} onPress={() => { openPicker('time', 'monthlyStart'); clearError('monthlyShiftStart'); }} />}
                    <ErrorMsg msg={errors.monthlyShiftStart} />
                  </View>
                  <View style={styles.fieldCol}>
                    <FieldLabel>Shift End *</FieldLabel>
                    {Platform.OS === 'web'
                      ? <WebInput mode="time" value={monthlyShiftEnd} onChange={(v) => { setMonthlyShiftEnd(v); clearError('monthlyShiftEnd'); }} />
                      : <PickerButton label="Select Time" value={monthlyShiftEnd} hasError={!!errors.monthlyShiftEnd} onPress={() => { openPicker('time', 'monthlyEnd'); clearError('monthlyShiftEnd'); }} />}
                    <ErrorMsg msg={errors.monthlyShiftEnd} />
                  </View>
                </View>
                <View style={styles.field}>
                  <FieldLabel>Joining Date *</FieldLabel>
                  {Platform.OS === 'web'
                    ? <WebInput mode="date" value={joiningDate} onChange={(v) => { setJoiningDate(v); clearError('joiningDate'); }} />
                    : <PickerButton label="Select Date" value={joiningDate} hasError={!!errors.joiningDate} onPress={() => { openPicker('date', 'monthlyDate'); clearError('joiningDate'); }} />}
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

            <View style={styles.field}>
              <FieldLabel>📍 Pin Job Location</FieldLabel>
              <View style={styles.mapPreview}>
                <JobPostMap
                  latitude={locationCoords.latitude}
                  longitude={locationCoords.longitude}
                  onSelect={setLocationCoords}
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
              <FieldLabel>Skills Preferred</FieldLabel>
              <ChipSelector
                options={COMMON_SKILLS.map(s => ({ key: s, label: s }))}
                value={selectedSkills}
                onChange={setSelectedSkills}
                multiSelect
              />
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
            <Text style={styles.stepTitle}>Review & Update</Text>
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
                <Toggle value={visibility === 'public'} onToggle={(v: boolean) => setVisibility(v ? 'public' : 'private')} />
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: Colors.navy }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Job</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: `${(currentStep / 5) * 100}%` as any },
            ]}
          />
        </View>
        <View style={styles.stepsRow}>
          {STEPS.map(step => {
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <TouchableOpacity
                key={step.id}
                style={styles.stepDot}
                onPress={() => currentStep > step.id && animateToStep(step.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.stepDotCircle,
                  isDone && styles.stepDotDone,
                  isCurrent && styles.stepDotCurrent,
                ]}>
                  {isDone
                    ? <Ionicons name="checkmark" size={12} color={Colors.white} />
                    : <Ionicons name={step.icon as any} size={12} color={isCurrent ? Colors.white : Colors.gray4} />}
                </View>
                <Text style={[styles.stepDotLabel, isCurrent && styles.stepDotLabelActive]}>
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
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
      <View style={styles.bottomCTA}>
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
            <TouchableOpacity
              style={[styles.ctaBtn, styles.ctaBtnPrimary, isPosting && { opacity: 0.7 }]}
              onPress={handlePost}
              disabled={isPosting}
              activeOpacity={0.88}
            >
              {isPosting ? (
                <>
                  <Ionicons name="hourglass-outline" size={18} color={Colors.white} />
                  <Text style={styles.ctaBtnText}>Updating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                  <Text style={styles.ctaBtnText}>Update Job</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.ctaBtn, styles.ctaBtnPrimary]}
              onPress={handleNext}
              activeOpacity={0.88}
            >
              <Text style={styles.ctaBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.stepCounter}>Step {currentStep} of 5</Text>
      </View>

      {/* iOS Date/Time Picker Modal */}
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
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  progressBarBg: {
    height: 3,
    backgroundColor: Colors.gray2,
    borderRadius: Radius.round,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: Radius.round,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepDot: {
    alignItems: 'center',
    gap: 4,
  },
  stepDotCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: Colors.green },
  stepDotCurrent: { backgroundColor: Colors.saffron },
  stepDotLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 9,
    color: Colors.gray4,
  },
  stepDotLabelActive: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },

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
    gap: 12,
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
    gap: 12,
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
    gap: 12,
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

import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';
import { QuantityEditor } from '../../src/components/molecules/QuantityEditor';
import { Toggle } from '../../src/components/atoms/Toggle';
import { JobPostMap } from '../../src/components/organisms/JobPostMap';
import type { PayType, JobCategory, WorkType, SkillLevel } from '../../src/types';

const CATEGORIES: { key: JobCategory; label: string; icon: string }[] = [
  { key: 'delivery', label: 'Delivery', icon: '🚗' },
  { key: 'events', label: 'Events', icon: '🎪' },
  { key: 'shop', label: 'Retail', icon: '🏪' },
  { key: 'construction', label: 'Labour', icon: '🏗️' },
  { key: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { key: 'others', label: 'Others', icon: '🌿' },
];

const PAY_TYPES: { key: PayType; label: string }[] = [
  { key: 'hour', label: 'Hourly' },
  { key: 'day', label: 'Daily' },
  { key: 'month', label: 'Monthly' },
];

const HOURLY_SCHEDULES = [
  { key: 'daily', label: 'Daily Payment' },
  { key: 'weekly', label: 'Weekly Payment' },
  { key: 'monthly', label: 'Monthly Settlement' },
  { key: 'completion', label: 'After Completion' },
] as const;

const DAILY_SCHEDULES = [
  { key: 'daily', label: 'Daily Payment' },
  { key: 'every_2_days', label: 'Every 2 Days' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'completion', label: 'After Completion' },
] as const;

const MONTHLY_SALARY_DATES = [
  { key: 'month_end', label: 'Month End' },
  { key: '1st', label: '1st of Every Month' },
  { key: '5th', label: '5th of Every Month' },
  { key: 'weekly_advance', label: 'Weekly Advance' },
] as const;

const WORK_TYPES: { key: WorkType; label: string }[] = [
  { key: 'full_time', label: 'Full Time' },
  { key: 'part_time', label: 'Part Time' },
  { key: 'one_time', label: 'One Time' },
  { key: 'shift', label: 'Shift Based' },
];

const SKILL_LEVELS: { key: SkillLevel; label: string }[] = [
  { key: 'beginner', label: 'Beginner Friendly' },
  { key: 'skilled', label: 'Skilled Required' },
  { key: 'heavy', label: 'Heavy Work' },
  { key: 'any', label: 'Any Experience' },
];


export default function PostJobScreen() {
  const [step, setStep] = useState(1);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JobCategory>('delivery');
  const [workType, setWorkType] = useState<WorkType>('full_time');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('any');
  
  const [payAmount, setPayAmount] = useState('600');
  const [payType, setPayType] = useState<PayType>('day');

  const [hourlyHoursPerDay, setHourlyHoursPerDay] = useState('8');
  const [hourlyDaysPerWeek, setHourlyDaysPerWeek] = useState('6');
  const [hourlyDurationDays, setHourlyDurationDays] = useState('15');
  const [hourlyPaymentSchedule, setHourlyPaymentSchedule] = useState<typeof HOURLY_SCHEDULES[number]['key']>('weekly');

  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailyTotalDays, setDailyTotalDays] = useState('5');
  const [dailyPaymentSchedule, setDailyPaymentSchedule] = useState<typeof DAILY_SCHEDULES[number]['key']>('daily');

  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState('Mon - Sat');
  const [monthlyWeeklyOff, setMonthlyWeeklyOff] = useState('Sunday');
  const [monthlySalaryDate, setMonthlySalaryDate] = useState<typeof MONTHLY_SALARY_DATES[number]['key']>('1st');
  const [monthlyOvertimePolicy, setMonthlyOvertimePolicy] = useState('');

  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI / Bank / Cash');
  const [advanceAvailable, setAdvanceAvailable] = useState(false);
  const [overtimeAvailable, setOvertimeAvailable] = useState(false);
  const [overtimeRate, setOvertimeRate] = useState('');
  const [bonusAvailable, setBonusAvailable] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [incentivesAvailable, setIncentivesAvailable] = useState(false);
  const [incentivesDetails, setIncentivesDetails] = useState('');
  const [attendanceBonus, setAttendanceBonus] = useState(false);

  // Map location handling
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number }>({ latitude: 17.3850, longitude: 78.4867 }); // Default Hyderabad
  
  const [workStartTime, setWorkStartTime] = useState('9:00 AM');
  const [workEndTime, setWorkEndTime] = useState('6:00 PM');
  
  const [quantity, setQuantity] = useState(1);

  const amountNum = parseInt(payAmount) || 0;
  const hoursPerDayNum = parseFloat(hourlyHoursPerDay) || 0;
  const daysPerWeekNum = parseFloat(hourlyDaysPerWeek) || 0;
  const hourlyDurationDaysNum = parseInt(hourlyDurationDays) || 0;
  const dailyTotalDaysNum = parseInt(dailyTotalDays) || 0;

  const hourlyEstimated = amountNum * hoursPerDayNum * hourlyDurationDaysNum;
  const dailyEstimated = amountNum * dailyTotalDaysNum;
  const monthlyEstimated = amountNum;
  const estimatedEarnings =
    payType === 'hour' ? hourlyEstimated : payType === 'day' ? dailyEstimated : monthlyEstimated;
  const totalPay = estimatedEarnings * quantity;

  const hourlyDailyEarnings = amountNum * hoursPerDayNum;
  const hourlyWeeklyEarnings = hourlyDailyEarnings * daysPerWeekNum;
  const hourlyMonthlyProjection = hourlyWeeklyEarnings ? hourlyWeeklyEarnings * 4 : 0;
  const dailyMonthlyProjection = amountNum ? amountNum * 26 : 0;
  const monthlyDailyAverage = amountNum ? Math.round(amountNum / 26) : 0;

  const scheduleSummary =
    payType === 'hour'
      ? `${hourlyHoursPerDay || 0} hrs/day • ${hourlyDurationDays || 0} days`
      : payType === 'day'
        ? `${dailyTotalDays || 0} days`
        : `${monthlyWorkingDays} • ${monthlyWeeklyOff} off`;

  const timingSummary = `${workStartTime} - ${workEndTime}`;
  const paymentFrequencyLabel =
    payType === 'hour'
      ? HOURLY_SCHEDULES.find((ps) => ps.key === hourlyPaymentSchedule)?.label
      : payType === 'day'
        ? DAILY_SCHEDULES.find((ps) => ps.key === dailyPaymentSchedule)?.label
        : MONTHLY_SALARY_DATES.find((ps) => ps.key === monthlySalaryDate)?.label;

  const [description, setDescription] = useState('');
  const [languagePref, setLanguagePref] = useState('');
  const [locationName, setLocationName] = useState('Ameerpet, Hyderabad');
  
  // Toggles
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [stayIncluded, setStayIncluded] = useState(false);
  const [travelAllowance, setTravelAllowance] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [notifyOnApply, setNotifyOnApply] = useState(true);

  const handlePost = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Info', 'Please fill in job title and description.');
      return;
    }
    setIsPosting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsPosting(false);
    setPosted(true);
  };

  if (posted) {
    return (
      <View style={styles.successScreen}>
        <SafeAreaView style={{ backgroundColor: Colors.navy }} />
        <View style={styles.successContent}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Job Posted Successfully!</Text>
          <Text style={styles.successSub}>
            Your job is now live and workers nearby can see it.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => router.replace('/(tabs)/my-jobs')}
          >
            <Text style={styles.successBtnText}>View My Jobs →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.successBtn2}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.successBtn2Text}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>📝 Job Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Construction Labour Needed"
          placeholderTextColor={Colors.gray3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>🗂️ Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryBtn, category === cat.key && styles.categoryBtnActive]}
              onPress={() => setCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryLabel, category === cat.key && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>💼 Work Type</Text>
        <View style={styles.chipGrid}>
          {WORK_TYPES.map((wt) => (
            <TouchableOpacity
              key={wt.key}
              style={[styles.chipBtn, workType === wt.key && styles.chipBtnActive]}
              onPress={() => setWorkType(wt.key)}
            >
              <Text style={[styles.chipBtnText, workType === wt.key && styles.chipBtnTextActive]}>{wt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>🛠️ Skill Level</Text>
        <View style={styles.chipGrid}>
          {SKILL_LEVELS.map((sl) => (
            <TouchableOpacity
              key={sl.key}
              style={[styles.chipBtn, skillLevel === sl.key && styles.chipBtnActive]}
              onPress={() => setSkillLevel(sl.key)}
            >
              <Text style={[styles.chipBtnText, skillLevel === sl.key && styles.chipBtnTextActive]}>{sl.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>👥 Number of Workers Needed *</Text>
        <QuantityEditor
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={100}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>📝 Full Job Description *</Text>
        <TextInput
          style={styles.textarea}
          value={description}
          onChangeText={setDescription}
          placeholder="Exact work details, physical effort, dress requirements..."
          placeholderTextColor={Colors.gray3}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, (!title.trim() || !description.trim()) && styles.nextBtnDisabled]}
        onPress={() => setStep(2)}
        disabled={!title.trim() || !description.trim()}
      >
        <Text style={styles.nextBtnText}>Next: Schedule & Pay →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>💼 Work Type *</Text>
        <View style={styles.chipGrid}>
          {PAY_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.key}
              style={[styles.chipBtn, payType === pt.key && styles.chipBtnActive]}
              onPress={() => setPayType(pt.key)}
            >
              <Text style={[styles.chipBtnText, payType === pt.key && styles.chipBtnTextActive]}>
                {pt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.earningsCard, Shadow.md]}>
        <View style={styles.earningsHeader}>
          <Text style={styles.earningsTitle}>💡 Quick Earnings Summary</Text>
          <Text style={styles.earningsSubtitle}>Clear upfront pay breakdown for workers</Text>
        </View>
        {payType === 'hour' && (
          <View style={styles.earningsContent}>
            <View style={styles.earningsMain}>
              <Text style={styles.earningsLabel}>Estimated Total Pay</Text>
              <Text style={styles.earningsTotalValue}>₹{hourlyEstimated || 0}</Text>
              <Text style={styles.earningsSubText}>for {hoursPerDayNum * hourlyDurationDaysNum || 0} hours total work</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsRow}>
              <View>
                <Text style={styles.earningsSmallLabel}>Hourly Rate</Text>
                <Text style={styles.earningsSmallValue}>₹{amountNum || 0}/hr</Text>
              </View>
              <View style={styles.earningsVertDivider} />
              <View>
                <Text style={styles.earningsSmallLabel}>Monthly Proj.</Text>
                <Text style={styles.earningsSmallValue}>₹{hourlyMonthlyProjection || 0}</Text>
              </View>
            </View>
          </View>
        )}
        {payType === 'day' && (
          <View style={styles.earningsContent}>
            <View style={styles.earningsMain}>
              <Text style={styles.earningsLabel}>Estimated Total Pay</Text>
              <Text style={styles.earningsTotalValue}>₹{dailyEstimated || 0}</Text>
              <Text style={styles.earningsSubText}>for {dailyTotalDaysNum || 0} days of work</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsRow}>
              <View>
                <Text style={styles.earningsSmallLabel}>Daily Rate</Text>
                <Text style={styles.earningsSmallValue}>₹{amountNum || 0}/day</Text>
              </View>
              <View style={styles.earningsVertDivider} />
              <View>
                <Text style={styles.earningsSmallLabel}>Monthly Proj.</Text>
                <Text style={styles.earningsSmallValue}>₹{dailyMonthlyProjection || 0}</Text>
              </View>
            </View>
          </View>
        )}
        {payType === 'month' && (
          <View style={styles.earningsContent}>
            <View style={styles.earningsMain}>
              <Text style={styles.earningsLabel}>Monthly Salary</Text>
              <Text style={styles.earningsTotalValue}>₹{amountNum || 0}</Text>
              <Text style={styles.earningsSubText}>fixed per month</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsRow}>
              <View>
                <Text style={styles.earningsSmallLabel}>Est. Daily Avg.</Text>
                <Text style={styles.earningsSmallValue}>~ ₹{monthlyDailyAverage || 0}/day</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {payType === 'hour' && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>💰 Pay Per Hour *</Text>
            <View style={styles.payAmountBox}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.payInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="number-pad"
                placeholder="120"
                placeholderTextColor={Colors.gray3}
              />
              <Text style={styles.perText}>/hour</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>⏰ Working Hours Per Day *</Text>
            <View style={styles.chipGrid}>
              {[
                { label: '9 AM - 5 PM', start: '9:00 AM', end: '5:00 PM' },
                { label: '9 AM - 6 PM', start: '9:00 AM', end: '6:00 PM' },
                { label: 'Night 8 PM - 4 AM', start: '8:00 PM', end: '4:00 AM' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.chipBtn, workStartTime === t.start && workEndTime === t.end && styles.chipBtnActive]}
                  onPress={() => { setWorkStartTime(t.start); setWorkEndTime(t.end); }}
                >
                  <Text style={[styles.chipBtnText, workStartTime === t.start && workEndTime === t.end && styles.chipBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>⏳ Total Hours/Day *</Text>
              <TextInput
                style={styles.input}
                value={hourlyHoursPerDay}
                onChangeText={setHourlyHoursPerDay}
                keyboardType="decimal-pad"
                placeholder="8"
                placeholderTextColor={Colors.gray3}
              />
            </View>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>📆 Working Days/Week *</Text>
              <TextInput
                style={styles.input}
                value={hourlyDaysPerWeek}
                onChangeText={setHourlyDaysPerWeek}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor={Colors.gray3}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>🗓️ Expected Total Duration *</Text>
            <TextInput
              style={styles.input}
              value={hourlyDurationDays}
              onChangeText={setHourlyDurationDays}
              keyboardType="number-pad"
              placeholder="15 days"
              placeholderTextColor={Colors.gray3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>📅 Payment Schedule *</Text>
            <View style={styles.chipGrid}>
              {HOURLY_SCHEDULES.map((ps) => (
                <TouchableOpacity
                  key={ps.key}
                  style={[styles.chipBtn, hourlyPaymentSchedule === ps.key && styles.chipBtnActive]}
                  onPress={() => setHourlyPaymentSchedule(ps.key)}
                >
                  <Text style={[styles.chipBtnText, hourlyPaymentSchedule === ps.key && styles.chipBtnTextActive]}>
                    {ps.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {payType === 'day' && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>💰 Pay Per Day *</Text>
            <View style={styles.payAmountBox}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.payInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="number-pad"
                placeholder="700"
                placeholderTextColor={Colors.gray3}
              />
              <Text style={styles.perText}>/day</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>📅 Start Date *</Text>
              <TextInput
                style={styles.input}
                value={dailyStartDate}
                onChangeText={setDailyStartDate}
                placeholder="e.g. 20 May"
                placeholderTextColor={Colors.gray3}
              />
            </View>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>📅 End Date *</Text>
              <TextInput
                style={styles.input}
                value={dailyEndDate}
                onChangeText={setDailyEndDate}
                placeholder="e.g. 25 May"
                placeholderTextColor={Colors.gray3}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>⏰ Working Time *</Text>
            <View style={styles.chipGrid}>
              {[
                { label: '8 AM - 6 PM', start: '8:00 AM', end: '6:00 PM' },
                { label: '9 AM - 6 PM', start: '9:00 AM', end: '6:00 PM' },
                { label: '10 AM - 7 PM', start: '10:00 AM', end: '7:00 PM' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.chipBtn, workStartTime === t.start && workEndTime === t.end && styles.chipBtnActive]}
                  onPress={() => { setWorkStartTime(t.start); setWorkEndTime(t.end); }}
                >
                  <Text style={[styles.chipBtnText, workStartTime === t.start && workEndTime === t.end && styles.chipBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>🗓️ Total Number of Days *</Text>
            <TextInput
              style={styles.input}
              value={dailyTotalDays}
              onChangeText={setDailyTotalDays}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={Colors.gray3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>📅 Payment Schedule *</Text>
            <View style={styles.chipGrid}>
              {DAILY_SCHEDULES.map((ps) => (
                <TouchableOpacity
                  key={ps.key}
                  style={[styles.chipBtn, dailyPaymentSchedule === ps.key && styles.chipBtnActive]}
                  onPress={() => setDailyPaymentSchedule(ps.key)}
                >
                  <Text style={[styles.chipBtnText, dailyPaymentSchedule === ps.key && styles.chipBtnTextActive]}>
                    {ps.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {payType === 'month' && (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>💰 Monthly Salary *</Text>
            <View style={styles.payAmountBox}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.payInput}
                value={payAmount}
                onChangeText={setPayAmount}
                keyboardType="number-pad"
                placeholder="18000"
                placeholderTextColor={Colors.gray3}
              />
              <Text style={styles.perText}>/month</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>🗓️ Working Days *</Text>
              <TextInput
                style={styles.input}
                value={monthlyWorkingDays}
                onChangeText={setMonthlyWorkingDays}
                placeholder="Mon - Sat"
                placeholderTextColor={Colors.gray3}
              />
            </View>
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>🛌 Weekly Off *</Text>
              <TextInput
                style={styles.input}
                value={monthlyWeeklyOff}
                onChangeText={setMonthlyWeeklyOff}
                placeholder="Sunday"
                placeholderTextColor={Colors.gray3}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>⏰ Daily Timing *</Text>
            <View style={styles.chipGrid}>
              {[
                { label: '9 AM - 7 PM', start: '9:00 AM', end: '7:00 PM' },
                { label: '10 AM - 7 PM', start: '10:00 AM', end: '7:00 PM' },
                { label: '8 AM - 5 PM', start: '8:00 AM', end: '5:00 PM' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.chipBtn, workStartTime === t.start && workEndTime === t.end && styles.chipBtnActive]}
                  onPress={() => { setWorkStartTime(t.start); setWorkEndTime(t.end); }}
                >
                  <Text style={[styles.chipBtnText, workStartTime === t.start && workEndTime === t.end && styles.chipBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>🕒 Overtime Policy (Optional)</Text>
            <TextInput
              style={styles.input}
              value={monthlyOvertimePolicy}
              onChangeText={setMonthlyOvertimePolicy}
              placeholder="e.g. ₹100/hr after 8 hrs"
              placeholderTextColor={Colors.gray3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>📆 Salary Payment Date *</Text>
            <View style={styles.chipGrid}>
              {MONTHLY_SALARY_DATES.map((ps) => (
                <TouchableOpacity
                  key={ps.key}
                  style={[styles.chipBtn, monthlySalaryDate === ps.key && styles.chipBtnActive]}
                  onPress={() => setMonthlySalaryDate(ps.key)}
                >
                  <Text style={[styles.chipBtnText, monthlySalaryDate === ps.key && styles.chipBtnTextActive]}>
                    {ps.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>🧾 Payment Note (Shown to workers)</Text>
        <TextInput
          style={styles.input}
          value={paymentNote}
          onChangeText={setPaymentNote}
          placeholder="e.g. Salary credited every Saturday"
          placeholderTextColor={Colors.gray3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>💳 Payment Mode</Text>
        <TextInput
          style={styles.input}
          value={paymentMode}
          onChangeText={setPaymentMode}
          placeholder="UPI / Bank / Cash"
          placeholderTextColor={Colors.gray3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>🎁 Payment Transparency & Benefits</Text>
        <View style={styles.optionsBox}>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>💵 Advance Available</Text>
            <Toggle value={advanceAvailable} onToggle={setAdvanceAvailable} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>⏱️ Overtime Available</Text>
            <Toggle value={overtimeAvailable} onToggle={setOvertimeAvailable} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>🎯 Bonus Available</Text>
            <Toggle value={bonusAvailable} onToggle={setBonusAvailable} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>💼 Incentives Available</Text>
            <Toggle value={incentivesAvailable} onToggle={setIncentivesAvailable} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>✅ Attendance Bonus</Text>
            <Toggle value={attendanceBonus} onToggle={setAttendanceBonus} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>🍛 Food Included</Text>
            <Toggle value={foodIncluded} onToggle={setFoodIncluded} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>🏠 Accommodation Included</Text>
            <Toggle value={stayIncluded} onToggle={setStayIncluded} />
          </View>
          <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.optionLabel}>🚌 Travel Allowance</Text>
            <Toggle value={travelAllowance} onToggle={setTravelAllowance} />
          </View>
        </View>
      </View>

      {overtimeAvailable && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>⏱️ Overtime Rate (per hour)</Text>
          <TextInput
            style={styles.input}
            value={overtimeRate}
            onChangeText={setOvertimeRate}
            placeholder="e.g. ₹150/hr"
            placeholderTextColor={Colors.gray3}
          />
        </View>
      )}

      {bonusAvailable && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>🎯 Bonus Details</Text>
          <TextInput
            style={styles.input}
            value={bonusAmount}
            onChangeText={setBonusAmount}
            placeholder="e.g. ₹500 on completion"
            placeholderTextColor={Colors.gray3}
          />
        </View>
      )}

      {incentivesAvailable && (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>💼 Incentives Details</Text>
          <TextInput
            style={styles.input}
            value={incentivesDetails}
            onChangeText={setIncentivesDetails}
            placeholder="e.g. Extra ₹30 per delivery"
            placeholderTextColor={Colors.gray3}
          />
        </View>
      )}

      <View style={styles.navBtns}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(1)}>
          <Text style={styles.backStepBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.nextBtn2]} 
          onPress={() => setStep(3)}
        >
          <Text style={styles.nextBtnText}>Next: Location & Post →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>📍 Job Location *</Text>
        <View style={styles.mapPreview}>
          <JobPostMap
            latitude={locationCoords.latitude}
            longitude={locationCoords.longitude}
            onSelect={setLocationCoords}
          />
        </View>
        <TextInput
          style={styles.input}
          value={locationName}
          onChangeText={setLocationName}
          placeholder="Enter area or landmark..."
          placeholderTextColor={Colors.gray3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>🗣️ Language Preference</Text>
        <TextInput
          style={styles.input}
          value={languagePref}
          onChangeText={setLanguagePref}
          placeholder="e.g. Telugu, Hindi (Optional)"
          placeholderTextColor={Colors.gray3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>⚙️ Job Options</Text>
        <View style={styles.optionsBox}>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>⚡ Mark as Urgent</Text>
            <Toggle value={isUrgent} onToggle={setIsUrgent} />
          </View>
          <View style={styles.optionRow}>
            <Text style={styles.optionLabel}>📞 Show My Phone Number</Text>
            <Toggle value={showPhone} onToggle={setShowPhone} />
          </View>
          <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.optionLabel}>🔔 Notify me instantly</Text>
            <Toggle value={notifyOnApply} onToggle={setNotifyOnApply} />
          </View>
        </View>
      </View>

      <View style={[styles.reviewCard, Shadow.sm]}>
        <Text style={styles.reviewCardTitle}>📋 Summary</Text>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Title</Text><Text style={styles.reviewValue}>{title}</Text></View>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Pay</Text><Text style={styles.reviewValue}>₹{payAmount}/{payType}</Text></View>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Schedule</Text><Text style={styles.reviewValue}>{scheduleSummary}</Text></View>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Timing</Text><Text style={styles.reviewValue}>{timingSummary}</Text></View>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Payment</Text><Text style={styles.reviewValue}>{paymentFrequencyLabel || '—'}</Text></View>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Estimated Total</Text><Text style={styles.reviewValue}>₹{totalPay}</Text></View>
        <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Workers</Text><Text style={styles.reviewValue}>{quantity} needed</Text></View>
      </View>

      <View style={styles.navBtns}>
        <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep(2)}>
          <Text style={styles.backStepBtnText}>← Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postBtn, isPosting && { opacity: 0.7 }]}
          onPress={handlePost}
          disabled={isPosting}
        >
          {isPosting ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.postBtnText}>🚀 Post Job Live</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: Colors.navy }}>
        <TopBar title="Post a Job" showBack showPostJob={false} />
      </SafeAreaView>

      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressSegment, s <= step && styles.progressSegmentActive]} />
        ))}
      </View>

      <View style={styles.stepLabel}>
        <Text style={styles.stepLabelText}>
          {step === 1 ? '📝 Step 1 — Job Info' : step === 2 ? '💰 Step 2 — Schedule & Pay' : '✅ Step 3 — Location & Post'}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.gray1 },
  scroll: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  progressBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.white },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.gray2 },
  progressSegmentActive: { backgroundColor: Colors.saffron },
  stepLabel: {
    backgroundColor: Colors.saffronLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.saffron,
    marginHorizontal: 14,
    marginVertical: 10,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepLabelText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.saffronDark },
  stepContent: { paddingHorizontal: 14, paddingBottom: 20 },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  earningsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    marginBottom: 24,
    overflow: 'hidden',
  },
  earningsHeader: {
    backgroundColor: Colors.greenLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.green + '30',
  },
  earningsTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.greenDark,
  },
  earningsSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.green,
    marginTop: 2,
  },
  earningsContent: {
    padding: 20,
  },
  earningsMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.gray4,
    marginBottom: 4,
  },
  earningsTotalValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 36,
    color: Colors.greenDark,
  },
  earningsSubText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 6,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: Colors.gray2,
    marginVertical: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  earningsVertDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray2,
  },
  earningsSmallLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    textAlign: 'center',
  },
  earningsSmallValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  summaryLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.gray4,
  },
  summaryValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink,
  },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldCol: { flex: 1 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    backgroundColor: Colors.white,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textarea: {
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    backgroundColor: Colors.white,
    minHeight: 120,
    marginBottom: 8,
    textAlignVertical: 'top',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryBtn: {
    flexBasis: '30%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBtnActive: { 
    borderColor: Colors.saffron, 
    backgroundColor: Colors.saffronLight, 
  },
  categoryIcon: { fontSize: 24 },
  categoryLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.ink2, textAlign: 'center' },
  categoryLabelActive: { color: Colors.saffronDark, fontFamily: FontFamily.bodySemiBold },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipBtnActive: { borderColor: Colors.saffron, backgroundColor: Colors.saffron },
  chipBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.ink2 },
  chipBtnTextActive: { color: Colors.white, fontFamily: FontFamily.bodySemiBold },
  payAmountBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.saffron,
    borderRadius: Radius.md,
    backgroundColor: '#FFF8F2', // very light saffron
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rupeeSymbol: { fontFamily: FontFamily.headingBold, fontSize: 28, color: Colors.saffronDark },
  payInput: { flex: 1, fontFamily: FontFamily.headingBold, fontSize: 32, color: Colors.saffronDark, margin: 0, padding: 0 },
  perText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.saffronDark, opacity: 0.8 },
  optionsBox: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  optionLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.ink2 },
  nextBtn: {
    backgroundColor: Colors.saffron,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextBtn2: {
    flex: 1,
    backgroundColor: Colors.saffron,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  nextBtnText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.white },
  navBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  backStepBtn: {
    flex: 0.35,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  backStepBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.ink2 },
  mapPreview: {
    height: 120,
    backgroundColor: '#E8F0E8',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginTop: 8,
  },
  mapPin: { fontSize: 32 },
  mapLabel: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: Colors.white,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  mapLabelText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.ink2 },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.saffronLight,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  reviewCardTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.saffronDark,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray1,
  },
  reviewLabel: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.base, color: Colors.ink2 },
  reviewValue: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.ink, flex: 1, textAlign: 'right' },
  postBtn: {
    flex: 1,
    backgroundColor: Colors.saffron,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    shadowColor: Colors.saffronDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postBtnText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.white, letterSpacing: 0.5 },
  successScreen: { flex: 1, backgroundColor: Colors.white },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successEmoji: { fontSize: 80, marginBottom: 20 },
  successTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['5xl'],
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  successSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.lg,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successBtn: {
    width: '100%',
    backgroundColor: Colors.saffron,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 12,
  },
  successBtnText: { fontFamily: FontFamily.headingBold, fontSize: FontSize['2xl'], color: Colors.white },
  successBtn2: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray2,
  },
  successBtn2Text: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize['2xl'], color: Colors.ink2 },
});

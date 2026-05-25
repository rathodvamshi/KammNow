import React, { memo, useMemo, useRef } from 'react';
import { Pressable } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, FontFamily, FontSize, Shadow } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { buildJobCardDisplay, type JobCardBenefit } from '../../utils/jobCardDisplay';
import type { Job } from '../../types';

interface JobCardProps {
  job: Job;
  onPress: (job: Job) => void;
  onApply: (job: Job) => void;
}

const BENEFIT_TONES: Record<JobCardBenefit['tone'], { bg: string; text: string; icon: string }> = {
  saffron: { bg: Colors.saffronLight, text: Colors.saffronDark, icon: Colors.saffron },
  green: { bg: Colors.greenLight, text: Colors.green, icon: Colors.green },
  blue: { bg: '#E8F4FD', text: '#1565C0', icon: '#1565C0' },
  gold: { bg: Colors.goldLight, text: Colors.goldDark, icon: Colors.gold },
};

export const JobCard: React.FC<JobCardProps> = memo(({ job, onPress, onApply }) => {
  const d = useMemo(() => buildJobCardDisplay(job), [job]);
  const cardScale = useSharedValue(1);
  const applyScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const applyStyle = useAnimatedStyle(() => ({ transform: [{ scale: applyScale.value }] }));

  return (
    <Animated.View style={[styles.wrap, cardStyle]}>
      <Pressable
        style={styles.cardOuter}
        onPress={() => onPress(job)}
        onPressIn={() => (cardScale.value = withSpring(0.985, { damping: 15, stiffness: 300 }))}
        onPressOut={() => (cardScale.value = withSpring(1, { damping: 15, stiffness: 300 }))}
      >
        <View style={styles.cardBody}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.employerBlock}>
              <View style={styles.avatarWrap}>
                <Avatar name={d.employerName} size="md" />
                {d.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </View>
              <View style={styles.employerMeta}>
                <Text style={styles.employerName} numberOfLines={1}>{d.employerName}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{d.ratingValue ? d.ratingValue.toFixed(1) : 'New'}</Text>
                  <Text style={styles.ratingLabel}> • Employer</Text>
                </View>
              </View>
            </View>

            <LinearGradient
              colors={['#EEF2FF', '#E0E7FF']}
              style={styles.payBox}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.payIconCircle}>
                <Ionicons name="cash" size={16} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.payLabel}>EST. PAY</Text>
                <View style={styles.payRow}>
                  <Text style={styles.payAmount}>{d.payPrimary}</Text>
                  <Text style={styles.payPeriod}>{d.payPeriod}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{job.title}</Text>
            {d.isUrgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={10} color="#DC2626" />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>

          {/* Timeline Row */}
          <View style={styles.timelineRow}>
            <View style={styles.infoBox}>
              <View style={styles.boxHeader}>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
                <Text style={styles.boxLabel}>DATE</Text>
              </View>
              <Text style={styles.boxValue}>{d.startDate || 'Flexible'}</Text>
              {!!d.endDate && d.endDate !== d.startDate && <Text style={styles.boxValue}>{d.endDate}</Text>}
            </View>
            <View style={styles.infoBox}>
              <View style={styles.boxHeader}>
                <Ionicons name="time-outline" size={14} color="#64748B" />
                <Text style={styles.boxLabel}>TIMING</Text>
              </View>
              <Text style={styles.boxValue}>{d.startTime || 'Flexible'}</Text>
              {!!d.endTime && d.endTime !== d.startTime && <Text style={styles.boxValue}>{d.endTime}</Text>}
            </View>
          </View>

          {/* Benefits Box */}
          {(d.benefits.length > 0 || d.benefitsOverflow > 0) && (
            <View style={styles.infoBoxFull}>
              <View style={styles.boxHeader}>
                <Ionicons name="sparkles-outline" size={14} color="#64748B" />
                <Text style={styles.boxLabel}>BENEFITS</Text>
              </View>
              <View style={styles.perksPreview}>
                {d.benefits.map((b) => {
                  const tone = BENEFIT_TONES[b.tone];
                  return (
                    <View key={b.label} style={[styles.perkDot, { backgroundColor: tone.bg }]}>
                      <Ionicons name={b.icon} size={10} color={tone.icon} />
                      <Text style={[styles.perkDotText, { color: tone.text }]}>{b.label}</Text>
                    </View>
                  );
                })}
                {d.benefitsOverflow > 0 && (
                  <Text style={styles.perksMore}>+{d.benefitsOverflow} more</Text>
                )}
              </View>
            </View>
          )}

          {/* Footer Row */}
          <View style={styles.footerRow}>
            <View style={styles.distanceBox}>
              <View style={styles.boxHeader}>
                <Ionicons name="location" size={14} color="#3B82F6" />
                <Text style={styles.boxLabel}>LOCATION</Text>
              </View>
              <Text style={styles.boxValueStrong}>{d.distanceText}</Text>
            </View>

            <Animated.View style={[styles.applyBtnOuter, applyStyle]}>
              <Pressable
                onPress={() => onApply(job)}
                onPressIn={() => (applyScale.value = withSpring(0.94, { damping: 15, stiffness: 300 }))}
                onPressOut={() => (applyScale.value = withSpring(1, { damping: 15, stiffness: 300 }))}
                disabled={d.isFull}
              >
                <LinearGradient
                  colors={d.isFull ? ['#94A3B8', '#64748B'] : ['#0F172A', '#1E293B']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.applyBtn]}
                >
                  <Text style={styles.applyText}>{d.isFull ? 'Position Full' : 'Apply Now'}</Text>
                  {!d.isFull && <Ionicons name="arrow-forward" size={14} color={Colors.white} style={{ marginLeft: 6 }} />}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

        </View>
      </Pressable>
    </Animated.View>
  );
});

JobCard.displayName = 'JobCard';

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  cardOuter: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardBody: { padding: 22 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  employerBlock: { flexDirection: 'row', gap: 14, flex: 1, marginRight: 10, alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  employerMeta: { justifyContent: 'center' },
  employerName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: '#D97706',
  },
  ratingLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: '#64748B',
  },
  payBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  payIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 2 }
    }),
  },
  payLabel: {
    fontFamily: FontFamily.headingBold,
    fontSize: 10,
    color: '#4F46E5',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  payRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  payAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  payPeriod: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: '#64748B',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 10,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: '#0F172A',
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.round,
  },
  urgentText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 10,
    color: '#DC2626',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },

  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9', // light gray
    backgroundColor: '#FAFAFA', // slight tint
    borderRadius: 16,
    padding: 14,
  },
  infoBoxFull: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  boxLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  boxValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
    color: '#0F172A',
    marginVertical: 1,
  },

  perksPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  perkDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.round,
  },
  perkDotText: { fontFamily: FontFamily.bodySemiBold, fontSize: 11 },
  perksMore: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: '#475569',
  },

  footerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    marginTop: 4,
  },
  distanceBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    justifyContent: 'center',
  },
  boxValueStrong: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: '#0F172A',
  },
  applyBtnOuter: { flex: 1.2 },
  applyBtn: {
    flex: 1,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  applyText: {
    color: Colors.white,
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

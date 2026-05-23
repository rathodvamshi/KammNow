import React, { memo, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const applyScaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.cardOuter}
        onPress={() => onPress(job)}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()}
        activeOpacity={1}
      >
        <View style={styles.cardBody}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.employerBlock}>
              <Avatar name={d.employerName} size="md" />
              <View style={styles.employerMeta}>
                <View style={styles.employerNameRow}>
                  <Text style={styles.employerName} numberOfLines={1}>{d.employerName}</Text>
                  {d.isVerified && (
                    <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
                  )}
                </View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{d.ratingValue ? d.ratingValue.toFixed(1) : 'New'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.payBox}>
              <View style={styles.payIconCircle}>
                <Ionicons name="cash-outline" size={16} color="#1E293B" />
              </View>
              <View>
                <Text style={styles.payLabel}>PAY</Text>
                <View style={styles.payRow}>
                  <Text style={styles.payAmount}>{d.payPrimary}</Text>
                  <Text style={styles.payPeriod}>{d.payPeriod}</Text>
                </View>
                {d.payTotalInfo ? (
                  <Text style={styles.payHint}>{d.payTotalInfo}</Text>
                ) : null}
              </View>
            </View>
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
                <Ionicons name="navigate-outline" size={14} color="#90CAF9" />
                <Text style={styles.boxLabel}>DISTANCE</Text>
              </View>
              <Text style={styles.boxValueStrong}>{d.distanceText}</Text>
            </View>

            <Animated.View style={[styles.applyBtnOuter, { transform: [{ scale: applyScaleAnim }] }]}>
              <TouchableOpacity
                style={[styles.applyBtn, d.isFull && styles.applyBtnOff]}
                onPress={() => onApply(job)}
                onPressIn={() => Animated.spring(applyScaleAnim, { toValue: 0.94, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(applyScaleAnim, { toValue: 1, useNativeDriver: true }).start()}
                disabled={d.isFull}
                activeOpacity={0.9}
              >
                <Text style={styles.applyText}>{d.isFull ? 'Full' : 'Apply Now'}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

        </View>
      </TouchableOpacity>
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
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F8FAFC', // barely visible border like image
    ...Shadow.sm,
    ...Platform.select({
      ios: { boxShadow: '0px 8px 32px rgba(30,41,59,0.05)' },
    }),
  },
  cardBody: { padding: 20 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  employerBlock: { flexDirection: 'row', gap: 12, flex: 1, marginRight: 10 },
  employerMeta: { justifyContent: 'center' },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employerName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: '#0F172A',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: '#D97706',
  },
  payBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF', // light blue
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  payIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { boxShadow: '0px 2px 8px rgba(30,41,59,0.1)' },
    }),
  },
  payLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  payRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  payAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    color: '#0F172A',
  },
  payPeriod: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: '#475569',
  },
  payHint: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: '#334155',
    marginTop: 2,
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
  },
  distanceBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
  },
  boxValueStrong: {
    fontFamily: FontFamily.headingBold,
    fontSize: 14,
    color: '#0F172A',
  },
  applyBtnOuter: { flex: 1 },
  applyBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  applyBtnOff: {
    backgroundColor: '#94A3B8',
  },
  applyText: {
    color: Colors.white,
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
  },
});

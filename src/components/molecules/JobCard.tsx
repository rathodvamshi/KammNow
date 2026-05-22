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

const StatCell: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.statCell}>
    <View style={styles.statIconWrap}>
      <Ionicons name={icon} size={14} color={Colors.saffron} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
  </View>
);

export const JobCard: React.FC<JobCardProps> = memo(({ job, onPress, onApply }) => {
  const d = useMemo(() => buildJobCardDisplay(job), [job]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const applyScaleAnim = useRef(new Animated.Value(1)).current;

  const accentColors = d.isUrgent
    ? (['#EF4444', '#DC2626'] as const)
    : ([Colors.saffron, Colors.saffronDark] as const);

  const handleContact = () => {
    if (job.contact_phone) Linking.openURL(`tel:${job.contact_phone}`);
  };

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.cardOuter}
        onPress={() => onPress(job)}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true, friction: 8 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()}
        activeOpacity={1}
      >
        <LinearGradient colors={accentColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accentBar} />

        <View style={styles.cardBody}>
          {/* Header */}
          <View style={styles.topRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryEmoji}>{d.categoryEmoji}</Text>
              <Text style={styles.categoryText}>{d.categoryLabel}</Text>
            </View>
            <View style={styles.topRight}>
              {d.isUrgent && (
                <View style={styles.urgentBadge}>
                  <Ionicons name="flash" size={10} color={Colors.red} />
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              )}
              <Text style={styles.postedAgo}>{d.postedAgo}</Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>{job.title}</Text>

          {/* Pay hero */}
          <View style={styles.payHero}>
            <LinearGradient
              colors={[Colors.saffronLighter, Colors.saffronLight]}
              style={styles.payHeroInner}
            >
              <View>
                <Text style={styles.payLabel}>You earn</Text>
                <View style={styles.payRow}>
                  <Text style={styles.payAmount}>{d.payPrimary}</Text>
                  <Text style={styles.payPeriod}>{d.payPeriod}</Text>
                </View>
                {d.payHint ? <Text style={styles.payHint}>{d.payHint}</Text> : null}
              </View>
              <View style={styles.payIconCircle}>
                <Ionicons name="wallet" size={20} color={Colors.saffron} />
              </View>
            </LinearGradient>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="navigate-circle" size={16} color={Colors.saffron} />
            <Text style={styles.locationText} numberOfLines={1}>{d.locationLine}</Text>
          </View>

          {/* Key stats — tap card for full schedule, skills, description */}
          <View style={styles.statsRow}>
            <StatCell icon="time-outline" label="Shift" value={d.shiftLine.split(' – ')[0] ?? d.shiftLine} />
            <View style={styles.statDivider} />
            <StatCell icon="calendar-outline" label="Duration" value={d.scheduleLine} />
            <View style={styles.statDivider} />
            <StatCell
              icon="people-outline"
              label="Open"
              value={d.isFull ? 'Filled' : `${d.slotsRemaining} left`}
            />
          </View>

          {/* Top perks preview */}
          {(d.benefits.length > 0 || d.benefitsOverflow > 0) && (
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
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.employerBlock}>
              <Avatar name={d.employerName} size="sm" />
              <View style={styles.employerMeta}>
                <View style={styles.employerNameRow}>
                  <Text style={styles.employerName} numberOfLines={1}>{d.employerName}</Text>
                  {d.isVerified && (
                    <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                  )}
                </View>
                <Text style={styles.employerSub} numberOfLines={1}>{d.employerMeta}</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${d.fillPercent}%` as any },
                      d.isFull && styles.progressFillFull,
                    ]}
                  />
                </View>
                <Text style={[styles.slotsText, d.slotsUrgency && styles.slotsUrgent]}>
                  {d.slotsUrgency ?? `${job.quantity_hired}/${job.quantity_total} hired`}
                </Text>
              </View>
            </View>

            <View style={styles.ctaCol}>
              {d.showCall && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    handleContact();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={16} color={Colors.navy} />
                </TouchableOpacity>
              )}
              <Animated.View style={{ transform: [{ scale: applyScaleAnim }] }}>
                <TouchableOpacity
                  style={[styles.applyBtn, d.isFull && styles.applyBtnOff]}
                  onPress={() => onApply(job)}
                  onPressIn={() => Animated.spring(applyScaleAnim, { toValue: 0.94, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(applyScaleAnim, { toValue: 1, useNativeDriver: true }).start()}
                  disabled={d.isFull}
                  activeOpacity={0.9}
                >
                  <Text style={styles.applyText}>{d.isFull ? 'Full' : 'Apply'}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          <View style={styles.detailsHint}>
            <Text style={styles.detailsHintText}>View full details</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.saffron} />
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
    marginBottom: 14,
  },
  cardOuter: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...Shadow.md,
    ...Platform.select({
      ios: { shadowColor: Colors.navy, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    }),
  },
  accentBar: { height: 3, width: '100%' },
  cardBody: { padding: 16, paddingTop: 14 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.round,
  },
  categoryEmoji: { fontSize: 11 },
  categoryText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  topRight: { alignItems: 'flex-end', gap: 4 },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.redLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.round,
  },
  urgentText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 8,
    color: Colors.red,
    letterSpacing: 0.5,
  },
  postedAgo: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
  },

  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: 19,
    color: Colors.ink,
    lineHeight: 24,
    letterSpacing: -0.4,
    marginBottom: 12,
  },

  payHero: { marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  payHeroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.12)',
  },
  payLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.saffronDark,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  payRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  payAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 26,
    color: Colors.saffronDark,
    letterSpacing: -0.5,
  },
  payPeriod: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.saffron,
  },
  payHint: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
    marginTop: 3,
  },
  payIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.gray1,
    borderRadius: 10,
  },
  locationText: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginBottom: 10,
    paddingVertical: 10,
  },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4, gap: 3 },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 9,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.ink,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray2,
    marginVertical: 4,
  },

  perksPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  perkDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.round,
  },
  perkDotText: { fontFamily: FontFamily.bodySemiBold, fontSize: 10 },
  perksMore: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.saffron,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
  },
  employerBlock: { flex: 1, flexDirection: 'row', gap: 10 },
  employerMeta: { flex: 1, gap: 3 },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  employerName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    flex: 1,
  },
  employerSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.gray2,
    borderRadius: 99,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.saffron, borderRadius: 99 },
  progressFillFull: { backgroundColor: Colors.gray4 },
  slotsText: { fontFamily: FontFamily.bodyMedium, fontSize: 9, color: Colors.gray4 },
  slotsUrgent: { color: Colors.red, fontFamily: FontFamily.bodySemiBold },

  ctaCol: { alignItems: 'flex-end', gap: 8 },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  applyBtn: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.saffron,
  },
  applyBtnOff: { backgroundColor: Colors.gray3, shadowOpacity: 0, elevation: 0 },
  applyText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },

  detailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray2,
  },
  detailsHintText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.saffron,
  },
});

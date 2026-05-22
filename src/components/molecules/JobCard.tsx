import React, { memo, useRef } from 'react';
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
import { Colors, Radius, FontFamily, FontSize, Spacing, Shadow } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { formatDistance } from '../../utils/helpers';
import type { Job } from '../../types';

interface JobCardProps {
  job: Job;
  onPress: (job: Job) => void;
  onApply: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = memo(({ job, onPress, onApply }) => {
  const slotsRemaining = job.quantity_total - job.quantity_hired;
  const isFull = slotsRemaining <= 0;
  const fillPercentage = Math.min((job.quantity_hired / job.quantity_total) * 100, 100);

  // Micro-interaction: card press scale
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const applyScaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.985, useNativeDriver: true, friction: 8, tension: 80 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }).start();
  };
  const onApplyPressIn = () => {
    Animated.spring(applyScaleAnim, { toValue: 0.94, useNativeDriver: true, friction: 8, tension: 100 }).start();
  };
  const onApplyPressOut = () => {
    Animated.spring(applyScaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
  };

  const handleContact = () => {
    if (job.contact_phone) Linking.openURL(`tel:${job.contact_phone}`);
  };

  // Pay display
  const payPeriodLabel = job.pay_type === 'hour' ? '/hr' : job.pay_type === 'day' ? '/day' : '/mo';
  const payFormatted = job.pay_amount >= 1000
    ? `${(job.pay_amount / 1000).toFixed(job.pay_amount % 1000 === 0 ? 0 : 1)}K`
    : job.pay_amount.toString();

  const locationLabel = job.distance_km !== undefined && job.distance_km !== null
    ? formatDistance(job.distance_km)
    : job.location_name;

  // Trust score tiers
  const trustScore = job.employer_trust_score ?? 0;
  const trustColor = trustScore >= 75 ? Colors.green : trustScore >= 50 ? Colors.gold : Colors.gray4;
  const trustLabel = trustScore >= 75 ? 'Trusted' : trustScore >= 50 ? 'Good' : 'New';

  // Urgency — drives dopamine
  const urgency = slotsRemaining === 1 ? 'Last 1 slot!' :
    slotsRemaining <= 3 ? `Only ${slotsRemaining} left` : null;

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(job)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* ── TOP STRIP: Employer + Badges ─────────────────────────────── */}
        <View style={styles.topRow}>
          <View style={styles.employerBlock}>
            <Avatar name={job.poster_name} size="sm" />
            <View style={styles.employerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.employerName} numberOfLines={1}>{job.poster_name}</Text>
                {job.employer_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={9} color={Colors.white} />
                  </View>
                )}
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="star" size={11} color={Colors.gold} />
                <Text style={styles.metaRating}>{(job.poster_rating ?? 5.0).toFixed(1)}</Text>
                <View style={styles.metaDot} />
                <View style={[styles.trustPill, { backgroundColor: trustColor + '18' }]}>
                  <Text style={[styles.trustText, { color: trustColor }]}>{trustLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.rightBadges}>
            {job.is_urgent && (
              <View style={styles.urgentBadge}>
                <Ionicons name="flash" size={10} color={Colors.red} />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── TITLE + PRICE: Most important info — biggest text ─────────── */}
        <View style={styles.titlePriceRow}>
          <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
          <View style={styles.priceBlock}>
            <Text style={styles.priceAmount}>₹{payFormatted}</Text>
            <Text style={styles.pricePeriod}>{payPeriodLabel}</Text>
          </View>
        </View>

        {/* ── META GRID: 2×2 scan-optimised info grid ─────────────────── */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Ionicons name="location-outline" size={13} color={Colors.saffron} />
            <Text style={styles.metaCellText} numberOfLines={1}>{locationLabel}</Text>
          </View>
          <View style={styles.metaCell}>
            <Ionicons name="time-outline" size={13} color={Colors.navy2} />
            <Text style={styles.metaCellText}>{job.work_start_time || '9 AM'} – {job.work_end_time || '6 PM'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Ionicons name="calendar-outline" size={13} color={Colors.navy2} />
            <Text style={styles.metaCellText} numberOfLines={1}>{job.duration_text || 'Ongoing'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Ionicons name="people-outline" size={13} color={Colors.navy2} />
            <Text style={styles.metaCellText}>{job.quantity_total} workers needed</Text>
          </View>
        </View>

        {/* ── PERKS STRIP ─────────────────────────────────────────────── */}
        {(job.food_included || job.stay_included || job.travel_allowance || job.payment_schedule) && (
          <View style={styles.perksRow}>
            {job.food_included && <View style={styles.perkTag}><Text style={styles.perkTagText}>🍱 Food</Text></View>}
            {job.stay_included && <View style={styles.perkTag}><Text style={styles.perkTagText}>🛏 Stay</Text></View>}
            {job.travel_allowance && <View style={styles.perkTag}><Text style={styles.perkTagText}>🚌 Travel</Text></View>}
            {job.payment_schedule && (
              <View style={[styles.perkTag, styles.perkTagGreen]}>
                <Text style={[styles.perkTagText, { color: Colors.green }]}>
                  💸 {job.payment_schedule.charAt(0).toUpperCase() + job.payment_schedule.slice(1)} Pay
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── SLOTS PROGRESS ──────────────────────────────────────────── */}
        <View style={styles.slotsRow}>
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                { width: `${fillPercentage}%` as any },
                isFull && styles.progressFull,
              ]} />
            </View>
            {urgency ? (
              <Text style={styles.urgencyText}>{urgency}</Text>
            ) : (
              <Text style={styles.slotsText}>
                <Text style={styles.slotsFilled}>{job.quantity_hired}</Text>/{job.quantity_total} filled
              </Text>
            )}
          </View>

          {/* ── CTAs ─────────────────────────────────────────────────── */}
          <View style={styles.ctas}>
            {job.show_phone && job.contact_phone && (
              <TouchableOpacity style={styles.callBtn} onPress={handleContact} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={18} color={Colors.navy} />
              </TouchableOpacity>
            )}
            <Animated.View style={{ transform: [{ scale: applyScaleAnim }] }}>
              <TouchableOpacity
                style={[styles.applyBtn, isFull && styles.applyBtnFull]}
                onPress={() => onApply(job)}
                onPressIn={onApplyPressIn}
                onPressOut={onApplyPressOut}
                disabled={isFull}
                activeOpacity={1}
              >
                {!isFull && <Ionicons name="flash" size={13} color={Colors.white} />}
                <Text style={[styles.applyBtnText, isFull && styles.applyBtnTextFull]}>
                  {isFull ? 'Filled' : 'Apply'}
                </Text>
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
  cardWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },

  // ── Top Row ──────────────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  employerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  employerInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  employerName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    letterSpacing: -0.1,
  },
  verifiedBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaRating: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.ink2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.gray3,
  },
  trustPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.round,
  },
  trustText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.2,
  },
  rightBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
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
    fontSize: 9,
    color: Colors.red,
    letterSpacing: 0.8,
  },

  // ── Title + Price ────────────────────────────────────────────────────────
  titlePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  jobTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    color: Colors.ink,
    lineHeight: 26,
    letterSpacing: -0.4,
    flex: 1,
  },
  priceBlock: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  priceAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: 20,
    color: Colors.saffron,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  pricePeriod: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray4,
    marginTop: 1,
  },

  // ── Meta Grid ────────────────────────────────────────────────────────────
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
    marginBottom: 12,
    backgroundColor: Colors.gray1,
    borderRadius: Radius.md,
    padding: 10,
    rowGap: 8,
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '50%',
  },
  metaCellText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink2,
    flex: 1,
  },

  // ── Perks ────────────────────────────────────────────────────────────────
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  perkTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.round,
    backgroundColor: Colors.saffronLight,
  },
  perkTagGreen: {
    backgroundColor: Colors.greenLight,
  },
  perkTagText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.saffronDark,
  },

  // ── Slots + CTAs ─────────────────────────────────────────────────────────
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  progressWrap: {
    flex: 1,
    gap: 5,
  },
  progressBg: {
    height: 5,
    backgroundColor: Colors.gray2,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: Radius.round,
  },
  progressFull: {
    backgroundColor: Colors.gray4,
  },
  slotsText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray4,
  },
  slotsFilled: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.ink2,
  },
  urgencyText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.red,
  },
  ctas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    backgroundColor: Colors.saffron,
    ...Shadow.saffron,
  },
  applyBtnFull: {
    backgroundColor: Colors.gray3,
    shadowOpacity: 0,
    elevation: 0,
  },
  applyBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  applyBtnTextFull: {
    color: Colors.white,
  },
});

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, FontFamily, FontSize, Spacing } from '../../theme';
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

  const handleContact = () => {
    if (job.contact_phone) {
      Linking.openURL(`tel:${job.contact_phone}`);
    }
  };

  const payPeriodText = job.pay_type === 'hour' ? 'hr' : job.pay_type === 'day' ? 'day' : 'mo';
  const payFormatted = job.pay_amount >= 1000 
    ? `${(job.pay_amount / 1000).toFixed(job.pay_amount % 1000 === 0 ? 0 : 1)}K` 
    : job.pay_amount.toString();

  // Deduplicate Date text
  let dateText = job.duration_text || '';
  if (!dateText && job.work_start_date) {
    dateText = job.work_start_date === job.work_end_date 
      ? job.work_start_date 
      : `${job.work_start_date} - ${job.work_end_date}`;
  }

  const locationLabel = job.distance_km !== undefined && job.distance_km !== null 
    ? formatDistance(job.distance_km) 
    : job.location_name;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(job)}
      activeOpacity={0.9}
    >
      {/* Premium Header: Clean Top Row */}
      <View style={styles.cardHeader}>
        <View style={styles.employerBlock}>
          <Avatar name={job.poster_name} size="sm" />
          <View style={styles.employerInfo}>
            <View style={styles.employerNameRow}>
              <Text style={styles.employerName} numberOfLines={1}>{job.poster_name}</Text>
              <View style={styles.verifiedDot}>
                 <Ionicons name="checkmark" size={10} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.metaText}>
              <Ionicons name="star" size={10} color={Colors.gold} /> {(job.poster_rating ?? 5.0).toFixed(1)}  <Text style={styles.metaDivider}>|</Text>  2h ago
            </Text>
          </View>
        </View>

        {job.is_urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>

      {/* Main Title & Minimalist Pricing */}
      <View style={styles.bodySection}>
        <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>₹{payFormatted}</Text>
          <Text style={styles.pricePeriod}>/{payPeriodText}</Text>
        </View>
      </View>

      {/* Elegant Details Row (Outline Icons, Clean Text) */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={16} color={Colors.ink} />
          <Text style={styles.detailText} numberOfLines={1}>{locationLabel}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="briefcase-outline" size={16} color={Colors.ink} />
          <Text style={styles.detailText}>{job.category.charAt(0).toUpperCase() + job.category.slice(1)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={Colors.ink} />
          <Text style={styles.detailText} numberOfLines={1}>{dateText || 'Ongoing'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={Colors.ink} />
          <Text style={styles.detailText}>{job.work_start_time || '9 AM'} - {job.work_end_time || '6 PM'}</Text>
        </View>
      </View>

      {/* Subtle Perks chips */}
      {(job.payment_schedule || job.food_included || job.stay_included) && (
        <View style={styles.perksContainer}>
          {job.payment_schedule && (
            <View style={[styles.perkChip, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="cash" size={14} color="#2E7D32" />
              <Text style={[styles.perkText, { color: '#2E7D32' }]}>{job.payment_schedule} Pay</Text>
            </View>
          )}
          {job.food_included && (
            <View style={[styles.perkChip, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="fast-food" size={14} color="#E65100" />
              <Text style={[styles.perkText, { color: '#E65100' }]}>Food</Text>
            </View>
          )}
          {job.stay_included && (
            <View style={[styles.perkChip, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="home" size={14} color="#1565C0" />
              <Text style={[styles.perkText, { color: '#1565C0' }]}>Stay</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.divider} />

      {/* Structured Footer */}
      <View style={styles.footerSection}>
        <View style={styles.slotsBlock}>
          <Text style={styles.slotsLabel}>Applications</Text>
          <Text style={styles.slotsValue}>
            <Text style={styles.slotsHighlight}>{job.quantity_hired}</Text> of {job.quantity_total} Filled
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${fillPercentage}%`, backgroundColor: isFull ? Colors.gray4 : Colors.navy }]} />
          </View>
        </View>
        
        <View style={styles.actionsBlock}>
          {job.show_phone && job.contact_phone && (
            <TouchableOpacity style={styles.classicCallButton} onPress={handleContact}>
              <Ionicons name="call-outline" size={20} color={Colors.ink} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.classicApplyButton, isFull && styles.classicApplyButtonDisabled]} 
            onPress={() => onApply(job)}
            disabled={isFull}
          >
            <Text style={styles.classicApplyText}>{isFull ? 'POSITION FILLED' : 'APPLY NOW'}</Text>
          </TouchableOpacity>
        </View>
      </View>

    </TouchableOpacity>
  );
});

JobCard.displayName = 'JobCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg, // slightly sharper corners for a classic look
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  employerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  employerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  employerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  employerName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  verifiedDot: {
    backgroundColor: Colors.navy,
    borderRadius: 8,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    alignItems: 'center',
  },
  metaDivider: {
    color: Colors.gray2,
  },
  urgentBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  urgentText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 9,
    color: Colors.red,
    letterSpacing: 1,
  },
  bodySection: {
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  jobTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    color: Colors.ink,
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 10,
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  priceAmount: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize['4xl'],
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    marginLeft: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    gap: 6,
  },
  detailText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  perksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  perkChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perkText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.ink2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  slotsBlock: {
    flex: 1,
  },
  slotsLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.gray4,
    marginBottom: 4,
  },
  slotsValue: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    marginBottom: 6,
  },
  slotsHighlight: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.ink,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.gray1,
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1.2,
  },
  classicCallButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: Colors.white,
  },
  classicApplyButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.navy,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicApplyButtonDisabled: {
    backgroundColor: Colors.gray3,
  },
  classicApplyText: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.xs,
    color: Colors.white,
    letterSpacing: 1,
  },
});

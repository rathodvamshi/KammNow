/**
 * Seeker job detail — all provider post fields, grouped for clarity.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { buildJobDetailModel, type DetailRow } from '../../utils/jobDetailDisplay';
import type { Job } from '../../types';
import type { JobCardBenefit } from '../../utils/jobCardDisplay';

const BENEFIT_TONES: Record<JobCardBenefit['tone'], { bg: string; text: string; icon: string }> = {
  saffron: { bg: Colors.saffronLight, text: Colors.saffronDark, icon: Colors.saffron },
  green: { bg: Colors.greenLight, text: Colors.green, icon: Colors.green },
  blue: { bg: '#E8F4FD', text: '#1565C0', icon: '#1565C0' },
  gold: { bg: Colors.goldLight, text: Colors.goldDark, icon: Colors.gold },
};

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={Colors.saffron} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DetailGrid({ rows }: { rows: DetailRow[] }) {
  return (
    <View style={styles.detailGrid}>
      {rows.map((r) => (
        <View
          key={`${r.label}-${r.value}`}
          style={[styles.detailBox, r.positive && styles.detailBoxPositive]}
        >
          <View style={[styles.detailIcon, r.positive && styles.detailIconPositive]}>
            <Ionicons name={r.icon} size={16} color={r.positive ? Colors.saffron : Colors.navy2} />
          </View>
          <View style={styles.detailTexts}>
            <Text style={styles.detailLabel}>{r.label}</Text>
            <Text style={[styles.detailValue, r.positive && styles.detailValuePositive]} numberOfLines={2}>
              {r.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export interface JobDetailContentProps {
  job: Job;
  onDirections: () => void;
  onCall?: () => void;
  renderReviews?: React.ReactNode;
  renderReport?: React.ReactNode;
}

export const JobDetailContent: React.FC<JobDetailContentProps> = ({
  job,
  onDirections,
  onCall,
  renderReviews,
  renderReport,
}) => {
  const m = buildJobDetailModel(job);
  const slotsLeft = m.card.slotsRemaining;

  return (
    <View style={styles.root}>
      {/* Slots urgency */}
      <View style={styles.slotsBanner}>
        <View style={styles.slotsBannerLeft}>
          <Ionicons
            name={slotsLeft > 0 ? 'people' : 'lock-closed'}
            size={20}
            color={slotsLeft > 0 ? Colors.saffron : Colors.gray4}
          />
          <View>
            <Text style={styles.slotsBannerTitle}>
              {slotsLeft > 0 ? `${slotsLeft} spot${slotsLeft === 1 ? '' : 's'} open` : 'All spots filled'}
            </Text>
            <Text style={styles.slotsBannerSub}>
              {job.quantity_hired} of {job.quantity_total} already hired
            </Text>
          </View>
        </View>
        <View style={styles.slotsBannerTrack}>
          <View style={[styles.slotsBannerFill, { width: `${m.card.fillPercent}%` as any }]} />
        </View>
      </View>

      <SectionCard title="About this gig" icon="document-text-outline">
        <Text style={styles.description}>{m.description}</Text>
        {m.allSkills.length > 0 && (
          <View style={styles.skillsBlock}>
            <Text style={styles.skillsHeading}>Skills needed</Text>
            <View style={styles.skillsWrap}>
              {m.allSkills.map((s) => (
                <View key={s} style={styles.skillChip}>
                  <Text style={styles.skillText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </SectionCard>

      <SectionCard title="Schedule & timing" icon="calendar-outline">
        <DetailGrid rows={m.scheduleRows} />
      </SectionCard>

      <SectionCard title="Pay & benefits" icon="wallet-outline">
        <DetailGrid rows={m.payBenefitRows} />
        {m.allBenefits.length > 0 && (
          <View style={styles.benefitsWrap}>
            {m.allBenefits.map((b) => {
              const tone = BENEFIT_TONES[b.tone];
              return (
                <View key={b.label} style={[styles.benefitChip, { backgroundColor: tone.bg }]}>
                  <Ionicons name={b.icon} size={14} color={tone.icon} />
                  <Text style={[styles.benefitChipText, { color: tone.text }]}>{b.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      {m.requirementRows.length > 0 && (
        <SectionCard title="Requirements" icon="checkmark-circle-outline">
          <DetailGrid rows={m.requirementRows} />
        </SectionCard>
      )}

      <SectionCard title="Workers & contact" icon="people-outline">
        <DetailGrid rows={m.workerRows} />
        {m.showPhone && onCall && (
          <TouchableOpacity style={styles.secondaryAction} onPress={onCall} activeOpacity={0.85}>
            <Ionicons name="call-outline" size={18} color={Colors.navy} />
            <Text style={styles.secondaryActionText}>Call employer</Text>
          </TouchableOpacity>
        )}
      </SectionCard>

      <SectionCard title="Location" icon="map-outline">
        <TouchableOpacity style={styles.locationCard} onPress={onDirections} activeOpacity={0.85}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={22} color={Colors.red} />
          </View>
          <View style={styles.locationTexts}>
            <Text style={styles.locationName}>{m.locationFull}</Text>
            {m.distanceText && (
              <Text style={styles.locationDist}>{m.distanceText} from you</Text>
            )}
            <Text style={styles.locationTap}>Tap for directions</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray4} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.directionsBtn} onPress={onDirections} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color={Colors.white} />
          <Text style={styles.directionsBtnText}>Get directions</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Posted by" icon="business-outline">
        <View style={styles.employerCard}>
          <Avatar name={job.poster_name} size="lg" />
          <View style={styles.employerInfo}>
            <View style={styles.employerNameRow}>
              <Text style={styles.employerName}>{job.poster_name ?? 'Employer'}</Text>
              {m.card.isVerified && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
              )}
            </View>
            <Text style={styles.employerSub}>{m.card.employerMeta}</Text>
            {m.contactMethod && (
              <Text style={styles.contactMethod}>Preferred contact: {m.contactMethod}</Text>
            )}
          </View>
        </View>
        <View style={styles.statsRow}>
          {m.employerStats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </SectionCard>

      {renderReviews}
      {renderReport}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: Spacing.md, paddingBottom: Spacing.sm },

  slotsBanner: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray2,
    gap: 10,
    ...Shadow.sm,
  },
  slotsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotsBannerTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  slotsBannerSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 2,
  },
  slotsBannerTrack: {
    height: 6,
    backgroundColor: Colors.gray2,
    borderRadius: 99,
    overflow: 'hidden',
  },
  slotsBannerFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: 99,
  },

  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    letterSpacing: -0.2,
  },

  description: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.ink2,
    lineHeight: 22,
  },
  skillsBlock: { marginTop: 14 },
  skillsHeading: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink,
    marginBottom: 8,
  },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.round,
    backgroundColor: '#EEF2FF',
  },
  skillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: '#3949AB',
  },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailBox: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.gray1,
  },
  detailBoxPositive: { backgroundColor: Colors.saffronLighter },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconPositive: { backgroundColor: Colors.saffronLight },
  detailTexts: { flex: 1 },
  detailLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.ink,
  },
  detailValuePositive: { color: Colors.saffronDark },

  benefitsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.round,
  },
  benefitChipText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm },

  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.gray1,
  },
  secondaryActionText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.navy,
  },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.gray1,
    borderRadius: 12,
    marginBottom: 10,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.redLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTexts: { flex: 1 },
  locationName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  locationDist: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.saffron,
    marginTop: 2,
  },
  locationTap: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    marginTop: 4,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    paddingVertical: 12,
    borderRadius: 12,
  },
  directionsBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },

  employerCard: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  employerInfo: { flex: 1 },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  employerName: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink,
  },
  employerSub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 4,
  },
  contactMethod: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.saffronDark,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.gray1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  statLbl: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.gray4,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray2,
    marginVertical: 4,
  },
});

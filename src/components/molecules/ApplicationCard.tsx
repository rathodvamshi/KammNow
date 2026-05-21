import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Radius, FontFamily, FontSize, Spacing, Shadow } from '../../theme';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { formatRelativeTime } from '../../utils/helpers';
import type { Application } from '../../types';

interface ApplicationCardProps {
  application: Application;
  mode: 'received' | 'sent' | 'completed';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewProfile?: (userId: string) => void;
  onWithdraw?: (id: string) => void;
  onRate?: (application: Application) => void;
  onGetDirections?: (application: Application) => void;
  onPress?: (application: Application) => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  mode,
  onAccept,
  onReject,
  onViewProfile,
  onWithdraw,
  onRate,
  onGetDirections,
  onPress,
}) => {
  const isUnread = application.status === 'pending' && mode === 'received';
  const person = mode === 'received' ? application.applicant : application.employer;
  const jobTitle = application.job?.title ?? 'Unknown job';

  const statusVariant = {
    pending: 'pending' as const,
    accepted: 'accepted' as const,
    rejected: 'rejected' as const,
    withdrawn: 'filled' as const,
    completed: 'review' as const,
  }[application.status] ?? 'pending';

  const statusLabel = {
    pending: 'Pending',
    accepted: "Accepted — You're hired!",
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    completed: 'Completed',
  }[application.status] ?? 'Pending';

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.unreadBorder, Shadow.sm]}
      onPress={() => onPress?.(application)}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.header}>
        <Avatar name={person?.name} size="sm" />
        <View style={styles.headerText}>
          <Text style={styles.name}>{person?.name ?? 'Unknown'}</Text>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {mode === 'received' ? 'Applied for: ' : ''}{jobTitle}
          </Text>
        </View>
        <Text style={styles.time}>{formatRelativeTime(application.applied_at)}</Text>
      </View>

      {/* Rating + Status */}
      <View style={styles.metaRow}>
        {person?.worker_rating !== undefined && person.worker_rating > 0 && (
          <>
            <Text style={styles.stars}>
              {'⭐'.repeat(Math.round(person.worker_rating))}
            </Text>
            <Text style={styles.ratingText}>{person.worker_rating.toFixed(1)} rating</Text>
          </>
        )}
        <Badge variant={statusVariant} label={statusLabel} />
      </View>

      {/* Message */}
      {application.description && (
        <Text style={styles.message} numberOfLines={2}>
          "{application.description}"
        </Text>
      )}

      {/* Slot info for received pending */}
      {mode === 'received' && application.status === 'pending' && application.job && (
        <View style={styles.slotInfo}>
          <Text style={styles.slotInfoText}>
            👥 If accepted: {application.job.quantity_hired + 1} of{' '}
            {application.job.quantity_total} slots filled (
            {application.job.quantity_total - application.job.quantity_hired - 1} remaining)
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {mode === 'received' && application.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => onAccept?.(application.id)}
            >
              <Text style={styles.acceptText}>✅ Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => onReject?.(application.id)}
            >
              <Text style={styles.rejectText}>❌ Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.profileBtn]}
              onPress={() => onViewProfile?.(application.applicant_id)}
            >
              <Text style={styles.profileText}>👤 Profile</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'sent' && application.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.withdrawBtn]}
            onPress={() => onWithdraw?.(application.id)}
          >
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        )}

        {mode === 'sent' && application.status === 'accepted' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rateBtn]}
              onPress={() => onRate?.(application)}
            >
              <Text style={styles.rateText}>⭐ Rate After Work</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.dirBtn]}
              onPress={() => onGetDirections?.(application)}
            >
              <Text style={styles.dirText}>📍 Directions</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'sent' && application.status === 'rejected' && (
          <TouchableOpacity style={[styles.actionBtn]}>
            <Text style={styles.dirText}>🔍 Find Similar Jobs</Text>
          </TouchableOpacity>
        )}

        {mode === 'completed' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.rateBtn]}
            onPress={() => onRate?.(application)}
          >
            <Text style={styles.rateText}>⭐ Rate Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  unreadBorder: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.saffron,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  jobTitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.gray4,
    marginTop: 1,
  },
  time: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  stars: {
    fontSize: FontSize.sm,
    color: Colors.gold,
  },
  ratingText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  message: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.ink2,
    marginTop: 5,
    lineHeight: 18,
  },
  slotInfo: {
    backgroundColor: Colors.goldLight,
    borderRadius: 8,
    padding: 6,
    marginTop: 8,
  },
  slotInfoText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: '#7B5200',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  acceptBtn: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  rejectBtn: { backgroundColor: Colors.redLight, borderColor: Colors.red },
  profileBtn: { backgroundColor: Colors.blueLight, borderColor: Colors.blue },
  withdrawBtn: { backgroundColor: Colors.gray1, borderColor: Colors.gray3 },
  rateBtn: { backgroundColor: Colors.goldLight, borderColor: Colors.gold },
  dirBtn: { backgroundColor: Colors.gray1, borderColor: Colors.gray2 },
  acceptText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.greenDark },
  rejectText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.red },
  profileText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.blue },
  withdrawText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.ink2 },
  rateText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: '#7B5200' },
  dirText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.base, color: Colors.ink2 },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { QuantityEditor } from '../../src/components/molecules/QuantityEditor';
import { Badge } from '../../src/components/atoms/Badge';
import { formatRelativeTime, getCategoryIcon } from '../../src/utils/helpers';
import type { Job, Application } from '../../src/types';
import { useUIStore } from '../../src/store/uiStore';
import { useApplicationStore } from '../../src/store/applicationStore';
import { useJobStore } from '../../src/store/jobStore';
import { useAuthStore } from '../../src/store/authStore';
import { AnimatedProgressTracker } from '../../src/components/molecules/AnimatedProgressTracker';
import { CategoryTab } from '../../src/components/atoms/CategoryTab';

const STATUS_FILTERS = ['All', 'Live', 'Paused'];
const SEEKER_STATUS_TABS = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed'];

export default function ManageJobsScreen() {
  const { currentRole, showToast } = useUIStore();
  const { user } = useAuthStore();
  const isSeeker = currentRole === 'seeker';

  // Seeker State
  const [seekerStatusFilter, setSeekerStatusFilter] = useState('All');
  const { myApplications, fetchMyApplications, cancelApplication, isLoading: isAppLoading } = useApplicationStore();
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  // Provider State
  const { myPostedJobs, fetchMyJobs, updateStatus, deleteJob } = useJobStore();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (isSeeker && user?.id) {
      fetchMyApplications(user.id);
    } else if (!isSeeker && user?.id) {
      fetchMyJobs(user.id);
    }
  }, [isSeeker, user]);

  const filteredSeekerApps = myApplications.filter(app => {
    if (seekerStatusFilter === 'All') return true;
    return app.status === seekerStatusFilter.toLowerCase();
  });

  const filtered = myPostedJobs.filter((j) => {
    if (selectedFilter === 'All') return !j.is_deleted;
    if (selectedFilter === 'Deleted') return j.is_deleted;
    return j.status === selectedFilter.toLowerCase() && !j.is_deleted;
  });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteJob(deleteTarget);
    setDeleteTarget(null);
    showToast('Job listing deleted successfully', 'success');
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget) return;
    await cancelApplication(withdrawTarget);
    setWithdrawTarget(null);
    showToast('Application cancelled successfully', 'info');
  };

  // Provider Card Render
  const renderJob = ({ item: job }: { item: Job }) => {
    const filled = job.quantity_hired;
    const total = job.quantity_total;
    const pct = total > 0 ? (filled / total) * 100 : 0;

    const statusBadgeVariant = {
      live: 'live',
      paused: 'paused',
      filled: 'filled',
      deleted: 'rejected',
    }[job.status] as any ?? 'live';

    return (
      <Animated.View entering={FadeInDown.springify()} style={[styles.jobCard, Shadow.md]}>
        {/* Header */}
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>{getCategoryIcon(job.category)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{job.title}</Text>
              <Text style={styles.cardSub}>
                <Ionicons name="location-outline" size={12} color={Colors.gray4} /> {job.location_name} • {formatRelativeTime(job.created_at)}
              </Text>
            </View>
          </View>
          <Badge
            variant={statusBadgeVariant}
            label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          />
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Workers hired</Text>
            <Text style={styles.progressCount}>{filled} / {total}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color={Colors.saffron} />
            <Text style={styles.payText}>₹{job.pay_amount}<Text style={styles.payPeriod}>/{job.pay_type}</Text></Text>
          </View>
          {job.is_urgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={12} color={Colors.white} />
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {job.status !== 'deleted' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryActionBtn]}
              onPress={() => router.push(`/job/${job.id}/applications` as any)}
            >
              <Ionicons name="people" size={18} color={Colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionText}>View Applications</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={() => router.push(`/job/edit/${job.id}` as any)}
              >
                <Ionicons name="pencil" size={18} color={Colors.ink2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, job.status === 'live' ? styles.warnBtn : styles.successBtn]}
                onPress={() => updateStatus(job.id, job.status === 'live' ? 'paused' : 'live')}
              >
                <Ionicons name={job.status === 'live' ? 'pause' : 'play'} size={18} color={job.status === 'live' ? '#7B5200' : Colors.greenDark} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, styles.dangerBtn]}
                onPress={() => setDeleteTarget(job.id)}
              >
                <Ionicons name="trash" size={18} color={Colors.red} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  // Seeker Application Card Render
  const renderSeekerApplication = ({ item: app, index }: { item: Application, index: number }) => {
    if (!app.job) return null;

    let statusColor: string = Colors.gray4;
    let statusBgColor: string = Colors.gray1;
    let statusLabel = app.status.toUpperCase();

    if (app.status === 'pending') {
      statusColor = Colors.goldDark;
      statusBgColor = Colors.goldLight;
    } else if (app.status === 'accepted') {
      statusColor = Colors.greenDark;
      statusBgColor = Colors.greenLight;
    } else if (app.status === 'rejected') {
      statusColor = Colors.redDark;
      statusBgColor = Colors.redLight;
    } else if (app.status === 'completed') {
      statusColor = Colors.blueDark;
      statusBgColor = Colors.blueLight;
    }

    const isAccepted = app.status === 'accepted';
    const isCompleted = app.status === 'completed';

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={[styles.jobCard, Shadow.md, { borderColor: Colors.gray2, borderWidth: 1, padding: 0 }]}>
        {/* Top Section */}
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.gray1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <View style={[styles.seekerAppIconCircle, { width: 48, height: 48, borderRadius: 24 }]}>
                <Text style={{ fontSize: 24 }}>{getCategoryIcon(app.job.category)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.cardTitle, { fontSize: 18 }]} numberOfLines={1}>{app.job.title}</Text>
                <Text style={styles.cardSub}>{app.job.poster_name || 'Provider'} • {formatRelativeTime(app.job.created_at)}</Text>

                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <View style={[styles.seekerBadge, { backgroundColor: Colors.gray1 }]}>
                    <Text style={[styles.seekerBadgeText, { color: Colors.ink2 }]}>{app.job.category.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={[styles.seekerBadge, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.seekerBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Middle Section */}
        <View style={{ padding: 16, backgroundColor: Colors.background }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '45%' }}>
              <Ionicons name="wallet-outline" size={16} color={Colors.gray4} />
              <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 13, color: Colors.ink, marginLeft: 6 }}>
                ₹{app.job.pay_amount}/{app.job.pay_type}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '45%' }}>
              <Ionicons name="location-outline" size={16} color={Colors.gray4} />
              <Text style={{ fontFamily: FontFamily.body, fontSize: 13, color: Colors.ink2, marginLeft: 6 }} numberOfLines={1}>
                {app.job.location_name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '45%' }}>
              <Ionicons name="time-outline" size={16} color={Colors.gray4} />
              <Text style={{ fontFamily: FontFamily.body, fontSize: 13, color: Colors.ink2, marginLeft: 6 }}>
                Full Day
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '45%' }}>
              <Ionicons name="calendar-outline" size={16} color={Colors.gray4} />
              <Text style={{ fontFamily: FontFamily.body, fontSize: 13, color: Colors.ink2, marginLeft: 6 }}>
                1 Week
              </Text>
            </View>
          </View>
        </View>

        {/* Tracker */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, backgroundColor: Colors.background }}>
          <AnimatedProgressTracker status={app.status as any} />
        </View>

        {/* Bottom Section (Actions) */}
        <View style={[styles.actions, { borderTopWidth: 1, borderTopColor: Colors.gray2, padding: 12, backgroundColor: Colors.white, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.gray1, borderWidth: 0 }]}
            onPress={() => router.push(`/job/${app.job_id}` as any)}
          >
            <Text style={[styles.actionText, { color: Colors.ink }]}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: isAccepted || isCompleted ? Colors.blueLight : Colors.gray1, borderWidth: 0 }]}
            onPress={() => (isAccepted || isCompleted) && router.push(`/chat/${app.id}` as any)}
            disabled={!isAccepted && !isCompleted}
          >
            <Ionicons name="chatbubble-outline" size={16} color={isAccepted || isCompleted ? Colors.blueDark : Colors.gray4} style={{ marginRight: 6 }} />
            <Text style={[styles.actionText, { color: isAccepted || isCompleted ? Colors.blueDark : Colors.gray4 }]}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: isAccepted || isCompleted ? Colors.saffronLight : Colors.gray1, borderWidth: 0 }]}
            onPress={() => { }} // call logic
            disabled={!isAccepted && !isCompleted}
          >
            <Ionicons name="call-outline" size={16} color={isAccepted || isCompleted ? Colors.saffronDark : Colors.gray4} style={{ marginRight: 6 }} />
            <Text style={[styles.actionText, { color: isAccepted || isCompleted ? Colors.saffronDark : Colors.gray4 }]}>Call</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.navy }} />
      <View style={styles.headerWrapper}>
        <TopBar
          showBack={false}
          showPostJob={!isSeeker}
        />
      </View>

      {isSeeker ? (
        // ============ SEEKER WORKFLOW ============
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {SEEKER_STATUS_TABS.map((f) => {
                const count = myApplications.filter((j) => {
                  if (f === 'All') return true;
                  return j.status === f.toLowerCase();
                }).length;

                let iconName = 'list-outline';
                if (f === 'Pending') iconName = 'time-outline';
                if (f === 'Accepted') iconName = 'checkmark-circle-outline';
                if (f === 'Rejected') iconName = 'close-circle-outline';
                if (f === 'Completed') iconName = 'checkmark-done-circle-outline';

                const isActive = seekerStatusFilter === f;

                return (
                  <CategoryTab
                    key={f}
                    label={f}
                    count={count}
                    iconName={iconName as any}
                    isActive={isActive}
                    onPress={() => setSeekerStatusFilter(f)}
                  />
                );
              })}
            </ScrollView>

            <FlatList
              data={filteredSeekerApps}
              keyExtractor={(item) => item.id}
              renderItem={renderSeekerApplication}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No Applications Yet</Text>
                  <Text style={styles.emptySub}>Start searching for gigs and apply with one tap!</Text>
                  <TouchableOpacity
                    style={styles.postBtn}
                    onPress={() => router.replace('/(tabs)' as any)}
                  >
                    <Text style={styles.postBtnText}>🔍 Find Jobs</Text>
                  </TouchableOpacity>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      ) : (
        // ============ PROVIDER WORKFLOW ============
        <View style={{ flex: 1 }}>
          {/* Status filter chips */}
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {STATUS_FILTERS.map((f) => {
                const count = myPostedJobs.filter((j) => {
                  if (f === 'All') return !j.is_deleted;
                  if (f === 'Deleted') return j.is_deleted;
                  return j.status === f.toLowerCase() && !j.is_deleted;
                }).length;

                let iconName = 'briefcase-outline';
                if (f === 'Live') iconName = 'radio-button-on';
                if (f === 'Paused') iconName = 'pause-circle-outline';
                if (f === 'Filled') iconName = 'checkmark-circle-outline';
                if (f === 'Deleted') iconName = 'trash-outline';

                const isActive = selectedFilter === f;

                return (
                  <CategoryTab
                    key={f}
                    label={f}
                    count={count}
                    iconName={iconName as any}
                    isActive={isActive}
                    onPress={() => setSelectedFilter(f)}
                  />
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(j) => j.id}
            renderItem={renderJob}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No jobs here</Text>
                <Text style={styles.emptySub}>Post a job to start hiring workers</Text>
                <TouchableOpacity
                  style={styles.postBtn}
                  onPress={() => router.push('/job/post' as any)}
                >
                  <Text style={styles.postBtnText}>➕ Post a Job</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Delete confirm modal (Provider) */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteTarget(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>🗑️</Text>
            <Text style={styles.modalTitle}>Delete this job?</Text>
            <Text style={styles.modalSub}>
              This action is permanent and cannot be undone. Workers who applied will be notified.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmDelete}>
                <Text style={styles.modalConfirmText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Withdraw confirm modal (Seeker) */}
      <Modal visible={!!withdrawTarget} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setWithdrawTarget(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Withdraw Application?</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to withdraw your application? This decision cannot be reversed.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setWithdrawTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: Colors.red }]} onPress={confirmWithdraw}>
                <Text style={styles.modalConfirmText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  headerWrapper: {
    backgroundColor: Colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 20,
    marginBottom: 12,
    zIndex: 10,
    ...Shadow.md,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.saffron, borderColor: Colors.saffron },
  filterChipText: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Colors.ink2 },
  filterChipTextActive: { color: Colors.white, fontFamily: FontFamily.bodySemiBold },
  jobCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontFamily: FontFamily.headingBold, fontSize: 17, color: Colors.ink },
  cardSub: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.gray4, marginTop: 4 },
  progressContainer: {
    backgroundColor: Colors.gray1,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: { fontFamily: FontFamily.bodyMedium, fontSize: 13, color: Colors.gray5 },
  progressCount: { fontFamily: FontFamily.headingBold, fontSize: 13, color: Colors.saffron },
  progressBar: {
    height: 8,
    backgroundColor: Colors.gray2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payText: { fontFamily: FontFamily.headingBold, fontSize: 18, color: Colors.ink },
  payPeriod: { fontFamily: FontFamily.body, fontSize: 13, color: Colors.gray4 },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  urgentText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  actionText: { fontFamily: FontFamily.bodySemiBold, fontSize: 12, color: Colors.ink2 },
  primaryActionBtn: { backgroundColor: Colors.saffron },
  primaryActionText: { fontFamily: FontFamily.headingBold, fontSize: 14, color: Colors.white },
  warnBtn: { backgroundColor: Colors.goldLight, borderColor: Colors.gold },
  successBtn: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  dangerBtn: { backgroundColor: Colors.redLight, borderColor: Colors.redLight },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontFamily: FontFamily.headingBold, fontSize: FontSize.xl, color: Colors.ink, marginBottom: 6 },
  emptySub: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.gray4, textAlign: 'center', marginBottom: 20 },
  postBtn: { backgroundColor: Colors.saffron, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.sm },
  postBtnText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.white },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,35,64,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    ...Shadow.lg,
  },
  modalIcon: { fontSize: 40, marginBottom: 10 },
  modalTitle: { fontFamily: FontFamily.headingBold, fontSize: FontSize['2xl'], color: Colors.ink, textAlign: 'center', marginBottom: 8 },
  modalSub: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.gray4, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, backgroundColor: Colors.gray2, alignItems: 'center' },
  modalCancelText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.ink },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: Radius.sm, backgroundColor: Colors.red, alignItems: 'center' },
  modalConfirmText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.white },

  // Seeker Specific styles
  seekerSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  seekerSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gray1,
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  seekerSegmentTabActive: {
    backgroundColor: Colors.saffronLight,
    borderColor: Colors.saffron,
  },
  seekerSegmentTabText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    color: Colors.gray5,
  },
  seekerSegmentTabTextActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.saffronDark,
  },
  seekerAppIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
  },
  seekerBadgeGreen: { backgroundColor: Colors.greenLight },
  seekerBadgeGold: { backgroundColor: Colors.goldLight },
  seekerBadgeBlue: { backgroundColor: Colors.blueLight },
  seekerBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
  },
  seekerBadgeTextGreen: { color: Colors.greenDark },
  seekerBadgeTextGold: { color: Colors.goldDark },
  seekerBadgeTextBlue: { color: Colors.blueDark },
  seekerAppPayRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray1,
    marginBottom: 12,
  },
  seekerAppPayText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: Colors.saffron,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 8,
    backgroundColor: Colors.gray1,
    paddingVertical: 12,
    borderRadius: Radius.sm,
  },
  timelineNodeContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.gray3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timelineDotCompleted: {
    backgroundColor: Colors.green,
  },
  timelineDotCurrent: {
    backgroundColor: Colors.gold,
  },
  timelineNodeLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.gray4,
  },
  timelineNodeLabelActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.ink,
  },
  timelineNodeDate: {
    fontFamily: FontFamily.body,
    fontSize: 8,
    color: Colors.gray5,
    marginTop: 2,
  },
  timelineConnector: {
    height: 2,
    backgroundColor: Colors.gray2,
    flex: 1,
    marginTop: -22,
  },
  timelineConnectorActive: {
    backgroundColor: Colors.green,
  },
  interviewBanner: {
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sm,
    padding: 12,
    marginVertical: 10,
  },
  interviewBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  interviewBannerTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.sm,
    color: Colors.goldDark,
    marginLeft: 6,
  },
  interviewBannerText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: '#7B5200',
    marginTop: 2,
  },
});

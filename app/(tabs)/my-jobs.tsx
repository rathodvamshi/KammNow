import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { CommonNavbar } from '../../src/components/organisms/CommonNavbar';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { QuantityEditor } from '../../src/components/molecules/QuantityEditor';
import { Badge } from '../../src/components/atoms/Badge';
import { formatRelativeTime, getCategoryIcon } from '../../src/utils/helpers';
import type { Job, Application } from '../../src/types';
import { useUIStore } from '../../src/store/uiStore';
import { useApplicationStore } from '../../src/store/applicationStore';
import { useJobStore } from '../../src/store/jobStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { AnimatedProgressTracker } from '../../src/components/molecules/AnimatedProgressTracker';
import { CategoryTab } from '../../src/components/atoms/CategoryTab';
import { JobCard } from '../../src/components/molecules/JobCard';

const STATUS_FILTERS = ['All', 'Active', 'Paused'];
const SEEKER_STATUS_TABS = ['All', 'Pending', 'Accepted', 'Rejected', 'Completed'];

export default function ManageJobsScreen() {
  const { currentRole, showToast } = useUIStore();
  const { user } = useAuthStore();
  const isSeeker = currentRole === 'seeker';
  const insets = useSafeAreaInsets();

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

  // Fetch suggested jobs for empty state
  const { data: suggestedJobs } = useQuery({
    queryKey: ['suggestedJobs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(3);
      return data as Job[] || [];
    },
    enabled: isSeeker && filteredSeekerApps.length === 0,
  });

  const filtered = myPostedJobs.filter((j) => {
    if (selectedFilter === 'All') return !j.is_deleted;
    if (selectedFilter === 'Deleted') return j.is_deleted;
    // 'Active' filter maps to DB status = 'active'
    const dbStatus = selectedFilter === 'Active' ? 'active' : selectedFilter.toLowerCase();
    return j.status === dbStatus && !j.is_deleted;
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
      active: 'live',   // 'active' in DB → 'live' badge visual style
      paused: 'paused',
      filled: 'filled',
      deleted: 'rejected',
    }[job.status] as any ?? 'live';

    return (
      <Animated.View entering={FadeInDown.springify()} style={[styles.jobCard, Shadow.md, { padding: 0 }]}>
        <Pressable 
          style={{ padding: 20 }} 
          onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
          android_ripple={{ color: Colors.gray2 }}
        >
          {/* Header Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
              <View style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.saffronLight, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{getCategoryIcon(job.category)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 18, color: Colors.ink, marginBottom: 4 }} numberOfLines={1}>
                  {job.title}
                </Text>
                <Text style={{ fontFamily: FontFamily.bodyMedium, fontSize: 12, color: Colors.gray4 }}>
                  <Ionicons name="location-outline" size={12} /> {job.location_name || 'Location N/A'} • {formatRelativeTime(job.created_at)}
                </Text>
              </View>
            </View>
            <Badge
              variant={statusBadgeVariant}
              label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            />
          </View>

          {/* Quick Stats Row */}
          <View style={{ flexDirection: 'row', backgroundColor: Colors.gray1, borderRadius: Radius.lg, padding: 12, marginBottom: 16, gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 10, color: Colors.gray4, textTransform: 'uppercase', marginBottom: 4 }}>Pay</Text>
              <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 16, color: Colors.ink }}>
                ₹{job.pay_amount}<Text style={{ fontSize: 12, color: Colors.gray4 }}>/{job.pay_type}</Text>
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: Colors.gray2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 10, color: Colors.gray4, textTransform: 'uppercase', marginBottom: 4 }}>Workers</Text>
              <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 16, color: Colors.ink }}>
                {filled} <Text style={{ fontSize: 12, color: Colors.gray4 }}>of {total}</Text>
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: Colors.gray2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 10, color: Colors.gray4, textTransform: 'uppercase', marginBottom: 4 }}>Applicants</Text>
              <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 16, color: Colors.saffron }}>
                {job.applicants_count || 0}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ height: 6, backgroundColor: Colors.gray2, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', backgroundColor: Colors.saffron, width: `${pct}%` }} />
            </View>
          </View>

          {/* Actions */}
          {job.status !== 'deleted' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: Colors.ink, borderRadius: Radius.lg, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                onPress={() => router.push({ pathname: '/job/[id]/applications', params: { id: job.id } })}
              >
                <Ionicons name="people" size={16} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: FontFamily.bodySemiBold, fontSize: 14, color: Colors.white }}>Applications</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gray2, alignItems: 'center', justifyContent: 'center' }} 
                onPress={() => router.push({ pathname: '/job/edit/[id]', params: { id: job.id } })}
              >
                <Ionicons name="pencil" size={18} color={Colors.ink2} />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, borderColor: job.status === 'active' ? '#FDE68A' : '#BBF7D0', backgroundColor: job.status === 'active' ? '#FEF3C7' : '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => updateStatus(job.id, job.status === 'active' ? 'paused' : 'active')}
              >
                <Ionicons name={job.status === 'active' ? 'pause' : 'play'} size={18} color={job.status === 'active' ? '#92400E' : '#166534'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setDeleteTarget(job.id)}
              >
                <Ionicons name="trash" size={18} color={Colors.red} />
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
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
            onPress={() => router.push({ pathname: '/job/[id]', params: { id: app.job_id } })}
          >
            <Text style={[styles.actionText, { color: Colors.ink }]}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: isAccepted || isCompleted ? Colors.blueLight : Colors.gray1, borderWidth: 0 }]}
            onPress={() => (isAccepted || isCompleted) && router.push({ pathname: '/chat/[id]', params: { id: app.id } })}
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
      
      
      <LinearGradient
        colors={isSeeker ? ['#1E293B', '#0F172A'] : ['#004DEB', '#0039B3']}
        style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 10) + 4, paddingBottom: 16 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <CommonNavbar />
      </LinearGradient>


      {isSeeker ? (
        // ============ SEEKER WORKFLOW ============
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={[styles.filterRow, { paddingHorizontal: 16, gap: 8 }]}
              style={{ flexGrow: 0, marginBottom: 8 }}
            >
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

            <FlashList
              data={filteredSeekerApps}
              keyExtractor={(item) => item.id}
              renderItem={renderSeekerApplication}
              estimatedItemSize={250}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyTitle}>No Applications Yet</Text>
                  <Text style={styles.emptySub}>Start searching for gigs and apply with one tap!</Text>
                  
                  {/* Smart Suggestions Section */}
                  {suggestedJobs && suggestedJobs.length > 0 && (
                    <View style={{ width: '100%', marginTop: 24 }}>
                      <Text style={{ fontFamily: FontFamily.headingBold, fontSize: 16, color: Colors.ink, marginBottom: 12, paddingHorizontal: 4 }}>
                        ✨ Suggested Gigs for You
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {suggestedJobs.map((job) => (
                          <View key={job.id} style={{ width: 280 }}>
                            <JobCard 
                              job={job} 
                              onPress={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
                              onApply={() => router.push({ pathname: '/job/[id]', params: { id: job.id } })}
                            />
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  
                  {(!suggestedJobs || suggestedJobs.length === 0) && (
                    <TouchableOpacity
                      style={styles.postBtn}
                      onPress={() => router.replace('/(tabs)' as any)}
                    >
                      <Text style={styles.postBtnText}>🔍 Find Jobs</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={filteredSeekerApps.length > 0}
            />
          </View>
        </View>
      ) : (
        // ============ PROVIDER WORKFLOW ============
        <View style={{ flex: 1 }}>
          {/* Status filter chips */}
          <View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={[styles.filterRow, { paddingHorizontal: 16, gap: 8 }]}
              style={{ flexGrow: 0, marginBottom: 8 }}
            >
              {STATUS_FILTERS.map((f) => {
                const count = myPostedJobs.filter((j) => {
                  if (f === 'All') return !j.is_deleted;
                  if (f === 'Deleted') return j.is_deleted;
                  const dbStatus = f === 'Active' ? 'active' : f.toLowerCase();
                  return j.status === dbStatus && !j.is_deleted;
                }).length;

                let iconName = 'briefcase-outline';
                if (f === 'Active') iconName = 'radio-button-on';
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

          <FlashList
            data={filtered}
            keyExtractor={(j) => j.id}
            renderItem={renderJob}
            estimatedItemSize={250}
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
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={filtered.length > 0}
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
    paddingHorizontal: 20,
    paddingTop: 12, 
    paddingBottom: 24, 
    borderBottomLeftRadius: 28, 
    borderBottomRightRadius: 28, 
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: "0px 4px 16px rgba(0,0,0,0.1)",
    marginBottom: 12,
    zIndex: 10,
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
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, minHeight: 400 },
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

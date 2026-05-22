import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { QuantityEditor } from '../../src/components/molecules/QuantityEditor';
import { Badge } from '../../src/components/atoms/Badge';
import { MOCK_MY_POSTED_JOBS } from '../../src/services/mockData';
import { formatRelativeTime, getCategoryIcon } from '../../src/utils/helpers';
import type { Job } from '../../src/types';
import { useUIStore } from '../../src/store/uiStore';

const STATUS_FILTERS = ['All', 'Live', 'Paused', 'Filled', 'Deleted'];

const MOCK_SEEKER_APPLICATIONS = [
  {
    id: 'app-101',
    title: 'Event Staff Crew',
    company: 'QuickMart Ameerpet',
    pay: '₹500/day',
    status: 'interview', // 'applied' | 'under_review' | 'interview' | 'selected' | 'withdrawn'
    appliedDate: '2 days ago',
    interviewTime: 'Tomorrow, 10:00 AM',
    location: 'Ameerpet Store premises',
    steps: [
      { label: 'Applied', status: 'completed', date: 'May 20' },
      { label: 'Review', status: 'completed', date: 'May 21' },
      { label: 'Interview', status: 'current', date: 'May 22' },
      { label: 'Offer', status: 'pending', date: null },
    ]
  },
  {
    id: 'app-102',
    title: 'Delivery Partner',
    company: 'Zepto Ameerpet',
    pay: '₹25/order + fuel',
    status: 'under_review',
    appliedDate: '3 days ago',
    steps: [
      { label: 'Applied', status: 'completed', date: 'May 19' },
      { label: 'Review', status: 'current', date: 'May 20' },
      { label: 'Interview', status: 'pending', date: null },
      { label: 'Offer', status: 'pending', date: null },
    ]
  },
  {
    id: 'app-103',
    title: 'Warehouse Loader',
    company: 'BigBasket Warehouse',
    pay: '₹12,000/month',
    status: 'selected',
    appliedDate: '1 week ago',
    steps: [
      { label: 'Applied', status: 'completed', date: 'May 15' },
      { label: 'Review', status: 'completed', date: 'May 16' },
      { label: 'Interview', status: 'completed', date: 'May 18' },
      { label: 'Offer', status: 'completed', date: 'May 20' },
    ]
  }
];

const MOCK_SEEKER_EARNINGS = [
  { id: 'earn-001', jobTitle: 'Store Delivery Gig', date: 'May 18, 2026', amount: '₹450', status: 'Paid' },
  { id: 'earn-002', jobTitle: 'Festival Event Host', date: 'May 12, 2026', amount: '₹1,500', status: 'Paid' },
  { id: 'earn-003', jobTitle: 'Boutique Delivery Assistant', date: 'May 08, 2026', amount: '₹600', status: 'Paid' },
];

export default function ManageJobsScreen() {
  const { currentRole, showToast } = useUIStore();
  const isSeeker = currentRole === 'seeker';

  // Seeker State
  const [seekerTab, setSeekerTab] = useState<'applications' | 'earnings'>('applications');
  const [seekerApps, setSeekerApps] = useState(MOCK_SEEKER_APPLICATIONS);
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  // Provider State
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [jobs, setJobs] = useState(MOCK_MY_POSTED_JOBS);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = jobs.filter((j) => {
    if (selectedFilter === 'All') return !j.is_deleted;
    if (selectedFilter === 'Deleted') return j.is_deleted;
    return j.status === selectedFilter.toLowerCase() && !j.is_deleted;
  });

  const updateQuantity = (id: string, q: number) => {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, quantity_total: q } : j));
  };

  const togglePause = (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: j.status === 'live' ? 'paused' : 'live' } : j
      )
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setJobs((prev) =>
      prev.map((j) => j.id === deleteTarget ? { ...j, is_deleted: true, status: 'deleted' } : j)
    );
    setDeleteTarget(null);
    showToast('Job listing deleted successfully', 'success');
  };

  const confirmWithdraw = () => {
    if (!withdrawTarget) return;
    setSeekerApps((prev) => prev.filter((a) => a.id !== withdrawTarget));
    setWithdrawTarget(null);
    showToast('Application withdrawn successfully', 'info');
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
      <View style={[styles.jobCard, Shadow.sm]}>
        {/* Header */}
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <Text style={styles.cardIcon}>{getCategoryIcon(job.category)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{job.title}</Text>
              <Text style={styles.cardSub}>{job.location_name} • {formatRelativeTime(job.created_at)}</Text>
            </View>
          </View>
          <Badge
            variant={statusBadgeVariant}
            label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          />
        </View>

        {/* Progress */}
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Workers hired:</Text>
          <Text style={styles.progressCount}>{filled} of {total}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>

        {/* Quantity editor */}
        {job.status !== 'deleted' && (
          <View style={styles.qtySection}>
            <QuantityEditor
              value={total}
              onChange={(q) => updateQuantity(job.id, q)}
              label="Total workers needed:"
            />
            <Text style={styles.qtyHint}>
              ⚡ Auto-reduces when you accept workers
            </Text>
          </View>
        )}

        {/* Actions */}
        {job.status !== 'deleted' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryActionBtn]}
              onPress={() => router.push('/(tabs)/inbox' as any)}
            >
              <Text style={styles.primaryActionText}>👥 View Applications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, job.status === 'live' ? styles.warnBtn : styles.successBtn]}
              onPress={() => togglePause(job.id)}
            >
              <Text style={job.status === 'live' ? styles.warnText : styles.successText}>
                {job.status === 'live' ? '⏸ Pause' : '▶️ Resume'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={() => setDeleteTarget(job.id)}
            >
              <Text style={styles.dangerText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pay info */}
        <View style={styles.payRow}>
          <Text style={styles.payText}>₹{job.pay_amount}/{job.pay_type}</Text>
          {job.is_urgent && <Text style={styles.urgentTag}>⚡ Urgent</Text>}
        </View>
      </View>
    );
  };

  // Seeker Application Card Render
  const renderSeekerApplication = ({ item: app }: { item: typeof MOCK_SEEKER_APPLICATIONS[0] }) => {
    return (
      <View style={[styles.jobCard, Shadow.sm]}>
        {/* Top Title Row */}
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <View style={styles.seekerAppIconCircle}>
              <Ionicons name="briefcase" size={20} color={Colors.saffron} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{app.title}</Text>
              <Text style={styles.cardSub}>{app.company} • Applied {app.appliedDate}</Text>
            </View>
          </View>
          <View style={[
            styles.seekerBadge,
            app.status === 'selected' ? styles.seekerBadgeGreen : app.status === 'interview' ? styles.seekerBadgeGold : styles.seekerBadgeBlue
          ]}>
            <Text style={[
              styles.seekerBadgeText,
              app.status === 'selected' ? styles.seekerBadgeTextGreen : app.status === 'interview' ? styles.seekerBadgeTextGold : styles.seekerBadgeTextBlue
            ]}>
              {app.status.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Dynamic pay details */}
        <View style={styles.seekerAppPayRow}>
          <Text style={styles.seekerAppPayText}>{app.pay}</Text>
        </View>

        {/* Timeline representation */}
        <View style={styles.timelineRow}>
          {app.steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            return (
              <React.Fragment key={step.label}>
                <View style={styles.timelineNodeContainer}>
                  <View style={[
                    styles.timelineDot,
                    isCompleted && styles.timelineDotCompleted,
                    isCurrent && styles.timelineDotCurrent,
                  ]}>
                    {isCompleted && <Ionicons name="checkmark" size={10} color={Colors.white} />}
                  </View>
                  <Text style={[
                    styles.timelineNodeLabel,
                    (isCompleted || isCurrent) && styles.timelineNodeLabelActive
                  ]}>{step.label}</Text>
                  {step.date && <Text style={styles.timelineNodeDate}>{step.date}</Text>}
                </View>
                {idx < app.steps.length - 1 && (
                  <View style={[
                    styles.timelineConnector,
                    isCompleted && styles.timelineConnectorActive
                  ]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Interview detail banner */}
        {app.status === 'interview' && app.interviewTime && (
          <View style={styles.interviewBanner}>
            <View style={styles.interviewBannerHeader}>
              <Ionicons name="calendar" size={16} color={Colors.goldDark} />
              <Text style={styles.interviewBannerTitle}>Interview Scheduled</Text>
            </View>
            <Text style={styles.interviewBannerText}>🗓️ Time: {app.interviewTime}</Text>
            <Text style={styles.interviewBannerText}>📍 Location: {app.location}</Text>
          </View>
        )}

        {/* Actions row */}
        <View style={styles.actions}>
          {app.status === 'interview' ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryActionBtn]}
              onPress={() => router.push('/(tabs)/inbox' as any)}
            >
              <Text style={styles.primaryActionText}>💬 Chat with Recruiter</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(tabs)/inbox' as any)}
            >
              <Text style={styles.actionText}>💬 Message Poster</Text>
            </TouchableOpacity>
          )}

          {app.status !== 'selected' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={() => setWithdrawTarget(app.id)}
            >
              <Text style={styles.dangerText}>Withdraw</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: Colors.navy }}>
        <View style={styles.topBarWrap}>
          <View style={{ flex: 1 }}>
            <TopBar
              title={isSeeker ? "📋 My Job Applications" : "⚙️ My Posted Jobs"}
              showBack={false}
              showPostJob={false}
            />
          </View>
          {!isSeeker && (
            <TouchableOpacity
              style={styles.postNewBtn}
              onPress={() => router.push('/job/post' as any)}
            >
              <Text style={styles.postNewBtnText}>➕ Post New</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {isSeeker ? (
        // ============ SEEKER WORKFLOW ============
        <View style={{ flex: 1 }}>
          {/* Seeker Sub Tabs Segment Picker */}
          <View style={styles.seekerSegmentContainer}>
            <TouchableOpacity
              style={[styles.seekerSegmentTab, seekerTab === 'applications' && styles.seekerSegmentTabActive]}
              onPress={() => setSeekerTab('applications')}
            >
              <Ionicons
                name="document-text"
                size={18}
                color={seekerTab === 'applications' ? Colors.saffron : Colors.gray5}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.seekerSegmentTabText, seekerTab === 'applications' && styles.seekerSegmentTabTextActive]}>
                Applications ({seekerApps.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.seekerSegmentTab, seekerTab === 'earnings' && styles.seekerSegmentTabActive]}
              onPress={() => setSeekerTab('earnings')}
            >
              <Ionicons
                name="wallet"
                size={18}
                color={seekerTab === 'earnings' ? Colors.saffron : Colors.gray5}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.seekerSegmentTabText, seekerTab === 'earnings' && styles.seekerSegmentTabTextActive]}>
                Earnings & Invoices
              </Text>
            </TouchableOpacity>
          </View>

          {seekerTab === 'applications' ? (
            <FlatList
              data={seekerApps}
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
          ) : (
            // Earnings View
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              {/* Total Earnings Balance Card */}
              <View style={[styles.seekerEarningsBalanceCard, Shadow.md]}>
                <Text style={styles.earningsLabel}>TOTAL LIFE-TIME EARNINGS</Text>
                <Text style={styles.earningsBalanceValue}>₹2,550</Text>
                <View style={styles.earningsDivider} />
                <View style={styles.earningsRow}>
                  <View>
                    <Text style={styles.earningSubLabel}>Current Month</Text>
                    <Text style={styles.earningSubVal}>₹1,050</Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View>
                    <Text style={styles.earningSubLabel}>Verified Profile</Text>
                    <Text style={[styles.earningSubVal, { color: Colors.green }]}>⭐ 100% Legit</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.earningsWithdrawBtn}
                  onPress={() => showToast('Withdrawal successful! Amount credited to your UPI ID.', 'success')}
                >
                  <Text style={styles.earningsWithdrawText}>Withdraw to UPI / Bank ⚡</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.earningsHistoryTitle}>Earning Transactions</Text>
              <View style={styles.earningsHistoryList}>
                {MOCK_SEEKER_EARNINGS.map((earn) => (
                  <View key={earn.id} style={[styles.earningRowCard, Shadow.xs]}>
                    <View style={styles.earningIconWrap}>
                      <Ionicons name="cash-outline" size={20} color={Colors.green} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.earningCardTitle}>{earn.jobTitle}</Text>
                      <Text style={styles.earningCardDate}>{earn.date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.earningCardAmount}>{earn.amount}</Text>
                      <View style={styles.earningCardStatus}>
                        <View style={[styles.liveDotCircle, { backgroundColor: Colors.green }]} />
                        <Text style={styles.earningCardStatusText}>{earn.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      ) : (
        // ============ PROVIDER WORKFLOW ============
        <View style={{ flex: 1 }}>
          {/* Status filter chips */}
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((f) => {
              const count = jobs.filter((j) => {
                if (f === 'All') return !j.is_deleted;
                if (f === 'Deleted') return j.is_deleted;
                return j.status === f.toLowerCase() && !j.is_deleted;
              }).length;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, selectedFilter === f && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f)}
                >
                  <Text style={[styles.filterChipText, selectedFilter === f && styles.filterChipTextActive]}>
                    {f} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  topBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingRight: 12,
  },
  postNewBtn: {
    backgroundColor: Colors.saffron,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  postNewBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.white },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.saffronLight, borderColor: Colors.saffron },
  filterChipText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.base, color: Colors.ink2 },
  filterChipTextActive: { color: Colors.saffronDark, fontFamily: FontFamily.bodySemiBold },
  jobCard: {
    margin: 12,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontFamily: FontFamily.headingBold, fontSize: 16, color: Colors.ink },
  cardSub: { fontFamily: FontFamily.bodyMedium, fontSize: 12, color: Colors.gray4, marginTop: 2 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4 },
  progressCount: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.saffron },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray2,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: 3,
  },
  qtySection: { marginBottom: 10 },
  qtyHint: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 4,
    marginLeft: 2,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4, marginTop: 10 },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtn: { backgroundColor: Colors.saffronLight, borderColor: Colors.saffron },
  primaryActionText: { fontFamily: FontFamily.bodySemiBold, fontSize: 12, color: Colors.saffronDark },
  actionText: { fontFamily: FontFamily.bodySemiBold, fontSize: 12, color: Colors.ink2 },
  warnBtn: { backgroundColor: Colors.goldLight, borderColor: Colors.gold },
  warnText: { fontFamily: FontFamily.bodySemiBold, fontSize: 12, color: '#7B5200' },
  successBtn: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  successText: { fontFamily: FontFamily.bodySemiBold, fontSize: 12, color: Colors.greenDark },
  dangerBtn: { backgroundColor: Colors.redLight, borderColor: 'transparent' },
  dangerText: { fontFamily: FontFamily.bodySemiBold, fontSize: 12, color: Colors.red },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray2, marginTop: 8 },
  payText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.saffron },
  urgentTag: {
    backgroundColor: Colors.redLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.red,
  },
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
  seekerEarningsBalanceCard: {
    margin: 20,
    backgroundColor: Colors.navy,
    borderRadius: Radius.md,
    padding: 20,
  },
  earningsLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  earningsBalanceValue: {
    fontFamily: FontFamily.headingBold,
    fontSize: 32,
    color: Colors.white,
    marginTop: 4,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningSubLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  earningSubVal: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: Colors.white,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningsWithdrawBtn: {
    backgroundColor: Colors.saffron,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    ...Shadow.sm,
  },
  earningsWithdrawText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 13,
    color: Colors.white,
  },
  earningsHistoryTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 16,
    color: Colors.ink,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  earningsHistoryList: {
    paddingHorizontal: 20,
  },
  earningRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  earningIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningCardTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.base,
    color: Colors.ink,
  },
  earningCardDate: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    color: Colors.gray4,
    marginTop: 2,
  },
  earningCardAmount: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.green,
  },
  earningCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveDotCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
    marginRight: 4,
  },
  earningCardStatusText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: Colors.green,
  },
});

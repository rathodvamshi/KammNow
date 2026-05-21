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
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { QuantityEditor } from '../../src/components/molecules/QuantityEditor';
import { Badge } from '../../src/components/atoms/Badge';
import { MOCK_MY_POSTED_JOBS } from '../../src/services/mockData';
import { formatRelativeTime, getCategoryIcon } from '../../src/utils/helpers';
import type { Job } from '../../src/types';

const STATUS_FILTERS = ['All', 'Live', 'Paused', 'Filled', 'Deleted'];

export default function ManageJobsScreen() {
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
  };

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
            <View>
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

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: Colors.navy }}>
        <View style={styles.topBarWrap}>
          <View style={{ flex: 1 }}>
            <TopBar title="⚙️ My Posted Jobs" showBack={false} showPostJob={false} />
          </View>
          <TouchableOpacity
            style={styles.postNewBtn}
            onPress={() => router.push('/job/post' as any)}
          >
            <Text style={styles.postNewBtnText}>➕ Post New</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Delete confirm modal */}
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

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.gray1 },
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
    marginBottom: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
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
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.ink },
  cardSub: { fontFamily: FontFamily.body, fontSize: FontSize.base, color: Colors.gray4 },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  actionBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  primaryActionBtn: { backgroundColor: Colors.saffronLight, borderColor: Colors.saffron },
  primaryActionText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.saffronDark },
  actionText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.ink2 },
  warnBtn: { backgroundColor: Colors.goldLight, borderColor: Colors.gold },
  warnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: '#7B5200' },
  successBtn: { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  successText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.greenDark },
  dangerBtn: { backgroundColor: Colors.redLight, borderColor: Colors.red },
  dangerText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.red },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.gray2 },
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
});

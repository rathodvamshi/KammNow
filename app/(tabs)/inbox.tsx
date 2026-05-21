import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../src/theme';
import { TopBar } from '../../src/components/organisms/TopBar';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { ApplicationCard } from '../../src/components/molecules/ApplicationCard';
import {
  MOCK_RECEIVED_APPLICATIONS,
  MOCK_SENT_APPLICATIONS,
  MOCK_COMPLETED_APPLICATIONS,
} from '../../src/services/mockData';
import { router } from 'expo-router';
import type { Application } from '../../src/types';

type TabKey = 'received' | 'sent' | 'completed';

const TABS: { key: TabKey; label: string; data: Application[] }[] = [
  { key: 'received', label: 'Received', data: MOCK_RECEIVED_APPLICATIONS },
  { key: 'sent', label: 'Sent', data: MOCK_SENT_APPLICATIONS },
  { key: 'completed', label: 'Completed', data: MOCK_COMPLETED_APPLICATIONS },
];

export default function InboxScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('received');
  const [applications, setApplications] = useState({
    received: [...MOCK_RECEIVED_APPLICATIONS],
    sent: [...MOCK_SENT_APPLICATIONS],
    completed: [...MOCK_COMPLETED_APPLICATIONS],
  });

  const currentData = applications[activeTab];

  const handleAccept = (id: string) => {
    setApplications((prev) => ({
      ...prev,
      received: prev.received.map((a) =>
        a.id === id ? { ...a, status: 'accepted' as const } : a
      ),
    }));
  };

  const handleReject = (id: string) => {
    setApplications((prev) => ({
      ...prev,
      received: prev.received.map((a) =>
        a.id === id ? { ...a, status: 'rejected' as const } : a
      ),
    }));
  };

  const handleWithdraw = (id: string) => {
    setApplications((prev) => ({
      ...prev,
      sent: prev.sent.map((a) =>
        a.id === id ? { ...a, status: 'withdrawn' as const } : a
      ),
    }));
  };

  const pendingCount = applications.received.filter((a) => a.status === 'pending').length;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: Colors.navy }}>
        <TopBar title="📬 Inbox" showBack={false} showPostJob={false} />
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const count = tab.data.length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
                {tab.key === 'received' && pendingCount > 0 && ` (${pendingCount})`}
                {tab.key !== 'received' && count > 0 && ` (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notification banner */}
      {activeTab === 'received' && pendingCount > 0 && (
        <View style={styles.notifBanner}>
          <Text style={styles.notifIcon}>🔔</Text>
          <Text style={styles.notifText}>
            <Text style={styles.notifBold}>{pendingCount} new application{pendingCount > 1 ? 's' : ''}</Text>
            {' '}— review them now!
          </Text>
        </View>
      )}

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApplicationCard
            application={item}
            mode={activeTab}
            onAccept={handleAccept}
            onReject={handleReject}
            onWithdraw={handleWithdraw}
            onViewProfile={(uid) => router.push(`/profile/${uid}` as any)}
            onRate={(app) => router.push(`/rating/${app.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'received' ? '📭' : activeTab === 'sent' ? '📤' : '✅'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'received' ? 'No applications received yet' :
               activeTab === 'sent' ? 'No applications sent yet' :
               'No completed jobs yet'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'received' ? 'Post a job to start receiving applications' :
               activeTab === 'sent' ? 'Browse and apply for jobs nearby' :
               'Completed jobs will appear here'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.gray1 },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.saffron },
  tabText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
  tabTextActive: { color: Colors.saffron },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.navy,
    margin: 12,
    borderRadius: 10,
    padding: 12,
  },
  notifIcon: { fontSize: 22 },
  notifText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    flex: 1,
  },
  notifBold: { color: Colors.white, fontFamily: FontFamily.bodySemiBold },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    textAlign: 'center',
    lineHeight: 22,
  },
});

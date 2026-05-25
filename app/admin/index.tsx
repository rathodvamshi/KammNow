import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Spacing, Shadow } from '../../src/theme';
import { apiFetch } from '../../src/utils/apiClient';
import { useAuthStore } from '../../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminDashboardScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      // Assuming authorization token is injected by apiFetch if using token-based
      // In this setup apiFetch does not automatically attach token unless modified, 
      // let's pass token manually if firebaseAuth was accessible, or just trust the proxy.
      const response = await apiFetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/admin/stats`, {
        method: 'GET'
      });
      const res = await response.json();
      if (res.success) {
        setStats(res.data);
      } else {
        alert('Failed to load stats: ' + res.error);
      }
    } catch (err: any) {
      alert('Error loading stats: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only allow admin access
    if ((user?.role as string) !== 'admin') {
      alert('Access Denied. You must be an admin.');
      router.replace('/');
      return;
    }
    fetchStats();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.saffron} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.saffron} />}
      >
        <LinearGradient colors={['#F9F9FB', '#FFFFFF']} style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Platform Health</Text>
          <Text style={styles.cardSubtitle}>Overview of current system metrics</Text>
        </LinearGradient>

        <View style={styles.grid}>
          <StatCard 
            title="Total Users" 
            value={stats?.users?.total_users || 0} 
            subtitle={`${stats?.users?.total_seekers} Seekers, ${stats?.users?.total_providers} Providers`}
            icon="people" 
            color={Colors.blue} 
          />
          <StatCard 
            title="DAU" 
            value={stats?.users?.daily_active_users || 0} 
            subtitle="Active in last 24h"
            icon="pulse" 
            color={Colors.green} 
          />
          <StatCard 
            title="Total Jobs" 
            value={stats?.jobs?.total_jobs || 0} 
            subtitle={`${stats?.jobs?.active_jobs} Active now`}
            icon="briefcase" 
            color={Colors.saffronDark} 
          />
          <StatCard 
            title="Daily Jobs" 
            value={stats?.jobs?.daily_new_jobs || 0} 
            subtitle="Posted in last 24h"
            icon="add-circle" 
            color={Colors.navy} 
          />
          <StatCard 
            title="Acceptance Rate" 
            value={((stats?.applications?.overall_acceptance_rate || 0) * 100).toFixed(1) + '%'} 
            subtitle="Of all applications"
            icon="checkmark-done" 
            color={Colors.green} 
          />
          <StatCard 
            title="Avg Trust Score" 
            value={Number(stats?.trust?.avg_trust_score || 0).toFixed(1)} 
            subtitle="Out of 100"
            icon="shield-checkmark" 
            color={Colors.saffron} 
          />
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ title, value, subtitle, icon, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconBox, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statSubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray2,
  },
  backBtn: { padding: 8, marginRight: 8, marginLeft: -8 },
  title: { fontFamily: FontFamily.headingBold, fontSize: FontSize.xl, color: Colors.navy },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  summaryCard: {
    padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.gray2,
    ...Shadow.sm, alignItems: 'center',
  },
  cardTitle: { fontFamily: FontFamily.headingBold, fontSize: 22, color: Colors.navy, marginBottom: 4 },
  cardSubtitle: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.md, color: Colors.gray4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  statCard: {
    width: '47%', backgroundColor: Colors.white, padding: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gray2, ...Shadow.sm,
  },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontFamily: FontFamily.headingBold, fontSize: 24, color: Colors.navy, marginBottom: 4 },
  statTitle: { fontFamily: FontFamily.bodySemiBold, fontSize: 14, color: Colors.ink },
  statSubtitle: { fontFamily: FontFamily.bodyMedium, fontSize: 12, color: Colors.gray4, marginTop: 4 },
});

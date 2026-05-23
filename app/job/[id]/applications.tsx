import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../../src/theme';
import { TopBar } from '../../../src/components/organisms/TopBar';
import { BottomNav } from '../../../src/components/organisms/BottomNav';
import { useApplicationStore } from '../../../src/store/applicationStore';
import { useJobStore } from '../../../src/store/jobStore';
import { formatRelativeTime } from '../../../src/utils/helpers';
import type { Application } from '../../../src/types';

export default function JobApplicationsScreen() {
  const { id } = useLocalSearchParams();
  const { receivedApplications, fetchReceivedApplications, updateApplicationStatus } = useApplicationStore();
  const { myPostedJobs } = useJobStore();
  
  const job = myPostedJobs.find(j => j.id === id);

  useEffect(() => {
    fetchReceivedApplications('user-001'); // Provider ID
  }, []);

  const applications = receivedApplications.filter(app => app.job_id === id) || [];

  // fallback to show all applications if no match found for demo purposes
  const displayApps = applications.length > 0 ? applications : receivedApplications;

  const handleStatusUpdate = (appId: string, status: any) => {
    Alert.alert(
      `Confirm ${status}`,
      `Are you sure you want to ${status} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            updateApplicationStatus(appId, status);
          }
        }
      ]
    );
  };

  const renderApplicationCard = ({ item, index }: { item: Application, index: number }) => {
    let statusColor: string = Colors.gray4;
    let statusBgColor: string = Colors.gray1;
    let statusIcon: string = 'time-outline';

    if (item.status === 'pending') {
      statusColor = Colors.goldDark;
      statusBgColor = Colors.goldLight;
      statusIcon = 'time';
    } else if (item.status === 'accepted') {
      statusColor = Colors.greenDark;
      statusBgColor = Colors.greenLight;
      statusIcon = 'checkmark-circle';
    } else if (item.status === 'rejected') {
      statusColor = Colors.redDark;
      statusBgColor = Colors.redLight;
      statusIcon = 'close-circle';
    } else if (item.status === 'completed') {
      statusColor = Colors.blueDark;
      statusBgColor = Colors.blueLight;
      statusIcon = 'checkmark-done-circle';
    }

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={[styles.card, Shadow.md]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            style={styles.profileSection} 
            onPress={() => router.push(`/profile/${item.applicant_id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.avatarWrapper}>
              <Image 
                source={{ uri: `https://i.pravatar.cc/150?u=${item.applicant_id}` }} 
                style={styles.avatar} 
              />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.applicantName}>Applicant {item.applicant_id.split('-')[1]}</Text>
              <Text style={styles.appliedTime}>Applied {formatRelativeTime(item.applied_at)}</Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
            <Ionicons name={statusIcon as any} size={14} color={statusColor} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="star" size={16} color={Colors.gold} />
              <Text style={styles.detailText}>4.8</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="briefcase-outline" size={16} color={Colors.gray5} />
              <Text style={styles.detailText}>12 Jobs</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color={Colors.saffron} />
              <Text style={styles.detailText}>2.5 km away</Text>
            </View>
          </View>
          
          {item.description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>"{item.description}"</Text>
            </View>
          ) : (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>"I am very interested in this job and can start immediately. I have relevant experience."</Text>
            </View>
          )}
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleStatusUpdate(item.id, 'rejected')}
            >
              <Ionicons name="close" size={18} color={Colors.red} />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleStatusUpdate(item.id, 'accepted')}
            >
              <Ionicons name="checkmark" size={18} color={Colors.white} />
              <Text style={styles.acceptText}>Accept Worker</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'accepted' && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.messageBtn]}
              onPress={() => router.push(`/chat/${item.id}` as any)}
            >
              <Ionicons name="chatbubble-outline" size={18} color={Colors.ink} />
              <Text style={styles.messageText}>Message Worker</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.profileBtn]}
              onPress={() => router.push(`/profile/${item.applicant_id}` as any)}
            >
              <Ionicons name="person-circle-outline" size={18} color={Colors.saffron} />
              <Text style={styles.profileText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.navy }} />
      
      <View style={styles.headerWrapper}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.subHeaderTitleContainer}>
            <Text style={styles.subHeaderSubtitle}>Review Applications</Text>
            <Text style={styles.subHeaderTitle} numberOfLines={1}>{job ? job.title : 'Loading...'}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={displayApps}
        keyExtractor={(item) => item.id}
        renderItem={renderApplicationCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={Colors.gray3} />
            <Text style={styles.emptyTitle}>No Applications Yet</Text>
            <Text style={styles.emptySub}>When workers apply to this job, they will appear here.</Text>
          </View>
        }
      />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <BottomNav />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    marginBottom: 20,
    ...Shadow.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.gray2,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    marginLeft: 14,
  },
  applicantName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 18,
    color: Colors.ink,
    letterSpacing: -0.3,
  },
  appliedTime: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.gray4,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.round,
  },
  statusText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cardBody: {
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.ink2,
  },
  descriptionBox: {
    backgroundColor: Colors.gray1,
    padding: 16,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 4,
    marginTop: 12,
  },
  descriptionText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  headerWrapper: {
    backgroundColor: Colors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 20,
    marginBottom: -8,
    zIndex: 10,
    ...Shadow.md,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  subHeaderTitleContainer: {
    flex: 1,
  },
  subHeaderSubtitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.saffron,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subHeaderTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.round,
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.redLight,
  },
  rejectText: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.red,
    fontSize: 15,
  },
  acceptBtn: {
    backgroundColor: Colors.green,
    ...Shadow.sm,
  },
  acceptText: {
    fontFamily: FontFamily.headingBold,
    color: Colors.white,
    fontSize: 15,
  },
  messageBtn: {
    backgroundColor: Colors.blueLight,
  },
  messageText: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.blueDark,
    fontSize: 15,
  },
  profileBtn: {
    backgroundColor: Colors.saffronLight,
  },
  profileText: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.saffronDark,
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 20,
    color: Colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    color: Colors.gray4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

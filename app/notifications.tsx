import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../src/theme';
import { useNotificationStore } from '../src/store/notificationStore';
import { formatRelativeTime } from '../src/utils/helpers';
import type { AppNotification } from '../src/types';

export default function NotificationsScreen() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();

  useEffect(() => {
    fetchNotifications('user-001');
  }, []);

  const handlePress = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.type === 'app_accepted' && notif.data?.applicationId) {
       router.push(`/rating/${notif.data.applicationId}` as any); // Just an example route
    } else if (notif.type === 'new_application' && notif.data?.roomId) {
       router.push(`/chat/${notif.data.roomId}` as any);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'app_accepted': return { name: 'checkmark-circle', color: Colors.green };
      case 'app_rejected': return { name: 'close-circle', color: Colors.red };
      case 'new_application': return { name: 'chatbubbles', color: Colors.blue };
      case 'rate_reminder': return { name: 'star', color: Colors.gold };
      default: return { name: 'notifications', color: Colors.saffron };
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const { name, color } = getIcon(item.type);
    return (
      <TouchableOpacity 
        style={[styles.notifCard, !item.is_read && styles.notifUnread]} 
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Ionicons name={name as any} size={24} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color={Colors.gray3} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>We'll let you know when something happens.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontFamily: FontFamily.headingBold, fontSize: FontSize.lg, color: Colors.ink },
  markAllText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.saffron },
  list: { padding: Spacing.md },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  notifUnread: {
    backgroundColor: Colors.saffronLight + '40', // very light tint
    borderWidth: 1,
    borderColor: Colors.saffron + '40',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: { flex: 1 },
  title: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.ink, marginBottom: 4 },
  body: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.ink2, marginBottom: 8, lineHeight: 20 },
  time: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.gray4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.saffron,
    marginTop: 4,
  },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontFamily: FontFamily.headingBold, fontSize: FontSize.xl, color: Colors.ink, marginTop: 16 },
  emptySub: { fontFamily: FontFamily.body, fontSize: FontSize.md, color: Colors.gray4, marginTop: 8 },
});

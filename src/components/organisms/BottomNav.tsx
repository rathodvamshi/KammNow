import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize } from '../../theme';
import { useUIStore } from '../../store/uiStore';

const NAV_ITEMS = [
  { icon: 'home-outline', iconActive: 'home', label: 'Home', href: '/(tabs)/' },
  { icon: 'mail-outline', iconActive: 'mail', label: 'Inbox', href: '/(tabs)/inbox', badge: true },
  { isPost: true, href: '/job/post' },
  { icon: 'briefcase-outline', iconActive: 'briefcase', label: 'My Jobs', href: '/(tabs)/my-jobs' },
  { icon: 'person-outline', iconActive: 'person', label: 'Profile', href: '/(tabs)/profile' },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { inboxBadgeCount } = useUIStore();

  const isActive = (href: string) => {
    if (href === '/(tabs)/') return pathname === '/' || pathname === '/(tabs)';
    return pathname.includes(href.replace('/(tabs)/', ''));
  };

  return (
    <View style={styles.nav}>
      {NAV_ITEMS.map((item, index) => {
        if (item.isPost) {
          return (
            <TouchableOpacity
              key="post-job"
              style={styles.postBtnContainer}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.85}
            >
              <View style={styles.postBtn}>
                <Ionicons name="add" size={34} color={Colors.white} />
              </View>
            </TouchableOpacity>
          );
        }

        const active = isActive(item.href!);
        return (
          <TouchableOpacity
            key={item.href}
            style={styles.item}
            onPress={() => router.push(item.href as any)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={active ? (item.iconActive as any) : (item.icon as any)}
                size={24}
                color={active ? Colors.saffron : Colors.gray4}
              />
              {item.badge && inboxBadgeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {inboxBadgeCount > 9 ? '9+' : inboxBadgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray1,
    position: 'relative',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
  },
  labelActive: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.red,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 9,
    color: Colors.white,
  },
  postBtnContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtn: {
    width: 58,
    height: 58,
    backgroundColor: Colors.saffron,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    // Elevated to sit above the navbar
    marginTop: -38,
    borderWidth: 4,
    borderColor: Colors.white,
    // Intense saffron shadow for premium look
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});

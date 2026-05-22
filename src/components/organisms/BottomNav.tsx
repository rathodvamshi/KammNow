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
import { Colors, FontFamily, FontSize, Shadow, Radius } from '../../theme';
import { useUIStore } from '../../store/uiStore';

interface NavItem {
  icon?: string;
  iconActive?: string;
  label?: string;
  href: string;
  isPost?: boolean;
  badge?: boolean;
}

const SEEKER_NAV_ITEMS: NavItem[] = [
  { icon: 'home-outline', iconActive: 'home', label: 'Home', href: '/(tabs)/' },
  { icon: 'search-outline', iconActive: 'search', label: 'Search', href: '/search' },
  { icon: 'briefcase-outline', iconActive: 'briefcase', label: 'My Gigs', href: '/(tabs)/my-jobs' },
  { icon: 'mail-outline', iconActive: 'mail', label: 'Inbox', href: '/(tabs)/inbox', badge: true },
  { icon: 'person-outline', iconActive: 'person', label: 'Profile', href: '/(tabs)/profile' },
];

const PROVIDER_NAV_ITEMS: NavItem[] = [
  { icon: 'grid-outline', iconActive: 'grid', label: 'Dashboard', href: '/(tabs)/' },
  { icon: 'briefcase-outline', iconActive: 'briefcase', label: 'Gigs', href: '/(tabs)/my-jobs' },
  { isPost: true, href: '/job/post' },
  { icon: 'mail-outline', iconActive: 'mail', label: 'Inbox', href: '/(tabs)/inbox', badge: true },
  { icon: 'business-outline', iconActive: 'business', label: 'Business', href: '/(tabs)/profile' },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { inboxBadgeCount, currentRole } = useUIStore();

  const NAV_ITEMS = currentRole === 'seeker' ? SEEKER_NAV_ITEMS : PROVIDER_NAV_ITEMS;

  const isActive = (href: string) => {
    if (href === '/(tabs)/') return pathname === '/' || pathname === '/(tabs)';
    return pathname.includes(href.replace('/(tabs)/', ''));
  };

  return (
    <View style={styles.navContainer}>
      <View style={styles.nav}>
        {NAV_ITEMS.map((item, index) => {
          if (item.isPost) {
            return (
              <TouchableOpacity
                key="post-job"
                style={styles.postBtnContainer}
                onPress={() => router.push(item.href as any)}
                activeOpacity={0.9}
              >
                <View style={styles.postBtn}>
                  <Ionicons name="add" size={32} color={Colors.white} />
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
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons
                  name={active ? (item.iconActive as any) : (item.icon as any)}
                  size={21}
                  color={active ? Colors.saffron : Colors.gray5}
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
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'transparent',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl, // 24pt rounded edges
    borderWidth: 1,
    borderColor: Colors.gray2,
    // Multi-layered depth shadow to make it float seamlessly
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
    marginBottom: 2,
  },
  iconWrapActive: {
    backgroundColor: Colors.saffronLight, // Soft glowing brand orange capsule
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 10,
    color: Colors.inkSubtle,
    letterSpacing: -0.1,
  },
  labelActive: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.red,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 8,
    color: Colors.white,
    lineHeight: 11,
  },
  postBtnContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtn: {
    width: 52,
    height: 52,
    backgroundColor: Colors.saffron,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32, // Floats premiumly above the floating bar
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadow.saffron,
  },
});

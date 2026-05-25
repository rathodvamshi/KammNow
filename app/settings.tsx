import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../src/theme';
import { TopBar } from '../src/components/organisms/TopBar';
import { useAuthStore } from '../src/store/authStore';

export default function SettingsScreen() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/splash');
        },
      },
    ]);
  };

  interface SettingsItem {
    icon: string;
    label: string;
    value?: string;
    isLink: boolean;
    action?: () => void;
    danger?: boolean;
  }

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Preferences',
      items: [
        { icon: '🌐', label: 'Language', value: 'English', isLink: true },
        { icon: '🔔', label: 'Notifications', value: 'Enabled', isLink: true },
        { icon: '📍', label: 'Location Services', value: 'While using app', isLink: true },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: '❓', label: 'Help & FAQ', isLink: true },
        { icon: '🚩', label: 'Report a Problem', isLink: true },
        { icon: '📄', label: 'Terms & Privacy Policy', isLink: true },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: '👤', label: 'Profile Visibility', value: 'Public', isLink: true },
        { icon: '📥', label: 'Export Work History', isLink: false, action: () => Alert.alert('Success', 'History sent to your email.') },
        { icon: '🚪', label: 'Logout', isLink: false, danger: true, action: handleLogout },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      
        <TopBar title="⚙️ Settings" showBack showPostJob={false} />
      

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                  onPress={item.action ?? (() => {})}
                  activeOpacity={item.action || item.isLink ? 0.7 : 1}
                >
                  <Text style={styles.icon}>{item.icon}</Text>
                  <Text style={[styles.label, item.danger && styles.labelDanger]}>
                    {item.label}
                  </Text>
                  {item.value && <Text style={styles.value}>{item.value}</Text>}
                  {item.isLink && <Text style={styles.chevron}>›</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Text style={{ fontSize: 12 }}>💼</Text></View>
            <Text style={styles.logoText}>Kaam<Text style={{ color: Colors.saffron }}>Now</Text></Text>
          </View>
          <Text style={styles.version}>Version 1.0.0 (Build 42)</Text>
          <Text style={styles.copy}>Made with ❤️ in India</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.gray1 },
  scroll: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray1,
  },
  icon: { fontSize: 20, marginRight: 12 },
  label: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  labelDanger: { color: Colors.red, fontFamily: FontFamily.bodySemiBold },
  value: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    marginRight: 8,
  },
  chevron: {
    fontFamily: FontFamily.headingBold,
    fontSize: 24,
    color: Colors.gray3,
    lineHeight: 24,
    paddingTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 40,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  logoIcon: { width: 20, height: 20, backgroundColor: Colors.navy, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: FontFamily.headingBold, fontSize: FontSize.xl, color: Colors.navy },
  version: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray4, marginBottom: 2 },
  copy: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.gray3 },
});

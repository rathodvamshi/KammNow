import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, Shadow } from '../../theme';
import { useUIStore } from '../../store/uiStore';

interface TopBarProps {
  showPostJob?: boolean;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
}

const LANGUAGES = [
  { key: 'en' as const, label: 'English', flag: '🇬🇧' },
  { key: 'hi' as const, label: 'हिन्दी', flag: '🇮🇳' },
  { key: 'te' as const, label: 'తెలుగు', flag: '🏔️' },
];

export const TopBar: React.FC<TopBarProps> = ({
  showPostJob = true,
  title,
  showBack = false,
  onBack,
  showLogo = true,
}) => {
  const { language, setLanguage } = useUIStore();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.key === language);

  return (
    <>
      <View style={styles.topbar}>
        {/* Left: back or logo */}
        {showBack ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack ?? (() => router.back())}
          >
            <Text style={styles.backText}>← {title ?? 'Back'}</Text>
          </TouchableOpacity>
        ) : showLogo ? (
          <TouchableOpacity
            style={styles.logoMark}
            onPress={() => router.push('/(tabs)')}
          >
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconEmoji}>💼</Text>
            </View>
            <Text style={styles.logoText}>
              Kaam<Text style={{ color: Colors.saffron }}>Now</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {/* Right: lang + post */}
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => setShowLangMenu(true)}
          >
            <Text style={styles.langBtnText}>
              🌐 {currentLang?.key?.toUpperCase() ?? 'EN'} ▾
            </Text>
          </TouchableOpacity>
          {showPostJob && (
            <TouchableOpacity
              style={styles.postBtn}
              onPress={() => router.push('/job/post')}
            >
              <Text style={styles.postBtnText}>➕ Post Job</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Language dropdown modal */}
      <Modal
        visible={showLangMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLangMenu(false)}>
          <View style={styles.langDropdown}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[styles.langItem, lang.key === language && styles.langItemActive]}
                onPress={() => {
                  setLanguage(lang.key);
                  setShowLangMenu(false);
                }}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langItemText, lang.key === language && styles.langItemTextActive]}>
                  {lang.label}
                </Text>
                {lang.key === language && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.navy,
    borderBottomWidth: 2,
    borderBottomColor: Colors.saffron,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  logoMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    width: 30,
    height: 30,
    backgroundColor: Colors.saffron,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconEmoji: {
    fontSize: 16,
  },
  logoText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['3xl'],
    color: Colors.white,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  langBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  postBtn: {
    backgroundColor: Colors.saffron,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  postBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  langDropdown: {
    position: 'absolute',
    top: 56,
    right: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray2,
    ...Shadow.md,
    overflow: 'hidden',
    width: 160,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
  },
  langItemActive: {
    backgroundColor: Colors.saffronLight,
  },
  langFlag: {
    fontSize: 20,
  },
  langItemText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.ink,
    flex: 1,
  },
  langItemTextActive: {
    color: Colors.saffron,
    fontFamily: FontFamily.bodySemiBold,
  },
  checkmark: {
    color: Colors.saffron,
    fontSize: FontSize.lg,
    fontFamily: FontFamily.headingBold,
  },
});

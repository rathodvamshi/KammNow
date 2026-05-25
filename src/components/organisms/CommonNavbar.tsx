import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize } from '../../theme';
import { useUIStore } from '../../store/uiStore';

const LANGUAGES = [
  { key: 'en' as const, label: 'English', flag: '🇬🇧', native: 'EN' },
  { key: 'hi' as const, label: 'हिन्दी', flag: '🇮🇳', native: 'HI' },
  { key: 'te' as const, label: 'తెలుగు', flag: '🏔️', native: 'TE' },
];

export const CommonNavbar: React.FC = () => {
  const { language, setLanguage } = useUIStore();
  const [showLangModal, setShowLangModal] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.key === language) || LANGUAGES[0];

  return (
    <>
      <View style={styles.headerTopRowPremium}>
        {/* Left: App Logo + Title */}
        <TouchableOpacity style={styles.brandContainer} activeOpacity={0.8} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.brandText}>Kaam<Text style={styles.brandAccent}>Now</Text></Text>
          <View style={styles.brandIconPulse}>
            <Ionicons name="briefcase" size={10} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* Right: Controls Row */}
        <View style={styles.controlsRowRight}>
          <TouchableOpacity style={styles.langBtnPremium} activeOpacity={0.8} onPress={() => setShowLangModal(true)}>
            <Ionicons name="globe-outline" size={13} color="rgba(255, 255, 255, 0.85)" style={{ marginRight: 2 }} />
            <Text style={styles.langBtnTextPremium}>{currentLang.native}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationBtnPremium}
            activeOpacity={0.8}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={15} color="rgba(255, 255, 255, 0.9)" />
            <View style={styles.notificationBadgeDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Modal */}
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <Pressable style={styles.langModalOverlay} onPress={() => setShowLangModal(false)}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>Select Language</Text>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langOption, language === l.key && styles.langOptionActive]}
                onPress={() => {
                  setLanguage(l.key);
                  setShowLangModal(false);
                }}
              >
                <Text style={styles.langOptionFlag}>{l.flag}</Text>
                <Text style={[styles.langOptionText, language === l.key && styles.langOptionTextActive]}>
                  {l.label}
                </Text>
                {language === l.key && <Ionicons name="checkmark-circle" size={20} color={Colors.saffron} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerTopRowPremium: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
    marginTop: 2,
    marginBottom: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Colors.saffron,
  },
  brandIconPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    boxShadow: "0px 0px 12px rgba(255,107,0,0.6)",
  },
  controlsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Equal spacing between lang and notif
  },
  langBtnPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    height: 32, // Same height as notification
    justifyContent: 'center',
  },
  langBtnTextPremium: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  notificationBtnPremium: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.red,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  langModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  langModalTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    marginBottom: 20,
    textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.gray1,
  },
  langOptionActive: {
    backgroundColor: '#FFF5EB',
    borderColor: Colors.saffron,
    borderWidth: 1,
  },
  langOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langOptionText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
    flex: 1,
  },
  langOptionTextActive: {
    color: Colors.saffron,
  },
});

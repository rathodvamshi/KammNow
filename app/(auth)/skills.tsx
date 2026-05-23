import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontFamily } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

const SKILLS = [
  {
    id: '1',
    name: 'Delivery',
    icon: 'bicycle-outline',
    earnings: '₹600–900/day',
    color: '#FF6B00',
    bgColor: 'rgba(255,107,0,0.15)',
    emoji: '🚴',
  },
  {
    id: '2',
    name: 'Driving',
    icon: 'car-outline',
    earnings: '₹700–1100/day',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.15)',
    emoji: '🚗',
  },
  {
    id: '3',
    name: 'Warehousing',
    icon: 'cube-outline',
    earnings: '₹500–800/day',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.15)',
    emoji: '📦',
  },
  {
    id: '4',
    name: 'Waitstaff',
    icon: 'restaurant-outline',
    earnings: '₹450–700/day',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.15)',
    emoji: '🍽️',
  },
  {
    id: '5',
    name: 'Retail',
    icon: 'storefront-outline',
    earnings: '₹400–650/day',
    color: '#EC4899',
    bgColor: 'rgba(236,72,153,0.15)',
    emoji: '🛍️',
  },
  {
    id: '6',
    name: 'Hospitality',
    icon: 'bed-outline',
    earnings: '₹500–900/day',
    color: '#14B8A6',
    bgColor: 'rgba(20,184,166,0.15)',
    emoji: '🏨',
  },
  {
    id: '7',
    name: 'Construction',
    icon: 'hammer-outline',
    earnings: '₹600–1000/day',
    color: '#F97316',
    bgColor: 'rgba(249,115,22,0.15)',
    emoji: '🏗️',
  },
  {
    id: '8',
    name: 'Cleaning',
    icon: 'water-outline',
    earnings: '₹350–550/day',
    color: '#06B6D4',
    bgColor: 'rgba(6,182,212,0.15)',
    emoji: '🧹',
  },
  {
    id: '9',
    name: 'Cooking',
    icon: 'fast-food-outline',
    earnings: '₹550–850/day',
    color: '#22C55E',
    bgColor: 'rgba(34,197,94,0.15)',
    emoji: '🍳',
  },
];

function SkillCard({
  skill,
  isSelected,
  isDisabled,
  onToggle,
  index,
}: {
  skill: typeof SKILLS[0];
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (isDisabled && !isSelected) return;
    scale.value = withSpring(0.95, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 8 });
    });
    onToggle();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400).springify()}
      style={[styles.cardWrapper, cardStyle]}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.skillCard,
          isSelected && styles.skillCardSelected,
          isDisabled && !isSelected && styles.skillCardDisabled,
        ]}
      >
        {/* Selected overlay */}
        {isSelected && (
          <View
            style={[
              styles.selectedOverlay,
              { backgroundColor: skill.bgColor },
            ]}
          />
        )}

        {/* Check badge */}
        {isSelected && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={18} color={skill.color} />
          </Animated.View>
        )}

        {/* Icon */}
        <View style={[styles.skillIconWrap, isSelected ? { backgroundColor: skill.bgColor } : {}]}>
          <Text style={styles.skillEmoji}>{skill.emoji}</Text>
        </View>

        {/* Text */}
        <Text style={[styles.skillName, isSelected && { color: skill.color }]}>
          {skill.name}
        </Text>
        <Text style={[styles.skillEarnings, isSelected && { color: skill.color, opacity: 0.8 }]}>
          {skill.earnings}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SkillsSelectionScreen() {
  const { user, updateUser } = useAuthStore();
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user?.skills || []);

  const MAX_SKILLS = 3;

  const toggleSkill = (id: string) => {
    if (selectedSkills.includes(id)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== id));
    } else if (selectedSkills.length < MAX_SKILLS) {
      setSelectedSkills([...selectedSkills, id]);
    }
  };

  const handleContinue = () => {
    updateUser({ skills: selectedSkills });
    router.replace('/location/permission');
  };

  const selectedNames = selectedSkills
    .map((id) => SKILLS.find((s) => s.id === id)?.name)
    .filter(Boolean);

  return (
    <View style={styles.container}>
      {/* Blurred background */}
      {Platform.OS === 'web' ? (
        <div style={styles.webBlur as any} />
      ) : (
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
      )}

      {/* Centered Modal Content */}
      <View style={styles.modalContainer}>
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.modalCard}>
          <LinearGradient
            colors={['#0A0F1E', '#121A2F']}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.headerTitle}>What kind of{'\n'}work do you do?</Text>
                </View>
                {/* Count badge */}
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{selectedSkills.length}</Text>
                  <Text style={styles.countMax}>/{MAX_SKILLS}</Text>
                </View>
              </View>
              <Text style={styles.headerSubtitle}>
                Select up to {MAX_SKILLS} skills to find the best matching jobs
              </Text>

              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${(selectedSkills.length / MAX_SKILLS) * 100}%` },
                  ]}
                />
              </View>
            </View>

            {/* Skills Grid */}
            <ScrollView
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              bounces={false}
            >
              {Array.from({ length: Math.ceil(SKILLS.length / 2) }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {SKILLS.slice(rowIdx * 2, rowIdx * 2 + 2).map((skill) => {
                    const isSelected = selectedSkills.includes(skill.id);
                    const isDisabled = selectedSkills.length >= MAX_SKILLS && !isSelected;
                    return (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isSelected={isSelected}
                        isDisabled={isDisabled}
                        onToggle={() => toggleSkill(skill.id)}
                        index={SKILLS.indexOf(skill)}
                      />
                    );
                  })}
                  {/* Fill last row if odd */}
                  {SKILLS.slice(rowIdx * 2, rowIdx * 2 + 2).length === 1 && (
                    <View style={styles.cardWrapper} />
                  )}
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Sticky Footer */}
            <View style={styles.footer}>
              {/* Selected tags */}
              {selectedNames.length > 0 && (
                <View style={styles.selectedTagsRow}>
                  {selectedNames.map((name, i) => (
                    <View key={i} style={styles.selectedTag}>
                      <Text style={styles.selectedTagText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={handleContinue}
                disabled={selectedSkills.length === 0}
                style={({ pressed }) => [
                  styles.continueBtn,
                  pressed && selectedSkills.length > 0 && { opacity: 0.9 },
                ]}
              >
                <LinearGradient
                  colors={
                    selectedSkills.length > 0
                      ? [Colors.saffron, '#FF5500']
                      : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']
                  }
                  style={styles.continueBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {selectedSkills.length === 0 ? (
                    <Text style={[styles.continueBtnText, styles.continueBtnTextInactive]}>
                      Select at least 1 skill
                    </Text>
                  ) : (
                    <View style={styles.btnRow}>
                      <Text style={styles.continueBtnText}>
                        Find {selectedSkills.length} Category{selectedSkills.length > 1 ? ' Jobs' : ' Jobs'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const CARD_SIZE = (width - 48 - 12) / 2; // 2 columns, 24px side padding each, 12px gap

const styles = StyleSheet.create({
  container: { flex: 1 },
  webBlur: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  } as any,
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: Dimensions.get('window').height * 0.85,
    borderRadius: 32,
    overflow: 'hidden',
    boxShadow: "0px 16px 48px rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardGradient: {
    flex: 1,
    width: '100%',
  },

  // ── Header ──────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  countText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.saffron,
  },
  countMax: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: 'rgba(255,107,0,0.5)',
  },
  headerSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
    lineHeight: 20,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.saffron,
    borderRadius: 4,
  },

  // ── Grid ────────────────────────────────────────
  scrollView: { flex: 1 },
  grid: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
  },

  // ── Skill Card ──────────────────────────────────
  skillCard: {
    flex: 1,
    minHeight: 130,
    borderRadius: 22,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  skillCardSelected: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  skillCardDisabled: {
    opacity: 0.4,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  skillIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  skillEmoji: {
    fontSize: 24,
  },
  skillName: {
    fontFamily: FontFamily.headingBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  skillEarnings: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  // ── Footer ──────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(10,15,30,0.6)',
    gap: 12,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectedTag: {
    backgroundColor: 'rgba(255,107,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  selectedTagText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: Colors.saffron,
  },
  continueBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: "0px 8px 32px rgba(255,107,0,0.3)",
  },
  continueBtnGradient: {
    height: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  continueBtnTextInactive: {
    color: 'rgba(255,255,255,0.5)',
  },
});

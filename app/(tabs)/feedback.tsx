import { FlashList } from '@shopify/flash-list';
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeedbackStore } from '../../src/store/feedbackStore';
import { useUIStore } from '../../src/store/uiStore';
import { FeedbackSummaryCard } from '../../src/components/molecules/FeedbackSummaryCard';
import { ReviewCard } from '../../src/components/molecules/ReviewCard';
import { EmptyFeedbackState } from '../../src/components/molecules/EmptyFeedbackState';
import { CommonNavbar } from '../../src/components/organisms/CommonNavbar';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/theme';

const FILTER_OPTIONS = ['All', '5★', '4★', '3★', '2★', '1★'];
type SortOption = 'Newest' | 'Oldest' | 'Highest Rated';

export default function FeedbackScreen() {
  const { feedbacks, incrementHelpful, reportFeedback } = useFeedbackStore();
  const { currentRole } = useUIStore();
  const insets = useSafeAreaInsets();

  // Assuming the logged-in user is 'user1' (seeker)
  const myFeedbacks = feedbacks.filter(f => f.receiverId === 'user1');

  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSort, setActiveSort] = useState<SortOption>('Newest');
  const [showSort, setShowSort] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = [...myFeedbacks];

    // Filter
    if (activeFilter !== 'All') {
      const star = parseInt(activeFilter.charAt(0));
      result = result.filter(f => f.rating === star);
    }

    // Sort
    result.sort((a, b) => {
      if (activeSort === 'Highest Rated') {
        return b.rating - a.rating;
      }
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return activeSort === 'Newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [myFeedbacks, activeFilter, activeSort]);

  const handleHelpful = (id: string) => {
    incrementHelpful(id);
  };

  const handleReport = (id: string) => {
    reportFeedback(id);
  };

  return (
    <View style={styles.screen}>
      

      
      <LinearGradient
        colors={currentRole === 'seeker' ? ['#1E293B', '#0F172A'] : ['#004DEB', '#0039B3']}
        style={[styles.topBarWrap, { paddingTop: Math.max(insets.top, 10) + 4, paddingBottom: 16 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <CommonNavbar />
        <Text style={[styles.pageHeaderTitle, { marginTop: 8 }]}>⭐ Feedback & Reviews</Text>
      </LinearGradient>


      <FlashList estimatedItemSize={100}
        data={filteredAndSorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <FeedbackSummaryCard feedbacks={myFeedbacks} />

            {/* Filters Row */}
            <View style={styles.filtersWrapper}>
              <View style={[styles.filterScroll, { flexDirection: 'row', gap: 4 }]}>
                {FILTER_OPTIONS.map((f) => {
                  const count = f === 'All'
                    ? myFeedbacks.length
                    : myFeedbacks.filter(fb => fb.rating === parseInt(f.charAt(0))).length;

                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setActiveFilter(f)}
                      style={[
                        styles.ratingTab,
                        { flex: 1 },
                        activeFilter === f && styles.ratingTabActive
                      ]}
                    >
                      <Text style={[styles.ratingTabText, activeFilter === f && styles.ratingTabTextActive]}>
                        {f}
                      </Text>
                      {count > 0 && (
                        <View style={[styles.ratingBadge, activeFilter === f && styles.ratingBadgeActive]}>
                          <Text style={[styles.ratingBadgeText, activeFilter === f && styles.ratingBadgeTextActive]}>
                            {count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort Row */}
            <View style={[styles.sortRow, { zIndex: 100 }]}>
              <Text style={styles.sortResultsText}>{filteredAndSorted.length} Reviews</Text>
              
              <View style={{ position: 'relative', zIndex: 100 }}>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
                  <Ionicons name="filter" size={14} color={Colors.ink2} />
                  <Text style={styles.sortBtnText}>{activeSort}</Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.ink2} />
                </TouchableOpacity>

                {showSort && (
                  <Animated.View entering={FadeInUp.duration(200).springify()} style={styles.sortDropdown}>
                    {(['Newest', 'Oldest', 'Highest Rated'] as SortOption[]).map((opt, idx, arr) => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.sortOption,
                          idx !== arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.gray1 }
                        ]}
                        onPress={() => { setActiveSort(opt); setShowSort(false); }}
                      >
                        <Text style={[styles.sortOptionText, activeSort === opt && { color: Colors.saffron, fontFamily: FontFamily.bodySemiBold }]}>{opt}</Text>
                        {activeSort === opt && <Ionicons name="checkmark" size={16} color={Colors.saffron} />}
                      </TouchableOpacity>
                    ))}
                  </Animated.View>
                )}
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay((index ?? 0) * 100).springify()}>
            <ReviewCard
              feedback={item}
              onHelpful={() => handleHelpful(item.id)}
              onReport={() => handleReport(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={<EmptyFeedbackState />}
      />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  topBarWrap: {
    paddingHorizontal: 20,
    paddingTop: 12, 
    paddingBottom: 24, 
    borderBottomLeftRadius: 28, 
    borderBottomRightRadius: 28, 
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: "0px 4px 16px rgba(0,0,0,0.1)",
    marginBottom: 16,
    zIndex: 10,
  },
  pageHeaderTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: 22,
    color: Colors.white,
    marginTop: 8,
    marginBottom: 4,
  },
  listContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  filtersWrapper: {
    marginBottom: Spacing.md,
    marginLeft: -16,
    marginRight: -16,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  ratingTab: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray1,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.gray2,
    gap: 4,
  },
  ratingTabActive: {
    backgroundColor: Colors.saffron,
    borderColor: Colors.saffronDark,
  },
  ratingTabText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.ink2,
  },
  ratingTabTextActive: {
    color: Colors.white,
  },
  ratingBadge: {
    backgroundColor: Colors.gray2,
    paddingHorizontal: 4,
    height: 18,
    minWidth: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadgeActive: {
    backgroundColor: Colors.white,
  },
  ratingBadgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 10,
    color: Colors.ink2,
  },
  ratingBadgeTextActive: {
    color: Colors.saffronDark,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    zIndex: 2,
  },
  sortResultsText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  sortBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  sortDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray2,
    width: 170,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sortOptionText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
});

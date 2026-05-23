import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeedbackStore } from '../../src/store/feedbackStore';
import { FeedbackSummaryCard } from '../../src/components/molecules/FeedbackSummaryCard';
import { ReviewCard } from '../../src/components/molecules/ReviewCard';
import { EmptyFeedbackState } from '../../src/components/molecules/EmptyFeedbackState';
import { TopBar } from '../../src/components/organisms/TopBar';
import { BottomNav } from '../../src/components/organisms/BottomNav';
import { CategoryTab } from '../../src/components/atoms/CategoryTab';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/theme';

const FILTER_OPTIONS = ['All', '5★', '4★', '3★', '2★', '1★'];
type SortOption = 'Newest' | 'Oldest' | 'Highest Rated';

export default function FeedbackScreen() {
  const { feedbacks, incrementHelpful, reportFeedback } = useFeedbackStore();

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
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.navy }} />

      <View style={styles.topBarWrap}>
        <TopBar
          title="⭐ Feedback & Reviews"
          showBack={false}
          showPostJob={false}
        />
      </View>

      <FlatList
        data={filteredAndSorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <FeedbackSummaryCard feedbacks={myFeedbacks} />

            {/* Filters Row */}
            <View style={styles.filtersWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {FILTER_OPTIONS.map((f) => {
                  const count = f === 'All'
                    ? myFeedbacks.length
                    : myFeedbacks.filter(fb => fb.rating === parseInt(f.charAt(0))).length;

                  return (
                    <CategoryTab
                      key={f}
                      label={f}
                      count={count}
                      iconName={f === 'All' ? 'list-outline' : 'star'}
                      isActive={activeFilter === f}
                      onPress={() => setActiveFilter(f)}
                    />
                  );
                })}
              </ScrollView>
            </View>

            {/* Sort Row */}
            <View style={styles.sortRow}>
              <Text style={styles.sortResultsText}>{filteredAndSorted.length} Reviews</Text>
              <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
                <Text style={styles.sortBtnText}>{activeSort}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.ink2} />
              </TouchableOpacity>
            </View>

            {showSort && (
              <View style={styles.sortDropdown}>
                {(['Newest', 'Oldest', 'Highest Rated'] as SortOption[]).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.sortOption}
                    onPress={() => { setActiveSort(opt); setShowSort(false); }}
                  >
                    <Text style={[styles.sortOptionText, activeSort === opt && { color: Colors.saffron, fontFamily: FontFamily.bodySemiBold }]}>{opt}</Text>
                    {activeSort === opt && <Ionicons name="checkmark" size={16} color={Colors.saffron} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ReviewCard
            feedback={item}
            onHelpful={() => handleHelpful(item.id)}
            onReport={() => handleReport(item.id)}
          />
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
    backgroundColor: Colors.navy,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 24,
    marginBottom: -16,
    zIndex: 10,
  },
  listContent: {
    paddingTop: 32,
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
    top: 290, // Approx beneath sort btn
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray2,
    padding: 8,
    width: 160,
    zIndex: 10,
    shadowColor: Colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sortOptionText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
});

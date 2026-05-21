import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
  ScrollView,
  Animated,
  SectionList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../src/theme';
import { useSearchStore } from '../src/store/searchStore';
import { MOCK_JOBS } from '../src/services/mockData';
import { JobCard } from '../src/components/molecules/JobCard';
import type { Job } from '../src/types';

const SEARCH_PLACEHOLDERS = [
  '"delivery jobs..."',
  '"helper jobs..."',
  '"event jobs..."',
  '"restaurant jobs..."',
];

const AnimatedPlaceholder = ({ active }: { active: boolean }) => {
  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) return;
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        translateY.setValue(20);
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [active, translateY, opacity]);

  if (active) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholderWrap]} pointerEvents="none">
      <Text style={styles.placeholderStatic}>Search </Text>
      <Animated.View style={{ transform: [{ translateY }], opacity, flex: 1 }}>
        <Text style={styles.placeholderAnimated}>
          {SEARCH_PLACEHOLDERS[index]}
        </Text>
      </Animated.View>
    </View>
  );
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Job[]>([]);
  
  const { recentSearches, addSearch, removeSearch, clearSearches } = useSearchStore();
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Simple debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Filter logic
  useEffect(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) {
      setResults([]);
      return;
    }
    
    const filtered = MOCK_JOBS.filter((job) => 
      job.title.toLowerCase().includes(q) ||
      job.location_name.toLowerCase().includes(q) ||
      job.category.toLowerCase().includes(q)
    );
    setResults(filtered);
  }, [debouncedQuery]);

  const handleSubmit = (searchQuery: string) => {
    if (searchQuery.trim().length > 0) {
      addSearch(searchQuery);
    }
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
    handleSubmit(term);
  };

  const renderIdleState = () => {
    const sections: any[] = [];
    if (recentSearches.length > 0) {
      sections.push({
        type: 'recent',
        title: 'Recent Searches',
        data: [recentSearches],
      });
    }
    sections.push({
      type: 'recommended',
      title: 'Recommended Jobs',
      data: MOCK_JOBS.slice(0, 5),
    });

    const renderSectionHeader = ({ section }: any) => {
      if (section.type === 'recent') {
        return (
          <View style={[styles.sectionHeader, styles.stickyHeader]}>
            <Text style={styles.sectionTitleBase}>Recent Searches</Text>
            <TouchableOpacity onPress={clearSearches}>
              <Text style={styles.clearAllText}>Clear</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={[styles.sectionHeader, styles.stickyHeader]}>
          <Text style={styles.sectionTitleBase}>{section.title}</Text>
        </View>
      );
    };

    const renderSectionItem = ({ item, section }: any) => {
      if (section.type === 'recent') {
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsScroll, { marginBottom: 24 }]}>
            {item.map((term: string) => (
              <TouchableOpacity
                key={term}
                style={styles.recentChip}
                onPress={() => handleSelectRecent(term)}
              >
                <Ionicons name="time-outline" size={14} color={Colors.gray4} />
                <Text style={styles.recentChipText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        );
      }
      
      return (
        <View style={styles.recommendedWrap}>
          <JobCard
            job={item}
            onPress={() => {
              handleSubmit(item.title);
              router.push(`/job/${item.id}` as any);
            }}
            onApply={() => {
              handleSubmit(item.title);
              router.push(`/job/${item.id}` as any);
            }}
          />
        </View>
      );
    };

    return (
      <SectionList
        contentContainerStyle={styles.idleContainer}
        sections={sections}
        keyExtractor={(item, index) => (item && item.id ? item.id.toString() : index.toString())}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderSectionItem}
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: Colors.white }} />
      
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color={Colors.ink} />
        </TouchableOpacity>
        
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={20} color={Colors.gray4} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder=""
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={(e) => handleSubmit(e.nativeEvent.text)}
            returnKeyType="search"
            autoCapitalize="none"
          />
          <AnimatedPlaceholder active={query.length > 0} />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray4} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {query.trim().length === 0 ? (
          renderIdleState()
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.resultsList}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                onPress={() => {
                  handleSubmit(item.title);
                  router.push(`/job/${item.id}` as any);
                }}
                onApply={() => {
                  handleSubmit(item.title);
                  router.push(`/job/${item.id}` as any);
                }}
              />
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="search-outline" size={48} color={Colors.saffron} />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySub}>
                  Try adjusting your search for "{query}"
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.gray1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
    ...Shadow.sm,
    zIndex: 20,
  },
  backBtn: {
    padding: 4,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.round,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.ink,
    height: '100%',
    zIndex: 2,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  placeholderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 38,
    zIndex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  placeholderStatic: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.gray4,
  },
  placeholderAnimated: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.gray4,
  },
  clearBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  idleContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  stickyHeader: {
    backgroundColor: Colors.gray1,
    paddingTop: 10,
    paddingBottom: 4,
    marginBottom: 8,
    zIndex: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sectionTitleBase: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  sectionTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  clearAllText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.saffron,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.gray2,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  recentChipText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.ink2,
  },
  recommendedWrap: {
    paddingHorizontal: 0,
  },
  resultsList: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.round,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.lg,
    color: Colors.gray4,
    textAlign: 'center',
  },
});

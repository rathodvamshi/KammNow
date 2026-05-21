import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '../../theme';

export interface CategoryItem {
  id: string;
  name: string;
  iconName: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
  badge?: string;
}

export interface CategorySectionProps {
  categories: CategoryItem[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

const ITEM_WIDTH = 62;
const ITEM_GAP = 10;

const getBadgeBg = (badge: string) => {
  switch (badge) {
    case 'HOT':   return '#E53935';
    case 'FAST':  return '#F57C00';
    case 'NEW':   return '#8E24AA';
    case 'MATCH': return '#2E7D32';
    case 'PRO':   return '#00ACC1';
    case 'DRIVE': return '#1E88E5';
    default:      return '#E53935';
  }
};

// ─── Single category item ─────────────────────────────────────────────────────
const CategoryItemView: React.FC<{
  item: CategoryItem;
  isActive: boolean;
  onPress: () => void;
}> = React.memo(({ item, isActive, onPress }) => {
  const scaleAnim    = useRef(new Animated.Value(isActive ? 1.08 : 1)).current;
  const indicatorAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.08 : 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorAnim, {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.90, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  const combinedScale = Animated.multiply(scaleAnim, pressAnim);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.itemContainer}
    >
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor: item.bgColor, transform: [{ scale: combinedScale }] },
          isActive && styles.circleActive,
        ]}
      >
        <Ionicons name={item.iconName} size={20} color={item.iconColor} />

        {item.badge && (
          <View style={[styles.badge, { backgroundColor: getBadgeBg(item.badge) }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </Animated.View>

      <Text
        style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.name}
      </Text>

      {/* Active underline indicator */}
      <View style={styles.indicatorWrap}>
        <Animated.View
          style={[
            styles.indicator,
            { transform: [{ scaleX: indicatorAnim }], opacity: indicatorAnim },
          ]}
        />
      </View>
    </Pressable>
  );
});

// ─── Category section ─────────────────────────────────────────────────────────
export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const flatListRef   = useRef<FlatList>(null);
  const isMounted     = useRef(false);   // skip scroll on first render
  const prevSelected  = useRef(selectedCategoryId);

  // Scroll to selected item — but ONLY after user interaction, never on mount
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; // skip initial render scroll
    }
    if (selectedCategoryId === prevSelected.current) return;
    prevSelected.current = selectedCategoryId;

    const index = categories.findIndex((c) => c.id === selectedCategoryId);
    if (index <= 0) return; // index 0 (All Gigs) is always visible — no scroll needed

    try {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.4,
      });
    } catch {
      // list not yet measured — ignore
    }
  }, [selectedCategoryId, categories]);

  // Web: redirect vertical wheel scroll to horizontal
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const ref = flatListRef.current as any;
    if (!ref?.getScrollableNode) return;
    const node = ref.getScrollableNode() as HTMLElement | null;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_WIDTH + ITEM_GAP,
    offset: (ITEM_WIDTH + ITEM_GAP) * index,
    index,
  });

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        data={categories}
        extraData={selectedCategoryId}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEnabled
        bounces
        alwaysBounceHorizontal
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <CategoryItemView
            item={item}
            isActive={selectedCategoryId === item.id}
            onPress={() => onSelectCategory(item.id)}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent', // inherits parent — zero color mismatch
    paddingTop: 6,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: ITEM_GAP,
  },

  // Item
  itemContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
  },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    // No border at all — background color provides the shape
    // Soft shadow only, no elevation box effect on Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 0, // 0 = no Android card border artifact
    ...Platform.select({
      web: { transition: 'box-shadow 0.18s ease' },
    }),
  },
  circleActive: {
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 0,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.white,
    zIndex: 10,
  },
  badgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 6,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },

  // Label
  label: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 12,
    height: 24,
    paddingHorizontal: 2,
  },
  labelInactive: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.ink2,
  },
  labelActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.saffronDark,
  },

  // Active indicator dot/line
  indicatorWrap: {
    width: 16,
    height: 2,
    marginTop: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
    backgroundColor: Colors.saffron,
  },
});

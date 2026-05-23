import React, { useEffect, useRef, useCallback } from 'react';
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

const AnimatedFlatList = Animated.FlatList || Animated.createAnimatedComponent(FlatList);

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
  isCompact?: boolean;
  scrollY?: Animated.Value;
  stickyHeaderY?: number;
  /** Pinned overlay mode — static layout, no horizontal auto-scroll on select */
  freezeLayout?: boolean;
}

const ITEM_WIDTH = 64;
const ITEM_GAP = 8;
const CIRCLE_SIZE = 42;
const ICON_SLOT_SIZE = 50;
const ACTIVE_SCALE = 1.06;
/** Reserved height — must stay constant so sticky header never jumps on category change */
const CATEGORY_SECTION_HEIGHT = 74;

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
  onPress: (id: string) => void;
  isCompact?: boolean;
  scrollY?: Animated.Value;
  stickyHeaderY?: number;
}> = React.memo(({ item, isActive, onPress, isCompact, scrollY, stickyHeaderY }) => {
  const scaleAnim    = useRef(new Animated.Value(isActive ? ACTIVE_SCALE : 1)).current;
  const indicatorAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressAnim    = useRef(new Animated.Value(1)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const breatheLoop  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // 1. Core scale and indicator animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? ACTIVE_SCALE : 1,
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

    // 2. Stop any existing loop first
    if (breatheLoop.current) {
      breatheLoop.current.stop();
      breatheLoop.current = null;
    }

    if (isActive) {
      Animated.sequence([
        Animated.spring(pulseAnim, {
          toValue: 0.94,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1.0,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate back to 1.0
      Animated.spring(pulseAnim, {
        toValue: 1.0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (breatheLoop.current) {
        breatheLoop.current.stop();
      }
    };
  }, [isActive]);

  const handlePressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.90, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  // Scroll interpolation ranges
  const startShrink = stickyHeaderY ? Math.max(0, stickyHeaderY - 80) : 170;
  const endShrink = stickyHeaderY ? Math.max(0, stickyHeaderY) : 250;

  // 1. Smoothly shrink the container width
  const animatedItemWidth = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [ITEM_WIDTH, ITEM_WIDTH, 46],
    extrapolate: 'clamp',
  }) : (isCompact ? 46 : ITEM_WIDTH);

  // 2. Smoothly scale down the circle (and icon inside it)
  const compactCircleScale = 36 / CIRCLE_SIZE;
  const animatedCircleScale = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [1, 1, compactCircleScale],
    extrapolate: 'clamp',
  }) : (isCompact ? compactCircleScale : 1);

  // 3. Fade out the badge before stuck
  const badgeFadeEnd = stickyHeaderY ? Math.max(0, stickyHeaderY - 40) : 210;
  const animatedBadgeOpacity = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, badgeFadeEnd],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  }) : (isCompact ? 0 : 1);

  // 4. Smooth label animations
  const animatedLabelOpacity = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [1, 1, 0.85],
    extrapolate: 'clamp',
  }) : (isCompact ? 0.85 : 1);

  const animatedLabelScale = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [1, 1, 0.9],
    extrapolate: 'clamp',
  }) : (isCompact ? 0.9 : 1);

  const animatedLabelHeight = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [20, 20, 10],
    extrapolate: 'clamp',
  }) : (isCompact ? 10 : 20);

  const animatedLabelMarginTop = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [4, 4, 2],
    extrapolate: 'clamp',
  }) : (isCompact ? 2 : 4);

  // 5. Smooth active indicator width
  const animatedIndicatorWidth = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [16, 16, 12],
    extrapolate: 'clamp',
  }) : (isCompact ? 12 : 16);

  // Multiply scale values safely
  const combinedScale = Animated.multiply(
    Animated.multiply(
      Animated.multiply(scaleAnim, pressAnim),
      animatedCircleScale
    ),
    pulseAnim
  );

  const handlePress = useCallback(() => {
    onPress(item.id);
  }, [item.id, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.itemContainer,
          { width: animatedItemWidth }
        ]}
      >
        <View style={styles.iconSlot}>
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: item.bgColor,
                transform: [{ scale: combinedScale }],
              },
              isActive && styles.circleActive,
            ]}
          >
            <Ionicons name={item.iconName} size={19} color={item.iconColor} />

            {item.badge && (
              <Animated.View style={[styles.badge, { backgroundColor: getBadgeBg(item.badge), opacity: animatedBadgeOpacity }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </View>

        <Animated.Text
          style={[
            styles.label,
            isActive ? styles.labelActive : styles.labelInactive,
            {
              opacity: animatedLabelOpacity,
              height: animatedLabelHeight,
              marginTop: animatedLabelMarginTop,
              transform: [{ scale: animatedLabelScale }],
            }
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.name}
        </Animated.Text>

        {/* Active underline indicator */}
        <Animated.View style={[styles.indicatorWrap, { width: animatedIndicatorWidth }]}>
          <Animated.View
            style={[
              styles.indicator,
              { transform: [{ scaleX: indicatorAnim }], opacity: indicatorAnim },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

// ─── Category section ─────────────────────────────────────────────────────────
export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isCompact = false,
  scrollY,
  stickyHeaderY,
  freezeLayout = false,
}) => {
  const flatListRef   = useRef<FlatList>(null);
  const isMounted     = useRef(false);   // skip scroll on first render
  const prevSelected  = useRef(selectedCategoryId);

  // Scroll to selected item — but ONLY after user interaction, never on mount
  useEffect(() => {
    if (freezeLayout) return;
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
        animated: false,
        viewPosition: 0.4,
      });
    } catch {
      // list not yet measured — ignore
    }
  }, [selectedCategoryId, categories, freezeLayout]);

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

  const startShrink = stickyHeaderY ? Math.max(0, stickyHeaderY - 80) : 170;
  const endShrink = stickyHeaderY ? Math.max(0, stickyHeaderY) : 250;

  const useScrollDrivenLayout = scrollY && !freezeLayout;

  const containerPaddingTop = useScrollDrivenLayout ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [4, 4, 0],
    extrapolate: 'clamp',
  }) : (isCompact ? 0 : 4);

  const listPaddingVertical = useScrollDrivenLayout ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [8, 8, 2],
    extrapolate: 'clamp',
  }) : (isCompact ? 2 : 8);

  return (
    <Animated.View
      style={[
        styles.container,
        (isCompact || freezeLayout) && styles.containerFixedHeight,
        { paddingTop: containerPaddingTop, overflow: 'visible' },
      ]}
    >
      <AnimatedFlatList
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
        contentContainerStyle={[
          styles.listContent,
          { paddingVertical: listPaddingVertical }
        ]}
        renderItem={({ item }) => (
          <CategoryItemView
            item={item}
            isActive={selectedCategoryId === item.id}
            onPress={onSelectCategory}
            isCompact={isCompact || freezeLayout}
            scrollY={freezeLayout ? undefined : scrollY}
            stickyHeaderY={stickyHeaderY}
          />
        )}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent', // inherits parent — zero color mismatch
  },
  containerFixedHeight: {
    minHeight: CATEGORY_SECTION_HEIGHT,
    maxHeight: CATEGORY_SECTION_HEIGHT,
  },
  listContent: {
    paddingHorizontal: 14,
    gap: ITEM_GAP,
    alignItems: 'flex-start',
  },

  // Item
  itemContainer: {
    alignItems: 'center',
    overflow: 'visible',
  },
  iconSlot: {
    width: ICON_SLOT_SIZE,
    height: ICON_SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: "0px 1px 8px rgba(0,0,0,0.05)",
    ...Platform.select({
      web: { transition: 'box-shadow 0.18s ease' },
    }),
  },
  circleActive: {
    boxShadow: '0px 2px 12px rgba(255,107,0,0.15)',
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
    lineHeight: 12,
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
    height: 2,
    marginTop: 2,
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

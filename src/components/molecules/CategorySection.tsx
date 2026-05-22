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
  onPress: (id: string) => void;
  isCompact?: boolean;
  scrollY?: Animated.Value;
  stickyHeaderY?: number;
}> = React.memo(({ item, isActive, onPress, isCompact, scrollY, stickyHeaderY }) => {
  const scaleAnim    = useRef(new Animated.Value(isActive ? 1.08 : 1)).current;
  const indicatorAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressAnim    = useRef(new Animated.Value(1)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const breatheLoop  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // 1. Core scale and indicator animation
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

    // 2. Stop any existing loop first
    if (breatheLoop.current) {
      breatheLoop.current.stop();
      breatheLoop.current = null;
    }

    if (isActive) {
      // Entrance bounce animation
      Animated.sequence([
        Animated.spring(pulseAnim, {
          toValue: 0.85,
          friction: 6,
          tension: 85,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1.15,
          friction: 4,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1.0,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Continuous breathing loop (gentle scaling)
        if (isActive) {
          breatheLoop.current = Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.06,
                duration: 1200,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1.0,
                duration: 1200,
                useNativeDriver: true,
              }),
            ])
          );
          breatheLoop.current.start();
        }
      });
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
    outputRange: [62, 62, 48],
    extrapolate: 'clamp',
  }) : (isCompact ? 48 : 62);

  // 2. Smoothly scale down the circle (and icon inside it)
  const animatedCircleScale = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [1, 1, 32 / 46],
    extrapolate: 'clamp',
  }) : (isCompact ? 32 / 46 : 1);

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
    outputRange: [24, 24, 10],
    extrapolate: 'clamp',
  }) : (isCompact ? 10 : 24);

  const animatedLabelMarginTop = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [5, 5, 2],
    extrapolate: 'clamp',
  }) : (isCompact ? 2 : 5);

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
          {/* Always render icon at size 20, visual scale handles size transition */}
          <Ionicons name={item.iconName} size={20} color={item.iconColor} />

          {item.badge && (
            <Animated.View style={[styles.badge, { backgroundColor: getBadgeBg(item.badge), opacity: animatedBadgeOpacity }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </Animated.View>
          )}
        </Animated.View>

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

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: (isCompact ? 48 : ITEM_WIDTH) + ITEM_GAP,
    offset: ((isCompact ? 48 : ITEM_WIDTH) + ITEM_GAP) * index,
    index,
  }), [isCompact]);

  const startShrink = stickyHeaderY ? Math.max(0, stickyHeaderY - 80) : 170;
  const endShrink = stickyHeaderY ? Math.max(0, stickyHeaderY) : 250;

  const containerPaddingTop = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [6, 6, 2],
    extrapolate: 'clamp',
  }) : (isCompact ? 2 : 6);

  const listPaddingVertical = scrollY ? scrollY.interpolate({
    inputRange: [0, startShrink, endShrink],
    outputRange: [10, 10, 4],
    extrapolate: 'clamp',
  }) : (isCompact ? 4 : 10);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: containerPaddingTop }
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
        getItemLayout={getItemLayout}
        contentContainerStyle={[
          styles.listContent,
          { paddingVertical: listPaddingVertical }
        ]}
        renderItem={({ item }) => (
          <CategoryItemView
            item={item}
            isActive={selectedCategoryId === item.id}
            onPress={onSelectCategory}
            isCompact={isCompact}
            scrollY={scrollY}
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
  listContent: {
    paddingHorizontal: 14,
    gap: ITEM_GAP,
  },

  // Item
  itemContainer: {
    alignItems: 'center',
  },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 0,
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

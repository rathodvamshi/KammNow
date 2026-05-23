import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Shadow } from '../../theme';

export interface SortOptionItem {
  id: 'distance' | 'pay' | 'recent';
  name: string;
  iconName: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
}

export interface SortSectionProps {
  options: SortOptionItem[];
  selectedOptionId: 'distance' | 'pay' | 'recent';
  onSelectOption: (id: 'distance' | 'pay' | 'recent') => void;
}

const ITEM_WIDTH = 54;

const SortItemView: React.FC<{
  item: SortOptionItem;
  isActive: boolean;
  onPress: () => void;
}> = ({ item, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.08 : 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(indicatorAnim, {
        toValue: isActive ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.94,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Combine parent press scale with selected spring scale
  const animatedScale = Animated.multiply(scaleAnim, pressAnim);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.itemContainer}
    >
      {/* Circle Icon Container */}
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: item.bgColor,
            transform: [{ scale: animatedScale }],
          },
          isActive && styles.circleActive,
        ]}
      >
        <Ionicons name={item.iconName} size={13} color={item.iconColor} />
      </Animated.View>

      {/* Label Text below Circle */}
      <Text
        style={[
          styles.label,
          isActive ? styles.labelActive : styles.labelInactive,
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>

      {/* Elegant active indicator line */}
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ scaleX: indicatorAnim }],
              opacity: indicatorAnim,
            },
          ]}
        />
      </View>
    </Pressable>
  );
};

export const SortSection: React.FC<SortSectionProps> = ({
  options,
  selectedOptionId,
  onSelectOption,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      <View style={styles.optionsRow}>
        {options.map((item) => (
          <SortItemView
            key={item.id}
            item={item}
            isActive={selectedOptionId === item.id}
            onPress={() => onSelectOption(item.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  sortLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.gray4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
    ...Platform.select({
      web: {
        transition: 'box-shadow 0.2s ease',
      },
    }),
  },
  circleActive: {
    boxShadow: '0px 2px 8px rgba(255,107,0,0.1)',
  },
  label: {
    fontSize: 8.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 9,
    height: 10,
  },
  labelInactive: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.ink2,
  },
  labelActive: {
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.saffronDark,
  },
  indicatorContainer: {
    width: 10,
    height: 1.5,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: '100%',
    height: '100%',
    borderRadius: 0.75,
    backgroundColor: Colors.saffron,
  },
});

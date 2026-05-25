/**
 * FilterBar — Horizontal scrollable filter chips with dropdown panels
 *
 * Layout (inside sticky header, below categories):
 *
 *   [📍 5 km  −  +]  [↕ Near Me ▾]  [⏱ Any Pay ▾]  [✕ Reset]
 *
 * Design:
 * - Chips are pill-shaped, 32px tall, horizontally scrollable
 * - Active (non-default) chips get saffron tint + filled background
 * - Radius stepper is a compact inline control
 * - Dropdown panels are floating cards rendered via Modal
 * - Each option row has icon + label + sublabel + checkmark when selected
 * - "Reset" chip appears only when any filter is non-default
 */

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../theme';
import type { SortOption, PayTypeFilter } from '../../store/filterStore';

// ─── Option definitions ───────────────────────────────────────────────────────

interface OptionDef<T> {
  id: T;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const SORT_OPTIONS: OptionDef<SortOption>[] = [
  {
    id: 'distance',
    label: 'Near Me',
    sublabel: 'Closest jobs first',
    icon: 'navigate',
    iconColor: '#F57C00',
    iconBg: '#FFF3E0',
  },
  {
    id: 'pay',
    label: 'Top Pay',
    sublabel: 'Highest paying first',
    icon: 'cash',
    iconColor: '#00875A',
    iconBg: '#E6F7F1',
  },
  {
    id: 'recent',
    label: 'Newest',
    sublabel: 'Latest posted first',
    icon: 'time',
    iconColor: '#1565C0',
    iconBg: '#E3EEFF',
  },
];

const PAY_TYPE_OPTIONS: OptionDef<PayTypeFilter>[] = [
  {
    id: 'all',
    label: 'Any Pay',
    sublabel: 'All pay types',
    icon: 'layers',
    iconColor: Colors.saffronDark,
    iconBg: Colors.saffronLight,
  },
  {
    id: 'hour',
    label: 'Hourly',
    sublabel: 'Paid per hour',
    icon: 'hourglass',
    iconColor: '#0284C7',
    iconBg: '#F0F9FF',
  },
  {
    id: 'day',
    label: 'Daily',
    sublabel: 'Paid per day',
    icon: 'sunny',
    iconColor: '#00875A',
    iconBg: '#E6F7F1',
  },
  {
    id: 'month',
    label: 'Monthly',
    sublabel: 'Paid per month',
    icon: 'calendar',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
  },
];

// ─── Dropdown option row ──────────────────────────────────────────────────────

interface OptionRowProps<T> {
  option: OptionDef<T>;
  isSelected: boolean;
  onPress: () => void;
}

function OptionRow<T>({ option, isSelected, onPress }: OptionRowProps<T>) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start()
      }
      onPressOut={() =>
        Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()
      }
      accessibilityRole="menuitem"
      accessibilityState={{ selected: isSelected }}
    >
      <Animated.View
        style={[
          styles.optionRow,
          isSelected && styles.optionRowSelected,
          { transform: [{ scale: pressAnim }] },
        ]}
      >
        {/* Icon circle */}
        <View style={[styles.optionIconCircle, { backgroundColor: option.iconBg }]}>
          <Ionicons name={option.icon} size={15} color={option.iconColor} />
        </View>

        {/* Labels */}
        <View style={styles.optionLabels}>
          <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
            {option.label}
          </Text>
          <Text style={styles.optionSublabel}>{option.sublabel}</Text>
        </View>

        {/* Checkmark */}
        {isSelected && (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Filter chip button ───────────────────────────────────────────────────────

interface FilterChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onPress: () => void;
  chipRef: React.RefObject<View>;
}

const FilterChip: React.FC<FilterChipProps> = ({
  icon,
  label,
  isActive,
  isOpen,
  onPress,
  chipRef,
}) => {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const isHighlighted = isActive || isOpen;

  return (
    <Pressable
      ref={chipRef as any}
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(pressAnim, { toValue: 0.93, useNativeDriver: true, friction: 8 }).start()
      }
      onPressOut={() =>
        Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()
      }
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityState={{ expanded: isOpen }}
    >
      <Animated.View
        style={[
          styles.chip,
          isHighlighted && styles.chipActive,
          { transform: [{ scale: pressAnim }] },
        ]}
      >
        <Ionicons
          name={icon}
          size={13}
          color={isHighlighted ? Colors.saffron : Colors.gray4}
        />
        <Text style={[styles.chipText, isHighlighted && styles.chipTextActive]}>
          {label}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons
            name="chevron-down"
            size={11}
            color={isHighlighted ? Colors.saffron : Colors.gray4}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Dropdown panel (rendered in Modal) ──────────────────────────────────────

interface DropdownPanelProps<T> {
  visible: boolean;
  anchorLayout: { x: number; y: number; width: number; height: number } | null;
  options: OptionDef<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  onClose: () => void;
  title: string;
  accentColor?: string;
}

function DropdownPanel<T extends string>({
  visible,
  anchorLayout,
  options,
  selectedId,
  onSelect,
  onClose,
  title,
  accentColor = Colors.saffron,
}: DropdownPanelProps<T>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(-10);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 10,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !anchorLayout) return null;

  const PANEL_WIDTH = 220;
  const dropLeft = anchorLayout.x + anchorLayout.width - PANEL_WIDTH;
  const dropTop = anchorLayout.y + anchorLayout.height + 8;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close filter dropdown">
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.panel,
          {
            left: Math.max(8, dropLeft),
            top: dropTop,
            width: PANEL_WIDTH,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
          { pointerEvents: 'box-none' },
        ]}
      >
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <View style={[styles.panelTitleDot, { backgroundColor: accentColor }]} />
          <Text style={styles.panelTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.panelCloseBtn}>
              <Ionicons name="close" size={13} color={Colors.gray4} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.panelDivider} />

        {/* Options */}
        <View style={styles.panelOptions}>
          {options.map((opt) => (
            <OptionRow
              key={String(opt.id)}
              option={opt}
              isSelected={selectedId === opt.id}
              onPress={() => {
                onSelect(opt.id);
                onClose();
              }}
            />
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Radius stepper chip ──────────────────────────────────────────────────────

interface RadiusChipProps {
  radiusKm: number;
  onDecrement: () => void;
  onIncrement: () => void;
  minKm?: number;
  maxKm?: number;
}

const RadiusChip: React.FC<RadiusChipProps> = ({
  radiusKm,
  onDecrement,
  onIncrement,
  minKm = 1,
  maxKm = 20,
}) => {
  const canDecrement = radiusKm > minKm;
  const canIncrement = radiusKm < maxKm;

  return (
    <View style={styles.radiusChip}>
      <Ionicons name="location" size={12} color={Colors.saffron} />
      <Text style={styles.radiusLabel}>{radiusKm} km</Text>
      <View style={styles.radiusDivider} />
      <TouchableOpacity
        onPress={onDecrement}
        disabled={!canDecrement}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel="Decrease radius"
      >
        <Ionicons
          name="remove"
          size={13}
          color={canDecrement ? Colors.saffron : Colors.gray3}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onIncrement}
        disabled={!canIncrement}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        accessibilityLabel="Increase radius"
      >
        <Ionicons
          name="add"
          size={13}
          color={canIncrement ? Colors.saffron : Colors.gray3}
        />
      </TouchableOpacity>
    </View>
  );
};

// ─── Public FilterBar component ───────────────────────────────────────────────

export interface FilterBarProps {
  sortBy: SortOption;
  payTypeFilter: PayTypeFilter;
  onSortChange: (sort: SortOption) => void;
  onPayTypeChange: (type: PayTypeFilter) => void;
  /** Radius stepper — pass these to embed the radius control inside FilterBar */
  radiusKm?: number;
  onRadiusDecrement?: () => void;
  onRadiusIncrement?: () => void;
  minRadiusKm?: number;
  maxRadiusKm?: number;
  /** Called when the reset chip is tapped */
  onReset?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  sortBy,
  payTypeFilter,
  onSortChange,
  onPayTypeChange,
  radiusKm,
  onRadiusDecrement,
  onRadiusIncrement,
  minRadiusKm = 1,
  maxRadiusKm = 20,
  onReset,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const sortChipRef = useRef<View>(null);
  const payChipRef = useRef<View>(null);

  const [sortLayout, setSortLayout] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);
  const [payLayout, setPayLayout] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  const measureAndOpen = useCallback(
    (
      ref: React.RefObject<View>,
      setLayout: (l: { x: number; y: number; width: number; height: number }) => void,
      setOpen: (v: boolean) => void,
      closeOther: () => void,
    ) => {
      closeOther();
      ref.current?.measureInWindow((x, y, width, height) => {
        setLayout({ x, y, width, height });
        setOpen(true);
      });
    },
    [],
  );

  const activeSortOption = SORT_OPTIONS.find((o) => o.id === sortBy)!;
  const activePayOption = PAY_TYPE_OPTIONS.find((o) => o.id === payTypeFilter)!;

  const sortIsNonDefault = sortBy !== 'distance';
  const payIsNonDefault = payTypeFilter !== 'all';
  const hasActiveFilters = sortIsNonDefault || payIsNonDefault;

  const showRadius = radiusKm !== undefined && onRadiusDecrement && onRadiusIncrement;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {/* Radius stepper chip */}
        {showRadius && (
          <RadiusChip
            radiusKm={radiusKm!}
            onDecrement={onRadiusDecrement!}
            onIncrement={onRadiusIncrement!}
            minKm={minRadiusKm}
            maxKm={maxRadiusKm}
          />
        )}

        {/* Separator */}
        {showRadius && <View style={styles.chipSeparator} />}

        {/* Sort chip */}
        <FilterChip
          chipRef={sortChipRef}
          icon={activeSortOption.icon}
          label={activeSortOption.label}
          isActive={sortIsNonDefault}
          isOpen={sortOpen}
          onPress={() =>
            measureAndOpen(sortChipRef, setSortLayout, setSortOpen, () => setPayOpen(false))
          }
        />

        {/* Pay type chip */}
        <FilterChip
          chipRef={payChipRef}
          icon={activePayOption.icon}
          label={activePayOption.label}
          isActive={payIsNonDefault}
          isOpen={payOpen}
          onPress={() =>
            measureAndOpen(payChipRef, setPayLayout, setPayOpen, () => setSortOpen(false))
          }
        />

        {/* Reset chip — only when filters are active */}
        {hasActiveFilters && onReset && (
          <ResetChip onPress={onReset} />
        )}
      </ScrollView>

      {/* Sort dropdown panel */}
      <DropdownPanel
        visible={sortOpen}
        anchorLayout={sortLayout}
        options={SORT_OPTIONS}
        selectedId={sortBy}
        onSelect={onSortChange}
        onClose={() => setSortOpen(false)}
        title="Sort by"
        accentColor="#F57C00"
      />

      {/* Pay type dropdown panel */}
      <DropdownPanel
        visible={payOpen}
        anchorLayout={payLayout}
        options={PAY_TYPE_OPTIONS}
        selectedId={payTypeFilter}
        onSelect={onPayTypeChange}
        onClose={() => setPayOpen(false)}
        title="Pay type"
        accentColor={Colors.saffron}
      />
    </View>
  );
};

// ─── Reset chip ───────────────────────────────────────────────────────────────

const ResetChip: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const pressAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(pressAnim, { toValue: 0.9, useNativeDriver: true, friction: 8 }).start()
      }
      onPressOut={() =>
        Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start()
      }
      accessibilityRole="button"
      accessibilityLabel="Reset all filters"
    >
      <Animated.View style={[styles.resetChip, { transform: [{ scale: pressAnim }] }]}>
        <Ionicons name="close-circle" size={13} color={Colors.red} />
        <Text style={styles.resetChipText}>Reset</Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },

  // ── Filter chip ──
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    ...Shadow.xs,
  },
  chipActive: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
  },
  chipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.ink2,
  },
  chipTextActive: {
    color: Colors.saffronDark,
  },

  // ── Radius chip ──
  radiusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
    ...Shadow.xs,
  },
  radiusLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.saffronDark,
    minWidth: 34,
    textAlign: 'center',
  },
  radiusDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.saffron,
    opacity: 0.25,
    marginHorizontal: 2,
  },

  // ── Chip separator ──
  chipSeparator: {
    width: 1,
    height: 20,
    backgroundColor: Colors.gray2,
    marginHorizontal: 2,
  },

  // ── Reset chip ──
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.redLight,
    backgroundColor: Colors.redLight,
  },
  resetChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.red,
  },

  // ── Dropdown panel ──
  panel: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingBottom: 8,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: Colors.gray2,
    zIndex: 9999,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  panelTitleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  panelTitle: {
    flex: 1,
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  panelCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelDivider: {
    height: 1,
    backgroundColor: Colors.gray2,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  panelOptions: {
    paddingTop: 2,
  },

  // ── Option row ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: Radius.sm,
    gap: 10,
  },
  optionRowSelected: {
    backgroundColor: Colors.saffronLight,
  },
  optionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabels: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink,
  },
  optionLabelSelected: {
    color: Colors.saffronDark,
  },
  optionSublabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.gray4,
    marginTop: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

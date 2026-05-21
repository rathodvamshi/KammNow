/**
 * FilterBar — Two compact dropdown buttons (Sort + Pay Type)
 *
 * Layout (inside sticky header, right side of "Jobs Near You" row):
 *
 *   Jobs Near You          [↕ Near Me ▾]  [⏱ Any Pay ▾]
 *
 * On tap each button opens a small dropdown popover just below it
 * with all options listed. Selecting one closes the dropdown.
 *
 * Design:
 * - Buttons are pill-shaped, 28px tall, compact
 * - Active selection shown in button label
 * - Active (non-default) button gets saffron tint
 * - Dropdown is a floating card with shadow, rendered via Modal
 *   so it escapes the sticky header's overflow clip
 * - Each option row has icon + label + checkmark when selected
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
          <Ionicons name={option.icon} size={14} color={option.iconColor} />
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
          <Ionicons name="checkmark-circle" size={18} color={Colors.saffron} />
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Dropdown trigger button ──────────────────────────────────────────────────

interface DropdownButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean; // non-default selection
  isOpen: boolean;
  onPress: () => void;
  buttonRef: React.RefObject<View>;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({
  icon,
  label,
  isActive,
  isOpen,
  onPress,
  buttonRef,
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

  return (
    <Pressable
      ref={buttonRef as any}
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
          styles.dropBtn,
          isActive && styles.dropBtnActive,
          isOpen && styles.dropBtnOpen,
          { transform: [{ scale: pressAnim }] },
        ]}
      >
        <Ionicons
          name={icon}
          size={12}
          color={isActive || isOpen ? Colors.saffron : Colors.gray4}
        />
        <Text style={[styles.dropBtnText, (isActive || isOpen) && styles.dropBtnTextActive]}>
          {label}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons
            name="chevron-down"
            size={10}
            color={isActive || isOpen ? Colors.saffron : Colors.gray4}
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
}

function DropdownPanel<T extends string>({
  visible,
  anchorLayout,
  options,
  selectedId,
  onSelect,
  onClose,
  title,
}: DropdownPanelProps<T>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(-8);
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

  // Position dropdown below the button, right-aligned to button's right edge
  const PANEL_WIDTH = 210;
  const dropLeft = anchorLayout.x + anchorLayout.width - PANEL_WIDTH;
  const dropTop = anchorLayout.y + anchorLayout.height + 6;

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
        ]}
        pointerEvents="box-none"
      >
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={Colors.gray4} />
          </TouchableOpacity>
        </View>
        <View style={styles.panelDivider} />

        {/* Options */}
        {options.map((opt, i) => (
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
      </Animated.View>
    </Modal>
  );
}

// ─── Public FilterBar component ───────────────────────────────────────────────

export interface FilterBarProps {
  sortBy: SortOption;
  payTypeFilter: PayTypeFilter;
  onSortChange: (sort: SortOption) => void;
  onPayTypeChange: (type: PayTypeFilter) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  sortBy,
  payTypeFilter,
  onSortChange,
  onPayTypeChange,
}) => {
  const [sortOpen, setSortOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const sortBtnRef = useRef<View>(null);
  const payBtnRef = useRef<View>(null);

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

  return (
    <View style={styles.container}>
      {/* Sort dropdown */}
      <DropdownButton
        buttonRef={sortBtnRef}
        icon={activeSortOption.icon}
        label={activeSortOption.label}
        isActive={sortIsNonDefault}
        isOpen={sortOpen}
        onPress={() =>
          measureAndOpen(sortBtnRef, setSortLayout, setSortOpen, () => setPayOpen(false))
        }
      />

      {/* Pay type dropdown */}
      <DropdownButton
        buttonRef={payBtnRef}
        icon={activePayOption.icon}
        label={activePayOption.label}
        isActive={payIsNonDefault}
        isOpen={payOpen}
        onPress={() =>
          measureAndOpen(payBtnRef, setPayLayout, setPayOpen, () => setSortOpen(false))
        }
      />



      {/* Sort dropdown panel */}
      <DropdownPanel
        visible={sortOpen}
        anchorLayout={sortLayout}
        options={SORT_OPTIONS}
        selectedId={sortBy}
        onSelect={onSortChange}
        onClose={() => setSortOpen(false)}
        title="Sort by"
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
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Trigger button ──
  dropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: Radius.round,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  dropBtnActive: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
  },
  dropBtnOpen: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
  },
  dropBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.ink2,
  },
  dropBtnTextActive: {
    color: Colors.saffronDark,
  },

  // ── Dropdown panel ──
  panel: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingBottom: 6,
    ...Shadow.lg,
    // Subtle border
    borderWidth: 1,
    borderColor: Colors.gray2,
    zIndex: 9999,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  panelTitle: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  panelDivider: {
    height: 1,
    backgroundColor: Colors.gray2,
    marginHorizontal: 10,
    marginBottom: 4,
  },

  // ── Option row ──
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 4,
    borderRadius: Radius.sm,
    gap: 10,
  },
  optionRowSelected: {
    backgroundColor: Colors.saffronLight,
  },
  optionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
});

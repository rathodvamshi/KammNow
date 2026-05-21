import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../theme';
import type { SavedAddress, AddressLabel } from '../../store/addressStore';
import { formatSavedAddress } from '../../utils/geocoding';

const LABEL_CONFIG: Record<AddressLabel, { icon: string; color: string; bg: string; text: string }> = {
  home:   { icon: 'home',        color: Colors.saffron, bg: Colors.saffronLight, text: 'Home' },
  work:   { icon: 'briefcase',   color: Colors.navy,    bg: Colors.blueLight,    text: 'Work' },
  family: { icon: 'people',      color: Colors.green,   bg: Colors.greenLight,   text: 'Family' },
  other:  { icon: 'location',    color: Colors.ink2,    bg: Colors.gray2,        text: 'Other' },
};

interface AddressCardProps {
  address: SavedAddress;
  isActive?: boolean;
  distance?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  animationDelay?: number;
  showActions?: boolean;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  isActive = false,
  distance,
  onPress,
  onEdit,
  onDelete,
  onSetDefault,
  animationDelay = 0,
  showActions = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const [showMenu, setShowMenu] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: animationDelay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: animationDelay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, delay: animationDelay, useNativeDriver: true }),
    ]).start();
  }, []);

  const cfg = LABEL_CONFIG[address.label];
  const fullAddr = formatSavedAddress(address);
  const shortAddr = [address.area, address.city].filter(Boolean).join(', ');

  return (
    <Animated.View
      style={[
        styles.card,
        isActive && styles.cardActive,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={() => setShowMenu((v) => !v)}
        style={styles.cardInner}
      >
        {/* Label icon */}
        <View style={[styles.iconBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={[styles.label, isActive && { color: cfg.color }]}>{cfg.text}</Text>
            {address.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={styles.shortAddr} numberOfLines={1}>{address.flatHouse ? `${address.flatHouse}, ` : ''}{shortAddr}</Text>
          {address.notes ? (
            <Text style={styles.notes} numberOfLines={1}>📝 {address.notes}</Text>
          ) : null}
          {distance ? <Text style={styles.distance}>📍 {distance} away</Text> : null}
        </View>

        {/* Actions button */}
        {showActions && (
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowMenu((v) => !v)}>
            <Ionicons name="ellipsis-vertical" size={18} color={Colors.gray4} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Action menu */}
      {showMenu && showActions && (
        <View style={styles.actionMenu}>
          {onEdit && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); onEdit?.(); }}
            >
              <Ionicons name="pencil" size={16} color={Colors.navy} />
              <Text style={styles.menuItemText}>Edit Address</Text>
            </TouchableOpacity>
          )}
          {!address.isDefault && onSetDefault && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); onSetDefault?.(); }}
            >
              <Ionicons name="star" size={16} color={Colors.gold} />
              <Text style={styles.menuItemText}>Set as Default</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => { setShowMenu(false); onDelete?.(); }}
            >
              <Ionicons name="trash" size={16} color={Colors.red} />
              <Text style={[styles.menuItemText, { color: Colors.red }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: 12,
    ...Shadow.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: Colors.saffron,
    ...Shadow.md,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  label: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.ink,
  },
  defaultBadge: {
    backgroundColor: Colors.saffronLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.saffron,
  },
  defaultBadgeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.saffron,
  },
  shortAddr: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink2,
    lineHeight: 20,
  },
  notes: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 3,
  },
  distance: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 3,
  },
  moreBtn: {
    padding: 4,
    marginLeft: 8,
  },
  actionMenu: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
    backgroundColor: Colors.gray1,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
  },
  menuItemText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
});

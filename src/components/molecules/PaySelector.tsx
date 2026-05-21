import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize } from '../../theme';
import type { PayType } from '../../types';

interface PaySelectorProps {
  amount: number;
  type: PayType;
  hours: number;
  onAmountChange: (amount: number) => void;
  onTypeChange: (type: PayType) => void;
  onHoursChange: (hours: number) => void;
}

const PAY_TYPES: { key: PayType; label: string }[] = [
  { key: 'hour', label: 'Hour' },
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' },
];

export const PaySelector: React.FC<PaySelectorProps> = ({
  amount,
  type,
  hours,
  onAmountChange,
  onTypeChange,
  onHoursChange,
}) => {
  const totalPerDay =
    type === 'hour' ? amount * hours :
    type === 'day' ? amount :
    Math.round(amount / 26);

  return (
    <View style={styles.container}>
      {/* Amount + Type row */}
      <View style={styles.row}>
        <View style={styles.amountBox}>
          <Text style={styles.rupee}>₹</Text>
          <Text style={styles.amountText}>{amount}</Text>
        </View>
        <Text style={styles.perLabel}>per</Text>
        <View style={styles.typeRow}>
          {PAY_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.key}
              style={[styles.typeBtn, type === pt.key && styles.typeBtnActive]}
              onPress={() => onTypeChange(pt.key)}
            >
              <Text style={[styles.typeBtnText, type === pt.key && styles.typeBtnTextActive]}>
                {pt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Total calculator */}
      <View style={styles.totalRow}>
        <Text style={styles.hoursLabel}>
          {hours} hrs/day • Total:{' '}
          <Text style={styles.totalAmount}>₹{totalPerDay.toLocaleString('en-IN')}/day</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
    flex: 1,
  },
  rupee: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.saffron,
  },
  amountText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize['2xl'],
    color: Colors.ink,
  },
  perLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  typeBtnActive: {
    borderColor: Colors.saffron,
    backgroundColor: Colors.saffronLight,
  },
  typeBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink2,
  },
  typeBtnTextActive: {
    color: Colors.saffronDark,
  },
  totalRow: {
    backgroundColor: Colors.greenLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hoursLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.base,
    color: Colors.greenDark,
  },
  totalAmount: {
    fontFamily: FontFamily.headingBold,
    color: Colors.green,
  },
});

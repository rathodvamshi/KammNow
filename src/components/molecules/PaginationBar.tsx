import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '../../theme';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Build visible page numbers with ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 6) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countLabel}>
        Showing {from}–{to} of {total} jobs near you
      </Text>
      <View style={styles.pills}>
        {/* Prev */}
        <TouchableOpacity
          style={[styles.pill, styles.navPill, page === 1 && styles.disabled]}
          onPress={() => page > 1 && onPageChange(page - 1)}
          disabled={page === 1}
        >
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>

        {pages.map((p, i) =>
          p === '...' ? (
            <View key={`dots-${i}`} style={styles.dots}>
              <Text style={styles.dotsText}>…</Text>
            </View>
          ) : (
            <TouchableOpacity
              key={p}
              style={[styles.pill, p === page && styles.activePill]}
              onPress={() => onPageChange(p)}
            >
              <Text style={[styles.pillText, p === page && styles.activePillText]}>
                {p}
              </Text>
            </TouchableOpacity>
          )
        )}

        {/* Next */}
        <TouchableOpacity
          style={[styles.pill, styles.navPill, page === totalPages && styles.disabled]}
          onPress={() => page < totalPages && onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  countLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.gray4,
  },
  pills: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pill: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray2,
    backgroundColor: Colors.white,
  },
  activePill: {
    backgroundColor: Colors.saffron,
    borderColor: Colors.saffron,
  },
  navPill: {
    backgroundColor: Colors.gray2,
    borderColor: Colors.gray2,
  },
  pillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.base,
    color: Colors.ink2,
  },
  activePillText: {
    color: Colors.white,
  },
  navText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.lg,
    color: Colors.ink2,
  },
  dots: {
    width: 20,
    alignItems: 'center',
  },
  dotsText: {
    color: Colors.gray4,
    fontSize: FontSize.md,
  },
  disabled: {
    opacity: 0.35,
  },
});

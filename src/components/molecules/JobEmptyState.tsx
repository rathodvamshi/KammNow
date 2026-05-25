import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Shadow } from '../../theme';

interface JobEmptyStateProps {
  onIncreaseRadius: () => void;
  onRefresh: () => void;
  onNotify: () => void;
}

export const JobEmptyState: React.FC<JobEmptyStateProps> = ({
  onIncreaseRadius,
  onRefresh,
  onNotify,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="search-outline" size={48} color={Colors.saffron} />
      </View>
      <Text style={styles.title}>No jobs found nearby</Text>
      <Text style={styles.subtitle}>
        We couldn't find any jobs matching your current filters within this radius.
      </Text>

      <View style={styles.actionsBox}>
        <TouchableOpacity style={styles.actionBtn} onPress={onIncreaseRadius} activeOpacity={0.7}>
          <View style={styles.actionIconWrap}>
            <Ionicons name="expand-outline" size={20} color={Colors.saffron} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Increase radius</Text>
            <Text style={styles.actionSub}>Search in a wider area</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray4} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionBtn} onPress={onRefresh} activeOpacity={0.7}>
          <View style={styles.actionIconWrap}>
            <Ionicons name="refresh-outline" size={20} color={Colors.saffron} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Refresh jobs</Text>
            <Text style={styles.actionSub}>Check for new postings</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray4} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionBtn} onPress={onNotify} activeOpacity={0.7}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#E3EEFF' }]}>
            <Ionicons name="notifications-outline" size={20} color="#1565C0" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Notify me</Text>
            <Text style={styles.actionSub}>When new jobs arrive</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray4} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    marginHorizontal: 16,
    ...Shadow.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadow.sm,
  },
  title: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.xl,
    color: Colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.gray4,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actionsBox: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  actionSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.gray4,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 68,
  },
});

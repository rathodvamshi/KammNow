import React from 'react';
import { Image } from 'expo-image';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../theme';
import type { Feedback } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';
import { router } from 'expo-router';

interface ReviewCardProps {
  feedback: Feedback;
  onHelpful: () => void;
  onReport: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ feedback, onHelpful, onReport }) => {
  const handleProfilePress = () => {
    router.push(`/profile/${feedback.reviewerId}` as any);
  };

  const handleReportPress = () => {
    Alert.alert(
      "Report Review",
      "Do you want to report this review as spam or inappropriate?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Report", style: "destructive", onPress: onReport }
      ]
    );
  };

  return (
    <View style={[styles.card, Shadow.sm]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileRow} onPress={handleProfilePress}>
          <Image 
            source={{ uri: feedback.reviewerAvatar || 'https://via.placeholder.com/150' }} 
            style={styles.avatar} 
          />
          <View style={styles.headerText}>
            <Text style={styles.reviewerName} numberOfLines={1}>{feedback.reviewerName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.roleBadge, feedback.reviewerRole === 'provider' ? styles.providerBadge : styles.seekerBadge]}>
                <Text style={styles.roleBadgeText}>{feedback.reviewerRole.toUpperCase()}</Text>
              </View>
              <Text style={styles.dateText}> • {formatRelativeTime(feedback.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreBtn} onPress={handleReportPress}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.gray4} />
        </TouchableOpacity>
      </View>

      {/* Star Rating */}
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons
            key={star}
            name={star <= feedback.rating ? 'star' : 'star-outline'}
            size={16}
            color={Colors.gold}
          />
        ))}
        {feedback.jobTitle && (
          <Text style={styles.jobTitleText} numberOfLines={1}>
            for <Text style={{ fontFamily: FontFamily.bodySemiBold }}>{feedback.jobTitle}</Text>
          </Text>
        )}
      </View>

      {/* Review Text */}
      <Text style={styles.reviewText}>{feedback.reviewText}</Text>

      {/* Image Gallery */}
      {feedback.reviewImages && feedback.reviewImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {feedback.reviewImages.map((uri, idx) => (
            <Image key={idx} source={{ uri }} style={styles.galleryImage} />
          ))}
        </ScrollView>
      )}

      {/* Tags */}
      {feedback.tags && feedback.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {feedback.tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer / Helpful */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.helpfulBtn} onPress={onHelpful}>
          <Ionicons name="thumbs-up-outline" size={16} color={Colors.ink2} />
          <Text style={styles.helpfulText}>Helpful ({feedback.helpfulCount})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray2,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
    backgroundColor: Colors.gray2,
  },
  headerText: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: FontFamily.headingMedium,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginTop: 2,
  },
  providerBadge: {
    backgroundColor: Colors.blueLight,
  },
  seekerBadge: {
    backgroundColor: Colors.greenLight,
  },
  roleBadgeText: {
    fontFamily: FontFamily.headingBold,
    fontSize: 9,
    color: Colors.ink,
  },
  dateText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.inkSubtle,
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  jobTitleText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.inkSubtle,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  reviewText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink2,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  gallery: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  galleryImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    backgroundColor: Colors.gray1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  tagChip: {
    backgroundColor: Colors.gray1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  tagText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.ink2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: Colors.gray1,
    borderRadius: Radius.round,
  },
  helpfulText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.ink2,
  },
});

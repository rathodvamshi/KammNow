import { safeGoBack } from '../../src/utils/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../src/services/supabase';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Spacing, Radius, Shadow } from '../../src/theme';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { formatRelativeTime } from '../../src/utils/helpers';
import type { Message } from '../../src/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Room ID
  const [inputText, setInputText] = useState('');
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [showRatingLock, setShowRatingLock] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isTyping,
    onlineUsers,
    fetchMessages,
    sendMessage,
    setActiveRoom,
  } = useChatStore();
  const { user } = useAuthStore();

  const roomMessages = messages[id] || [];
  const roomIsTyping = isTyping[id];
  const activeRoom = useChatStore(state => state.rooms.find(r => r.id === id));
  // Determine who the "other" user is based on my role
  const otherUser = activeRoom ? (activeRoom.provider_id === user?.id ? (activeRoom as any).seeker : (activeRoom as any).provider) : null;
  const otherUserId = otherUser?.id || 'unknown';
  const isOtherUserOnline = onlineUsers[otherUserId] ?? false;

  useEffect(() => {
    setActiveRoom(id);
    fetchMessages(id);
    
    // Check if we need to show the rating lock
    const checkRatingLock = async () => {
      if (!activeRoom || !user?.id) return;
      
      const app_id = (activeRoom as any).application_id;
      if (!app_id) return;
      setApplicationId(app_id);

      const { data: appData } = await supabase
        .from('job_applications')
        .select('status, job_id')
        .eq('id', app_id)
        .single();
        
      if (appData?.status === 'completed') {
        const { count } = await supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('from_user_id', user.id)
          .eq('application_id', app_id);
          
        if (count === 0) {
          setShowRatingLock(true);
        }
      }
    };
    checkRatingLock();

    return () => setActiveRoom(null);
  }, [id, activeRoom?.id, user?.id]);

  const handleSend = () => {
    if (!inputText.trim() || !user?.id) return;
    sendMessage(id, user.id, inputText.trim());
    setInputText('');
    Keyboard.dismiss();
  };

  const handleReport = () => {
    setIsOptionsVisible(false);
    // Open report modal or toast
  };

  const handleBlock = () => {
    setIsOptionsVisible(false);
    // Call API to block user
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const showAvatar = !isMe && (index === 0 || roomMessages[index - 1].sender_id !== item.sender_id);

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>P</Text>
              </View>
            ) : <View style={{ width: 28 }} />}
          </View>
        )}
        <View style={isMe ? styles.messageBubbleContainerMe : styles.messageBubbleContainerOther}>
          <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {item.text}
            </Text>
          </View>
          <View style={[styles.messageMeta, isMe && styles.messageMetaMe]}>
            <Text style={styles.messageTime}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons
                name={item.status === 'seen' ? 'checkmark-done' : item.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.status === 'seen' ? Colors.blue : Colors.gray4}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeGoBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.ink} />
        </TouchableOpacity>
        
        <View style={styles.headerProfile}>
          <View style={styles.headerAvatar}>
            <Text style={styles.avatarText}>P</Text>
            {isOtherUserOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUser?.name || 'Loading...'}</Text>
            <Text style={styles.headerStatus}>
              {roomIsTyping ? 'Typing...' : isOtherUserOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.callBtn}>
          <Ionicons name="call" size={20} color={Colors.saffron} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.callBtn, { marginLeft: Spacing.sm, backgroundColor: 'transparent' }]} onPress={() => setIsOptionsVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal visible={isOptionsVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsOptionsVisible(false)}>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionRow} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color={Colors.ink} />
              <Text style={styles.optionText}>Report User</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider} />
            <TouchableOpacity style={styles.optionRow} onPress={handleBlock}>
              <Ionicons name="ban-outline" size={20} color={Colors.red} />
              <Text style={[styles.optionText, { color: Colors.red }]}>Block User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={roomMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {roomIsTyping && (
          <View style={styles.typingIndicatorContainer}>
            <Text style={styles.typingText}>Provider is typing...</Text>
          </View>
        )}

        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add" size={24} color={Colors.gray5} />
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.gray4}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray2,
    ...Shadow.xs,
    zIndex: 10,
  },
  backBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.saffronDark,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerInfo: {
    justifyContent: 'center',
  },
  headerName: {
    fontFamily: FontFamily.headingBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
  headerStatus: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.green, // Adjust dynamically if typing
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.saffronLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubbleContainerMe: {
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  messageBubbleContainerOther: {
    alignItems: 'flex-start',
    maxWidth: '80%',
  },
  messageBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  messageBubbleMe: {
    backgroundColor: Colors.saffron,
    borderBottomRightRadius: Radius.xs,
  },
  messageBubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.gray2,
  },
  messageText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  messageTextMe: {
    color: Colors.white,
  },
  messageTextOther: {
    color: Colors.ink,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  messageMetaMe: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.gray4,
  },
  typingIndicatorContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  typingText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.gray4,
    fontStyle: 'italic',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray2,
  },
  attachBtn: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
    marginBottom: 2,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.gray1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 40,
    maxHeight: 120,
    marginRight: Spacing.sm,
  },
  input: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.ink,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsCard: {
    width: 250,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    ...Shadow.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  optionDivider: {
    height: 1,
    backgroundColor: Colors.gray2,
  },
  optionText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.ink,
  },
});

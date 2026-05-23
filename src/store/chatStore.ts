import { create } from 'zustand';
import type { Message } from '../types';

interface ChatRoom {
  id: string;
  application_id: string;
  provider_id: string;
  seeker_id: string;
  created_at: string;
}

interface ChatState {
  rooms: ChatRoom[];
  messages: Record<string, Message[]>; // room_id -> Message[]
  isTyping: Record<string, boolean>; // room_id -> boolean
  onlineUsers: Record<string, boolean>; // user_id -> boolean
  activeRoomId: string | null;

  // Actions
  setActiveRoom: (roomId: string | null) => void;
  fetchRooms: (userId: string) => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, senderId: string, text: string, attachments?: string[]) => Promise<void>;
  setTyping: (roomId: string, isTyping: boolean) => void;
  
  // Mock Socket Actions
  receiveMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'sent' | 'delivered' | 'seen') => void;
  setUserOnlineStatus: (userId: string, isOnline: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  messages: {},
  isTyping: {},
  onlineUsers: {},
  activeRoomId: null,

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  fetchRooms: async (userId) => {
    // Mock fetching rooms
    await new Promise((r) => setTimeout(r, 500));
    set({
      rooms: [
        {
          id: 'room-1',
          application_id: 'app-003',
          provider_id: 'user-003',
          seeker_id: 'user-001',
          created_at: new Date().toISOString(),
        }
      ]
    });
  },

  fetchMessages: async (roomId) => {
    // Mock fetching messages
    await new Promise((r) => setTimeout(r, 500));
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [
          {
            id: `msg-${Date.now() - 60000}`,
            room_id: roomId,
            sender_id: 'user-003',
            text: 'Hello, your application was accepted! When can you start?',
            status: 'seen',
            created_at: new Date(Date.now() - 60000).toISOString(),
          }
        ]
      }
    }));
  },

  sendMessage: async (roomId, senderId, text, attachments) => {
    const tempId = `msg-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: senderId,
      text,
      status: 'sent',
      created_at: new Date().toISOString(),
      attachments,
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), newMsg],
      }
    }));

    // Mock server response
    setTimeout(() => {
      get().updateMessageStatus(tempId, 'delivered');
    }, 1000);

    // Mock auto-reply for demo purposes
    if (senderId === 'user-001') {
      setTimeout(() => {
        get().setTyping(roomId, true);
      }, 1500);

      setTimeout(() => {
        get().setTyping(roomId, false);
        const replyMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          room_id: roomId,
          sender_id: 'user-003', // mock provider
          text: 'Great! Let me know if you need directions.',
          status: 'sent',
          created_at: new Date().toISOString(),
        };
        get().receiveMessage(replyMsg);
      }, 3500);
    }
  },

  setTyping: (roomId, isTyping) => {
    set((state) => ({
      isTyping: {
        ...state.isTyping,
        [roomId]: isTyping
      }
    }));
  },

  receiveMessage: (message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.room_id]: [...(state.messages[message.room_id] || []), message],
      }
    }));
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => {
      const newMessages = { ...state.messages };
      for (const roomId in newMessages) {
        newMessages[roomId] = newMessages[roomId].map(msg => 
          msg.id === messageId ? { ...msg, status } : msg
        );
      }
      return { messages: newMessages };
    });
  },

  setUserOnlineStatus: (userId, isOnline) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: isOnline
      }
    }));
  }
}));

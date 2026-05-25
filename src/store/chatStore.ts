import { create } from 'zustand';
import type { Message } from '../types';
import { supabase } from '../services/supabase';
import { firebaseAuth } from '../services/firebaseAuth';
import { apiFetch } from '../utils/apiClient';

const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  isLoading: boolean;
  error: string | null;
  fetchRooms: (userId: string, role: "seeker" | "provider") => Promise<void>;
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
  isLoading: false,
  error: null,

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  fetchRooms: async (userId: string, role: 'seeker' | 'provider') => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`*, job:jobs(*), seeker:users!seeker_id(*), provider:users!provider_id(*)`)
        .or(`seeker_id.eq.${userId},provider_id.eq.${userId}`);
      
      if (error) throw error;
      set({ rooms: data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMessages: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      set((state) => ({
        messages: { ...state.messages, [roomId]: data || [] },
        isLoading: false
      }));

      // Subscribe to realtime messages
      supabase
        .channel(`room_${roomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
          get().receiveMessage(payload.new as Message);
        })
        .subscribe();
        
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  sendMessage: async (roomId: string, senderId: string, content: string) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const response = await apiFetch(`${getApiUrl()}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ room_id: roomId, message: content })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could show a toast here if rate limited
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

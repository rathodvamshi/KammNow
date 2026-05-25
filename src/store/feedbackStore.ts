import { create } from 'zustand';
import type { Feedback } from '../types';

interface FeedbackState {
  feedbacks: Feedback[];
  isLoading: boolean;
  error: string | null;
  addFeedback: (feedback: Feedback) => void;
  incrementHelpful: (id: string) => void;
  reportFeedback: (id: string) => void;
  getFeedbacksForUser: (userId: string) => Feedback[];
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: [],
  isLoading: false,
  error: null,

  fetchFeedbacks: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Fetch from actual API
      set({ feedbacks: [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addFeedback: (feedback) => {
    set((state) => ({ feedbacks: [feedback, ...state.feedbacks] }));
  },

  incrementHelpful: (id) => {
    set((state) => ({
      feedbacks: state.feedbacks.map(f =>
        f.id === id ? { ...f, helpfulCount: f.helpfulCount + 1 } : f
      )
    }));
  },

  reportFeedback: (id) => {
    // In a real app, send report to backend. Here we mock it.
    
  },

  getFeedbacksForUser: (userId) => {
    return get().feedbacks.filter(f => f.receiverId === userId);
  }
}));

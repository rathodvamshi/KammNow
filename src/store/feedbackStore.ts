import { create } from 'zustand';
import type { Feedback } from '../types';

interface FeedbackState {
  feedbacks: Feedback[];
  isLoading: boolean;
  addFeedback: (feedback: Feedback) => void;
  incrementHelpful: (id: string) => void;
  reportFeedback: (id: string) => void;
  getFeedbacksForUser: (userId: string) => Feedback[];
}

// Mock Data
const MOCK_FEEDBACKS: Feedback[] = [
  {
    id: 'f1',
    rating: 5,
    reviewText: 'Very punctual and completed work properly. Highly recommended!',
    reviewerId: 'p1',
    reviewerName: 'Ramesh Singh',
    reviewerAvatar: 'https://i.pravatar.cc/150?u=ramesh',
    reviewerRole: 'provider',
    receiverId: 'user1',
    jobId: 'j1',
    jobTitle: 'Event Staff - 1 Day',
    reviewImages: ['https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&q=80&w=400'],
    tags: ['Punctual', 'Professional', 'Fast Worker'],
    helpfulCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'f2',
    rating: 4,
    reviewText: 'Good communication and reliable. Did a decent job with the delivery.',
    reviewerId: 'p2',
    reviewerName: 'Swiggy Mart',
    reviewerAvatar: 'https://i.pravatar.cc/150?u=swiggy',
    reviewerRole: 'provider',
    receiverId: 'user1',
    jobTitle: 'Delivery Partner',
    reviewImages: [],
    tags: ['Good Communication', 'Reliable'],
    helpfulCount: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'f3',
    rating: 5,
    reviewText: 'Absolutely fantastic worker. Followed all instructions perfectly.',
    reviewerId: 'p3',
    reviewerName: 'Arjun Reddy',
    reviewerAvatar: 'https://i.pravatar.cc/150?u=arjun',
    reviewerRole: 'provider',
    receiverId: 'user1',
    jobTitle: 'Warehouse Helper',
    reviewImages: [],
    tags: ['Skilled', 'Professional'],
    helpfulCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  }
];

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbacks: MOCK_FEEDBACKS,
  isLoading: false,

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
    console.log(`Reported feedback ${id}`);
  },

  getFeedbacksForUser: (userId) => {
    return get().feedbacks.filter(f => f.receiverId === userId);
  }
}));

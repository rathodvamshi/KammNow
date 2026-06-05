import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { matchingEngine, MatchingParams } from './matchingEngine';
import { firebaseAuth } from './firebaseAuth';

// Base URL — ensure /api prefix is included for all route calls
const BASE_URL = `${(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api`;

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Firebase auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await firebaseAuth.getIdToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Auth not available — skip
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      // Token expired or invalid — clear the real session keys and trigger logout
      try {
        await SecureStore.deleteItemAsync('kn_firebase_uid');
        await SecureStore.deleteItemAsync('kn_user_id');
      } catch {
        // ignore SecureStore errors
      }
      // Trigger auth store logout (clears Zustand state)
      try {
        const { useAuthStore } = await import('../store/authStore');
        await useAuthStore.getState().logout();
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

// Our local fetch wrapper simulating the backend matching engine.
// Later, this can just become a call: return api.post('/jobs/recommend', params).then(res => res.data);
export const fetchRecommendedJobs = async (params: MatchingParams) => {
  return await matchingEngine.getRecommendations(params);
};

export default api;

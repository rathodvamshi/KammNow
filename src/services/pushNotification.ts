import * as Notifications from 'expo-notifications';
import { Platform, NativeModules } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { apiFetch } from '../utils/apiClient';
import { firebaseAuth } from './firebaseAuth';
import { useNotificationStore } from '../store/notificationStore';
import { router } from 'expo-router';

// Only attempt to require messaging if the native module is actually linked
let messaging: any = null;
let isMessagingAvailable = !!NativeModules.RNFBMessagingModule;

if (isMessagingAvailable) {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (e) {
    console.warn('Firebase Messaging JS module failed to load. Push notifications disabled.');
    isMessagingAvailable = false;
  }
} else {
  console.warn('Firebase Messaging native module not found. Push notifications disabled.');
}


if (isMessagingAvailable && messaging) {
  messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
    console.log('Message handled in the background!', remoteMessage);
    // You can handle background data payload here
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permission and return the FCM token.
 */
export async function requestPushPermission(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Use Firebase Messaging to get the FCM token
    // This requires a google-services.json (Android) / GoogleService-Info.plist (iOS)
    if (isMessagingAvailable && messaging) {
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }
      const fcmToken = await messaging().getToken();
      return fcmToken;
    }
    
    return null;
  } catch (err) {
    console.error('Error requesting push permission:', err);
    return null;
  }
}

/**
 * Foreground handler for Firebase messages.
 */
export function setupForegroundHandler() {
  if (!isMessagingAvailable || !messaging) return () => {};
  
  const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
    console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
    
    // Add it directly to our Zustand store so UI updates immediately
    const notif = {
      id: remoteMessage.messageId || Math.random().toString(),
      title: remoteMessage.notification?.title || 'New Notification',
      body: remoteMessage.notification?.body || '',
      type: remoteMessage.data?.type || 'system',
      created_at: new Date().toISOString(),
      is_read: false,
      data: remoteMessage.data,
      user_id: '' // Will be managed by the store/backend
    };
    
    useNotificationStore.getState().addNotification(notif as any);
  });
  return unsubscribe;
}

/**
 * Handle notification taps when app is in background/quit state.
 */
export function setupBackgroundHandler() {
  if (!isMessagingAvailable || !messaging) return;

  // When app is in background and opened via a tap
  messaging().onNotificationOpenedApp((remoteMessage: any) => {
    console.log('Notification caused app to open from background state:', remoteMessage.notification);
    handleNotificationTap(remoteMessage);
  });

  // When app is completely quit and opened via a tap
  messaging().getInitialNotification().then((remoteMessage: any) => {
    if (remoteMessage) {
      console.log('Notification caused app to open from quit state:', remoteMessage.notification);
      handleNotificationTap(remoteMessage);
    }
  });
}

function handleNotificationTap(remoteMessage: any) {
  const type = remoteMessage.data?.type;
  if (type === 'job_alert' && remoteMessage.data?.job_id) {
    // Small delay to ensure router is ready
    setTimeout(() => {
      router.push(`/job/${remoteMessage.data.job_id}`);
    }, 1000);
  } else if (type === 'new_application' && remoteMessage.data?.roomId) {
    setTimeout(() => {
      router.push(`/chat/${remoteMessage.data.roomId}`);
    }, 1000);
  }
}

import { haversineDistance } from '../utils/helpers';

let lastHeartbeatTime = 0;
let lastHeartbeatLat: number | null = null;
let lastHeartbeatLng: number | null = null;

/**
 * Helper to ping the backend heartbeat endpoint with location and FCM token.
 * Throttled: Only sends if moved > 300m or 5 minutes have passed since last ping.
 */
export async function sendHeartbeat(latitude?: number, longitude?: number, fcmToken?: string) {
  try {
    const now = Date.now();
    const timeSinceLast = now - lastHeartbeatTime;

    // Check distance moved if we have valid coordinates
    let movedFarEnough = true; // Default to true if we don't have previous coords
    if (latitude && longitude && lastHeartbeatLat && lastHeartbeatLng) {
      const distanceKm = haversineDistance(latitude, longitude, lastHeartbeatLat, lastHeartbeatLng);
      if (distanceKm < 0.3) { // Less than 300 meters
        movedFarEnough = false;
      }
    }

    // Abort if we haven't moved far enough AND it hasn't been 5 minutes
    if (!movedFarEnough && timeSinceLast < 5 * 60 * 1000) {
      return; 
    }

    const token = await firebaseAuth.getIdToken();
    if (!token) return;

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    
    await apiFetch(`${apiUrl}/api/users/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        fcm_token: fcmToken
      }),
    });

    // Update throttle cache
    lastHeartbeatTime = now;
    if (latitude && longitude) {
      lastHeartbeatLat = latitude;
      lastHeartbeatLng = longitude;
    }
  } catch (err) {
    // Silently fail for background heartbeat
    console.log('Heartbeat failed', err);
  }
}

/**
 * _layout.tsx — Root application layout.
 *
 * Responsibilities:
 * 1. Load fonts (Roboto family)
 * 2. initSession() — fast cold-start restore from SecureStore
 * 3. Subscribe to Firebase onAuthStateChanged (single listener for entire app)
 * 4. On Firebase auth confirmed → fetch Supabase profile → set authStore user
 * 5. On Firebase auth cleared → logout authStore → redirect to phone screen
 */
import { Stack, router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '../src/components/ErrorBoundary/ErrorBoundary';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AppState, AppStateStatus } from 'react-native';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/i18n';
import { useAuthStore } from '../src/store/authStore';
import { firebaseAuth } from '../src/services/firebaseAuth';
import { userService } from '../src/services/userService';
import { requestPushPermission, setupForegroundHandler, setupBackgroundHandler, sendHeartbeat } from '../src/services/pushNotification';
import { useLocationStore } from '../src/store/locationStore';
import { useAddressStore } from '../src/store/addressStore';
import socketClient from '../src/services/socketClient';
import { useRealtimeJobs } from '../src/hooks/useRealtimeJobs';

// Initialize FCM background handler once outside the component
setupBackgroundHandler();

SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});


// Initialize Firebase App Check
// try {
//   const rnfbProvider = new ReactNativeFirebaseAppCheckProvider();
//   rnfbProvider.configure({
//     android: {
//       provider: __DEV__ ? 'debug' : 'playIntegrity',
//       // If debugging App Check, set a specific debugToken here from Firebase console
//       debugToken: 'kaamnow-debug-token'
//     },
//     apple: {
//       provider: __DEV__ ? 'debug' : 'deviceCheck',
//       debugToken: 'kaamnow-debug-token'
//     },
//   });
//   initializeAppCheck(undefined, { provider: rnfbProvider, isTokenAutoRefreshEnabled: true });
// } catch (err) {
//   Sentry.captureMessage(`${'Firebase App Check initialization failed or already initialized.'} ${err}`);
// }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

export default function RootLayout() {
  const { initSession, setUser, logout, setLoading, setFirebaseSession } = useAuthStore();
  const authUnsubscribe = useRef<(() => void) | null>(null);
  const isHandlingAuth = useRef(false);

  const [fontsLoaded] = useFonts({
    Roboto_400Regular: require('../assets/fonts/Roboto_400Regular.ttf'),
    Roboto_500Medium: require('../assets/fonts/Roboto_500Medium.ttf'),
    Roboto_700Bold: require('../assets/fonts/Roboto_700Bold.ttf'),
    Roboto_900Black: require('../assets/fonts/Roboto_900Black.ttf'),
  });

  useEffect(() => {
    const unsubscribeForeground = setupForegroundHandler();
    return () => unsubscribeForeground();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;

    let isMounted = true;

    const bootstrap = async () => {
      try {
        // Step 1: Fast cold-start restore from SecureStore
        await initSession();

        // Step 2: Single auth state check — resolves once, then hands off to background listener
        await new Promise<void>((resolve) => {
          let resolved = false;
          const tempUnsub = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
            tempUnsub(); // unsubscribe immediately — we only need the first event
            if (resolved) return;

            if (!isMounted) {
              resolved = true;
              resolve();
              return;
            }

            try {
              if (firebaseUser) {
                const profile = await userService.getUserByFirebaseUid(firebaseUser.uid);
                if (profile) {
                  await setFirebaseSession(firebaseUser.uid, profile.id);
                  setUser(profile);

                  // Connect Socket.IO after successful login
                  try {
                    const token = await firebaseAuth.getIdToken();
                    if (token && profile.id) {
                      socketClient.connect(token, profile.id);
                    }
                  } catch (socketErr) {
                    console.warn('[Layout] Socket connect error:', socketErr);
                  }

                  useAddressStore.getState().loadFromStorage();

                  const fcmToken = await requestPushPermission();
                  const loc = useLocationStore.getState();
                  await sendHeartbeat(loc.lat ?? undefined, loc.lng ?? undefined, fcmToken ?? undefined);
                } else {
                  // Firebase user exists but no Supabase profile — clear loading
                  setLoading(false);
                }
              } else {
                // No Firebase user — ensure clean logout state
                await logout();
              }
            } catch (error) {
              Sentry.captureException(new Error(`[Layout] Initial Auth fetch error: ${error}`));
              setLoading(false);
            } finally {
              resolved = true;
              resolve();
            }
          });
        });
      } catch (error) {
        Sentry.captureException(new Error(`[Layout] Bootstrap error: ${error}`));
        setLoading(false);
      } finally {
        if (isMounted) {
          await SplashScreen.hideAsync();
        }
      }

      // Step 3: Attach the persistent background listener AFTER bootstrap completes
      // This avoids the race where both fire simultaneously on app start
      authUnsubscribe.current = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
        if (!isMounted || isHandlingAuth.current) return;
        isHandlingAuth.current = true;

        try {
          if (firebaseUser) {
            const profile = await userService.getUserByFirebaseUid(firebaseUser.uid);
            if (profile) {
              await setFirebaseSession(firebaseUser.uid, profile.id);
              setUser(profile);
              useAddressStore.getState().loadFromStorage();

              const fcmToken = await requestPushPermission();
              const loc = useLocationStore.getState();
              await sendHeartbeat(loc.lat ?? undefined, loc.lng ?? undefined, fcmToken ?? undefined);
            } else {
              setLoading(false);
            }
          } else {
            await logout();
            socketClient.disconnect();
          }
        } catch (error) {
          Sentry.captureException(new Error(`[Layout] Background Auth handler error: ${error}`));
          setLoading(false);
        } finally {
          isHandlingAuth.current = false;
        }
      });
    };

    bootstrap();

    return () => {
      isMounted = false;
      authUnsubscribe.current?.();
    };
  }, [fontsLoaded]);

  // Refresh Firebase token when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        // Force token refresh to ensure it's still valid
        const token = await firebaseAuth.getIdToken(true);
        if (!token && firebaseAuth.getCurrentUser() === null) {
          await logout();
        } else if (token) {
          // Geo-Engine Heartbeat on app open
          const loc = useLocationStore.getState();
          await sendHeartbeat(loc.lat ?? undefined, loc.lng ?? undefined);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Mount real-time socket event listeners at root level (single instance)
  useRealtimeJobs();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" options={{ animation: 'fade' }} />
          <Stack.Screen name="job/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="job/post" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen
            name="rating/[applicationId]"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="location" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
          </Stack>
        </QueryClientProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

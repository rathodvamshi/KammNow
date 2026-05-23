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
import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AppState, AppStateStatus } from 'react-native';
import appCheck from '@react-native-firebase/app-check';

import '../src/i18n';
import { useAuthStore } from '../src/store/authStore';
import { firebaseAuth } from '../src/services/firebaseAuth';
import { userService } from '../src/services/userService';

SplashScreen.preventAutoHideAsync();

// Initialize Firebase App Check
try {
  const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
  rnfbProvider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
      // If debugging App Check, set a specific debugToken here from Firebase console
      debugToken: 'kaamnow-debug-token'
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'deviceCheck',
      debugToken: 'kaamnow-debug-token'
    },
  });
  appCheck().initializeAppCheck({ provider: rnfbProvider, isTokenAutoRefreshEnabled: true });
} catch (err) {
  console.warn('Firebase App Check initialization failed or already initialized.', err);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
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
    if (!fontsLoaded) return;

    let isMounted = true;

    const bootstrap = async () => {
      // Step 1: Fast-path restore from SecureStore
      await initSession();

      // Step 2: Subscribe to Firebase auth state (the single source of truth)
      authUnsubscribe.current = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
        if (!isMounted || isHandlingAuth.current) return;
        isHandlingAuth.current = true;

        try {
          if (firebaseUser) {
            // Authenticated — fetch full profile from Supabase
            const profile = await userService.getUserByFirebaseUid(firebaseUser.uid);

            if (profile) {
              // Returning user with complete profile
              await setFirebaseSession(firebaseUser.uid, profile.id);
              setUser(profile);
            } else {
              // Firebase user exists but no Supabase row yet (first OTP verify)
              // Let the verify screen handle createOrGetUser()
              setLoading(false);
            }
          } else {
            // Firebase says not authenticated — clear everything
            await logout();
          }
        } catch (error) {
          console.error('[Layout] Auth state handler error:', error);
          setLoading(false);
        } finally {
          isHandlingAuth.current = false;
        }
      });

      // Step 3: Hide splash screen
      await SplashScreen.hideAsync();
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
        }
      }
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor="#050505" />
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
      </Stack>
    </QueryClientProvider>
  );
}

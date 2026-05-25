import { router } from 'expo-router';

/**
 * Safely goes back in the navigation stack.
 * If no history exists, it redirects to the provided fallback route (defaults to Home).
 */
export const safeGoBack = (fallback: any = '/(tabs)') => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
};

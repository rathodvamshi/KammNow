import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../src/theme';

/**
 * Root entry point.
 * - Always shows splash first (the splash screen handles routing internally).
 * - If the user is already authenticated, splash will redirect to (tabs).
 * - If not authenticated, splash redirects to (auth)/phone.
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    // Minimal loading state while store hydrates
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.saffron} />
      </View>
    );
  }

  if (isAuthenticated) {
    // Returning user — skip auth, go straight to the app
    return <Redirect href="/(tabs)" />;
  } else {
    // New / logged-out user — show the splash then login
    return <Redirect href="/(auth)/splash" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

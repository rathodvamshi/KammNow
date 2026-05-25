import { Stack } from 'expo-router';

export default function LocationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="map-picker" options={{ animation: 'slide_from_right' }} />

      <Stack.Screen name="saved-addresses" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="confirm" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

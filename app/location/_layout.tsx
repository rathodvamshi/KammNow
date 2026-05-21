import { Stack } from 'expo-router';

export default function LocationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="map-picker" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="address-form" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="saved-addresses" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="confirm" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

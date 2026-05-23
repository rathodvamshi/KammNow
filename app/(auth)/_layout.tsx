import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="success" />
      <Stack.Screen name="skills" options={{ presentation: 'transparentModal', animation: 'fade' }} />
    </Stack>
  );
}

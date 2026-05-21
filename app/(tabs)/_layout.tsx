import { Tabs } from 'expo-router';

// Bottom navigation is handled by BottomNav component in each screen
// This layout just provides the tab container without a default tab bar
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="my-jobs" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

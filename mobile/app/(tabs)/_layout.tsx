import { Tabs } from 'expo-router';
import { C } from '../../constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="results" />
      <Tabs.Screen name="chat" />
    </Tabs>
  );
}

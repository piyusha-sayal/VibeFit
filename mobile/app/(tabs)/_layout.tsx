import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar } from '../../components/ds/TabBar';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Five experiences, one route each. scan / results / chat stay as routes so
 * existing links and deep links keep working, but they are reached from Home,
 * Discover and More rather than owning a tab of their own.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Tabs
          screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' }, sceneStyle: { backgroundColor: colors.bg } }}
          tabBar={() => null}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="discover" />
          <Tabs.Screen name="create" />
          <Tabs.Screen name="passport" />
          <Tabs.Screen name="more" />
          <Tabs.Screen name="scan" />
          <Tabs.Screen name="results" />
          <Tabs.Screen name="chat" />
        </Tabs>
        <TabBar />
      </View>
    </SafeAreaProvider>
  );
}

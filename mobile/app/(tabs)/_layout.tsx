import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar } from '../../components/ds/TabBar';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Home, Progress, Analyze (scan), Passport and Profile own the tab bar.
 * discover / create / more / results / chat stay as routes so existing links
 * and deep links keep working; they are reached from the Home tools grid.
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
          <Tabs.Screen name="progress" />
          <Tabs.Screen name="passport" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="discover" />
          <Tabs.Screen name="create" />
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

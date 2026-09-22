import { Stack } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';

export default function AuthLayout() {
  const { colors, reducedMotion } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen
        name="onboarding"
        options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
      />
    </Stack>
  );
}

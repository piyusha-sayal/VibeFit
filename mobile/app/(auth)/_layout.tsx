import { Stack } from 'expo-router';
import { C } from '../../constants/colors';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

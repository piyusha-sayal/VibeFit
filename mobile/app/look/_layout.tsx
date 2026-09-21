import { Stack } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';

export default function LookLayout() {
  const { colors, reducedMotion } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: reducedMotion ? 'none' : 'slide_from_right',
      }}
    />
  );
}

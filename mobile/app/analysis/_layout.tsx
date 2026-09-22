import { Stack } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';

export default function AnalysisLayout() {
  // The background has to come from the theme, not from a constant: a fixed
  // near-black painted behind every analysis screen made light mode look
  // broken between one screen and the next.
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

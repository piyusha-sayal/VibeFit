import { Stack } from 'expo-router';
import { C } from '../../constants/colors';

export default function AnalysisLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}

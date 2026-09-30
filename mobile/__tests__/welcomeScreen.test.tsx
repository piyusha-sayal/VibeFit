import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../components/ds/Logo', () => ({ Logo: () => null }));
jest.mock('../theme/ThemeProvider', () => ({ useTheme: () => ({ reducedMotion: true }) }));
jest.mock('../theme/legacy', () => ({
  useLegacyTheme: () => ({ C: new Proxy({}, { get: () => '#000' }), GRADIENTS: { heroAlt: ['#000', '#111'] } }),
}));
jest.mock('../components/ui/GoldButton', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return {
    GoldButton: ({ label, onPress }: { label: string; onPress: () => void }) =>
      createElement(Text, { onPress }, label),
  };
});

import WelcomeScreen from '../app/(auth)/welcome';

beforeEach(() => {
  mockPush.mockClear();
});

describe('WelcomeScreen', () => {
  it('offers sign up and sign in', () => {
    render(<WelcomeScreen />);
    fireEvent.press(screen.getByText('Create account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
    fireEvent.press(screen.getByText('I already have an account'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });
});

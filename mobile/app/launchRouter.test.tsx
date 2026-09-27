/**
 * The launch router's order after a sign-in: biometric lock, then 18+, then
 * onboarding, then home. Every sign-in now lands here, so this order is what
 * stops a fresh account reaching onboarding or home without confirming 18+.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

type State = Record<string, unknown>;
const mockState: Record<'auth' | 'lock' | 'onboarding' | 'eligibility', State> = {
  auth: {}, lock: {}, onboarding: {}, eligibility: {},
};
/** A zustand-style hook reading this test's state; hoisted so mock factories can use it. */
function mockStore(key: keyof typeof mockState) {
  return (selector: (s: State) => unknown) => selector(mockState[key]);
}

/** A stand-in component that renders its label, built inside each mock factory. */
function mockLabel(label: string) {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text: T } = jest.requireActual<typeof import('react-native')>('react-native');
  return createElement(T, null, label);
}

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => mockLabel(`redirect:${href}`),
}));
jest.mock('../store/authStore', () => ({ useAuthStore: mockStore('auth') }));
jest.mock('../store/lockStore', () => ({ useLockStore: mockStore('lock') }));
jest.mock('../store/onboardingStore', () => ({ useOnboardingStore: mockStore('onboarding') }));
jest.mock('../store/eligibilityStore', () => ({ useEligibilityStore: mockStore('eligibility') }));
jest.mock('../components/ds/AgeGate', () => ({ AgeGate: () => mockLabel('age-gate') }));
jest.mock('../components/ds/LockScreen', () => ({ LockScreen: () => mockLabel('lock-screen') }));
jest.mock('../components/ds/WakingScreen', () => ({ WakingScreen: () => mockLabel('waking') }));

import Index from './index';

const checkEligibility = jest.fn(async () => undefined);

function signedIn(overrides: {
  lock?: string; eligibility?: string; onboarding?: string;
} = {}) {
  mockState.auth = { isAuthenticated: true, isRestoring: false, user: { id: 'u1' } };
  mockState.lock = { state: overrides.lock ?? 'open', check: jest.fn(async () => undefined) };
  mockState.onboarding = { status: overrides.onboarding ?? 'required', resolve: jest.fn(async () => undefined) };
  mockState.eligibility = { state: overrides.eligibility ?? 'required', check: checkEligibility };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('launch router after sign-in', () => {
  it('asks 18+ before onboarding for a new account', () => {
    signedIn({ eligibility: 'required', onboarding: 'required' });
    render(<Index />);
    expect(screen.getByText('age-gate')).toBeTruthy();
    expect(screen.queryByText(/redirect:/)).toBeNull();
  });

  it('asks 18+ before home for a returning account that never confirmed', () => {
    signedIn({ eligibility: 'required', onboarding: 'done' });
    render(<Index />);
    expect(screen.getByText('age-gate')).toBeTruthy();
  });

  it('keeps an under-18 answer on the gate', () => {
    signedIn({ eligibility: 'declined', onboarding: 'done' });
    render(<Index />);
    expect(screen.getByText('age-gate')).toBeTruthy();
  });

  it('checks eligibility for the signed-in account', () => {
    signedIn();
    render(<Index />);
    expect(checkEligibility).toHaveBeenCalledWith('u1');
  });

  it('shows the biometric lock before the 18+ question', () => {
    signedIn({ lock: 'locked', eligibility: 'required' });
    render(<Index />);
    expect(screen.getByText('lock-screen')).toBeTruthy();
    expect(screen.queryByText('age-gate')).toBeNull();
  });

  it('shows the waking screen while a new device asks the server', () => {
    signedIn({ eligibility: 'asking' });
    render(<Index />);
    expect(screen.getByText('waking')).toBeTruthy();
  });

  it('continues to onboarding once confirmed', () => {
    signedIn({ eligibility: 'confirmed', onboarding: 'required' });
    render(<Index />);
    expect(screen.getByText('redirect:/(auth)/onboarding')).toBeTruthy();
  });

  it('continues home once confirmed and onboarded', () => {
    signedIn({ eligibility: 'confirmed', onboarding: 'done' });
    render(<Index />);
    expect(screen.getByText('redirect:/(tabs)')).toBeTruthy();
  });

  it('sends a signed-out launch to login', () => {
    signedIn();
    mockState.auth = { isAuthenticated: false, isRestoring: false, user: null };
    render(<Index />);
    expect(screen.getByText('redirect:/(auth)/login')).toBeTruthy();
  });
});

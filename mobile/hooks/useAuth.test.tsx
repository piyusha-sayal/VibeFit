/**
 * Every sign-in must land on the launch router, which owns the biometric
 * lock, the 18+ check and onboarding. Routing straight to home or onboarding
 * skipped the 18+ check until the next cold launch.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../store/authStore', () => ({ useAuthStore: jest.fn() }));

import { useAuth } from './useAuth';
import { POST_SIGN_IN_ROUTE } from '../constants/routes';

const router = { replace: jest.fn() };
const store = {
  restoreSession: jest.fn(),
  login: jest.fn(async () => undefined),
  register: jest.fn(async () => undefined),
  loginAsGuest: jest.fn(async () => undefined),
  logout: jest.fn(async () => undefined),
  clearError: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (jest.requireMock('expo-router') as { useRouter: jest.Mock }).useRouter.mockReturnValue(router);
  (jest.requireMock('../store/authStore') as { useAuthStore: jest.Mock }).useAuthStore.mockReturnValue(store);
});

describe('useAuth redirects', () => {
  it('sends the launch router the root path', () => {
    expect(POST_SIGN_IN_ROUTE).toBe('/');
  });

  it.each([
    ['email sign-in', (a: ReturnType<typeof useAuth>) => a.login('a@b.com', 'pw')],
    ['registration', (a: ReturnType<typeof useAuth>) => a.register('a@b.com', 'pw', 'A')],
    ['guest sign-in', (a: ReturnType<typeof useAuth>) => a.loginAsGuest()],
  ])('%s goes through the launch router', async (_label, action) => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await action(result.current); });
    expect(router.replace).toHaveBeenCalledWith(POST_SIGN_IN_ROUTE);
  });

  it('a failed sign-in does not navigate', async () => {
    store.login.mockRejectedValueOnce(new Error('bad password') as never);
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await expect(result.current.login('a@b.com', 'pw')).rejects.toThrow('bad password');
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sign-out returns to login', async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.logout(); });
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});

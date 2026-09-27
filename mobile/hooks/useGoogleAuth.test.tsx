/**
 * The Google sign-in hook: a build without an Android client must stay usable,
 * a cancelled browser must not look like a failure, and a successful sign-in
 * must go through the launch router so the 18+ check and onboarding still run.
 * No real Google or Firebase call is made.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: jest.fn() }));
jest.mock('../services/authService', () => ({ loginWithGoogleIdToken: jest.fn() }));
jest.mock('../store/authStore', () => {
  const setState = jest.fn();
  return { useAuthStore: Object.assign(jest.fn(), { setState }) };
});

import { Platform } from 'react-native';
import { useGoogleAuth } from './useGoogleAuth';

const router = { replace: jest.fn() };
const prompt = jest.fn(async () => ({ type: 'cancel' }));

function mocks() {
  return {
    google: jest.requireMock('expo-auth-session/providers/google') as { useAuthRequest: jest.Mock },
    auth: jest.requireMock('../services/authService') as { loginWithGoogleIdToken: jest.Mock },
    store: jest.requireMock('../store/authStore') as { useAuthStore: { setState: jest.Mock } },
    expoRouter: jest.requireMock('expo-router') as { useRouter: jest.Mock },
  };
}

/** Configure the platform, the Android client id and the provider's response. */
function load(androidClientId: string | undefined, response: unknown = null) {
  Platform.OS = 'android';
  if (androidClientId) process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = androidClientId;
  else delete process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const m = mocks();
  m.expoRouter.useRouter.mockReturnValue(router);
  m.google.useAuthRequest.mockReturnValue([{ url: 'x' }, response, prompt]);
  return { useGoogleAuth };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('without an Android client id', () => {
  it('renders without calling the provider and explains itself on tap', async () => {
    const { useGoogleAuth } = load(undefined);
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.ready).toBe(false);
    expect(mocks().google.useAuthRequest).not.toHaveBeenCalled();

    await act(async () => { await result.current.signInWithGoogle(); });
    expect(result.current.error).toMatch(/email and password/);
    expect(result.current.loading).toBe(false);
    expect(prompt).not.toHaveBeenCalled();
  });
});

describe('with an Android client id', () => {
  it('opens the Google prompt', async () => {
    const { useGoogleAuth } = load('android-client');
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.ready).toBe(true);
    await act(async () => { await result.current.signInWithGoogle(); });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('stays quiet when the user cancels', () => {
    const { useGoogleAuth } = load('android-client', { type: 'cancel' });
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mocks().auth.loginWithGoogleIdToken).not.toHaveBeenCalled();
  });

  it('shows a provider failure', () => {
    const { useGoogleAuth } = load('android-client', { type: 'error', error: { message: 'access_denied' } });
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.error).toBe('access_denied');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('rejects a success callback that carries no token', () => {
    const { useGoogleAuth } = load('android-client', { type: 'success', authentication: null });
    const { result } = renderHook(() => useGoogleAuth());
    expect(result.current.error).toMatch(/did not complete/);
    expect(mocks().auth.loginWithGoogleIdToken).not.toHaveBeenCalled();
  });

  it('stores the session and hands over to the launch router on success', async () => {
    const data = { user: { id: 'u1' }, tokens: { accessToken: 'a' } };
    const { useGoogleAuth } = load('android-client', { type: 'success', authentication: { idToken: 'id-tok' } });
    mocks().auth.loginWithGoogleIdToken.mockResolvedValue({ success: true, data } as never);
    const { result } = renderHook(() => useGoogleAuth());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(mocks().auth.loginWithGoogleIdToken).toHaveBeenCalledWith('id-tok');
    expect(mocks().store.useAuthStore.setState).toHaveBeenCalledWith({
      user: data.user, tokens: data.tokens, isAuthenticated: true,
    });
    expect(result.current.loading).toBe(false);
  });

  it('does not sign in when the backend exchange fails', async () => {
    const { useGoogleAuth } = load('android-client', { type: 'success', authentication: { idToken: 'id-tok' } });
    mocks().auth.loginWithGoogleIdToken.mockResolvedValue({ success: false, data: null, error: 'auth/invalid-credential' } as never);
    const { result } = renderHook(() => useGoogleAuth());

    await waitFor(() => expect(result.current.error).toBe('auth/invalid-credential'));
    expect(mocks().store.useAuthStore.setState).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});

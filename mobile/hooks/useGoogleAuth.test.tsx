/**
 * The Google sign-in hook: a build without a web client id stays usable, a
 * cancelled picker is not a failure, and a successful sign-in goes through
 * the launch router so the 18+ check and onboarding still run. The native
 * module, Firebase and the backend are all mocked.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../services/googleAuth', () => ({
  ...jest.requireActual<Record<string, unknown>>('../services/googleAuth'),
  requestGoogleIdToken: jest.fn(),
  clearGoogleSession: jest.fn(async () => undefined),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {}, statusCodes: {},
  isSuccessResponse: jest.fn(), isCancelledResponse: jest.fn(), isErrorWithCode: jest.fn(),
}));
jest.mock('../services/authService', () => ({ loginWithGoogleIdToken: jest.fn() }));
jest.mock('../store/authStore', () => ({ useAuthStore: Object.assign(jest.fn(), { setState: jest.fn() }) }));

import { useGoogleAuth } from './useGoogleAuth';

const router = { replace: jest.fn() };
const m = () => ({
  google: jest.requireMock('../services/googleAuth') as { requestGoogleIdToken: jest.Mock; clearGoogleSession: jest.Mock },
  auth: jest.requireMock('../services/authService') as { loginWithGoogleIdToken: jest.Mock },
  store: jest.requireMock('../store/authStore') as { useAuthStore: { setState: jest.Mock } },
});

function configure(webClientId: string | undefined) {
  Platform.OS = 'android';
  if (webClientId) process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = webClientId;
  else delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  (jest.requireMock('expo-router') as { useRouter: jest.Mock }).useRouter.mockReturnValue(router);
}

async function tapGoogle() {
  const hook = renderHook(() => useGoogleAuth());
  await act(async () => { await hook.result.current.signInWithGoogle(); });
  return hook.result;
}

beforeEach(() => {
  jest.clearAllMocks();
  configure('web-client');
});

describe('missing configuration', () => {
  it('explains itself and never opens the native picker', async () => {
    configure(undefined);
    const result = await tapGoogle();
    expect(result.current.ready).toBe(false);
    expect(result.current.error).toMatch(/email and password/);
    expect(m().google.requestGoogleIdToken).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});

describe('native Google sign-in', () => {
  it('signs in, stores the session and hands over to the launch router', async () => {
    const data = { user: { id: 'u1' }, tokens: { accessToken: 'firebase-id-token' } };
    m().google.requestGoogleIdToken.mockResolvedValue({ kind: 'idToken', idToken: 'google-id-token' } as never);
    m().auth.loginWithGoogleIdToken.mockResolvedValue({ success: true, data } as never);

    const result = await tapGoogle();

    expect(m().google.requestGoogleIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ webClientId: 'web-client' }));
    expect(m().auth.loginWithGoogleIdToken).toHaveBeenCalledWith('google-id-token');
    expect(m().store.useAuthStore.setState).toHaveBeenCalledWith({
      user: data.user, tokens: data.tokens, isAuthenticated: true,
    });
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('stays quiet when the user cancels', async () => {
    m().google.requestGoogleIdToken.mockResolvedValue({ kind: 'cancelled' } as never);
    const result = await tapGoogle();
    expect(result.current.error).toBeNull();
    expect(m().auth.loginWithGoogleIdToken).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('shows a provider failure', async () => {
    m().google.requestGoogleIdToken.mockResolvedValue({ kind: 'error', message: 'Google sign-in failed. Please try again.' } as never);
    const result = await tapGoogle();
    expect(result.current.error).toBe('Google sign-in failed. Please try again.');
    expect(m().auth.loginWithGoogleIdToken).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does not sign in when Firebase or the session exchange fails, and forgets the Google account', async () => {
    m().google.requestGoogleIdToken.mockResolvedValue({ kind: 'idToken', idToken: 'google-id-token' } as never);
    m().auth.loginWithGoogleIdToken.mockResolvedValue({ success: false, data: null, error: 'Sign-in failed.' } as never);
    const result = await tapGoogle();
    expect(result.current.error).toBe('Sign-in failed.');
    expect(m().store.useAuthStore.setState).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(m().google.clearGoogleSession).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});

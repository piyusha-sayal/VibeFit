/**
 * Native Google sign-in: what the picker's answers mean. The native module is
 * mocked; no real Google call is made.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
  isCancelledResponse: (r: { type: string }) => r.type === 'cancelled',
  isErrorWithCode: (e: unknown) => Boolean(e && typeof e === 'object' && 'code' in e),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

const native = (jest.requireMock('@react-native-google-signin/google-signin') as {
  GoogleSignin: Record<'configure' | 'hasPlayServices' | 'signIn' | 'signOut', jest.Mock>;
}).GoogleSignin;

import {
  GOOGLE_FAILED_MESSAGE, GOOGLE_NO_TOKEN_MESSAGE, GOOGLE_PLAY_SERVICES_MESSAGE,
  clearGoogleSession, googleSignInReady, requestGoogleIdToken,
} from './googleAuth';

const IDS = { webClientId: 'web-client' };
const codeError = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  jest.clearAllMocks();
  native.hasPlayServices.mockResolvedValue(true as never);
});

describe('googleSignInReady', () => {
  it('needs only the web client id on Android', () => {
    expect(googleSignInReady('android', { webClientId: 'web' })).toBe(true);
  });

  it('is not ready on Android without a web client id', () => {
    expect(googleSignInReady('android', {})).toBe(false);
    expect(googleSignInReady('android', { webClientId: '  ' })).toBe(false);
  });

  it('needs an iOS client on iOS and is never offered on web', () => {
    expect(googleSignInReady('ios', { webClientId: 'web' })).toBe(false);
    expect(googleSignInReady('ios', { webClientId: 'web', iosClientId: 'ios' })).toBe(true);
    expect(googleSignInReady('web', { webClientId: 'web' })).toBe(false);
  });
});

describe('requestGoogleIdToken', () => {
  it('returns the ID token from a successful sign-in', async () => {
    native.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-id-token' } } as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'idToken', idToken: 'google-id-token' });
    expect(native.configure).toHaveBeenCalledWith({ webClientId: 'web-client', iosClientId: undefined });
    expect(native.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
  });

  it('treats a closed picker as a cancel, not an error', async () => {
    native.signIn.mockResolvedValue({ type: 'cancelled', data: null } as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'cancelled' });
  });

  it('treats the cancel and in-progress codes as a cancel', async () => {
    native.signIn.mockRejectedValueOnce(codeError('SIGN_IN_CANCELLED') as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'cancelled' });
    native.signIn.mockRejectedValueOnce(codeError('IN_PROGRESS') as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'cancelled' });
  });

  it('explains missing Play services', async () => {
    native.hasPlayServices.mockRejectedValue(codeError('PLAY_SERVICES_NOT_AVAILABLE') as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'error', message: GOOGLE_PLAY_SERVICES_MESSAGE });
  });

  it('reports any other provider failure without throwing', async () => {
    native.signIn.mockRejectedValue(codeError('DEVELOPER_ERROR') as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'error', message: GOOGLE_FAILED_MESSAGE });
    native.signIn.mockRejectedValue(new Error('boom') as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'error', message: GOOGLE_FAILED_MESSAGE });
  });

  it('rejects a success that carries no ID token', async () => {
    native.signIn.mockResolvedValue({ type: 'success', data: { idToken: null } } as never);
    await expect(requestGoogleIdToken(IDS)).resolves.toEqual({ kind: 'error', message: GOOGLE_NO_TOKEN_MESSAGE });
  });
});

describe('clearGoogleSession', () => {
  it('signs out of Google and swallows a failure', async () => {
    native.signOut.mockRejectedValue(new Error('not signed in') as never);
    await expect(clearGoogleSession()).resolves.toBeUndefined();
    expect(native.signOut).toHaveBeenCalled();
  });
});

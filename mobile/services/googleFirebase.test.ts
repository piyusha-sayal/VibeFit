/**
 * The Google ID token becomes a Firebase session, and the Firebase ID token is
 * what the backend verifies. A rejected credential or a missing Firebase token
 * must fail the sign-in rather than half-complete it.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: jest.fn((idToken: string) => ({ providerId: 'google.com', idToken })) },
  signInWithCredential: jest.fn(),
}));
jest.mock('./firebase', () => ({ auth: {}, isFirebaseConfigured: true }));

const firebase = jest.requireMock('firebase/auth') as {
  GoogleAuthProvider: { credential: jest.Mock };
  signInWithCredential: jest.Mock;
};

import { loginWithGoogleIdToken } from './authService';

const firebaseUser = (getIdToken: () => Promise<string>) => ({
  uid: 'firebase-uid', email: 'a@b.com', displayName: 'A', photoURL: null, isAnonymous: false,
  refreshToken: 'refresh', metadata: { creationTime: '2026-09-27T00:00:00Z' }, getIdToken,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loginWithGoogleIdToken', () => {
  it('signs into Firebase with the Google token and returns the Firebase ID token', async () => {
    firebase.signInWithCredential.mockResolvedValue({ user: firebaseUser(async () => 'firebase-id-token') } as never);
    const res = await loginWithGoogleIdToken('google-id-token');
    expect(firebase.GoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token');
    expect(res.success).toBe(true);
    expect(res.data?.user.id).toBe('firebase-uid');
    expect(res.data?.tokens.accessToken).toBe('firebase-id-token');
  });

  it('fails cleanly when Firebase rejects the Google credential', async () => {
    firebase.signInWithCredential.mockRejectedValue(
      Object.assign(new Error('bad'), { code: 'auth/invalid-credential' }) as never);
    const res = await loginWithGoogleIdToken('google-id-token');
    expect(res.success).toBe(false);
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
  });

  it('fails cleanly when no Firebase ID token can be issued for the backend', async () => {
    firebase.signInWithCredential.mockResolvedValue({
      user: firebaseUser(async () => { throw new Error('network'); }),
    } as never);
    const res = await loginWithGoogleIdToken('google-id-token');
    expect(res.success).toBe(false);
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const anonUser = {
  uid: 'anon-1',
  email: null,
  displayName: null,
  photoURL: null,
  isAnonymous: true,
  refreshToken: 'refresh',
  metadata: { creationTime: '2026-01-01T00:00:00Z' },
  getIdToken: async () => 'anon-id-token',
};

let mockSignInAnonymously = async () => ({ user: anonUser });

jest.mock('firebase/auth', () => ({
  signInAnonymously: () => mockSignInAnonymously(),
}));
jest.mock('./firebase', () => ({
  get auth() { return {}; },
  get isFirebaseConfigured() { return true; },
}));

import { loginAsGuest } from './authService';

describe('guest sign-in', () => {
  beforeEach(() => {
    mockSignInAnonymously = async () => ({ user: anonUser });
  });

  it('returns a usable session for an anonymous user', async () => {
    const res = await loginAsGuest();
    expect(res.success).toBe(true);
    expect(res.data?.user.id).toBe('anon-1');
    // An anonymous user has no email or display name; the UI still needs a label.
    expect(res.data?.user.name).toBe('Guest');
    expect(res.data?.user.email).toBe('');
    expect(res.data?.tokens.accessToken).toBe('anon-id-token');
  });

  it('explains what to enable when the provider is off in the Firebase console', async () => {
    mockSignInAnonymously = async () => {
      throw Object.assign(new Error('nope'), { code: 'auth/operation-not-allowed' });
    };
    const res = await loginAsGuest();
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Anonymous sign-in/i);
  });
});

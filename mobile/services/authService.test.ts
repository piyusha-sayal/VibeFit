import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Firebase restores a persisted user asynchronously: `currentUser` is null until
// `authStateReady()` resolves. Reading it synchronously at launch signed every
// returning user out.
const restoredUser = {
  uid: 'u1',
  email: 'me@example.com',
  displayName: 'Me',
  photoURL: null,
  refreshToken: 'refresh',
  metadata: { creationTime: '2026-01-01T00:00:00Z' },
  getIdToken: async () => 'id-token',
};

const mockAuth: { currentUser: typeof restoredUser | null; authStateReady: () => Promise<void> } = {
  currentUser: null,
  authStateReady: async () => {
    mockAuth.currentUser = restoredUser;
  },
};
let mockConfigured = true;

jest.mock('firebase/auth', () => ({}));
jest.mock('./firebase', () => ({
  get auth() { return mockAuth; },
  get isFirebaseConfigured() { return mockConfigured; },
}));

import { getCurrentUser, getFreshIdToken, getStoredTokens } from './authService';

describe('authService session restore', () => {
  beforeEach(() => {
    mockAuth.currentUser = null;
    mockConfigured = true;
  });

  it('waits for Firebase to restore the persisted user', async () => {
    expect((await getCurrentUser())?.id).toBe('u1');
  });

  it('returns tokens for the restored user', async () => {
    expect((await getStoredTokens())?.accessToken).toBe('id-token');
    expect(await getFreshIdToken()).toBe('id-token');
  });

  it('returns null without touching auth when Firebase is not configured', async () => {
    mockConfigured = false;
    expect(await getCurrentUser()).toBeNull();
    expect(await getFreshIdToken()).toBeNull();
  });
});

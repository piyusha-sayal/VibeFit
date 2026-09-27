/**
 * Deleting an account must remove the Firebase sign-in as well as the data.
 * Otherwise the same email can sign straight back in, and the backend quietly
 * provisions a new, empty account for it.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockUser = { uid: 'u1' };
const mockAuth: { currentUser: typeof mockUser | null } = { currentUser: mockUser };
let mockConfigured = true;

jest.mock('firebase/auth', () => ({ deleteUser: jest.fn() }));
jest.mock('./firebase', () => ({
  get auth() { return mockAuth; },
  get isFirebaseConfigured() { return mockConfigured; },
}));

const firebase = jest.requireMock('firebase/auth') as { deleteUser: jest.Mock };

import { deleteFirebaseAccount } from './authService';

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = mockUser;
  mockConfigured = true;
});

describe('deleteFirebaseAccount', () => {
  it('deletes the signed-in Firebase user', async () => {
    firebase.deleteUser.mockResolvedValue(undefined as never);
    await expect(deleteFirebaseAccount()).resolves.toBe(true);
    expect(firebase.deleteUser).toHaveBeenCalledWith(mockUser);
  });

  it('reports failure when Firebase refuses (e.g. the sign-in is too old)', async () => {
    firebase.deleteUser.mockRejectedValue(
      Object.assign(new Error('requires-recent-login'), { code: 'auth/requires-recent-login' }) as never,
    );
    await expect(deleteFirebaseAccount()).resolves.toBe(false);
  });

  it('has nothing to delete for an account that never used Firebase', async () => {
    mockAuth.currentUser = null;
    await expect(deleteFirebaseAccount()).resolves.toBe(true);
    expect(firebase.deleteUser).not.toHaveBeenCalled();
  });

  it('has nothing to delete when Firebase is not configured', async () => {
    mockConfigured = false;
    await expect(deleteFirebaseAccount()).resolves.toBe(true);
    expect(firebase.deleteUser).not.toHaveBeenCalled();
  });
});

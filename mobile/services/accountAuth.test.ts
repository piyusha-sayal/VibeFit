/**
 * Password reset, password change and display name, all on Firebase.
 * A reset never reveals whether an email has an account.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockUser = {
  uid: 'u1',
  email: 'a@b.com',
  providerData: [{ providerId: 'password' }],
};
const mockAuth: { currentUser: unknown } = { currentUser: mockUser };

jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  updatePassword: jest.fn(),
  updateProfile: jest.fn(),
  EmailAuthProvider: { credential: jest.fn((email: string, pw: string) => ({ email, pw })) },
}));
jest.mock('./firebase', () => ({
  get auth() { return mockAuth; },
  isFirebaseConfigured: true,
}));

const fb = jest.requireMock('firebase/auth') as Record<string, jest.Mock> & {
  EmailAuthProvider: { credential: jest.Mock };
};

import {
  canChangePassword, changePassword, sendPasswordReset, setFirebaseDisplayName,
} from './authService';

const fail = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = mockUser;
});

describe('sendPasswordReset', () => {
  it('sends the reset email', async () => {
    fb.sendPasswordResetEmail.mockResolvedValue(undefined as never);
    await expect(sendPasswordReset(' A@B.com ')).resolves.toEqual({ success: true, data: null });
    expect(fb.sendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'a@b.com');
  });

  it('answers the same for an unknown email, so accounts cannot be discovered', async () => {
    fb.sendPasswordResetEmail.mockRejectedValue(fail('auth/user-not-found') as never);
    await expect(sendPasswordReset('nobody@b.com')).resolves.toEqual({ success: true, data: null });
  });

  it('rejects a malformed email before calling Firebase', async () => {
    const res = await sendPasswordReset('not-an-email');
    expect(res.success).toBe(false);
    expect(fb.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('reports rate limiting', async () => {
    fb.sendPasswordResetEmail.mockRejectedValue(fail('auth/too-many-requests') as never);
    const res = await sendPasswordReset('a@b.com');
    expect(res).toMatchObject({ success: false, error: 'Too many attempts. Try again later.' });
  });
});

describe('changePassword', () => {
  it('re-authenticates with the current password, then updates it', async () => {
    fb.reauthenticateWithCredential.mockResolvedValue({} as never);
    fb.updatePassword.mockResolvedValue(undefined as never);
    await expect(changePassword('old-password', 'new-password-1')).resolves.toEqual({ success: true, data: null });
    expect(fb.EmailAuthProvider.credential).toHaveBeenCalledWith('a@b.com', 'old-password');
    expect(fb.updatePassword).toHaveBeenCalledWith(mockUser, 'new-password-1');
  });

  it('says so when the current password is wrong, and changes nothing', async () => {
    fb.reauthenticateWithCredential.mockRejectedValue(fail('auth/invalid-credential') as never);
    const res = await changePassword('wrong', 'new-password-1');
    expect(res).toMatchObject({ success: false, error: 'Your current password is incorrect.' });
    expect(fb.updatePassword).not.toHaveBeenCalled();
  });

  it('enforces the same 8-character minimum as registration', async () => {
    const res = await changePassword('old-password', 'short');
    expect(res.success).toBe(false);
    expect(fb.reauthenticateWithCredential).not.toHaveBeenCalled();
  });

  it('is not offered to Google or guest accounts', async () => {
    mockAuth.currentUser = { ...mockUser, providerData: [{ providerId: 'google.com' }] };
    expect(canChangePassword()).toBe(false);
    const res = await changePassword('x', 'new-password-1');
    expect(res.success).toBe(false);
    mockAuth.currentUser = mockUser;
    expect(canChangePassword()).toBe(true);
  });
});

describe('setFirebaseDisplayName', () => {
  it('updates the Firebase profile name', async () => {
    fb.updateProfile.mockResolvedValue(undefined as never);
    await setFirebaseDisplayName('Priya');
    expect(fb.updateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Priya' });
  });

  it('does nothing without a Firebase user', async () => {
    mockAuth.currentUser = null;
    await setFirebaseDisplayName('Priya');
    expect(fb.updateProfile).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('./api', () => ({ patch: jest.fn() }));
jest.mock('./authService', () => ({ setFirebaseDisplayName: jest.fn(async () => undefined) }));

const api = jest.requireMock('./api') as { patch: jest.Mock };
const authService = jest.requireMock('./authService') as { setFirebaseDisplayName: jest.Mock };

import { MAX_NAME_LENGTH, updateAccountName } from './accountService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('updateAccountName', () => {
  it('saves the trimmed name on the server, then on Firebase', async () => {
    api.patch.mockResolvedValue({ success: true, data: { id: 'u1', name: 'Priya' } } as never);
    const res = await updateAccountName('  Priya ');
    expect(api.patch).toHaveBeenCalledWith('/users/me', { name: 'Priya' });
    expect(authService.setFirebaseDisplayName).toHaveBeenCalledWith('Priya');
    expect(res).toEqual({ success: true, data: 'Priya' });
  });

  it('rejects an empty or overlong name without calling the server', async () => {
    expect((await updateAccountName('   ')).success).toBe(false);
    expect((await updateAccountName('x'.repeat(MAX_NAME_LENGTH + 1))).success).toBe(false);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('leaves Firebase alone when the server refuses', async () => {
    api.patch.mockResolvedValue({ success: false, data: null, error: 'Network error' } as never);
    const res = await updateAccountName('Priya');
    expect(res).toMatchObject({ success: false, error: 'Network error' });
    expect(authService.setFirebaseDisplayName).not.toHaveBeenCalled();
  });

  it('still succeeds if only the Firebase copy of the name fails', async () => {
    api.patch.mockResolvedValue({ success: true, data: { name: 'Priya' } } as never);
    authService.setFirebaseDisplayName.mockRejectedValueOnce(new Error('offline') as never);
    await expect(updateAccountName('Priya')).resolves.toEqual({ success: true, data: 'Priya' });
  });
});

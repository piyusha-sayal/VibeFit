import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const mockToken = jest.fn<(force?: boolean) => Promise<string | null>>();
jest.mock('./authService', () => ({ getFreshIdToken: (force?: boolean) => mockToken(force) }));

import api, { friendlyError, post } from './api';

function reject(config: InternalAxiosRequestConfig, status?: number): Promise<never> {
  const response = status === undefined ? undefined : ({ status, data: {}, config } as AxiosResponse);
  return Promise.reject(new AxiosError('Request failed with status code ' + status, 'ERR', config, null, response));
}

beforeEach(() => {
  mockToken.mockReset();
  mockToken.mockResolvedValue('token');
});

// Raw axios text ("Request failed with status code 500") used to reach screens.
describe('friendlyError', () => {
  it('explains network, session and server failures in plain words', () => {
    expect(friendlyError(undefined)).toMatch(/connection/);
    expect(friendlyError(401)).toMatch(/sign in/);
    expect(friendlyError(503)).toMatch(/our side/);
    expect(friendlyError(400)).not.toMatch(/status code/);
  });

  it('is what a caller sees when the backend gives no detail', async () => {
    api.defaults.adapter = (config) => reject(config, 500);
    const res = await post('/x', {});
    expect(res.success).toBe(false);
    expect(res.error).toBe(friendlyError(500));
  });
});

// An expired token gave a generic error instead of a quiet refresh and retry.
describe('401 handling', () => {
  it('refreshes the token once and repeats the request', async () => {
    let calls = 0;
    api.defaults.adapter = (config) => {
      calls += 1;
      if (calls === 1) return reject(config, 401);
      return Promise.resolve({ status: 200, data: { ok: true }, config, headers: {}, statusText: 'OK' } as AxiosResponse);
    };
    const res = await post<{ ok: boolean }>('/x', {});
    expect(res.success).toBe(true);
    expect(calls).toBe(2);
    expect(mockToken).toHaveBeenLastCalledWith(true);
  });

  it('gives up after one refresh', async () => {
    let calls = 0;
    api.defaults.adapter = (config) => { calls += 1; return reject(config, 401); };
    const res = await post('/x', {});
    expect(res.success).toBe(false);
    expect(calls).toBe(2);
  });
});

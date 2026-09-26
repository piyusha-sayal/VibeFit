/**
 * The 18+ eligibility gate.
 *
 * What matters: a returning user is not asked again, a slow or sleeping server
 * never strands anyone (it falls back to asking), and a confirmation made
 * while offline still reaches the server later.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../services/api', () => ({
  __esModule: true,
  get: jest.fn(),
  post: jest.fn(),
}));

const mockApi = jest.requireMock('../services/api') as {
  get: jest.Mock;
  post: jest.Mock;
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_WAIT_MS, storageKey } from '../services/eligibility';
import { useEligibilityStore } from './eligibilityStore';

const USER = 'user-1';
const serverSays = (ageConfirmedAt: string | null) =>
  mockApi.get.mockResolvedValue({ success: true, data: { ageConfirmedAt } } as never);
const postOk = () =>
  mockApi.post.mockResolvedValue({ success: true, data: { ageConfirmedAt: 'x' } } as never);
const postFails = () =>
  mockApi.post.mockResolvedValue({ success: false, data: null, error: 'offline' } as never);

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useRealTimers();
  await AsyncStorage.clear();
  useEligibilityStore.getState().reset();
});

describe('check', () => {
  it('asks a new account', async () => {
    serverSays(null);
    await useEligibilityStore.getState().check(USER);
    expect(useEligibilityStore.getState().state).toBe('required');
  });

  it('does not ask again once confirmed on this device', async () => {
    await AsyncStorage.setItem(storageKey(USER), 'synced');
    await useEligibilityStore.getState().check(USER);
    expect(useEligibilityStore.getState().state).toBe('confirmed');
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('trusts a confirmation made on another device and remembers it', async () => {
    serverSays('2026-09-26T00:00:00Z');
    await useEligibilityStore.getState().check(USER);
    expect(useEligibilityStore.getState().state).toBe('confirmed');
    expect(await AsyncStorage.getItem(storageKey(USER))).toBe('synced');
  });

  it('asks rather than waits when the server does not answer', async () => {
    jest.useFakeTimers();
    mockApi.get.mockReturnValue(new Promise(() => {}) as never);
    const pending = useEligibilityStore.getState().check(USER);
    await jest.advanceTimersByTimeAsync(SERVER_WAIT_MS + 1);
    await pending;
    expect(useEligibilityStore.getState().state).toBe('required');
  });

  it('asks when the server call fails', async () => {
    mockApi.get.mockResolvedValue({ success: false, data: null, error: 'x' } as never);
    await useEligibilityStore.getState().check(USER);
    expect(useEligibilityStore.getState().state).toBe('required');
  });

  it('keeps confirmations separate per account', async () => {
    await AsyncStorage.setItem(storageKey('someone-else'), 'synced');
    serverSays(null);
    await useEligibilityStore.getState().check(USER);
    expect(useEligibilityStore.getState().state).toBe('required');
  });
});

describe('confirm', () => {
  it('opens the app and records the confirmation on the server', async () => {
    serverSays(null);
    postOk();
    await useEligibilityStore.getState().check(USER);
    await useEligibilityStore.getState().confirm();
    expect(useEligibilityStore.getState().state).toBe('confirmed');
    expect(mockApi.post).toHaveBeenCalledWith('/privacy/eligibility');
    expect(await AsyncStorage.getItem(storageKey(USER))).toBe('synced');
  });

  it('still opens the app offline and retries the record on the next launch', async () => {
    serverSays(null);
    postFails();
    await useEligibilityStore.getState().check(USER);
    await useEligibilityStore.getState().confirm();
    expect(useEligibilityStore.getState().state).toBe('confirmed');
    expect(await AsyncStorage.getItem(storageKey(USER))).toBe('pending');

    useEligibilityStore.getState().reset();
    postOk();
    await useEligibilityStore.getState().check(USER);
    await Promise.resolve();
    expect(useEligibilityStore.getState().state).toBe('confirmed');
    expect(mockApi.post).toHaveBeenCalledTimes(2);
  });
});

describe('decline', () => {
  it('keeps the app closed and records nothing', async () => {
    serverSays(null);
    await useEligibilityStore.getState().check(USER);
    useEligibilityStore.getState().decline();
    expect(useEligibilityStore.getState().state).toBe('declined');
    expect(mockApi.post).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(storageKey(USER))).toBeNull();
  });
});

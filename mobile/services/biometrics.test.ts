/**
 * Unlocking with a fingerprint or a face.
 *
 * The rules that matter are the awkward ones: a sensor that stops working
 * must not lock someone out of their own account, and a phone handed over
 * unlocked must not let the lock be removed without proof.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// The factory is hoisted above this file's own statements, so the doubles
// have to be created inside it and read back afterwards — a `const` declared
// out here is still in its temporal dead zone when the factory runs.
jest.mock('expo-local-authentication', () => ({
  __esModule: true,
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
}));

const mockAuth = jest.requireMock('expo-local-authentication') as {
  hasHardwareAsync: jest.Mock;
  isEnrolledAsync: jest.Mock;
  supportedAuthenticationTypesAsync: jest.Mock;
  authenticateAsync: jest.Mock;
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as biometrics from './biometrics';

const ok = () => mockAuth.authenticateAsync.mockResolvedValue({ success: true } as never);
const refused = (error: string) =>
  mockAuth.authenticateAsync.mockResolvedValue({ success: false, error } as never);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockAuth.hasHardwareAsync.mockResolvedValue(true as never);
  mockAuth.isEnrolledAsync.mockResolvedValue(true as never);
  mockAuth.supportedAuthenticationTypesAsync.mockResolvedValue([1] as never);
});

describe('what the device can do', () => {
  it('is unavailable with no sensor, and says so in words a user can act on', async () => {
    mockAuth.hasHardwareAsync.mockResolvedValue(false as never);
    const c = await biometrics.capability();
    expect(c.available).toBe(false);
    expect(c.reason).toMatch(/no fingerprint or face sensor/i);
  });

  it('is unavailable when nothing is enrolled, and points at device settings', async () => {
    mockAuth.isEnrolledAsync.mockResolvedValue(false as never);
    const c = await biometrics.capability();
    expect(c.available).toBe(false);
    expect(c.reason).toMatch(/device settings/i);
  });

  it('reports the kind so screens do not have to guess the wording', async () => {
    mockAuth.supportedAuthenticationTypesAsync.mockResolvedValue([2] as never);
    expect((await biometrics.capability()).kind).toBe('face');
    expect(biometrics.labelFor('face')).toBe('face unlock');
  });

  it('treats a device that throws as one that cannot be relied on', async () => {
    mockAuth.hasHardwareAsync.mockRejectedValue(new Error('no api') as never);
    expect((await biometrics.capability()).available).toBe(false);
  });
});

describe('unlocking', () => {
  it('leaves the device passcode available as a fallback', async () => {
    ok();
    await biometrics.unlock();
    expect(mockAuth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false }));
  });

  it('separates a dismissal from a failure, and shows an error only for a failure', async () => {
    refused('user_cancel');
    const cancelled = await biometrics.unlock();
    expect(cancelled).toEqual({ ok: false, cancelled: true, error: null });

    refused('authentication_failed');
    const failed = await biometrics.unlock();
    expect(failed.cancelled).toBe(false);
    expect(failed.error).toBeTruthy();
  });
});

describe('turning the lock on and off', () => {
  it('is off until it is turned on', async () => {
    expect(await biometrics.isEnabled('u1')).toBe(false);
  });

  it('proves the sensor works before the user starts relying on it', async () => {
    refused('authentication_failed');
    const result = await biometrics.setEnabled('u1', true);
    expect(result.ok).toBe(false);
    expect(await biometrics.isEnabled('u1')).toBe(false);
  });

  it('turns on after a successful prompt', async () => {
    ok();
    expect((await biometrics.setEnabled('u1', true)).ok).toBe(true);
    expect(await biometrics.isEnabled('u1')).toBe(true);
  });

  it('refuses to turn OFF without proof, so a borrowed phone cannot remove it', async () => {
    ok();
    await biometrics.setEnabled('u1', true);

    refused('authentication_failed');
    const off = await biometrics.setEnabled('u1', false);

    expect(off.ok).toBe(false);
    expect(await biometrics.isEnabled('u1')).toBe(true);
  });

  it('is per account, not per device', async () => {
    ok();
    await biometrics.setEnabled('u1', true);
    expect(await biometrics.isEnabled('u2')).toBe(false);
  });

  it('is forgotten on sign-out, so the next account is not asked for it', async () => {
    ok();
    await biometrics.setEnabled('u1', true);
    await biometrics.forget('u1');
    expect(await biometrics.isEnabled('u1')).toBe(false);
  });
});

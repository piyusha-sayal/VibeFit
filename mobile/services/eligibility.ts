import AsyncStorage from '@react-native-async-storage/async-storage';

import { get, post } from './api';

/**
 * The 18+ product-eligibility confirmation. A statement, not proof of age:
 * no birth date is asked for or stored.
 *
 * The device remembers the answer per account so the launch never waits on
 * the server for it. 'pending' means the server has not recorded it yet.
 */
type Stored = 'synced' | 'pending';

/** How long the launch waits for the server before simply asking. */
export const SERVER_WAIT_MS = 5_000;

export const storageKey = (userId: string) => `mylookfit.ageConfirmed.${userId}`;

export async function readLocal(userId: string): Promise<Stored | null> {
  const value = await AsyncStorage.getItem(storageKey(userId));
  return value === 'synced' || value === 'pending' ? value : null;
}

export async function markLocal(userId: string, value: Stored): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), value);
}

/** Record the confirmation on the server; the device copy follows the result. */
export async function record(userId: string): Promise<void> {
  const res = await post<{ ageConfirmedAt: string }>('/privacy/eligibility');
  await markLocal(userId, res.success ? 'synced' : 'pending');
}

/** Whether the server already holds a confirmation. Null when it cannot say in time. */
export async function confirmedOnServer(): Promise<boolean | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SERVER_WAIT_MS);
  });
  const lookup = get<{ ageConfirmedAt: string | null }>('/auth/me')
    .then((res) => (res.success && res.data ? Boolean(res.data.ageConfirmedAt) : null));
  try {
    return await Promise.race([lookup, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

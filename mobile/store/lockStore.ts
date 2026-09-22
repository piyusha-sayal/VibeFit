import { create } from 'zustand';

import * as biometrics from '../services/biometrics';

/**
 * Whether the app is locked right now.
 *
 * Deliberately not persisted: the lock has to come back on every cold launch,
 * so "already unlocked" must not survive the process. Unlocking lasts for the
 * life of the launch and no longer.
 */
type LockState = 'unknown' | 'checking' | 'locked' | 'open';

interface LockStore {
  state: LockState;
  userId: string | null;
  error: string | null;
  /** Ask whether this account has the lock on. Idempotent per launch. */
  check: (userId: string) => Promise<void>;
  /** Run the prompt. */
  attempt: () => Promise<void>;
  reset: () => void;
}

export const useLockStore = create<LockStore>((set, get) => ({
  state: 'unknown',
  userId: null,
  error: null,

  check: async (userId: string) => {
    const current = get();
    // An unlock already granted this launch is not asked for again, and a
    // check in flight is not started twice.
    if (current.userId === userId
      && (current.state === 'open' || current.state === 'checking')) return;

    set({ state: 'checking', userId, error: null });
    const enabled = await biometrics.isEnabled(userId);
    if (!enabled) {
      set({ state: 'open' });
      return;
    }
    // The lock is on, but the sensor may have been removed or the enrolment
    // cleared since. Locking someone out of their own account over that would
    // be worse than the exposure, so an unusable sensor opens the app.
    const { available } = await biometrics.capability();
    set({ state: available ? 'locked' : 'open' });
  },

  attempt: async () => {
    const result = await biometrics.unlock();
    if (result.ok) {
      set({ state: 'open', error: null });
      return;
    }
    set({ error: result.cancelled ? null : result.error });
  },

  reset: () => set({ state: 'unknown', userId: null, error: null }),
}));

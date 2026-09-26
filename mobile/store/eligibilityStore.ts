import { create } from 'zustand';

import * as eligibility from '../services/eligibility';

/**
 * Whether this account has confirmed it is 18 or older.
 *
 * 'reading' is the local lookup and is too quick to show anything for;
 * 'asking' is the server fallback on a new device, which can be slow.
 */
type EligibilityState = 'unknown' | 'reading' | 'asking' | 'required' | 'confirmed' | 'declined';

interface EligibilityStore {
  state: EligibilityState;
  userId: string | null;
  check: (userId: string) => Promise<void>;
  confirm: () => Promise<void>;
  decline: () => void;
  reset: () => void;
}

export const useEligibilityStore = create<EligibilityStore>((set, get) => ({
  state: 'unknown',
  userId: null,

  check: async (userId: string) => {
    const current = get();
    if (current.userId === userId && current.state !== 'unknown') return;

    set({ state: 'reading', userId });
    const local = await eligibility.readLocal(userId);
    if (local) {
      set({ state: 'confirmed' });
      if (local === 'pending') void eligibility.record(userId);
      return;
    }

    set({ state: 'asking' });
    // A slow or sleeping server falls back to asking: confirming twice is
    // harmless, being stuck on a blank launch is not.
    const onServer = await eligibility.confirmedOnServer();
    if (onServer) await eligibility.markLocal(userId, 'synced');
    set({ state: onServer ? 'confirmed' : 'required' });
  },

  confirm: async () => {
    const { userId } = get();
    if (!userId) return;
    await eligibility.markLocal(userId, 'pending');
    set({ state: 'confirmed' });
    await eligibility.record(userId);
  },

  decline: () => set({ state: 'declined' }),

  reset: () => set({ state: 'unknown', userId: null }),
}));

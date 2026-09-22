/**
 * Which of four states the person is in, and the draft they left behind.
 *
 * The routing decision is small and the cost of getting it wrong is not: a
 * returning user sent back through onboarding, or a home screen that flashes
 * before bouncing away. So this resolves to one of four explicit states and
 * the root screen renders nothing until it has one.
 *
 * When the network cannot answer, the answer is `done`. Someone who already
 * has an account is far more likely to be a returning user than a new one, and
 * the failure of showing onboarding to a returning user is worse than the
 * failure of letting a genuinely new user reach a home screen that invites
 * them to start.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { getOnboarding, saveOnboarding } from '../services/profileService';
import type { OnboardingAnswers } from '../types';

export type OnboardingStatus = 'unknown' | 'resolving' | 'required' | 'partial' | 'done';

/** Per account: two people sharing a device must not inherit each other's state. */
const doneKey = (userId: string) => `mylookfit.onboarding.done.${userId}`;
const draftKey = (userId: string) => `mylookfit.onboarding.draft.${userId}`;
/** Kept after completion: the home screen orders itself by these. */
const interestKey = (userId: string) => `mylookfit.onboarding.interests.${userId}`;

interface OnboardingState {
  status: OnboardingStatus;
  userId: string | null;
  draft: Partial<OnboardingAnswers>;
  /** Survives completion, unlike the draft: the home screen reads it. */
  interests: string[];
  /** Decide where this account belongs. Safe to call repeatedly. */
  resolve: (userId: string) => Promise<OnboardingStatus>;
  /** Keep a local draft so a killed app does not lose a half-finished run. */
  saveDraft: (patch: Partial<OnboardingAnswers>) => Promise<void>;
  /** Persist to the server and mark the run finished. */
  complete: (answers: Partial<OnboardingAnswers>) => Promise<boolean>;
  /** Sign-out: forget the resolution, keep nothing in memory. */
  reset: () => void;
}

async function readFlag(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(doneKey(userId))) === '1';
  } catch {
    return false;
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  status: 'unknown',
  userId: null,
  draft: {},
  interests: [],

  resolve: async (userId: string) => {
    const already = get();
    if (already.userId === userId && (already.status === 'done'
      || already.status === 'required' || already.status === 'partial')) {
      return already.status;
    }
    set({ status: 'resolving', userId });

    // The local flag answers instantly and is only ever written after the
    // server confirmed a completed run, so it cannot invent a completion.
    if (await readFlag(userId)) {
      set({ status: 'done', interests: await readInterests(userId) });
      return 'done';
    }

    const response = await getOnboarding();
    let status: OnboardingStatus;
    if (response.success && response.data) {
      if (response.data.completedAt) {
        status = 'done';
        try { await AsyncStorage.setItem(doneKey(userId), '1'); } catch { /* cache only */ }
      } else {
        // A row with no completion stamp: they started and stopped.
        status = 'partial';
      }
    } else if (response.status === 404) {
      status = 'required';
    } else {
      // Ambiguous. Never classify an existing account as new on a failure.
      status = 'done';
    }

    let draft: Partial<OnboardingAnswers> = {};
    if (status !== 'done') {
      try {
        const raw = await AsyncStorage.getItem(draftKey(userId));
        if (raw) draft = JSON.parse(raw) as Partial<OnboardingAnswers>;
      } catch { /* a corrupt draft is not worth failing over */ }
      if (response.success && response.data) {
        draft = { ...stripMeta(response.data), ...draft };
      }
    }

    const fromServer = (response.success && response.data?.areasOfInterest) || null;
    const interests = fromServer ?? await readInterests(userId);
    if (fromServer) await writeInterests(userId, fromServer);

    set({ status, draft, interests });
    return status;
  },

  saveDraft: async (patch) => {
    const { draft, userId } = get();
    const next = { ...draft, ...patch };
    set({ draft: next });
    if (!userId) return;
    try {
      await AsyncStorage.setItem(draftKey(userId), JSON.stringify(next));
    } catch { /* the in-memory draft still carries the run */ }
  },

  complete: async (answers) => {
    const { userId } = get();
    // One write at the end rather than one per tap: this runs on a free tier
    // that sleeps, and a round trip between screens would be felt.
    const response = await saveOnboarding({ ...answers, completed: true });
    if (!response.success) return false;
    set({ status: 'done', draft: {}, interests: answers.areasOfInterest ?? [] });
    if (userId) {
      try {
        await AsyncStorage.setItem(doneKey(userId), '1');
        await writeInterests(userId, answers.areasOfInterest ?? []);
        await AsyncStorage.removeItem(draftKey(userId));
      } catch { /* the server is the record; this is only a shortcut */ }
    }
    return true;
  },

  reset: () => set({ status: 'unknown', userId: null, draft: {}, interests: [] }),
}));

async function readInterests(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(interestKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function writeInterests(userId: string, interests: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(interestKey(userId), JSON.stringify(interests));
  } catch { /* ordering falls back to the default, which is not a failure */ }
}

const META_FIELDS = ['id', 'userId', 'completedAt', 'createdAt', 'updatedAt'];

/** Server columns that are not answers, and must not ride back up as ones. */
function stripMeta(record: object): Partial<OnboardingAnswers> {
  const answers: Record<string, unknown> = { ...record };
  for (const field of META_FIELDS) delete answers[field];
  return answers as Partial<OnboardingAnswers>;
}

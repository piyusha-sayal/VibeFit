import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { EMPTY_STREAK, localDay, nextStreak, type StreakState } from '../constants/gamification';

/**
 * Streak and daily-quiz progress, kept on the device per account.
 *
 * It is motivational, not a record: losing it (a reinstall) costs nothing
 * important, so it lives in local storage rather than on the server.
 */
interface GameData {
  streak: StreakState;
  quizBest: number;
  quizzesPlayed: number;
  /** Local day and score of the last quiz played, so it is once a day. */
  lastQuizDay: string | null;
  lastQuizScore: number | null;
}

interface GameStore extends GameData {
  userId: string | null;
  /** Load this account's progress and count today's visit. */
  load: (userId: string) => Promise<void>;
  submitQuiz: (score: number) => Promise<void>;
}

const EMPTY: GameData = {
  streak: EMPTY_STREAK, quizBest: 0, quizzesPlayed: 0, lastQuizDay: null, lastQuizScore: null,
};

const key = (userId: string) => `mylookfit.game.${userId}`;

async function read(userId: string): Promise<GameData> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<GameData>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function write(userId: string, data: GameData): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify(data));
  } catch {
    /* progress that cannot be saved is shown for this session only */
  }
}

const pick = (s: GameStore): GameData => ({
  streak: s.streak, quizBest: s.quizBest, quizzesPlayed: s.quizzesPlayed,
  lastQuizDay: s.lastQuizDay, lastQuizScore: s.lastQuizScore,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY,
  userId: null,

  load: async (userId) => {
    const stored = await read(userId);
    const data = { ...stored, streak: nextStreak(stored.streak, localDay()) };
    set({ ...data, userId });
    if (data.streak !== stored.streak) await write(userId, data);
  },

  submitQuiz: async (score) => {
    const { userId } = get();
    const today = localDay();
    if (!userId || get().lastQuizDay === today) return;
    const data: GameData = {
      ...pick(get()),
      quizBest: Math.max(get().quizBest, score),
      quizzesPlayed: get().quizzesPlayed + 1,
      lastQuizDay: today,
      lastQuizScore: score,
    };
    set(data);
    await write(userId, data);
  },
}));

import { useEffect, useMemo } from 'react';

import { badgesFor, levelFor, pointsFor, type ActivityInput } from '../constants/gamification';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { usePassport } from './useBeauty';

/** Everything the Progress tab and the Home header show: level, streak, badges. */
export function useProgress() {
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const passport = usePassport();
  const game = useGameStore();
  const load = useGameStore((s) => s.load);

  useEffect(() => {
    if (userId && game.userId !== userId) void load(userId);
  }, [userId, game.userId, load]);

  const activity: ActivityInput = useMemo(() => {
    const journey = passport.data?.journey;
    return {
      analyses: journey?.analyses ?? 0,
      savedLooks: journey?.savedLooks ?? 0,
      triedLooks: journey?.triedLooks ?? 0,
      activeGoals: journey?.activeGoals ?? 0,
      completion: passport.data?.completion ?? 0,
      streak: game.streak.count,
      bestStreak: game.streak.best,
      quizBest: game.quizBest,
      quizzesPlayed: game.quizzesPlayed,
    };
  }, [passport.data, game.streak, game.quizBest, game.quizzesPlayed]);

  const level = useMemo(() => levelFor(pointsFor(activity)), [activity]);
  const badges = useMemo(() => badgesFor(activity), [activity]);

  return { passport, activity, level, badges, game };
}

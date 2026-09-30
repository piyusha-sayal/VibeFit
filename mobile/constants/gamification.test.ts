import { describe, expect, it } from '@jest/globals';

import {
  EMPTY_STREAK, QUIZ_BANK, QUIZ_LENGTH, badgesFor, dailyQuiz, levelFor, localDay, nextStreak, pointsFor,
  type ActivityInput,
} from './gamification';

const none: ActivityInput = {
  analyses: 0, savedLooks: 0, triedLooks: 0, activeGoals: 0, completion: 0,
  streak: 0, bestStreak: 0, quizBest: 0, quizzesPlayed: 0,
};

describe('streak', () => {
  it('starts at one, holds within a day, grows on consecutive days and restarts after a gap', () => {
    const first = nextStreak(EMPTY_STREAK, '2026-09-01');
    expect(first).toEqual({ last: '2026-09-01', count: 1, best: 1 });
    expect(nextStreak(first, '2026-09-01')).toBe(first);
    const second = nextStreak(first, '2026-09-02');
    expect(second.count).toBe(2);
    const broken = nextStreak(second, '2026-09-05');
    expect(broken).toEqual({ last: '2026-09-05', count: 1, best: 2 });
  });

  it('carries across a month boundary', () => {
    expect(nextStreak({ last: '2026-09-30', count: 4, best: 4 }, '2026-10-01').count).toBe(5);
  });

  it('formats the local day', () => {
    expect(localDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('points and levels', () => {
  it('a brand-new account is a level 1 Newcomer with no badges', () => {
    const level = levelFor(pointsFor(none));
    expect(level).toMatchObject({ level: 1, title: 'Newcomer', points: 0, next: 100 });
    expect(badgesFor(none).every((b) => !b.earned)).toBe(true);
  });

  it('activity earns points, levels and the matching badges', () => {
    const active = { ...none, analyses: 3, savedLooks: 1, completion: 0.5, bestStreak: 3, quizBest: QUIZ_LENGTH, quizzesPlayed: 1 };
    const level = levelFor(pointsFor(active));
    expect(level.level).toBeGreaterThan(1);
    expect(level.progress).toBeGreaterThanOrEqual(0);
    expect(level.progress).toBeLessThanOrEqual(1);
    const earned = badgesFor(active).filter((b) => b.earned).map((b) => b.key);
    expect(earned).toEqual(expect.arrayContaining(['first-scan', 'curious', 'collector', 'half-way', 'streak-3', 'quiz-perfect']));
    expect(earned).not.toContain('complete');
  });

  it('the top level reports full progress and no next threshold', () => {
    expect(levelFor(99_999)).toMatchObject({ next: null, progress: 1 });
  });
});

describe('daily quiz', () => {
  it('gives the same questions all day and valid answers', () => {
    const morning = dailyQuiz(new Date(2026, 8, 1, 8));
    const evening = dailyQuiz(new Date(2026, 8, 1, 22));
    expect(morning).toEqual(evening);
    expect(morning).toHaveLength(QUIZ_LENGTH);
    QUIZ_BANK.forEach((q) => expect(q.options[q.answer]).toBeDefined());
  });

  it('changes the questions the next day', () => {
    expect(dailyQuiz(new Date(2026, 8, 1))).not.toEqual(dailyQuiz(new Date(2026, 8, 2)));
  });
});

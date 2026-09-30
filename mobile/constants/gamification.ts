/**
 * Points, levels, badges and the daily quiz.
 *
 * Everything here is derived from things the person actually did — analyses
 * run, looks saved, days opened, quiz answers — never invented. Pure
 * functions, so the rules are testable without a device.
 */

export interface ActivityInput {
  analyses: number;
  savedLooks: number;
  triedLooks: number;
  activeGoals: number;
  /** Passport completion, 0..1. */
  completion: number;
  streak: number;
  bestStreak: number;
  /** Best daily quiz score ever, 0..QUIZ_LENGTH. */
  quizBest: number;
  quizzesPlayed: number;
}

export interface Badge {
  key: string;
  emoji: string;
  title: string;
  /** How to earn it — shown on a locked badge. */
  hint: string;
  earned: boolean;
}

export interface Level {
  level: number;
  title: string;
  points: number;
  /** Points at which this level started and the next one begins (null at max). */
  floor: number;
  next: number | null;
  /** 0..1 progress towards the next level (1 at max). */
  progress: number;
}

const LEVELS = [
  { floor: 0, title: 'Newcomer' },
  { floor: 100, title: 'Explorer' },
  { floor: 250, title: 'Style Seeker' },
  { floor: 500, title: 'Trendsetter' },
  { floor: 900, title: 'Style Icon' },
  { floor: 1400, title: 'Muse' },
] as const;

export function pointsFor(a: ActivityInput): number {
  return Math.round(
    a.analyses * 50
    + a.savedLooks * 20
    + a.triedLooks * 30
    + a.activeGoals * 15
    + a.completion * 200
    + a.bestStreak * 5
    + a.quizBest * 10
    + a.quizzesPlayed * 5,
  );
}

export function levelFor(points: number): Level {
  let index = 0;
  LEVELS.forEach((l, i) => { if (points >= l.floor) index = i; });
  const current = LEVELS[index];
  const upcoming = LEVELS[index + 1];
  const next = upcoming ? upcoming.floor : null;
  const progress = next === null ? 1 : (points - current.floor) / (next - current.floor);
  return { level: index + 1, title: current.title, points, floor: current.floor, next, progress };
}

export function badgesFor(a: ActivityInput): Badge[] {
  return [
    { key: 'first-scan', emoji: '📸', title: 'First Scan', hint: 'Run your first analysis', earned: a.analyses >= 1 },
    { key: 'curious', emoji: '🔍', title: 'Curious Mind', hint: 'Run 3 analyses', earned: a.analyses >= 3 },
    { key: 'collector', emoji: '💾', title: 'Collector', hint: 'Save your first look', earned: a.savedLooks >= 1 },
    { key: 'lookbook', emoji: '📚', title: 'Lookbook', hint: 'Save 5 looks', earned: a.savedLooks >= 5 },
    { key: 'brave', emoji: '✨', title: 'Brave Try', hint: 'Mark a look as tried', earned: a.triedLooks >= 1 },
    { key: 'goal-getter', emoji: '🎯', title: 'Goal Getter', hint: 'Set a style goal', earned: a.activeGoals >= 1 },
    { key: 'half-way', emoji: '🌗', title: 'Half Way', hint: 'Fill half your passport', earned: a.completion >= 0.5 },
    { key: 'complete', emoji: '🛂', title: 'Passport Ready', hint: 'Complete your passport', earned: a.completion >= 1 },
    { key: 'streak-3', emoji: '🔥', title: 'On Fire', hint: 'Open the app 3 days in a row', earned: a.bestStreak >= 3 },
    { key: 'streak-7', emoji: '🌟', title: 'Week Strong', hint: 'Keep a 7-day streak', earned: a.bestStreak >= 7 },
    { key: 'quiz-played', emoji: '🧠', title: 'Quiz Taker', hint: 'Play the daily quiz', earned: a.quizzesPlayed >= 1 },
    { key: 'quiz-perfect', emoji: '🏆', title: 'Colour Genius', hint: 'Score full marks in a quiz', earned: a.quizBest >= QUIZ_LENGTH },
  ];
}

// ------------------------------------------------------------------ quiz

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  /** One line shown after answering, right or wrong. */
  why: string;
}

export const QUIZ_LENGTH = 3;

export const QUIZ_BANK: QuizQuestion[] = [
  { question: 'Veins that look greenish on your wrist usually suggest…', options: ['Cool undertone', 'Warm undertone', 'No undertone'], answer: 1, why: 'Green-looking veins are a classic sign of warm undertones.' },
  { question: 'Which metal tends to flatter cool undertones?', options: ['Gold', 'Copper', 'Silver'], answer: 2, why: 'Silver and platinum echo the blue-pink base of cool skin.' },
  { question: 'A "Spring" colour season is…', options: ['Warm and light', 'Cool and deep', 'Cool and soft'], answer: 0, why: 'Springs are warm, clear and light — think peach and coral.' },
  { question: 'Which neckline lengthens a round face?', options: ['Crew neck', 'V-neck', 'Turtleneck'], answer: 1, why: 'A V-neck draws the eye down and adds vertical length.' },
  { question: 'Complementary colours sit…', options: ['Next to each other', 'Opposite on the wheel', 'In the same family'], answer: 1, why: 'Opposites on the colour wheel make each other pop.' },
  { question: 'Winters look best in…', options: ['Muted earth tones', 'Clear, high-contrast colours', 'Soft pastels'], answer: 1, why: 'Winters are cool and deep — crisp black, white and jewel tones.' },
  { question: 'Side-swept bangs are often suggested for…', options: ['Square faces', 'Only oval faces', 'Nobody'], answer: 0, why: 'Soft, angled fringes soften a strong jawline.' },
  { question: 'An "Autumn" palette leans…', options: ['Warm and muted', 'Cool and bright', 'Neutral grey'], answer: 0, why: 'Autumns suit rich, warm, earthy shades like rust and olive.' },
  { question: 'Blush for warm undertones usually looks best in…', options: ['Peach or coral', 'Icy pink', 'Lilac'], answer: 0, why: 'Warm peachy blush blends naturally into golden skin.' },
  { question: 'The 60-30-10 rule is about…', options: ['Outfit colour balance', 'Skincare steps', 'Hair length'], answer: 0, why: '60% main colour, 30% secondary, 10% accent keeps a look balanced.' },
  { question: 'Which lip shade suits most "Summer" types?', options: ['Rose pink', 'Orange red', 'Brick brown'], answer: 0, why: 'Summers are cool and soft — dusty rose is a safe favourite.' },
  { question: 'Monochrome dressing means…', options: ['Only black and white', 'Shades of one colour', 'No patterns'], answer: 1, why: 'Tonal shades of a single colour read polished and elongating.' },
];

/** Day number used to rotate content: same questions all day, new ones tomorrow. */
export function dayIndex(date: Date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(start / 86_400_000);
}

export function dailyQuiz(date: Date = new Date()): QuizQuestion[] {
  const offset = (dayIndex(date) * QUIZ_LENGTH) % QUIZ_BANK.length;
  return Array.from({ length: QUIZ_LENGTH }, (_, i) => QUIZ_BANK[(offset + i) % QUIZ_BANK.length]);
}

// ---------------------------------------------------------------- streak

export interface StreakState {
  /** Local calendar day of the last visit, YYYY-MM-DD. */
  last: string | null;
  count: number;
  best: number;
}

export const EMPTY_STREAK: StreakState = { last: null, count: 0, best: 0 };

export function localDay(date: Date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** A visit today: same day keeps the count, the next day extends it, a gap restarts it. */
export function nextStreak(prev: StreakState, today: string): StreakState {
  if (prev.last === today) return prev;
  const gap = prev.last ? daysBetween(prev.last, today) : null;
  const count = gap === 1 ? prev.count + 1 : 1;
  return { last: today, count, best: Math.max(prev.best, count) };
}

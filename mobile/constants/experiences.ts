/**
 * Static navigation content: the five experiences, the small tools, occasions
 * and the daily tip.
 *
 * `SMALL_TOOLS` carries an `available` flag deliberately. A tool that is not
 * built yet stays in this list with `available: false` so it is visible in code
 * review as pending work, and is filtered out of the UI rather than shipped as
 * a button that does nothing.
 */
import type { AccentKey } from './theme';

export interface Experience {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  route: string;
  accent: AccentKey;
  /** Illustrative palette, drawn from the season data this experience leads to. */
  swatches: string[];
}

export const EXPERIENCES: Experience[] = [
  {
    key: 'colors',
    eyebrow: 'Personal colour',
    title: 'Discover My Colors',
    body: 'Your season, undertone and the palettes that follow from them — clothing, makeup, hair and metals.',
    route: '/colors',
    accent: 'blush',
    swatches: ['#c97f86', '#d99873', '#b0894e', '#9187b8'],
  },
  {
    key: 'face',
    eyebrow: 'Face and hair',
    title: 'Discover My Face',
    body: 'Face shape, features, Hair Studio and Makeup Studio.',
    route: '/(tabs)/discover?section=face',
    accent: 'lavender',
    swatches: ['#9187b8', '#7f9480'],
  },
  {
    key: 'style',
    eyebrow: 'Wardrobe',
    title: 'Discover My Style',
    body: 'Silhouettes, fits and a global wardrobe — built from your answers, never from a body photo.',
    route: '/style',
    accent: 'sage',
    swatches: ['#7f9480', '#b0894e'],
  },
  {
    key: 'create',
    eyebrow: 'Put it together',
    title: 'Create My Look',
    body: 'One occasion, one coordinated look, drawn from your passport.',
    route: '/(tabs)/create',
    accent: 'peach',
    swatches: ['#d99873', '#c97f86'],
  },
  {
    key: 'passport',
    eyebrow: 'Everything you',
    title: 'My Beauty Passport',
    body: 'Your profile, saved looks, goals and history in one place.',
    route: '/(tabs)/passport',
    accent: 'gold',
    swatches: ['#b0894e', '#9187b8'],
  },
];

export interface SmallTool {
  label: string;
  route: string;
  accent: AccentKey;
  /** False until the tool actually exists; filtered out of the UI. */
  available: boolean;
}

export const SMALL_TOOLS: SmallTool[] = [
  { label: 'Lipstick', route: '/colors/lipstick', accent: 'blush', available: true },
  { label: 'Blush', route: '/colors/blush', accent: 'peach', available: true },
  { label: 'Eye makeup', route: '/colors/eyeshadow', accent: 'lavender', available: true },
  { label: 'Hair colour', route: '/colors/hair', accent: 'gold', available: true },
  { label: 'Jewellery', route: '/colors/jewellery', accent: 'gold', available: true },
  { label: 'Outfit colours', route: '/colors/outfit', accent: 'sage', available: true },
  { label: 'Clothing', route: '/colors/clothing', accent: 'sage', available: true },
  // Phase 3 — the analysis behind these does not exist yet.
  { label: 'Bangs', route: '/analysis/hair', accent: 'lavender', available: false },
  { label: 'Glasses', route: '/analysis/accessories', accent: 'blush', available: false },
];

export const OCCASIONS = [
  { key: 'everyday', label: 'Everyday' },
  { key: 'office', label: 'Office' },
  { key: 'college', label: 'College' },
  { key: 'date', label: 'Date' },
  { key: 'party', label: 'Party' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'indian_wedding', label: 'Indian wedding' },
  { key: 'festival', label: 'Festival' },
  { key: 'interview', label: 'Interview' },
  { key: 'vacation', label: 'Vacation' },
] as const;

const TIPS = [
  'Hold a colour under your chin in daylight. If your skin looks brighter and the shadows soften, it is working with you.',
  'A season is a starting point, not a rule. The colours outside your palette are still yours to wear.',
  'Phone cameras auto-correct colour. Compare two swatches side by side rather than trusting one photo.',
  'Silver and gold both suit most people; the question is which one your eye goes to first.',
  'A haircut that suits your face shape still has to suit your morning. Maintenance is part of the fit.',
  'Undertone does not change with a tan. Depth does, which is why summer photos can shift a reading.',
];

/** Deterministic per calendar day, so the tip does not change on every render. */
export function tipOfTheDay(date = new Date()): string {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  return TIPS[dayNumber % TIPS.length];
}

/**
 * MyLookFit design system.
 *
 * Light: warm ivory ground, deep charcoal ink, gold as the signature accent.
 * Dark: near-black ground with gold — the same system, not a second palette.
 *
 * The core values come from the supplied MyLookFit brand kit, so the app, the
 * icon and the splash screen are literally the same colours:
 *   Black #080808 · Charcoal #1E1E1E · Rich gold #D4AF37
 *   Champagne #F1D9A7 · Soft ivory #FAF7EE
 *
 * Accent gold is champagne #C9A96E in dark mode; light mode uses a deeper
 * shade of the same hue so gold text keeps 4.5:1 contrast on ivory.
 *
 * Gold carries the brand in both themes, so it is the accent used for primary
 * actions and for anything that should read as premium. The blush / peach /
 * lavender / sage accents stay for categorising, used on small areas and never
 * as a full-bleed wash: a beauty product, not a dashboard.
 *
 * The legacy gold-on-near-black tokens in `constants/colors.ts` still back the
 * older analysis screens; those migrate screen by screen rather than in one
 * sweep that would break working surfaces.
 */

export type ThemeName = 'light' | 'dark';

export interface Palette {
  /** Page ground. */
  bg: string;
  /** Raised surface on the ground: cards. */
  surface: string;
  /** Floating surfaces: sheets, modals, menus. */
  surfaceRaised: string;
  /** A surface on a surface: inputs, inner wells. */
  surfaceAlt: string;
  /** Hairlines and dividers. */
  border: string;
  borderStrong: string;
  /** Primary reading colour. */
  text: string;
  textMuted: string;
  textSubtle: string;
  /** Inverse ink, for filled buttons. */
  onAccent: string;
  /** Accents. Used on small areas, never as a full-bleed wash. */
  blush: string;
  peach: string;
  lavender: string;
  sage: string;
  gold: string;
  /** Tinted fills derived from the accents. */
  blushSoft: string;
  peachSoft: string;
  lavenderSoft: string;
  sageSoft: string;
  goldSoft: string;
  /** Feedback. */
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  /** Scrim for overlays and pressed states. */
  scrim: string;
  shadow: string;
}

const light: Palette = {
  bg: '#faf7ee',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  surfaceAlt: '#f2ecdd',
  border: 'rgba(43,38,34,0.10)',
  borderStrong: 'rgba(43,38,34,0.22)',
  text: '#2b2622',
  textMuted: '#6d635a',
  textSubtle: '#9a8f84',
  onAccent: '#ffffff',
  blush: '#c97f86',
  peach: '#d99873',
  lavender: '#9187b8',
  sage: '#7f9480',
  gold: '#86672a',
  blushSoft: 'rgba(201,127,134,0.12)',
  peachSoft: 'rgba(217,152,115,0.14)',
  lavenderSoft: 'rgba(145,135,184,0.12)',
  sageSoft: 'rgba(127,148,128,0.14)',
  goldSoft: 'rgba(201,169,110,0.18)',
  success: '#4f8a63',
  successSoft: 'rgba(79,138,99,0.12)',
  danger: '#b4554f',
  dangerSoft: 'rgba(180,85,79,0.10)',
  warning: '#9a6a1c',
  warningSoft: 'rgba(154,106,28,0.12)',
  scrim: 'rgba(43,38,34,0.06)',
  shadow: 'rgba(43,38,34,0.10)',
};

const dark: Palette = {
  // Near-black rather than a warm brown: gold reads as gold against it, and
  // the ground disappears on an OLED panel instead of glowing.
  bg: '#080808',
  surface: '#141414',
  surfaceRaised: '#1c1c1c',
  surfaceAlt: '#1e1e1e',
  border: 'rgba(250,247,238,0.10)',
  borderStrong: 'rgba(250,247,238,0.24)',
  text: '#faf7ee',
  textMuted: '#a9a199',
  textSubtle: '#746d66',
  onAccent: '#080808',
  blush: '#e0a0a6',
  peach: '#e8b28d',
  lavender: '#b3a8d8',
  sage: '#a3b8a4',
  // Champagne accent: 8.8:1 on #080808, warmer than the kit's #D4AF37.
  gold: '#c9a96e',
  blushSoft: 'rgba(224,160,166,0.14)',
  peachSoft: 'rgba(232,178,141,0.14)',
  lavenderSoft: 'rgba(179,168,216,0.14)',
  sageSoft: 'rgba(163,184,164,0.14)',
  goldSoft: 'rgba(201,169,110,0.16)',
  success: '#7cc094',
  successSoft: 'rgba(124,192,148,0.14)',
  danger: '#e08a84',
  dangerSoft: 'rgba(224,138,132,0.12)',
  warning: '#e3b76a',
  warningSoft: 'rgba(227,183,106,0.14)',
  scrim: 'rgba(0,0,0,0.55)',
  shadow: 'rgba(0,0,0,0.6)',
};

export const PALETTES: Record<ThemeName, Palette> = { light, dark };

/** 4px base. Every margin and padding comes from here. */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Type scale. Display and h1–h3 are set serif by callers; the rest is sans.
 * `title`, `heading` and `bodySm` are the original names, kept as aliases so
 * existing screens keep their sizes.
 */
export const TYPE = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 18, lineHeight: 24 },
  heading: { fontSize: 19, lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 19 },
  bodySm: { fontSize: 13, lineHeight: 19 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  overline: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' as const },
} as const;

/** Accent rotation, so sibling cards differ without hard-coding a colour each. */
export const ACCENT_KEYS = ['blush', 'peach', 'lavender', 'sage', 'gold'] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

export function accentPair(palette: Palette, key: AccentKey): { fg: string; bg: string } {
  const soft = `${key}Soft` as keyof Palette;
  return { fg: palette[key], bg: palette[soft] as string };
}

/** Minimum touch target, per platform accessibility guidance. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH = 44;

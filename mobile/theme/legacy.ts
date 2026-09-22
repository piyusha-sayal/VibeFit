/**
 * A bridge from the original fixed palette to the themed one.
 *
 * Twelve screens were written against `constants/colors`, whose values are a
 * single hard-coded dark scheme. They are not broken — they are internally
 * consistent — but they stay dark when someone picks light mode, which makes
 * the application look like two applications.
 *
 * Rewriting eighteen hundred lines of layout to fix a colour problem would
 * risk the journeys those screens carry: sign-in, scanning, results, the hair
 * and makeup studios. So instead the same key names are served from the active
 * theme. A screen keeps its structure and its `C.text`, and starts obeying the
 * theme, by turning its static stylesheet into one built per palette.
 *
 * This is a bridge, not a destination. New screens use `components/ds`.
 */
import { useMemo } from 'react';

import type { Palette } from '../constants/theme';
import { useTheme } from './ThemeProvider';

export interface LegacyPalette {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  gold: string;
  goldLight: string;
  goldDim: string;
  goldBorder: string;
  goldGlow: string;
  amber: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  green: string;
  greenDim: string;
  red: string;
  redDim: string;
  redBorder: string;
  /** Hairlines and dividers. Named for the dark scheme they came from. */
  white06: string;
  white08: string;
  white18: string;
  black50: string;
  black92: string;
  card: string;
  hero: string;
  heroAlt: string;
  goldShimmer: string;
  scan: string;
  navBg: string;
}

export interface LegacyGradients {
  card: [string, string];
  hero: [string, string, string];
  heroAlt: [string, string, string];
  scan: [string, string, string];
}

export function legacyPalette(colors: Palette): LegacyPalette {
  return {
    bg: colors.bg,
    surface: colors.surface,
    surface2: colors.surfaceAlt,
    surface3: colors.surfaceAlt,
    gold: colors.gold,
    goldLight: colors.gold,
    goldDim: colors.goldSoft,
    goldBorder: colors.gold,
    goldGlow: colors.goldSoft,
    amber: colors.gold,
    text: colors.text,
    textMuted: colors.textMuted,
    textSubtle: colors.textSubtle,
    green: colors.success,
    greenDim: colors.successSoft,
    red: colors.danger,
    redDim: colors.dangerSoft,
    redBorder: colors.danger,
    // The three "white" values were dividers at three weights. In light mode
    // a white hairline is invisible, so they become the theme's borders.
    white06: colors.border,
    white08: colors.border,
    white18: colors.borderStrong,
    black50: colors.scrim,
    black92: colors.scrim,
    card: colors.surface,
    hero: colors.goldSoft,
    heroAlt: colors.goldSoft,
    goldShimmer: colors.goldSoft,
    scan: colors.surfaceAlt,
    navBg: colors.surface,
  };
}

/**
 * The gradients were three stops of near-black warmed with gold. Rebuilt from
 * the palette so the light theme gets ivory warmed the same way, rather than
 * a dark slab in the middle of a pale screen.
 */
export function legacyGradients(colors: Palette): LegacyGradients {
  return {
    card: [colors.surface, colors.bg],
    hero: [colors.goldSoft, colors.surface, colors.bg],
    heroAlt: [colors.goldSoft, colors.surfaceAlt, colors.bg],
    scan: [colors.surfaceAlt, colors.bg, colors.surfaceAlt],
  };
}

/** The palette, the gradients and the live theme, for a screen being bridged. */
export function useLegacyTheme() {
  const { colors, name, reducedMotion } = useTheme();
  return useMemo(() => ({
    C: legacyPalette(colors),
    GRADIENTS: legacyGradients(colors),
    colors,
    name,
    reducedMotion,
  }), [colors, name, reducedMotion]);
}

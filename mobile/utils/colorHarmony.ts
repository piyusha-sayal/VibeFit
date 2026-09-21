/**
 * Deterministic colour maths for the outfit matcher.
 *
 * Plain arithmetic in HSL — no AI call. Pairing two colours is a geometry
 * problem, and sending it to a model would cost money to produce a worse,
 * non-reproducible answer.
 */

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): Hsl | null {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return null;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

/** Shortest distance around the hue circle, 0–180. */
export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export type HarmonyKind = 'monochrome' | 'analogous' | 'complementary' | 'triadic' | 'neutral-pair' | 'contrast';

export interface Harmony {
  kind: HarmonyKind;
  label: string;
  note: string;
  /** How reliably the pair reads as intentional, 0–1. */
  strength: number;
}

/**
 * HSL saturation alone misreads near-white and near-black: ivory (#f2ece3)
 * reports s = 0.37 despite being visually neutral, because saturation is
 * measured relative to the available range at that lightness. Chroma —
 * saturation scaled by how far the colour sits from white or black — is what
 * the eye actually reads as "colourful".
 */
const NEUTRAL_CHROMA = 0.12;

function chroma({ s, l }: Hsl): number {
  return s * (1 - Math.abs(2 * l - 1));
}

/**
 * Classify a pair. Neutrals are handled first: a near-grey has no meaningful
 * hue relationship, so measuring its hue distance would be noise.
 */
export function describePair(hexA: string, hexB: string): Harmony | null {
  const a = hexToHsl(hexA);
  const b = hexToHsl(hexB);
  if (!a || !b) return null;

  const aNeutral = chroma(a) <= NEUTRAL_CHROMA;
  const bNeutral = chroma(b) <= NEUTRAL_CHROMA;

  if (aNeutral && bNeutral) {
    return {
      kind: 'neutral-pair',
      label: 'Neutral pair',
      note: 'Two quiet colours. Safe, and a good base for one loud accessory.',
      strength: 0.8,
    };
  }
  if (aNeutral || bNeutral) {
    return {
      kind: 'contrast',
      label: 'Colour on a neutral',
      note: 'The neutral lets the colour speak. This is the easiest pairing to wear.',
      strength: 0.95,
    };
  }

  const distance = hueDistance(a.h, b.h);
  const lightnessGap = Math.abs(a.l - b.l);

  if (distance < 15) {
    return {
      kind: 'monochrome',
      label: 'Monochrome',
      note: lightnessGap > 0.18
        ? 'Same hue, different depths — reads deliberate and calm.'
        : 'Very close in both hue and depth. Add a third piece with more contrast.',
      strength: lightnessGap > 0.18 ? 0.85 : 0.5,
    };
  }
  if (distance <= 55) {
    return {
      kind: 'analogous',
      label: 'Analogous',
      note: 'Neighbours on the colour wheel. Harmonious, low-risk, slightly rich.',
      strength: 0.85,
    };
  }
  if (distance >= 150) {
    return {
      kind: 'complementary',
      label: 'Complementary',
      note: 'Opposites. High energy — best when one of the two dominates.',
      strength: 0.7,
    };
  }
  if (distance >= 100) {
    return {
      kind: 'triadic',
      label: 'Triadic-ish',
      note: 'Far apart but not opposite. Bold; usually wants a neutral between them.',
      strength: 0.6,
    };
  }
  return {
    kind: 'contrast',
    label: 'Mid contrast',
    note: 'Neither harmonious nor opposite. Works when the depths differ clearly.',
    strength: lightnessGap > 0.2 ? 0.65 : 0.45,
  };
}

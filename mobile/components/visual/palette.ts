/**
 * Representation values for the illustration system.
 *
 * Every illustration takes a skin tone and, where relevant, a hair texture.
 * They are inputs, never inferred from anything: a screen that shows five
 * hairstyles cycles the tones so the library does not silently default to one
 * appearance. The app never guesses a user's own skin tone for this.
 */

export interface SkinTone {
  key: string;
  /** Base fill. */
  hex: string;
  /** Shadow side, for the simple two-tone shading the illustrations use. */
  shade: string;
}

/** A deliberately wide range, evenly spaced rather than clustered light. */
export const SKIN_TONES: SkinTone[] = [
  { key: 'porcelain', hex: '#f3d9c4', shade: '#e0bfa4' },
  { key: 'light', hex: '#e8c0a0', shade: '#d2a583' },
  { key: 'medium', hex: '#c99a6e', shade: '#ac7f56' },
  { key: 'tan', hex: '#a9744a', shade: '#8c5c38' },
  { key: 'deep', hex: '#7b4a2b', shade: '#5f3620' },
  { key: 'rich', hex: '#4e2d1b', shade: '#3a2013' },
];

export const HAIR_COLOURS: Record<string, string> = {
  black: '#1d1713',
  darkBrown: '#3b2a20',
  brown: '#5c4030',
  auburn: '#7c3218',
  blonde: '#b98a4b',
  grey: '#9a938c',
};

export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily';
export const HAIR_TEXTURES: HairTexture[] = ['straight', 'wavy', 'curly', 'coily'];

/**
 * Pick a tone from a key so a list renders a spread rather than one face
 * repeated. Deterministic, so the same card always looks the same.
 */
export function toneFor(seed: string, offset = 0): SkinTone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SKIN_TONES[(hash + offset) % SKIN_TONES.length];
}

export function textureFor(seed: string): HairTexture {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 17 + seed.charCodeAt(i)) >>> 0;
  return HAIR_TEXTURES[hash % HAIR_TEXTURES.length];
}

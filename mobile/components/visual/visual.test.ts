/**
 * The illustration system's representation guarantees.
 *
 * These are product properties, not rendering details: a library that draws
 * every hairstyle on straight hair, or every makeup look on fair skin, is the
 * failure mode this file exists to catch.
 */
import { describe, expect, it } from '@jest/globals';

import { HAIR_TEXTURES, SKIN_TONES, textureFor, toneFor } from './palette';

describe('skin tones', () => {
  it('spans a genuinely wide range, not a cluster of light tones', () => {
    expect(SKIN_TONES.length).toBeGreaterThanOrEqual(6);

    const luminance = (hex: string) => {
      const v = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    const values = SKIN_TONES.map((t) => luminance(t.hex));
    expect(Math.min(...values)).toBeLessThan(0.3);
    expect(Math.max(...values)).toBeGreaterThan(0.75);
  });

  it('gives every tone its own shading colour', () => {
    for (const tone of SKIN_TONES) {
      expect(tone.shade).not.toBe(tone.hex);
    }
  });
});

describe('deterministic variety', () => {
  it('returns the same tone for the same seed, so cards do not flicker', () => {
    expect(toneFor('box_braids')).toEqual(toneFor('box_braids'));
    expect(textureFor('lob')).toBe(textureFor('lob'));
  });

  it('spreads a real list across several tones rather than repeating one', () => {
    const keys = ['pixie', 'bob', 'locs', 'box_braids', 'lob', 'shag', 'wolf_cut', 'twists'];
    const tones = new Set(keys.map((k) => toneFor(k).key));
    expect(tones.size).toBeGreaterThanOrEqual(3);
  });

  it('covers every hair texture across a real list', () => {
    const keys = ['pixie', 'bob', 'locs', 'box_braids', 'lob', 'shag', 'wolf_cut',
                  'twists', 'fade', 'buzz_cut', 'long_curls', 'u_cut'];
    const textures = new Set(keys.map((k) => textureFor(k)));
    expect(textures.size).toBeGreaterThanOrEqual(3);
    expect(HAIR_TEXTURES).toContain('coily');
    expect(HAIR_TEXTURES).toContain('curly');
  });
});

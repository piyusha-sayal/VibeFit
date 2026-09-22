/**
 * Do different styles actually look different?
 *
 * This is the question the earlier sessions never asked. It is answerable
 * without a device or a screenshot: two styles render identically when they
 * resolve to the same path data, and that is a string comparison.
 *
 * What it cannot tell you is whether a drawing is any *good* — whether the
 * "blunt" outline reads as a blunt bob to a person. That needs eyes on a
 * screen, and it stays unverified until someone looks.
 */
import { describe, expect, it } from '@jest/globals';

import {
  BLUSH_ZONES, CUT_SILHOUETTES, FRINGES, HAIR_SILHOUETTES, LINERS,
  silhouetteFor,
} from './shapes';

// The 29 keys in backend/rules/hair_library.py, by the length it reports.
const CUTS: Record<string, string[]> = {
  short: ['pixie', 'bob', 'french_bob', 'blunt_bob', 'layered_bob',
          'textured_crop', 'crew_cut', 'fade', 'undercut', 'two_block',
          'buzz_cut', 'tapered_coils'],
  medium: ['lob', 'shoulder_layers', 'shag', 'wolf_cut', 'butterfly_cut',
           'hush_cut', 'medium_curls', 'twists', 'box_braids'],
  long: ['long_layers', 'face_framing', 'long_curls', 'u_cut', 'v_cut',
         'straight_cut', 'locs', 'medium_flow'],
};
const ALL_CUTS = Object.values(CUTS).flat();

describe('haircuts', () => {
  it('covers all 29 of the library', () => {
    expect(ALL_CUTS).toHaveLength(29);
    const missing = ALL_CUTS.filter((key) => !CUT_SILHOUETTES[key]);
    expect(missing).toEqual([]);
  });

  it('no longer draws twelve short cuts the same way', () => {
    // The defect: length was the only input, so a buzz cut and a French bob
    // were one drawing. Twelve of them.
    const drawings = new Set(CUTS.short.map((k) => HAIR_SILHOUETTES[silhouetteFor(k, 'short')]));
    expect(drawings.size).toBeGreaterThan(1);
  });

  it('separates the pairs a person would actually compare', () => {
    const pairs: [string, string][] = [
      ['bob', 'long_layers'],
      ['pixie', 'textured_crop'],
      ['butterfly_cut', 'straight_cut'],
      ['blunt_bob', 'layered_bob'],
      ['box_braids', 'long_curls'],
      ['buzz_cut', 'french_bob'],
    ];
    const drawn = (k: string) => HAIR_SILHOUETTES[silhouetteFor(k, lengthOf(k))];
    const identical = pairs.filter(([a, b]) => drawn(a) === drawn(b))
      .map(([a, b]) => `${a} and ${b}`);
    expect(identical).toEqual([]);
  });

  it('draws curly and coily shapes with volume rather than a flat outline', () => {
    for (const key of ['long_curls', 'medium_curls', 'tapered_coils']) {
      expect(silhouetteFor(key, lengthOf(key))).toBe('voluminous');
    }
  });

  it('falls back to a shape rather than to nothing', () => {
    // An unknown key must still draw: a blank card is worse than a generic one.
    expect(HAIR_SILHOUETTES[silhouetteFor('not_a_real_cut', 'long')]).toBeTruthy();
    expect(silhouetteFor('not_a_real_cut', 'short')).toBe('cropped');
  });
});

describe('fringes', () => {
  // The keys in backend/rules/hair_library.py BANGS.
  const BANGS = ['curtain', 'wispy', 'full', 'side_swept', 'see_through',
                 'baby', 'face_framing', 'none'];

  it('has a drawing for every option the library offers', () => {
    for (const key of BANGS) {
      expect(Object.keys(FRINGES)).toContain(key);
    }
  });

  it('draws each one differently', () => {
    const drawn = BANGS.map((k) => FRINGES[k as keyof typeof FRINGES]).filter(Boolean);
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it('draws nothing for no fringe', () => {
    expect(FRINGES.none).toBeNull();
  });
});

describe('what still shares a drawing', () => {
  it('is only the short cuts that genuinely share a silhouette', () => {
    // Stated rather than hidden: a buzz cut, a crew cut and a pixie are the
    // same shape at different lengths, and the schematic says so honestly.
    // Every other cut in the library has its own outline.
    const sharing = ALL_CUTS.filter((k) => silhouetteFor(k, lengthOf(k)) === 'cropped');
    expect(sharing.sort()).toEqual(['buzz_cut', 'crew_cut', 'pixie']);
  });
});

describe('makeup', () => {
  it('puts each blush placement somewhere genuinely different', () => {
    // One fixed pair of circles made every placement look the same.
    const positions = Object.values(BLUSH_ZONES)
      .map((z) => `${z.cx},${z.cy},${z.rx},${z.ry},${z.rotate}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('keeps a draped blush higher on the face than an apple blush', () => {
    expect(BLUSH_ZONES.draped.cy).toBeLessThan(BLUSH_ZONES.apples.cy);
  });

  it('gives each liner a different shape', () => {
    const paths = Object.values(LINERS).map((l) => l.d);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('makes a smudged liner soft and a graphic liner sharp', () => {
    expect(LINERS.smudged.opacity).toBeLessThan(LINERS.graphic.opacity);
    expect(LINERS.smudged.width).toBeGreaterThan(LINERS.tightline.width);
  });
});

function lengthOf(key: string): string {
  return Object.entries(CUTS).find(([, keys]) => keys.includes(key))?.[0] ?? 'medium';
}

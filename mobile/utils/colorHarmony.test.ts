import { describe, expect, it } from '@jest/globals';

import { describePair, hexToHsl, hueDistance } from './colorHarmony';

describe('hexToHsl', () => {
  it('reads a saturated colour', () => {
    const hsl = hexToHsl('#ff0000');
    expect(hsl).not.toBeNull();
    expect(Math.round(hsl!.h)).toBe(0);
    expect(hsl!.s).toBeCloseTo(1, 2);
  });

  it('reads a grey as unsaturated', () => {
    expect(hexToHsl('#808080')!.s).toBe(0);
  });

  it('rejects anything that is not a six-digit hex', () => {
    expect(hexToHsl('#fff')).toBeNull();
    expect(hexToHsl('not a colour')).toBeNull();
  });
});

describe('hueDistance', () => {
  it('takes the short way round the circle', () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
  });

  it('never exceeds half the circle', () => {
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(0, 200)).toBe(160);
  });
});

describe('describePair', () => {
  it('calls near-identical hues monochrome', () => {
    expect(describePair('#c0392b', '#e74c3c')?.kind).toBe('monochrome');
  });

  it('calls neighbouring hues analogous', () => {
    expect(describePair('#e67e22', '#f1c40f')?.kind).toBe('analogous');
  });

  it('calls opposite hues complementary', () => {
    expect(describePair('#c8102e', '#00734a')?.kind).toBe('complementary');
  });

  it('treats a colour on a neutral as the easiest pairing', () => {
    const result = describePair('#c97f86', '#f2ece3');
    expect(result?.kind).toBe('contrast');
    expect(result!.strength).toBeGreaterThan(0.9);
  });

  it('recognises two neutrals together', () => {
    expect(describePair('#f2ece3', '#9a8f84')?.kind).toBe('neutral-pair');
  });

  it('rates a flat monochrome pair lower than one with depth between them', () => {
    const flat = describePair('#c0392b', '#c43a2c')!;
    const layered = describePair('#5d1a13', '#e88a7d')!;
    expect(layered.strength).toBeGreaterThan(flat.strength);
  });

  it('returns null rather than guessing on bad input', () => {
    expect(describePair('#fff', '#000000')).toBeNull();
  });
});

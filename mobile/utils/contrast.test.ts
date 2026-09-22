/**
 * Personal Color Studio is the reason this module exists, so the tests are
 * about real palette colours rather than abstract hex values: a tick drawn in
 * one fixed colour disappears on half of any season's palette.
 */
import { describe, expect, it } from '@jest/globals';

import { contrastRatio, inkOn, meetsAA, relativeLuminance } from './contrast';

const LIGHT = '#ffb997'; // Peach, from Light Spring
const DARK = '#2f2a26';  // A deep neutral, from Deep Autumn

describe('relativeLuminance', () => {
  it('puts black at 0 and white at 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('accepts three-digit hex and a missing hash', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 5);
    expect(relativeLuminance('ffffff')).toBeCloseTo(1, 5);
  });

  it('treats an unparseable value as dark rather than throwing', () => {
    // A palette entry should never crash a screen, whatever the data says.
    expect(relativeLuminance('not-a-colour')).toBe(0);
    expect(relativeLuminance('')).toBe(0);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 3);
    expect(contrastRatio(LIGHT, LIGHT)).toBeCloseTo(1, 5);
  });

  it('does not depend on the order of its arguments', () => {
    expect(contrastRatio(LIGHT, DARK)).toBeCloseTo(contrastRatio(DARK, LIGHT), 6);
  });
});

describe('inkOn', () => {
  it('marks a light swatch with dark ink and a dark one with light', () => {
    expect(inkOn(LIGHT)).toBe('#12100E');
    expect(inkOn(DARK)).toBe('#FFFDF9');
  });

  it('always picks the more readable of the two', () => {
    for (const hex of [LIGHT, DARK, '#ffffff', '#000000', '#808080', '#7f7f7f']) {
      const chosen = inkOn(hex);
      const other = chosen === '#12100E' ? '#FFFDF9' : '#12100E';
      expect(contrastRatio(chosen, hex)).toBeGreaterThanOrEqual(
        contrastRatio(other, hex),
      );
    }
  });

  it('stays legible across a whole season palette', () => {
    // The failure this guards against: one fixed tick colour, invisible on
    // roughly half the swatches it is drawn on.
    const palette = ['#ffb997', '#ff9e8a', '#f7e7ce', '#2f2a26', '#6b4f3a',
                     '#c9d6df', '#1b1b1b', '#fdf6ec'];
    for (const hex of palette) {
      expect(contrastRatio(inkOn(hex), hex)).toBeGreaterThan(3);
    }
  });
});

describe('meetsAA', () => {
  it('holds body text to 4.5 and large text to 3', () => {
    expect(meetsAA('#000000', '#ffffff')).toBe(true);
    expect(meetsAA('#777777', '#ffffff')).toBe(false);
    expect(meetsAA('#777777', '#ffffff', true)).toBe(true);
  });
});

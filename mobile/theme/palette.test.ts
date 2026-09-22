/**
 * No screen may paint from the fixed palette.
 *
 * `constants/colors` is a single hard-coded dark scheme. Twelve screens and
 * nine shared primitives were built against it, which is why light mode used
 * to change appearance halfway through the app. They now take the same key
 * names from the live theme via `theme/legacy`.
 *
 * This is the test that keeps it that way: the failure it guards against is
 * invisible to anyone developing in dark mode.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, jest } from '@jest/globals';
import { sync as glob } from 'glob';

// legacy.ts pulls in ThemeProvider, which reaches for the native storage
// module. This suite only needs the two pure palette functions.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { PALETTES } from '../constants/theme';
import { legacyGradients, legacyPalette } from './legacy';

const ROOT = join(__dirname, '..');
const screens = [
  ...glob('app/**/*.tsx', { cwd: ROOT, absolute: true }),
  ...glob('components/**/*.tsx', { cwd: ROOT, absolute: true }),
];

describe('the fixed palette', () => {
  it('finds the files to check', () => {
    expect(screens.length).toBeGreaterThan(50);
  });

  it.each(screens)('%s does not import it', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/from '.*constants\/colors'/);
  });
});

describe('the bridge', () => {
  it('answers every key the old palette had', () => {
    // A missing key is `undefined` at runtime, which React Native renders as
    // a transparent or black fill rather than throwing.
    for (const palette of [legacyPalette(PALETTES.light), legacyPalette(PALETTES.dark)]) {
      for (const [key, value] of Object.entries(palette)) {
        expect(typeof value).toBe('string');
        expect(`${key}=${value}`).not.toBe(`${key}=`);
      }
    }
  });

  it('gives the two themes genuinely different colours', () => {
    const light = legacyPalette(PALETTES.light);
    const dark = legacyPalette(PALETTES.dark);
    expect(light.bg).not.toBe(dark.bg);
    expect(light.text).not.toBe(dark.text);
    expect(light.surface).not.toBe(dark.surface);
  });

  it('draws every gradient stop from the theme it was asked for', () => {
    // The gradients used to be three fixed stops of near-black, which is a
    // dark slab in the middle of a pale screen. Each stop must now be a
    // colour the active theme actually defines.
    for (const [name, palette] of Object.entries(PALETTES)) {
      const allowed = new Set<string>(Object.values(palette));
      for (const [gradient, stops] of Object.entries(legacyGradients(palette))) {
        for (const stop of stops) {
          expect(`${name}.${gradient}: ${stop}`)
            .toBe(allowed.has(stop) ? `${name}.${gradient}: ${stop}` : 'not from this theme');
        }
      }
    }
  });
});

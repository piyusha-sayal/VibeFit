/**
 * Navigation layouts must take their background from the theme.
 *
 * `constants/colors` is the original fixed dark palette. A layout that paints
 * `C.bg` behind a stack makes light mode look broken between one screen and
 * the next, and the break is invisible to anyone developing in dark mode —
 * which is why it survived until now. This test is cheap and catches it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';
import { sync as glob } from 'glob';

const APP = join(__dirname, '..', 'app');
const layouts = glob('**/_layout.tsx', { cwd: APP, absolute: true });

describe('navigation layouts', () => {
  it('finds the layouts to check', () => {
    expect(layouts.length).toBeGreaterThan(0);
  });

  it.each(layouts)('%s takes its background from the theme', (file) => {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('backgroundColor')) return;
    expect(source).toContain('useTheme');
    expect(source).not.toMatch(/backgroundColor:\s*C\./);
  });
});

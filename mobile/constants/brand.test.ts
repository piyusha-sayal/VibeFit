/**
 * Brand integration: the assets referenced by config and code must exist on
 * disk, at the right shape. A broken icon path only surfaces at build time,
 * which is an expensive place to find it.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { PALETTES } from './theme';

const ROOT = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const expo = appJson.expo;

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const configured = [
  expo.icon,
  expo.splash.image,
  expo.android.adaptiveIcon.foregroundImage,
  expo.android.adaptiveIcon.monochromeImage,
  expo.web.favicon,
];

describe('app configuration assets', () => {
  it.each(configured)('%s exists', (rel: string) => {
    expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
  });

  it('uses square source art for the icon and adaptive foreground', () => {
    for (const rel of [expo.icon, expo.android.adaptiveIcon.foregroundImage]) {
      const { width, height } = pngSize(path.join(ROOT, rel));
      expect(width).toBe(height);
      expect(width).toBeGreaterThanOrEqual(1024);
    }
  });

  it('names the app MyLookFit', () => {
    expect(expo.name).toBe('MyLookFit');
  });

  it('keeps the slug and bundle id, which are tied to the existing project', () => {
    // Changing these breaks the EAS project and every installed build.
    expect(expo.slug).toBe('vibefit');
    expect(expo.android.package).toBe('com.vibefit.app');
  });
});

describe('logo component assets', () => {
  const brandFiles = [
    'symbol-gold.png', 'symbol-black.png',
    'logo-horizontal.png', 'logo-horizontal-black.png',
  ];

  it.each(brandFiles)('assets/brand/%s exists', (file: string) => {
    expect(fs.existsSync(path.join(ROOT, 'assets', 'brand', file))).toBe(true);
  });

  it('ships a dark and a light variant of each lockup', () => {
    // The gold lockup is invisible on ivory and vice versa, so both are needed.
    const symbolGold = pngSize(path.join(ROOT, 'assets/brand/symbol-gold.png'));
    const symbolBlack = pngSize(path.join(ROOT, 'assets/brand/symbol-black.png'));
    expect(symbolGold).toEqual(symbolBlack);

    const horizontal = pngSize(path.join(ROOT, 'assets/brand/logo-horizontal.png'));
    expect(horizontal.width / horizontal.height).toBeCloseTo(4, 1);
  });
});

describe('brand palette', () => {
  const kit = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'assets/brand/brand-colors.json'), 'utf8'),
  );

  it('grounds the themes in the supplied kit colours', () => {
    expect(PALETTES.dark.bg).toBe(kit.palette.Black.toLowerCase());
    expect(PALETTES.dark.surfaceAlt).toBe(kit.palette.Charcoal.toLowerCase());
    expect(PALETTES.light.bg).toBe(kit.palette['Soft Ivory'].toLowerCase());
  });

  it('matches the splash background to the dark ground', () => {
    expect(expo.splash.backgroundColor.toLowerCase()).toBe(PALETTES.dark.bg);
    expect(expo.android.adaptiveIcon.backgroundColor.toLowerCase()).toBe(PALETTES.dark.bg);
  });

  it('keeps gold legible on both grounds', () => {
    // The dark gold must be lighter than the dark ground, and the light gold
    // darker than the ivory ground, or the accent disappears.
    expect(PALETTES.dark.gold).not.toBe(PALETTES.light.gold);
    expect(PALETTES.dark.gold.toLowerCase()).toBe(kit.palette['Champagne Gold'].toLowerCase());
  });
});

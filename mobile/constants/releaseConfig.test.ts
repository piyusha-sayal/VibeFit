/**
 * Release configuration: what a Play Store build is made from. The package is
 * permanent after the first upload and Play only accepts an App Bundle, so a
 * silent regression here would only surface in the Play Console.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const { expo } = read('app.json');
const eas = read('eas.json');

describe('app identity', () => {
  it('ships as MyLookFit under com.mylookfit.app', () => {
    expect(expo.name).toBe('MyLookFit');
    expect(expo.android.package).toBe('com.mylookfit.app');
    expect(expo.ios.bundleIdentifier).toBe('com.mylookfit.app');
    expect(expo.scheme[0]).toBe('mylookfit');
  });

  it('never refers to the legacy package', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')
      + fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8');
    expect(raw).not.toContain('com.vibefit.app');
  });

  it('keeps a semantic marketing version', () => {
    expect(expo.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('Android permissions', () => {
  it('asks only for what the app uses', () => {
    expect(expo.android.permissions).toEqual(['android.permission.CAMERA']);
  });

  it('blocks the microphone and other defaults the app never uses', () => {
    expect(expo.android.blockedPermissions).toEqual(expect.arrayContaining([
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ]));
    const picker = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-image-picker');
    expect(picker[1].microphonePermission).toBe(false);
  });
});

describe('build numbering', () => {
  it('lets EAS own versionCode, so no local value can collide with it', () => {
    expect(eas.cli.appVersionSource).toBe('remote');
    expect(expo.android.versionCode).toBeUndefined();
  });
});

describe('production profile', () => {
  const production = eas.build.production;

  it('builds an App Bundle for the store', () => {
    expect(production.android.buildType).toBe('app-bundle');
    expect(production.distribution).toBe('store');
  });

  it('reads the production environment and increments the build number', () => {
    expect(production.environment).toBe('production');
    expect(production.autoIncrement).toBe(true);
  });

  it('uses EAS-managed signing rather than a local keystore', () => {
    expect(production.credentialsSource ?? 'remote').toBe('remote');
  });
});

describe('preview profile', () => {
  const preview = eas.build.preview;

  it('builds an installable APK from the preview environment', () => {
    expect(preview.android.buildType).toBe('apk');
    expect(preview.distribution).toBe('internal');
    expect(preview.environment).toBe('preview');
  });
});

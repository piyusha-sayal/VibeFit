import { describe, expect, it } from '@jest/globals';

import { resolveIncomingLink } from './deepLink';

describe('resolveIncomingLink', () => {
  it('opens the root for a bare mylookfit:// link', () => {
    expect(resolveIncomingLink('mylookfit://')).toBe('/');
    expect(resolveIncomingLink('mylookfit:///')).toBe('/');
  });

  it('routes a mylookfit:// path to the matching screen', () => {
    expect(resolveIncomingLink('mylookfit://settings/privacy')).toBe('/settings/privacy');
    expect(resolveIncomingLink('mylookfit:///look')).toBe('/look');
  });

  it('keeps the query string', () => {
    expect(resolveIncomingLink('mylookfit://look?id=42')).toBe('/look?id=42');
  });

  it('still accepts legacy vibefit:// links', () => {
    expect(resolveIncomingLink('vibefit://colors')).toBe('/colors');
    expect(resolveIncomingLink('VIBEFIT://colors')).toBe('/colors');
  });

  it('leaves the Google sign-in callback untouched', () => {
    const callback = 'com.mylookfit.app:/oauthredirect?code=abc&state=xyz';
    expect(resolveIncomingLink(callback)).toBe(callback);
  });

  it('leaves plain router paths untouched', () => {
    expect(resolveIncomingLink('/(tabs)')).toBe('/(tabs)');
  });

  it('sends malformed links to the root instead of an error screen', () => {
    expect(resolveIncomingLink('')).toBe('/');
    expect(resolveIncomingLink('mylookfit://%E0%A4%A')).toBe('/');
    expect(resolveIncomingLink('mylookfit://../../etc/passwd')).toBe('/');
    expect(resolveIncomingLink('mylookfit://look\\..\\x')).toBe('/');
    expect(resolveIncomingLink('mylookfit://look%00')).toBe('/');
  });
});

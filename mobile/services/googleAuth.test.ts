import { describe, expect, it } from '@jest/globals';

import {
  GOOGLE_FAILED_MESSAGE, GOOGLE_NO_TOKEN_MESSAGE, googleClientFor, interpretGoogleResponse,
} from './googleAuth';

describe('googleClientFor', () => {
  const ids = { androidClientId: 'android-id', iosClientId: 'ios-id', webClientId: 'web-id' };

  it('uses the Android client on Android', () => {
    expect(googleClientFor('android', ids)).toBe('android-id');
  });

  it('reports no client when the Android id is absent, even if a web id exists', () => {
    expect(googleClientFor('android', { webClientId: 'web-id' })).toBeUndefined();
  });

  it('treats a blank id as absent', () => {
    expect(googleClientFor('android', { androidClientId: '  ' })).toBeUndefined();
  });

  it('uses the matching client on iOS and web', () => {
    expect(googleClientFor('ios', ids)).toBe('ios-id');
    expect(googleClientFor('web', ids)).toBe('web-id');
  });
});

describe('interpretGoogleResponse', () => {
  it('ignores no response yet', () => {
    expect(interpretGoogleResponse(null)).toEqual({ kind: 'none' });
  });

  it('extracts the ID token from a successful exchange', () => {
    expect(interpretGoogleResponse({ type: 'success', authentication: { idToken: 'tok' } }))
      .toEqual({ kind: 'idToken', idToken: 'tok' });
  });

  it('accepts an ID token returned in the callback params', () => {
    expect(interpretGoogleResponse({ type: 'success', params: { id_token: 'tok' } }))
      .toEqual({ kind: 'idToken', idToken: 'tok' });
  });

  it('treats a success callback without a token as an error, not a sign-in', () => {
    expect(interpretGoogleResponse({ type: 'success', authentication: null, params: {} }))
      .toEqual({ kind: 'error', message: GOOGLE_NO_TOKEN_MESSAGE });
  });

  it('passes a provider error through', () => {
    expect(interpretGoogleResponse({ type: 'error', error: { message: 'access_denied' } }))
      .toEqual({ kind: 'error', message: 'access_denied' });
    expect(interpretGoogleResponse({ type: 'error' }))
      .toEqual({ kind: 'error', message: GOOGLE_FAILED_MESSAGE });
  });

  it.each(['cancel', 'dismiss', 'locked', 'opened'])('does nothing when the browser was %s', (type) => {
    expect(interpretGoogleResponse({ type })).toEqual({ kind: 'none' });
  });
});

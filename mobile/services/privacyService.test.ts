/**
 * The export endpoint is the one call in the app that must NOT be camelized.
 * It hands back the server's own column names, and rewriting them would give
 * the user a file that no longer describes their data. That is easy to break
 * by accident and invisible when it breaks, so it gets a test.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('./authService', () => ({ getFreshIdToken: async () => null }));

import { encodeBody } from './api';
import { DELETE_CONFIRMATION } from './privacyService';

describe('privacy request encoding', () => {
  it('sends the deletion payload in snake_case like every other call', () => {
    expect(encodeBody({ confirmation: DELETE_CONFIRMATION, password: 'pw' })).toEqual({
      confirmation: DELETE_CONFIRMATION,
      password: 'pw',
    });
    expect(encodeBody({ photoRetentionConsent: true })).toEqual({
      photo_retention_consent: true,
    });
  });

  it('leaves an exported document untouched when case is preserved', () => {
    const exported = {
      exportedAt: '2026-09-21T00:00:00Z',
      account: { email: 'a@b.com', created_at: '2026-01-01' },
      savedLooks: [{ client_token: 'look-1', payload: { outfit: { pieces: [] } } }],
    };
    expect(encodeBody(exported, true)).toBe(exported);
  });
});

describe('deletion confirmation phrase', () => {
  it('is the exact phrase the backend compares against', () => {
    // backend/services/privacy_service.py: DELETE_CONFIRMATION
    expect(DELETE_CONFIRMATION).toBe('DELETE MY ACCOUNT');
  });

  it('does not match a near miss', () => {
    for (const attempt of ['delete my account', 'DELETE MY ACCOUNT!', 'DELETE ACCOUNT', '']) {
      expect(attempt.trim() === DELETE_CONFIRMATION).toBe(false);
    }
  });

  it('matches once surrounding whitespace is trimmed', () => {
    expect('  DELETE MY ACCOUNT  '.trim() === DELETE_CONFIRMATION).toBe(true);
  });
});

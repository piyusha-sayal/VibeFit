/**
 * The Create My Look client.
 *
 * Two things are worth a test here, because both are silent when they break:
 * a composition must reach the server with its keys intact, and a save token
 * must be unique per attempt so a retry cannot create a second look.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('./authService', () => ({ getFreshIdToken: async () => null }));

import { encodeBody } from './api';
import { newClientToken } from './lookService';

describe('client tokens', () => {
  it('are unique per save attempt', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newClientToken()));
    expect(tokens.size).toBe(200);
  });

  it('fit the column the server stores them in', () => {
    expect(newClientToken().length).toBeLessThanOrEqual(64);
  });
});

describe('case conversion', () => {
  // The interceptor rewrites request bodies to snake_case. A composition is a
  // document the server produced, so rewriting its inner keys would corrupt it
  // — `colourRole` would arrive as `colour_role` and the rules would miss it.
  it('leaves a composition untouched when preserveCase is set', () => {
    const body = {
      composition: { colourRole: 'best', hairColour: { lift: 'low' }, outfit: { pieces: [] } },
    };

    expect(encodeBody(body, true)).toEqual(body);
  });

  it('still converts an ordinary body', () => {
    expect(encodeBody({ bodyType: 'pear' })).toEqual({ body_type: 'pear' });
  });

  it('never touches an upload', () => {
    const form = new FormData();
    expect(encodeBody(form, false)).toBe(form);
  });
});

import { describe, expect, it } from '@jest/globals';

import { evennessWord } from './skinWords';

// Results showed "Evenness 62 out of 100" — a score, which the brand rules out.
describe('evennessWord', () => {
  it('describes evenness in words, never as a number', () => {
    expect(evennessWord(90)).toBe('Even');
    expect(evennessWord(55)).toBe('Mostly even');
    expect(evennessWord(20)).toBe('Varied');
    for (const n of [0, 44, 45, 69, 70, 100]) expect(evennessWord(n)).not.toMatch(/\d/);
  });
});

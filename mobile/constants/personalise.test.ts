import { describe, expect, it } from '@jest/globals';

import { makeupPicks, orderByPicks } from './personalise';

const looks = ['full_glam', 'natural', 'clean_girl', 'office', 'soft_glam'].map((key) => ({ key }));

describe('personalised ordering', () => {
  it('leaves the order alone when nothing was told', () => {
    expect(orderByPicks(looks, makeupPicks(null, null))).toEqual(looks);
  });

  it('brings age-bracket picks first without dropping anything', () => {
    const ordered = orderByPicks(looks, makeupPicks('18-24', 'feminine')).map((l) => l.key);
    expect(ordered[0]).toBe('clean_girl');
    expect(ordered).toHaveLength(looks.length);
    expect(new Set(ordered)).toEqual(new Set(looks.map((l) => l.key)));
  });

  it('leads with light-touch looks for Male', () => {
    const ordered = orderByPicks(looks, makeupPicks('25-34', 'masculine')).map((l) => l.key);
    expect(ordered.slice(0, 2)).toEqual(['natural', 'office']);
  });
});

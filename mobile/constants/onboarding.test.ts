import { describe, expect, it } from '@jest/globals';

import { EXPERIENCES } from './experiences';
import {
  EVERYTHING, INTERESTS, STYLE_CHOICES, UNSURE,
  applyInterest, applyStyle, isEverythingSelected, orderExperiences, recommendedStart,
} from './onboarding';
import { AESTHETICS } from './wardrobe';

describe('interests', () => {
  it('toggles one at a time and keeps the tap order', () => {
    let picked = applyInterest([], 'fashion');
    picked = applyInterest(picked, 'color');
    expect(picked).toEqual(['fashion', 'color']);
    expect(applyInterest(picked, 'fashion')).toEqual(['color']);
  });

  it('stores the five values rather than the word "everything"', () => {
    // A stored "everything" would have to be special-cased by every reader.
    const all = applyInterest([], EVERYTHING);
    expect(all).toEqual(INTERESTS.map((i) => i.value));
    expect(all).not.toContain(EVERYTHING);
    expect(isEverythingSelected(all)).toBe(true);
  });

  it('lets everything be turned back off', () => {
    expect(applyInterest(applyInterest([], EVERYTHING), EVERYTHING)).toEqual([]);
  });
});

describe('style', () => {
  it('uses the shared aesthetic library and invents no new names', () => {
    expect(STYLE_CHOICES).toEqual([...AESTHETICS]);
  });

  it('allows more than one, because most people are more than one', () => {
    const picked = applyStyle(applyStyle([], 'Minimalist'), 'Classic');
    expect(picked).toEqual(['Minimalist', 'Classic']);
  });

  it('keeps "not sure" distinguishable from an unanswered question', () => {
    // Blank means not asked. This means asked, and answered honestly.
    const unsure = applyStyle(['Minimalist'], UNSURE);
    expect(unsure).toEqual([UNSURE]);
    expect(applyStyle(unsure, 'Classic')).toEqual(['Classic']);
  });
});

describe('recommendedStart', () => {
  it('follows the first thing the person tapped', () => {
    expect(recommendedStart(['fashion', 'color'])?.experienceKey).toBe('style');
    expect(recommendedStart(['color', 'fashion'])?.experienceKey).toBe('colors');
  });

  it('sends hair to the face analysis it actually depends on', () => {
    expect(recommendedStart(['hair'])?.experienceKey).toBe('face');
  });

  it('recommends nothing when nothing was chosen', () => {
    expect(recommendedStart([])).toBeNull();
  });

  it('only ever names an experience that exists', () => {
    for (const interest of INTERESTS) {
      const key = recommendedStart([interest.value])?.experienceKey;
      expect(EXPERIENCES.some((e) => e.key === key)).toBe(true);
    }
  });
});

describe('orderExperiences', () => {
  it('puts chosen interests first without removing anything', () => {
    const ordered = orderExperiences(EXPERIENCES, ['looks']);
    expect(ordered[0].key).toBe('create');
    expect(ordered).toHaveLength(EXPERIENCES.length);
  });

  it('never hides an experience, whatever was chosen', () => {
    // An interest is a preference about order, not a filter on the product.
    for (const interest of [[], ['color'], ['hair', 'fashion'], ['nonsense']]) {
      const ordered = orderExperiences(EXPERIENCES, interest);
      expect(new Set(ordered.map((e) => e.key)))
        .toEqual(new Set(EXPERIENCES.map((e) => e.key)));
    }
  });

  it('leaves the default order alone when nothing was chosen', () => {
    expect(orderExperiences(EXPERIENCES, []).map((e) => e.key))
      .toEqual(EXPERIENCES.map((e) => e.key));
  });

  it('does not mutate the list it was given', () => {
    const before = EXPERIENCES.map((e) => e.key);
    orderExperiences(EXPERIENCES, ['looks', 'color']);
    expect(EXPERIENCES.map((e) => e.key)).toEqual(before);
  });
});

describe('what onboarding does not ask', () => {
  const asked = [
    ...INTERESTS.flatMap((i) => [i.label, i.blurb]),
    ...STYLE_CHOICES,
  ].join(' ').toLowerCase();

  it('never asks for a photograph', () => {
    // Nothing here may gate the app behind a camera. The experiences ask for
    // a photograph at the point they need one, with consent handled there.
    expect(asked).not.toMatch(/photo|camera|selfie|upload/);
  });

  it('never asks anyone to classify their body', () => {
    expect(asked).not.toMatch(/body shape|body type|weight|height|figure/);
  });

  it('never asks for an identity it has no business asking for', () => {
    expect(asked).not.toMatch(/ethnicity|race|religion|nationality|gender/);
  });
});

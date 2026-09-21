import { describe, expect, it } from '@jest/globals';

import { ACADEMY_GUIDES, guideBySlug } from './academy';
import { EXPERIENCES, OCCASIONS, SMALL_TOOLS, tipOfTheDay } from './experiences';
import { INSPIRATION } from './inspiration';
import { BODY_GUIDANCE, BODY_TYPES, WARDROBE } from './wardrobe';
import { PALETTES, accentPair } from './theme';

describe('navigation content', () => {
  it('offers exactly the five flagship experiences', () => {
    expect(EXPERIENCES).toHaveLength(5);
    expect(EXPERIENCES.map((e) => e.key)).toEqual(['colors', 'face', 'style', 'create', 'passport']);
  });

  it('never renders a tool that does not exist yet', () => {
    // The home screen filters on `available`; anything false must stay hidden.
    const pending = SMALL_TOOLS.filter((t) => !t.available);
    expect(pending.length).toBeGreaterThan(0);
    expect(SMALL_TOOLS.filter((t) => t.available).every((t) => t.route.startsWith('/'))).toBe(true);
  });

  it('covers the occasions the spec names', () => {
    const keys = OCCASIONS.map((o) => o.key);
    for (const required of ['everyday', 'office', 'wedding', 'indian_wedding', 'festival', 'date', 'interview']) {
      expect(keys).toContain(required);
    }
  });
});

describe('tip of the day', () => {
  it('is stable within a day and moves between days', () => {
    const monday = new Date('2026-09-21T09:00:00Z');
    const mondayLater = new Date('2026-09-21T23:00:00Z');
    const tuesday = new Date('2026-09-22T09:00:00Z');
    expect(tipOfTheDay(monday)).toBe(tipOfTheDay(mondayLater));
    expect(tipOfTheDay(monday)).not.toBe(tipOfTheDay(tuesday));
  });
});

describe('academy', () => {
  it('has a real body for every guide — no placeholder cards', () => {
    for (const guide of ACADEMY_GUIDES) {
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      for (const section of guide.sections) {
        expect(section.body.length).toBeGreaterThan(120);
      }
    }
  });

  it('looks guides up by slug', () => {
    expect(guideBySlug('understanding-personal-color')?.category).toBe('colour');
    expect(guideBySlug('does-not-exist')).toBeUndefined();
  });
});

describe('inspiration', () => {
  it('is not restricted to one region', () => {
    const regions = new Set(INSPIRATION.map((i) => i.region));
    expect(regions.size).toBeGreaterThanOrEqual(4);
    expect([...regions]).toEqual(expect.arrayContaining(['India', 'Global']));
  });

  it('carries palettes rather than photographs of people', () => {
    for (const item of INSPIRATION) {
      expect(item.palette.length).toBeGreaterThanOrEqual(3);
      expect(item.palette.every((hex) => /^#[0-9a-f]{6}$/i.test(hex))).toBe(true);
    }
  });
});

describe('body styling', () => {
  it('lets someone opt out of categorising themselves', () => {
    const keys = BODY_TYPES.map((t) => t.key);
    expect(keys).toContain('unsure');
    expect(keys).toContain('uncategorised');
  });

  it('still gives guidance for the opt-out answers', () => {
    expect(BODY_GUIDANCE.unsure.explore.length).toBeGreaterThan(0);
    expect(BODY_GUIDANCE.uncategorised).toBe(BODY_GUIDANCE.unsure);
  });

  it('gives every selectable type both Indian and global options', () => {
    for (const type of BODY_TYPES) {
      const guide = BODY_GUIDANCE[type.key];
      expect(guide).toBeDefined();
      expect(guide.indian.length).toBeGreaterThan(0);
      expect(guide.global.length).toBeGreaterThan(0);
    }
  });

  it('keeps every wardrobe category available to everyone', () => {
    expect(WARDROBE.some((w) => w.group === 'Indian')).toBe(true);
    expect(WARDROBE.some((w) => w.group === 'Global')).toBe(true);
    // No item carries a gate of any kind — the library is not region-locked.
    expect(Object.keys(WARDROBE[0])).toEqual(['name', 'group', 'occasion', 'note']);
  });
});

describe('theme', () => {
  it('defines both themes with the same token set', () => {
    expect(Object.keys(PALETTES.light).sort()).toEqual(Object.keys(PALETTES.dark).sort());
  });

  it('pairs each accent with its soft fill', () => {
    const pair = accentPair(PALETTES.light, 'blush');
    expect(pair.fg).toBe(PALETTES.light.blush);
    expect(pair.bg).toBe(PALETTES.light.blushSoft);
  });
});

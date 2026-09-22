/**
 * Visible text that is never spoken.
 *
 * The per-screen audit found `accessibilityLiveRegion` used **zero** times
 * across 79 screens. Every error banner, every loading label and the Look
 * Builder's "Draft saved" line was visible to one user and silent to another
 * — and the silent half is exactly the half that cannot see the change.
 *
 * This reads the sources rather than rendering, because the failure is a
 * missing attribute. Whether TalkBack then speaks it at the right moment is a
 * device question, and this file does not claim to answer it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';

const DS = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
const BUILDER = readFileSync(
  join(__dirname, '..', '..', 'app', 'look', 'builder.tsx'), 'utf8');

/** The body of one exported component, up to the next export. */
function component(source: string, name: string): string {
  const start = source.indexOf(`export function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = source.indexOf('\nexport function ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

describe('ErrorState', () => {
  const body = component(DS, 'ErrorState');

  it('interrupts, because an unheard error cannot be acted on', () => {
    expect(body).toContain('accessibilityLiveRegion="assertive"');
  });

  it('is announced as an alert', () => {
    expect(body).toContain('accessibilityRole="alert"');
  });
});

describe('LoadingState', () => {
  const body = component(DS, 'LoadingState');

  it('announces politely rather than going quiet', () => {
    expect(body).toContain('accessibilityLiveRegion="polite"');
  });

  it('carries its label, not just a spinner', () => {
    // accessibilityRole="progressbar" with no label announces nothing useful.
    expect(body).toContain('accessibilityLabel={label}');
  });
});

describe('EmptyState', () => {
  it('marks its title as a heading so it can be navigated to', () => {
    expect(component(DS, 'EmptyState')).toContain('accessibilityRole="header"');
  });
});

describe('Txt', () => {
  const body = component(DS, 'Txt');

  it('can carry a live region for a screen that owns a status line', () => {
    expect(body).toContain('accessibilityLiveRegion={live}');
  });

  it('offers both urgencies and nothing else', () => {
    expect(DS).toContain("live?: 'polite' | 'assertive';");
  });
});

describe('the Look Builder', () => {
  it('announces whether the look was saved', () => {
    // "Whether the change was saved" is the thing a screen reader user could
    // not find out here: the status line was visible and silent.
    expect(BUILDER).toMatch(/live="polite"[\s\S]{0,400}Draft saved/);
  });

  it('announces that an update is in flight', () => {
    expect(BUILDER).toMatch(/live="polite">Updating the look/);
  });
});

/**
 * Every route the app pushes must exist.
 *
 * expo-router resolves paths at runtime, so a renamed or deleted screen fails
 * silently as a tap that does nothing — the kind of break that survives a
 * whole release because nobody happened to press that one button. This walks
 * every literal `router.push`/`replace`/`href` in the app and checks a file
 * backs it.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';
import { sync as glob } from 'glob';

const APP = join(__dirname, '..', 'app');
const sources = glob('**/*.tsx', { cwd: APP, absolute: true });

/** '/look/builder?draftId=x' -> ['look', 'builder'] */
function segments(route: string): string[] {
  return route.split('?')[0].split('#')[0].split('/')
    .filter(Boolean)
    .map((s) => s.replace(/\$\{.*?\}/g, '*'));
}

function resolves(parts: string[]): boolean {
  if (parts.length === 0) return true; // '/' is app/index.tsx
  const literal = join(APP, ...parts);
  if (existsSync(`${literal}.tsx`) || existsSync(join(literal, 'index.tsx'))) return true;
  // A template segment stands in for a dynamic one: look for [param].tsx.
  const parent = join(APP, ...parts.slice(0, -1));
  return glob('*.tsx', { cwd: parent, absolute: true })
    .some((f) => /\[[^\]]+\]\.tsx$/.test(f));
}

const ROUTE = /(?:router\.(?:push|replace|navigate)|href=)\(?[`'"](\/[^`'"]*)[`'"]/g;

const found = new Map<string, string>();
for (const file of sources) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(ROUTE)) {
    if (!found.has(match[1])) found.set(match[1], file);
  }
}

describe('navigation targets', () => {
  it('finds routes to check', () => {
    expect(found.size).toBeGreaterThan(20);
  });

  it.each([...found.keys()].sort())('%s resolves to a screen', (route) => {
    expect(resolves(segments(route))).toBe(true);
  });
});

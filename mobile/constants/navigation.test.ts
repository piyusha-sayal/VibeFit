/**
 * Navigation content: every route a card points at must exist as a file.
 *
 * A button that navigates nowhere is worse than no button, and this is the
 * cheapest way to catch one.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { EXPERIENCES, SMALL_TOOLS } from './experiences';

const APP_DIR = path.join(__dirname, '..', 'app');

/** Resolve an expo-router path to a file on disk, allowing for dynamic segments. */
function routeExists(route: string): boolean {
  const clean = route.split('?')[0].replace(/^\//, '');
  if (!clean) return fs.existsSync(path.join(APP_DIR, 'index.tsx'));

  const candidates = [
    path.join(APP_DIR, `${clean}.tsx`),
    path.join(APP_DIR, clean, 'index.tsx'),
  ];
  if (candidates.some((c) => fs.existsSync(c))) return true;

  // A dynamic route: the last real segment may be matched by [param].tsx.
  const segments = clean.split('/');
  const parent = path.join(APP_DIR, ...segments.slice(0, -1));
  if (!fs.existsSync(parent)) return false;
  return fs.readdirSync(parent).some((file) => /^\[.+\]\.tsx$/.test(file));
}

describe('experience routes', () => {
  it.each(EXPERIENCES.map((e) => [e.title, e.route] as const))(
    '%s points at a real screen',
    (_title: string, route: string) => {
      expect(routeExists(route)).toBe(true);
    },
  );
});

describe('small tools', () => {
  const available = SMALL_TOOLS.filter((t) => t.available);

  it('shows only tools that exist', () => {
    expect(available.length).toBeGreaterThan(0);
    available.forEach((tool) => {
      expect({ label: tool.label, exists: routeExists(tool.route) })
        .toEqual({ label: tool.label, exists: true });
    });
  });

  it('keeps the Phase 3 studios reachable from the home tools', () => {
    const routes = available.map((t) => t.route);
    expect(routes).toEqual(expect.arrayContaining([
      '/hair/cuts', '/hair/bangs', '/makeup', '/accessories/glasses',
    ]));
  });
});

describe('Create My Look', () => {
  // Every route the studio, the homepage and the Passport push to.
  it.each([
    '/(tabs)/create',
    '/look/new',
    '/look/builder',
    '/look/compare',
    '/look/abc123',
  ])('%s resolves to a screen', (route: string) => {
    expect(routeExists(route)).toBe(true);
  });
});

describe('legacy analysis screens', () => {
  // Phase 3 replaced these in navigation, but the screens still work and are
  // deliberately not deleted until the replacements have been used in anger.
  it.each(['analysis/hair', 'analysis/makeup', 'analysis/accessories', 'analysis/facial-canon'])(
    '%s still exists',
    (route: string) => {
      expect(routeExists(`/${route}`)).toBe(true);
    },
  );
});

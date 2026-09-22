/**
 * A blank screen and a frozen screen look identical.
 *
 * The launch gate rendered `null` while it decided where to send the user. On
 * a fresh install that decision needs the network, and the free plan sleeps
 * after fifteen minutes, so the first launch could show nothing at all for the
 * better part of a minute. Reported from a phone as "so slow, stuck on first
 * page" — which is what an unexplained wait is, whatever the cause.
 *
 * These read the sources, because the defect is a missing branch rather than a
 * rendering bug. Whether the wait feels acceptable on a real device is a
 * device question, and this file does not claim to answer it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from '@jest/globals';

const ROOT = join(__dirname, '..', '..');
const GATE = readFileSync(join(ROOT, 'app', 'index.tsx'), 'utf8');
const LOGIN = readFileSync(join(ROOT, 'app', '(auth)', 'login.tsx'), 'utf8');

describe('the launch gate', () => {
  it('shows something once the wait stops being momentary', () => {
    expect(GATE).toContain('<Waking');
  });

  it('still renders nothing for the first instant, so a fast path does not flicker', () => {
    expect(GATE).toMatch(/waited === 0\) return null/);
  });

  it('explains a long wait rather than spinning in silence', () => {
    expect(GATE).toMatch(/Waking the service/);
    expect(GATE).toMatch(/sleeps when it has not been used/);
  });

  it('announces the wait to a screen reader', () => {
    // An unexplained wait is worse, not better, when the screen is unread.
    expect(GATE).toContain('accessibilityLiveRegion="polite"');
  });

  it('still refuses to guess where to send the launch', () => {
    // The fix is to show the wait, not to shorten it by redirecting early:
    // bouncing a signed-in user to login is the bug this gate exists to stop.
    expect(GATE).toContain("if (!isAuthenticated) return <Redirect href=\"/(auth)/login\" />");
    expect(GATE).toMatch(/status === 'required' \|\| status === 'partial'/);
  });
});

describe('sign in', () => {
  it('carries the cold-start banner, not only the home screen', () => {
    expect(LOGIN).toContain('<WakingBanner />');
    expect(LOGIN).toContain("from '../../components/ds/WakingBanner'");
  });
});

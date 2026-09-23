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
const WAKING = readFileSync(join(ROOT, 'components', 'ds', 'WakingScreen.tsx'), 'utf8');
const ONBOARDING = readFileSync(join(ROOT, 'app', '(auth)', 'onboarding.tsx'), 'utf8');

describe('the launch gate', () => {
  it('shows something once the wait stops being momentary', () => {
    expect(GATE).toContain('<WakingScreen />');
  });

  it('stops waiting on the server and goes in anyway', () => {
    // The whole defect: a forty-five second cold start held the entire app.
    expect(GATE).toMatch(/GIVE_UP_MS = 5_000/);
    expect(GATE).toMatch(/waited >= GIVE_UP_MS/);
  });

  it('lands an unanswered launch somewhere with a way out', () => {
    // 'unknown' means the server never replied. Onboarding is skippable and
    // carries "Explore anyway"; a passport-less home screen is a dead end.
    expect(GATE).toMatch(/status === 'unknown'/);
  });

  it('still renders nothing for the first instant, so a fast path does not flicker', () => {
    expect(GATE).toMatch(/waited === 0\) return null/);
  });

  it('explains a long wait rather than spinning in silence', () => {
    expect(WAKING).toMatch(/Waking the service/);
    expect(WAKING).toMatch(/rests when nobody has used it/);
  });

  it('says something different as the wait lengthens', () => {
    // One frozen line for forty-five seconds reads as a hang whatever it says.
    expect(WAKING).toMatch(/after: 6_000/);
    expect(WAKING).toMatch(/after: 25_000/);
  });

  it('honours reduced motion instead of animating regardless', () => {
    expect(WAKING).toMatch(/if \(reducedMotion\) return undefined;/);
    // Still deliberate when still: a blank screen is not the fallback.
    expect(WAKING).toMatch(/Reduced motion gets a still bar/);
  });

  it('announces the wait to a screen reader', () => {
    // An unexplained wait is worse, not better, when the screen is unread.
    expect(WAKING).toContain('accessibilityLiveRegion="polite"');
    expect(WAKING).toMatch(/accessibilityLabel=\{`\$\{stage\.title\}/);
  });

  it('does not make the last onboarding step hang on the same cold start', () => {
    expect(ONBOARDING).toMatch(/FINISH_TIMEOUT_MS = 6_000/);
    expect(ONBOARDING).toMatch(/Promise\.race/);
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

describe('the splash screen', () => {
  const LAYOUT = readFileSync(join(ROOT, 'app', '_layout.tsx'), 'utf8');

  it('does not discard the font error', () => {
    // Discarding it is what trapped the app: a failed face left `fontsLoaded`
    // false for ever, so the root returned null for ever and the splash was
    // never hidden. A black screen with a tagline and nothing to press.
    expect(LAYOUT).toContain('const [fontsLoaded, fontError] = useFonts({');
  });

  it('starts anyway when the fonts do not arrive', () => {
    expect(LAYOUT).toMatch(/FONT_TIMEOUT_MS = 3_000/);
    expect(LAYOUT).toMatch(/fontsLoaded \|\| Boolean\(fontError\) \|\| fontsGaveUp/);
  });

  it('hides the splash on every path out of the wait, not just the happy one', () => {
    // The splash covers the whole screen; leaving it up is indistinguishable
    // from a crash, so every exit has to take it down.
    expect(LAYOUT).toMatch(/if \(ready\) SplashScreen\.hideAsync\(\)/);
  });

  it('renders the app rather than nothing once it is ready', () => {
    expect(LAYOUT).toMatch(/if \(!ready\) return null;/);
  });
});

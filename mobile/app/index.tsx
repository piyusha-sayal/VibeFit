import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';

import { AgeGate } from '../components/ds/AgeGate';
import { LockScreen } from '../components/ds/LockScreen';
import { WakingScreen } from '../components/ds/WakingScreen';
import { useAuthStore } from '../store/authStore';
import { useEligibilityStore } from '../store/eligibilityStore';
import { useLockStore } from '../store/lockStore';
import { useOnboardingStore } from '../store/onboardingStore';

/** Below this, anything on screen is a flicker rather than reassurance. */
const PATIENCE_MS = 400;
/**
 * How long the launch will wait for the server before going ahead without it.
 *
 * The free plan takes about forty-five seconds to wake, and blocking the whole
 * app on that is what "stuck on the first screen" was. Nothing here actually
 * needs the server: onboarding is skippable, and the home screen fills itself
 * in as its own queries land. So after this, the launch proceeds on what is
 * cached and the answer is reconciled when it arrives.
 */
const GIVE_UP_MS = 5_000;

/**
 * The one place that decides where an app launch lands.
 *
 * Four states: signed out, new, half way through, and returning. Rendering
 * the home screen while the answer is still unknown is what produces the
 * flash-then-bounce, so this does not do that — but it shows the wait rather
 * than hiding it.
 */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const userId = useAuthStore((s) => s.user?.id);
  const status = useOnboardingStore((s) => s.status);
  const resolve = useOnboardingStore((s) => s.resolve);
  const lockState = useLockStore((s) => s.state);
  const checkLock = useLockStore((s) => s.check);
  const eligibility = useEligibilityStore((s) => s.state);
  const checkEligibility = useEligibilityStore((s) => s.check);
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    if (isAuthenticated && userId) void resolve(userId);
  }, [isAuthenticated, userId, resolve]);

  useEffect(() => {
    if (isAuthenticated && userId) void checkLock(userId);
  }, [isAuthenticated, userId, checkLock]);

  useEffect(() => {
    if (isAuthenticated && userId) void checkEligibility(userId);
  }, [isAuthenticated, userId, checkEligibility]);

  // Reading the stored session is local and quick, so that wait is not
  // negotiable — redirecting before it lands would bounce a signed-in user
  // out to login. Waiting on the *server* is a different matter.
  const answered = !isAuthenticated
    || (status !== 'unknown' && status !== 'resolving');
  const settled = !isRestoring && (answered || waited >= GIVE_UP_MS);

  useEffect(() => {
    if (!isRestoring && answered) return undefined;
    const patience = setTimeout(() => setWaited(PATIENCE_MS), PATIENCE_MS);
    const giveUp = setTimeout(() => setWaited(GIVE_UP_MS), GIVE_UP_MS);
    return () => { clearTimeout(patience); clearTimeout(giveUp); };
  }, [isRestoring, answered]);

  if (!settled) {
    if (waited === 0) return null;
    return <WakingScreen />;
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // The lock sits after "is there a session" and before "which screen", so a
  // locked phone reveals neither the home screen nor how far through
  // onboarding this account is.
  if (lockState === 'unknown' || lockState === 'checking') return null;
  if (lockState === 'locked') return <LockScreen />;

  // 18+ is asked once per account, before anything that handles a photo.
  // The device remembers the answer, so only a new device waits on the server.
  if (eligibility === 'unknown' || eligibility === 'reading') return null;
  if (eligibility === 'asking') return <WakingScreen />;
  if (eligibility === 'required' || eligibility === 'declined') return <AgeGate />;

  // 'partial' goes back to onboarding, where the draft is waiting and every
  // step can still be skipped.
  //
  // 'unknown' means the server never answered in time. Onboarding is the safe
  // landing for that: every step after the first can be skipped, it carries an
  // "Explore anyway" way out, and it writes nothing until the user does. The
  // alternative — dropping someone into a home screen with no passport — looks
  // like an empty app rather than a slow one.
  if (status === 'required' || status === 'partial' || status === 'unknown'
    || status === 'resolving') {
    return <Redirect href="/(auth)/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}

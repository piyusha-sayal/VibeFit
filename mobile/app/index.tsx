import { useEffect } from 'react';
import { Redirect } from 'expo-router';

import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * The one place that decides where an app launch lands.
 *
 * Four states, resolved before anything renders: signed out, new, half way
 * through, and returning. Rendering the home screen while the answer is still
 * unknown is what produces the flash-then-bounce, so this renders nothing
 * until it has one — the splash background covers the wait.
 */
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  const userId = useAuthStore((s) => s.user?.id);
  const status = useOnboardingStore((s) => s.status);
  const resolve = useOnboardingStore((s) => s.resolve);

  useEffect(() => {
    if (isAuthenticated && userId) void resolve(userId);
  }, [isAuthenticated, userId, resolve]);

  // Redirecting before the persisted session is read would bounce a signed-in
  // user to login. The splash background covers this brief wait.
  if (isRestoring) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // Signed in, but we do not yet know which kind of user this is.
  if (status === 'unknown' || status === 'resolving') return null;

  // 'partial' goes back to onboarding, where the draft is waiting and every
  // step can still be skipped.
  if (status === 'required' || status === 'partial') {
    return <Redirect href="/(auth)/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { Txt } from '../components/ds';
import { SPACE } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

/** Below this, a spinner is a flicker rather than reassurance. */
const PATIENCE_MS = 600;
/** Past this, say why it is taking so long instead of spinning silently. */
const COLD_START_MS = 6_000;

/**
 * A blank screen and a frozen screen look identical.
 *
 * This gate used to render `null` while it worked out where to send the
 * launch. On a fresh install the answer needs the network, and the free plan
 * sleeps after fifteen minutes idle, so the first request can take the better
 * part of a minute to wake it. For that whole time the app showed nothing at
 * all — no spinner, no message — which reads as a hang, not as work.
 *
 * The cold-start banner already existed but lives on the home screen, which
 * is precisely the screen nobody stuck here has reached. So this one says so
 * itself.
 */
function Waking({ slow }: { slow: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SPACE.xl, backgroundColor: colors.bg,
      }}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      accessibilityLabel={slow ? 'Waking the service' : 'Loading'}
    >
      <ActivityIndicator color={colors.gold} />
      <Txt variant="bodySm" tone="muted"
           style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
        {slow ? 'Waking the service…' : 'Getting things ready…'}
      </Txt>
      {slow ? (
        <Txt variant="caption" tone="subtle"
             style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
          The server sleeps when it has not been used for a while. The first
          start after that takes up to a minute.
        </Txt>
      ) : null}
    </View>
  );
}

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
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    if (isAuthenticated && userId) void resolve(userId);
  }, [isAuthenticated, userId, resolve]);

  const settled = !isRestoring
    && (!isAuthenticated || (status !== 'unknown' && status !== 'resolving'));

  useEffect(() => {
    if (settled) return undefined;
    const patience = setTimeout(() => setWaited(PATIENCE_MS), PATIENCE_MS);
    const cold = setTimeout(() => setWaited(COLD_START_MS), COLD_START_MS);
    return () => { clearTimeout(patience); clearTimeout(cold); };
  }, [settled]);

  // Redirecting before the persisted session is read would bounce a signed-in
  // user to login, so the wait itself is not negotiable — only its silence.
  if (!settled) {
    if (waited === 0) return null;
    return <Waking slow={waited >= COLD_START_MS} />;
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // 'partial' goes back to onboarding, where the draft is waiting and every
  // step can still be skipped.
  if (status === 'required' || status === 'partial') {
    return <Redirect href="/(auth)/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}

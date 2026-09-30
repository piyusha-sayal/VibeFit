import { useCallback, useEffect, useState } from 'react';

import * as biometrics from '../services/biometrics';
import { useAuthStore } from '../store/authStore';

/**
 * The fingerprint / face unlock switch, shared by Settings, Profile and the
 * offer on Home so all three read and change the same thing.
 *
 * The capability is asked for fresh because a sensor can be enrolled or
 * cleared in device settings while the app is open.
 */
export function useBiometricLock() {
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const [enabled, setEnabledState] = useState(false);
  const [capability, setCapability] = useState<biometrics.BiometricCapability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cap = await biometrics.capability();
      const on = userId ? await biometrics.isEnabled(userId) : false;
      if (cancelled) return;
      setCapability(cap);
      setEnabledState(on);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const toggle = useCallback(async (next: boolean): Promise<boolean> => {
    if (!userId || busy) return false;
    setBusy(true);
    setError(null);
    // Both directions prove it is the same person first, so that a phone
    // handed over unlocked cannot quietly have the lock removed.
    const result = await biometrics.setEnabled(userId, next);
    if (result.ok) setEnabledState(next);
    else if (result.error) setError(result.error);
    setBusy(false);
    return result.ok;
  }, [userId, busy]);

  return {
    enabled,
    capability,
    label: biometrics.labelFor(capability?.kind ?? 'none'),
    error,
    busy,
    toggle,
  };
}

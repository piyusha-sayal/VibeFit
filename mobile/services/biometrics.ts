/**
 * Unlocking the app with a fingerprint or a face.
 *
 * What this is, precisely: the Firebase session is already persisted on the
 * device, so a returning user is signed in before they touch anything. This
 * puts a lock in front of that session. It does not re-authenticate with the
 * server, and it does not encrypt the stored token — someone with the unlocked
 * phone and the right tools could still read it. It stops the ordinary case:
 * another person picking up the phone and opening MyLookFit.
 *
 * It is off until the user turns it on, per account, and turning it off needs
 * a successful unlock first so that a borrowed phone cannot simply disable it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricKind = 'fingerprint' | 'face' | 'iris' | 'none';

export interface BiometricCapability {
  /** Hardware present and at least one credential enrolled. */
  available: boolean;
  kind: BiometricKind;
  /** What to show the user when it cannot be offered. Null when it can. */
  reason: string | null;
}

const key = (userId: string) => `biometric.enabled.${userId}`;

/**
 * Read at call time, not at import time.
 *
 * Building this map while the module loads makes importing the module fail
 * outright if the native enum is not there yet — which is the case under a
 * test double, and would be the case on a platform without the module.
 */
function kindFor(type: number | undefined): BiometricKind {
  const types = LocalAuthentication.AuthenticationType;
  if (type === undefined || !types) return 'none';
  if (type === types.FINGERPRINT) return 'fingerprint';
  if (type === types.FACIAL_RECOGNITION) return 'face';
  if (type === types.IRIS) return 'iris';
  return 'none';
}

/** What this device can actually do, asked fresh — enrolment can change. */
export async function capability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, kind: 'none',
        reason: 'This device has no fingerprint or face sensor.' };
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const kind = kindFor(types[0]);
    if (!enrolled) {
      return { available: false, kind,
        reason: 'No fingerprint or face is set up on this device yet. '
          + 'Add one in your device settings, then come back.' };
    }
    return { available: true, kind, reason: null };
  } catch {
    // A device that cannot answer is a device that cannot be relied on.
    return { available: false, kind: 'none',
      reason: 'This device could not report whether it supports unlocking.' };
  }
}

/** Human wording for a capability, so screens do not each invent their own. */
export function labelFor(kind: BiometricKind): string {
  if (kind === 'face') return 'face unlock';
  if (kind === 'iris') return 'iris unlock';
  if (kind === 'fingerprint') return 'fingerprint';
  return 'device unlock';
}

export interface UnlockResult {
  ok: boolean;
  /** True when the person dismissed it rather than failing it. */
  cancelled: boolean;
  error: string | null;
}

/**
 * Ask for the fingerprint or face.
 *
 * The device passcode stays available as a fallback: refusing it would lock
 * out anyone whose sensor stops reading, which is a worse failure than the
 * one this feature prevents.
 */
export async function unlock(prompt = 'Unlock MyLookFit'): Promise<UnlockResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) return { ok: true, cancelled: false, error: null };
    const cancelled = result.error === 'user_cancel'
      || result.error === 'system_cancel' || result.error === 'app_cancel';
    return {
      ok: false,
      cancelled,
      error: cancelled ? null : 'That did not match. Try again.',
    };
  } catch {
    return { ok: false, cancelled: false, error: 'Unlocking is unavailable on this device.' };
  }
}

export async function isEnabled(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === '1';
  } catch {
    return false;
  }
}

/**
 * Turn the lock on or off.
 *
 * Both directions require a successful unlock: turning it on proves the
 * sensor works before the user relies on it, and turning it off stops someone
 * holding an unlocked phone from quietly removing the lock.
 */
export async function setEnabled(userId: string, next: boolean): Promise<UnlockResult> {
  const result = await unlock(next ? 'Confirm it is you' : 'Confirm before turning this off');
  if (!result.ok) return result;
  try {
    if (next) await AsyncStorage.setItem(key(userId), '1');
    else await AsyncStorage.removeItem(key(userId));
    return result;
  } catch {
    return { ok: false, cancelled: false, error: 'The setting could not be saved.' };
  }
}

/** Signing out should not leave a lock behind for the next account. */
export async function forget(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(userId));
  } catch {
    /* nothing to clean up is not a failure */
  }
}

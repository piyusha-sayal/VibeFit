/**
 * Native Google sign-in (@react-native-google-signin/google-signin, Original
 * API). Returns a Google ID token for Firebase; it never talks to our backend.
 *
 * Android needs no redirect URI, custom URI scheme or google-services.json:
 * Google matches the app by package name and signing certificate (the Android
 * OAuth client), and the web client id is what makes it return an ID token.
 */
import {
  GoogleSignin, isCancelledResponse, isErrorWithCode, isSuccessResponse, statusCodes,
} from '@react-native-google-signin/google-signin';

export type GooglePlatform = 'android' | 'ios' | 'web' | string;

export interface GoogleClientIds {
  webClientId?: string;
  iosClientId?: string;
}

export const GOOGLE_UNAVAILABLE_MESSAGE =
  'Google sign-in is not available in this version yet. Please use your email and password.';
export const GOOGLE_NO_TOKEN_MESSAGE = 'Google sign-in did not complete. Please try again.';
export const GOOGLE_FAILED_MESSAGE = 'Google sign-in failed. Please try again.';
export const GOOGLE_PLAY_SERVICES_MESSAGE =
  'Google Play services is missing or out of date on this phone. Update it, or use your email and password.';

export type GoogleOutcome =
  | { kind: 'idToken'; idToken: string }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

const present = (id?: string) => Boolean(id?.trim());

/** Whether this build can offer Google sign-in on this platform. */
export function googleSignInReady(platform: GooglePlatform, ids: GoogleClientIds): boolean {
  if (platform === 'android') return present(ids.webClientId);
  if (platform === 'ios') return present(ids.webClientId) && present(ids.iosClientId);
  return false;
}

let configuredFor: string | null = null;

function configure(ids: GoogleClientIds): void {
  const key = `${ids.webClientId}|${ids.iosClientId ?? ''}`;
  if (configuredFor === key) return;
  GoogleSignin.configure({ webClientId: ids.webClientId, iosClientId: ids.iosClientId });
  configuredFor = key;
}

/** Run the native account picker and return what happened. Never throws. */
export async function requestGoogleIdToken(ids: GoogleClientIds): Promise<GoogleOutcome> {
  try {
    configure(ids);
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return { kind: 'cancelled' };
    if (isSuccessResponse(response) && response.data.idToken) {
      return { kind: 'idToken', idToken: response.data.idToken };
    }
    return { kind: 'error', message: GOOGLE_NO_TOKEN_MESSAGE };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
        return { kind: 'cancelled' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { kind: 'error', message: GOOGLE_PLAY_SERVICES_MESSAGE };
      }
    }
    return { kind: 'error', message: GOOGLE_FAILED_MESSAGE };
  }
}

/** Forget the chosen Google account so the next attempt shows the picker. */
export async function clearGoogleSession(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing to clear, or the module is unavailable: either way nothing to do.
  }
}

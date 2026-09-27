/**
 * The decisions behind Google sign-in, kept free of React so they can be
 * tested: whether this build can offer it at all, and what an OAuth response
 * means. The hook in hooks/useGoogleAuth.ts only wires these to the UI.
 */
export type GooglePlatform = 'android' | 'ios' | 'web' | string;

export interface GoogleClientIds {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
}

export const GOOGLE_UNAVAILABLE_MESSAGE =
  'Google sign-in is not available in this version yet. Please use your email and password.';
export const GOOGLE_NO_TOKEN_MESSAGE = 'Google sign-in did not complete. Please try again.';
export const GOOGLE_FAILED_MESSAGE = 'Google sign-in failed. Please try again.';

/** The OAuth client this platform needs, or undefined when the build has none. */
export function googleClientFor(platform: GooglePlatform, ids: GoogleClientIds): string | undefined {
  const id = platform === 'android' ? ids.androidClientId
    : platform === 'ios' ? ids.iosClientId
      : platform === 'web' ? ids.webClientId
        : undefined;
  return id?.trim() ? id : undefined;
}

/** The subset of an AuthSession result this flow reads. */
export interface GoogleAuthResult {
  type: string;
  authentication?: { idToken?: string | null } | null;
  params?: Record<string, string>;
  error?: { message?: string } | null;
}

export type GoogleOutcome =
  | { kind: 'idToken'; idToken: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' };

/**
 * What an OAuth response means for the sign-in screen. A cancelled or
 * dismissed browser is not an error: the user simply stays where they were.
 */
export function interpretGoogleResponse(response: GoogleAuthResult | null | undefined): GoogleOutcome {
  if (!response) return { kind: 'none' };
  if (response.type === 'success') {
    const idToken = response.authentication?.idToken ?? response.params?.id_token;
    return idToken ? { kind: 'idToken', idToken } : { kind: 'error', message: GOOGLE_NO_TOKEN_MESSAGE };
  }
  if (response.type === 'error') {
    return { kind: 'error', message: response.error?.message || GOOGLE_FAILED_MESSAGE };
  }
  return { kind: 'none' };
}

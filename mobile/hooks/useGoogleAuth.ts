import { useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { loginWithGoogleIdToken } from '../services/authService';
import {
  GOOGLE_FAILED_MESSAGE, GOOGLE_UNAVAILABLE_MESSAGE, clearGoogleSession,
  googleSignInReady, requestGoogleIdToken,
} from '../services/googleAuth';
import { POST_SIGN_IN_ROUTE } from '../constants/routes';

// Inlined at build time. The Android OAuth client is not passed in: Google
// matches it by package name and signing certificate.
function readClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  };
}

/**
 * Native Google sign-in → Firebase credential → the existing backend session,
 * then the launch router decides lock, 18+, onboarding or home.
 */
export function useGoogleAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = readClientIds();
  const ready = googleSignInReady(Platform.OS, ids);

  const signInWithGoogle = async () => {
    setError(null);
    if (!ready) {
      setError(GOOGLE_UNAVAILABLE_MESSAGE);
      return;
    }
    setLoading(true);
    try {
      const outcome = await requestGoogleIdToken(ids);
      if (outcome.kind === 'cancelled') return;
      if (outcome.kind === 'error') {
        setError(outcome.message);
        return;
      }
      const res = await loginWithGoogleIdToken(outcome.idToken);
      if (!res.success || !res.data) {
        // Let the next attempt pick an account again rather than reuse this one.
        await clearGoogleSession();
        setError(res.error ?? GOOGLE_FAILED_MESSAGE);
        return;
      }
      useAuthStore.setState({
        user: res.data.user,
        tokens: res.data.tokens,
        isAuthenticated: true,
      });
      router.replace(POST_SIGN_IN_ROUTE);
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading, error, ready };
}

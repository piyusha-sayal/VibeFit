import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { loginWithGoogleIdToken } from '../services/authService';
import {
  GOOGLE_FAILED_MESSAGE, GOOGLE_UNAVAILABLE_MESSAGE, googleClientFor, interpretGoogleResponse,
} from '../services/googleAuth';
import { POST_SIGN_IN_ROUTE } from '../constants/routes';

WebBrowser.maybeCompleteAuthSession();

// Inlined at build time, so they are constant for the life of the app and the
// provider hook below is either always called or never called.
function readClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
}

export function useGoogleAuth() {
  const clientIds = readClientIds();
  // The provider throws if this platform's client id is missing, so without
  // one it is never called.
  const platformClientReady = Boolean(googleClientFor(Platform.OS, clientIds));
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallback: ReturnType<typeof Google.useAuthRequest> = [
    null,
    null,
    async () => ({ type: 'cancel' } as never),
  ];
  const [request, response, promptAsync] = platformClientReady
    ? Google.useAuthRequest(clientIds)
    : fallback;

  useEffect(() => {
    const outcome = interpretGoogleResponse(response);
    if (outcome.kind === 'none') return;
    if (outcome.kind === 'error') {
      setError(outcome.message);
      return;
    }
    setLoading(true);
    loginWithGoogleIdToken(outcome.idToken)
      .then((res) => {
        if (!res.success || !res.data) {
          setError(res.error ?? GOOGLE_FAILED_MESSAGE);
          return;
        }
        useAuthStore.setState({
          user: res.data.user,
          tokens: res.data.tokens,
          isAuthenticated: true,
        });
        // The launch router decides what comes next: lock, 18+, onboarding or home.
        router.replace(POST_SIGN_IN_ROUTE);
      })
      .finally(() => setLoading(false));
  }, [response]);

  const signInWithGoogle = async () => {
    setError(null);
    if (!request) {
      setError(GOOGLE_UNAVAILABLE_MESSAGE);
      return;
    }
    await promptAsync();
  };

  return { signInWithGoogle, loading, error, ready: Boolean(request) };
}

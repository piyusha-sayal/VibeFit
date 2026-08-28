import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { loginWithGoogleIdToken } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

const platformClientReady =
  (Platform.OS === 'android' && Boolean(androidClientId)) ||
  (Platform.OS === 'ios' && Boolean(iosClientId)) ||
  (Platform.OS === 'web' && Boolean(webClientId));

export function useGoogleAuth() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallback: ReturnType<typeof Google.useAuthRequest> = [
    null,
    null,
    async () => ({ type: 'cancel' } as never),
  ];
  const [request, response, promptAsync] = platformClientReady
    ? Google.useAuthRequest({ webClientId, iosClientId, androidClientId })
    : fallback;

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        setError('Google sign-in returned no ID token.');
        return;
      }
      setLoading(true);
      loginWithGoogleIdToken(idToken)
        .then((res) => {
          if (!res.success || !res.data) {
            setError(res.error ?? 'Google sign-in failed');
            return;
          }
          setUser(res.data.user);
          useAuthStore.setState({
            user: res.data.user,
            tokens: res.data.tokens,
            isAuthenticated: true,
          });
          router.replace('/(tabs)');
        })
        .finally(() => setLoading(false));
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in error');
    }
  }, [response]);

  const signInWithGoogle = async () => {
    setError(null);
    if (!request) {
      setError(
        Platform.OS === 'android'
          ? 'Google sign-in needs an Android Client ID (EAS build required for Expo Go SDK 54+).'
          : 'Google sign-in not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.',
      );
      return;
    }
    await promptAsync();
  };

  return { signInWithGoogle, loading, error, ready: Boolean(request) };
}

import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  // Redirecting before the persisted session is read would bounce a signed-in
  // user to login. The splash background covers this brief wait.
  if (isRestoring) return null;
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}

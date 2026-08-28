import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    store.restoreSession();
  }, []);

  const loginAndRedirect = async (email: string, password: string) => {
    await store.login(email, password);
    router.replace('/(tabs)');
  };

  const registerAndRedirect = async (email: string, password: string, name: string) => {
    await store.register(email, password, name);
    router.replace('/(auth)/onboarding');
  };

  const logoutAndRedirect = async () => {
    await store.logout();
    router.replace('/(auth)/login');
  };

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: loginAndRedirect,
    register: registerAndRedirect,
    logout: logoutAndRedirect,
    clearError: store.clearError,
  };
}

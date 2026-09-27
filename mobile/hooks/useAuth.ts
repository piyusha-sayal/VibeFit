import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { POST_SIGN_IN_ROUTE } from '../constants/routes';

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    store.restoreSession();
  }, []);

  const loginAndRedirect = async (email: string, password: string) => {
    await store.login(email, password);
    router.replace(POST_SIGN_IN_ROUTE);
  };

  const registerAndRedirect = async (email: string, password: string, name: string) => {
    await store.register(email, password, name);
    router.replace(POST_SIGN_IN_ROUTE);
  };

  // Every sign-in goes through the launch router, which asks 18+ before
  // onboarding and sends a new account (or a guest) on to onboarding.
  const guestLoginAndRedirect = async () => {
    await store.loginAsGuest();
    router.replace(POST_SIGN_IN_ROUTE);
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
    loginAsGuest: guestLoginAndRedirect,
    logout: logoutAndRedirect,
    clearError: store.clearError,
  };
}

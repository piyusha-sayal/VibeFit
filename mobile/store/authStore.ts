import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import * as authService from '../services/authService';
import * as biometrics from '../services/biometrics';
import { clearCachedAnalysis } from '../services/localCache';
import { useAnalysisStore } from './analysisStore';
import { useLockStore } from './lockStore';
import { useOnboardingStore } from './onboardingStore';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True until the first restoreSession() settles; routing waits on it. */
  isRestoring: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      if (!response.success || !response.data) throw new Error(response.error ?? 'Login failed');
      set({ user: response.data.user, tokens: response.data.tokens, isAuthenticated: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register({ email, password, name });
      if (!response.success || !response.data) throw new Error(response.error ?? 'Registration failed');
      set({ user: response.data.user, tokens: response.data.tokens, isAuthenticated: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.loginAsGuest();
      if (!response.success || !response.data) throw new Error(response.error ?? 'Guest sign-in failed');
      set({ user: response.data.user, tokens: response.data.tokens, isAuthenticated: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Guest sign-in failed';
      set({ error: msg });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    const signingOut = get().user?.id;
    try {
      await authService.logout();
    } finally {
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      // The device cache is not per-account; never show it to the next sign-in.
      await clearCachedAnalysis();
      useAnalysisStore.setState({ currentAnalysis: null, analyses: [] });
      // Forget which account was resolved, not that it finished onboarding:
      // the completion flag is per account and signing back in must not ask
      // the same questions again.
      useOnboardingStore.getState().reset();
      // The lock belongs to the account, not the device: leaving it behind
      // would make the next person to sign in face a prompt for a fingerprint
      // that was never theirs.
      if (signingOut) await biometrics.forget(signingOut);
      useLockStore.getState().reset();
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getCurrentUser();
      const tokens = await authService.getStoredTokens();
      if (user && tokens) {
        set({ user, tokens, isAuthenticated: true });
      }
    } catch {
      // Treat an unreadable session as signed out; the login screen handles it.
    } finally {
      set({ isLoading: false, isRestoring: false });
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));

import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import * as authService from '../services/authService';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
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

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
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
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PALETTES, Palette, ThemeName } from '../constants/theme';

export type ThemePreference = ThemeName | 'system';

interface ThemeValue {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is actually painted right now. */
  name: ThemeName;
  colors: Palette;
  /** True when the OS asks for less motion, or the user set it here. */
  reducedMotion: boolean;
  setPreference: (next: ThemePreference) => void;
  setReducedMotion: (next: boolean) => void;
}

const STORAGE_KEY = 'vibefit.theme';
const MOTION_KEY = 'vibefit.reducedMotion';

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Theme state lives on the device so the first paint after launch is correct;
 * Settings mirrors the same choice to the backend, which is what makes it
 * follow the account to another device.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [userReducedMotion, setUserReducedMotion] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stored, motion] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(MOTION_KEY),
        ]);
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
        if (motion === '1') setUserReducedMotion(true);
      } catch {
        // A device with unreadable storage still gets a usable theme.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setSystemReducedMotion(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReducedMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const name: ThemeName = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      preference,
      name,
      colors: PALETTES[name],
      reducedMotion: userReducedMotion || systemReducedMotion,
      setPreference: (next) => {
        setPreferenceState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
      setReducedMotion: (next) => {
        setUserReducedMotion(next);
        AsyncStorage.setItem(MOTION_KEY, next ? '1' : '0').catch(() => {});
      },
    };
  }, [preference, system, userReducedMotion, systemReducedMotion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}

/** Shorthand for the common case of only needing colours. */
export function useColors(): Palette {
  return useTheme().colors;
}

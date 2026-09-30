import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Presentation } from '../components/visual/features';
import { getOnboarding, saveOnboarding } from '../services/profileService';

/**
 * Who the suggestions are for: the styles someone asked to see (Female /
 * Male) and their age bracket. Both are optional and self-reported — never
 * inferred from a photo. Cached on the device so screens can use them offline.
 */
interface Persona {
  /** Backend value: 'feminine' | 'masculine' | null. */
  genderPresentation: string | null;
  ageRange: string | null;
}

interface PersonaStore extends Persona {
  userId: string | null;
  load: (userId: string) => Promise<void>;
  /** Save a change on the server and locally. Resolves false if the server refused. */
  update: (patch: Partial<Persona>) => Promise<boolean>;
}

const EMPTY: Persona = { genderPresentation: null, ageRange: null };
const key = (userId: string) => `mylookfit.persona.${userId}`;

export const usePersonaStore = create<PersonaStore>((set, get) => ({
  ...EMPTY,
  userId: null,

  load: async (userId) => {
    try {
      const raw = await AsyncStorage.getItem(key(userId));
      if (raw) set({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persona>), userId });
      else set({ ...EMPTY, userId });
    } catch {
      set({ ...EMPTY, userId });
    }
    // The server is the record; refresh from it when it answers.
    const res = await getOnboarding();
    if (res.success && res.data && get().userId === userId) {
      const next = {
        genderPresentation: res.data.genderPresentation ?? null,
        ageRange: res.data.ageRange ?? null,
      };
      set(next);
      AsyncStorage.setItem(key(userId), JSON.stringify(next)).catch(() => undefined);
    }
  },

  update: async (patch) => {
    const { userId } = get();
    const next = { genderPresentation: get().genderPresentation, ageRange: get().ageRange, ...patch };
    set(next);
    if (userId) AsyncStorage.setItem(key(userId), JSON.stringify(next)).catch(() => undefined);
    const res = await saveOnboarding(patch);
    return res.success;
  },
}));

/** The illustration set to draw: 'male' only when Male was chosen. */
export function artPresentation(genderPresentation: string | null): Presentation {
  return genderPresentation === 'masculine' ? 'male' : 'female';
}

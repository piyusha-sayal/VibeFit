import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/authStore';
import { artPresentation, usePersonaStore } from '../store/personaStore';

/** The signed-in person's style presentation and age bracket, loaded once per account. */
export function usePersona() {
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const persona = usePersonaStore();
  const load = usePersonaStore((s) => s.load);
  const save = usePersonaStore((s) => s.update);
  const queryClient = useQueryClient();

  // Hairstyle lists and looks are filtered on the server by these answers,
  // so cached results are refetched once the change is saved.
  const update = useCallback(async (patch: Parameters<typeof save>[0]) => {
    const ok = await save(patch);
    if (ok) await queryClient.invalidateQueries();
    return ok;
  }, [save, queryClient]);

  useEffect(() => {
    if (userId && persona.userId !== userId) void load(userId);
  }, [userId, persona.userId, load]);

  return {
    genderPresentation: persona.genderPresentation,
    ageRange: persona.ageRange,
    art: artPresentation(persona.genderPresentation),
    update,
  };
}

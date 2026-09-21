/**
 * React Query hooks over the colour and passport endpoints.
 *
 * Every hook returns the unwrapped payload or throws, so screens can rely on
 * `isLoading` / `error` / `data` instead of unwrapping the envelope themselves.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as beauty from '../services/beautyService';
import type {
  BeautyGoal, BeautyProfile, ColorReport, Passport, SavedLook, SeasonSummary, UserSettings,
} from '../services/beautyService';
import { ApiResponse } from '../types';

/** A 404 from these endpoints means "nothing yet", which screens render as an empty state. */
export class NotFoundError extends Error {}

async function take<T>(call: Promise<ApiResponse<T>>): Promise<T> {
  const res = await call;
  if (res.success && res.data !== null) return res.data;
  if (res.status === 404) throw new NotFoundError(res.error ?? 'Not found');
  throw new Error(res.error ?? 'Request failed');
}

const noRetryOn404 = (failureCount: number, error: unknown) =>
  !(error instanceof NotFoundError) && failureCount < 2;

export const passportKey = ['passport'] as const;
export const colorReportKey = ['color', 'report'] as const;
export const looksKey = ['passport', 'looks'] as const;
export const goalsKey = ['passport', 'goals'] as const;
export const settingsKey = ['passport', 'settings'] as const;

export function usePassport() {
  return useQuery<Passport>({
    queryKey: passportKey,
    queryFn: () => take(beauty.getPassport()),
  });
}

export function useColorReport() {
  return useQuery<ColorReport>({
    queryKey: colorReportKey,
    queryFn: () => take(beauty.getColorReport()),
    retry: noRetryOn404,
  });
}

export function useSeasons() {
  return useQuery<SeasonSummary[]>({
    queryKey: ['color', 'seasons'],
    queryFn: async () => (await take(beauty.listSeasons())).seasons,
    // The twelve-season reference is static data; it never needs refetching.
    staleTime: Infinity,
  });
}

export function useBeautyProfile() {
  return useQuery<BeautyProfile>({
    queryKey: ['passport', 'profile'],
    queryFn: () => take(beauty.getBeautyProfile()),
    retry: noRetryOn404,
  });
}

export function useSaveBeautyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: BeautyProfile) => take(beauty.saveBeautyProfile(patch)),
    onSuccess: (profile) => {
      qc.setQueryData(['passport', 'profile'], profile);
      qc.invalidateQueries({ queryKey: passportKey });
    },
  });
}

export function useLooks(params?: { kind?: string; status?: string }) {
  return useQuery<SavedLook[]>({
    queryKey: [...looksKey, params ?? {}],
    queryFn: () => take(beauty.listLooks(params)),
  });
}

export function useSaveLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (look: Parameters<typeof beauty.saveLook>[0]) => take(beauty.saveLook(look)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: looksKey });
      qc.invalidateQueries({ queryKey: passportKey });
    },
  });
}

export function useUpdateLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status?: SavedLook['status']; name?: string }) =>
      take(beauty.updateLook(id, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: looksKey });
      qc.invalidateQueries({ queryKey: passportKey });
    },
  });
}

export function useDeleteLook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await beauty.deleteLook(id);
      if (!res.success) throw new Error(res.error ?? 'Could not remove that look');
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: looksKey });
      qc.invalidateQueries({ queryKey: passportKey });
    },
  });
}

export function useGoals() {
  return useQuery<BeautyGoal[]>({ queryKey: goalsKey, queryFn: () => take(beauty.listGoals()) });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goal: { title: string; detail?: string }) => take(beauty.createGoal(goal)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalsKey });
      qc.invalidateQueries({ queryKey: passportKey });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; status?: BeautyGoal['status']; title?: string }) =>
      take(beauty.updateGoal(id, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalsKey });
      qc.invalidateQueries({ queryKey: passportKey });
    },
  });
}

export function useSettings() {
  return useQuery<UserSettings>({ queryKey: settingsKey, queryFn: () => take(beauty.getSettings()) });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserSettings>) => take(beauty.updateSettings(patch)),
    onSuccess: (settings) => qc.setQueryData(settingsKey, settings),
  });
}

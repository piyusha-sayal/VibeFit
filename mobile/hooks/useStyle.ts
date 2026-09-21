/**
 * React Query hooks for Discover My Style.
 *
 * Saving a preference invalidates the outfit and garment queries, so a change
 * to the profile is visible in the recommendations immediately rather than on
 * the next cold load.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as style from '../services/styleService';
import type {
  ColourPairing, GarmentFilters, OutfitResponse, StyleOptions, StyleProfile,
  StyleProfilePatch,
} from '../services/styleService';
import { ApiResponse } from '../types';
import { NotFoundError } from './useBeauty';

async function take<T>(call: Promise<ApiResponse<T>>): Promise<T> {
  const res = await call;
  if (res.success && res.data !== null) return res.data;
  if (res.status === 404) throw new NotFoundError(res.error ?? 'Not found');
  throw new Error(res.error ?? 'Request failed');
}

export const styleProfileKey = ['style', 'profile'] as const;
export const outfitsKey = ['style', 'outfits'] as const;
export const garmentsKey = ['style', 'garments'] as const;
export const styleColoursKey = ['style', 'colours'] as const;

function invalidateStyle(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: styleProfileKey });
  qc.invalidateQueries({ queryKey: outfitsKey });
  qc.invalidateQueries({ queryKey: garmentsKey });
  qc.invalidateQueries({ queryKey: styleColoursKey });
  qc.invalidateQueries({ queryKey: ['passport'] });
}

export function useStyleProfile() {
  return useQuery<StyleProfile>({
    queryKey: styleProfileKey,
    queryFn: () => take(style.getStyleProfile()),
  });
}

export function useUpdateStyleProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: StyleProfilePatch) => take(style.updateStyleProfile(patch)),
    onSuccess: (profile) => {
      qc.setQueryData(styleProfileKey, profile);
      invalidateStyle(qc);
    },
  });
}

export function useStyleOptions() {
  return useQuery<StyleOptions>({
    queryKey: ['style', 'options'],
    queryFn: () => take(style.getStyleOptions()),
    staleTime: Infinity, // static reference data
  });
}

export function useGarments(filters: GarmentFilters = {}) {
  return useQuery({
    queryKey: [...garmentsKey, filters],
    queryFn: () => take(style.getGarments(filters)),
  });
}

export function useAesthetics() {
  return useQuery({
    queryKey: ['style', 'aesthetics'],
    queryFn: () => take(style.getAesthetics()),
    staleTime: Infinity,
  });
}

export function useStyleQuiz() {
  return useQuery({
    queryKey: ['style', 'quiz'],
    queryFn: () => take(style.getQuiz()),
    staleTime: Infinity,
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answers, save }: { answers: Record<string, string[] | string>; save?: boolean }) =>
      take(style.submitQuiz(answers, save ?? true)),
    onSuccess: () => invalidateStyle(qc),
  });
}

export function useOutfits(occasion?: string, climate?: string) {
  return useQuery<OutfitResponse>({
    queryKey: [...outfitsKey, occasion ?? null, climate ?? null],
    queryFn: () => take(style.getOutfits(occasion, climate)),
  });
}

export function useOutfitColours(region?: string) {
  return useQuery({
    queryKey: [...styleColoursKey, region ?? null],
    queryFn: () => take(style.getOutfitColours(region)),
  });
}

export function useColourPairing(key: string | null) {
  return useQuery<ColourPairing>({
    queryKey: [...styleColoursKey, 'pairing', key],
    queryFn: () => take(style.getColourPairing(key as string)),
    enabled: Boolean(key),
  });
}

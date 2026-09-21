/**
 * React Query hooks for the face profile and the three studios.
 *
 * The face profile is the shared cache key: confirming an attribute
 * invalidates the studios too, so a correction is visible everywhere at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as face from '../services/faceService';
import type {
  AccessoriesBundle, Aesthetic, BangsOption, FaceProfile, GuideProgressRow,
  HairColourOption, HairFilters, MakeupLook, Parting, SalonGuide,
} from '../services/faceService';
import { ApiResponse } from '../types';
import { NotFoundError } from './useBeauty';

async function take<T>(call: Promise<ApiResponse<T>>): Promise<T> {
  const res = await call;
  if (res.success && res.data !== null) return res.data;
  if (res.status === 404) throw new NotFoundError(res.error ?? 'Not found');
  throw new Error(res.error ?? 'Request failed');
}

const noRetryOn404 = (failureCount: number, error: unknown) =>
  !(error instanceof NotFoundError) && failureCount < 2;

export const faceProfileKey = ['face', 'profile'] as const;
export const hairKey = ['hair'] as const;
export const makeupKey = ['makeup'] as const;
export const accessoriesKey = ['accessories'] as const;
export const guideProgressKey = ['guides', 'progress'] as const;

/** Everything that changes when the face profile changes. */
function invalidateFaceDependents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: faceProfileKey });
  qc.invalidateQueries({ queryKey: hairKey });
  qc.invalidateQueries({ queryKey: makeupKey });
  qc.invalidateQueries({ queryKey: accessoriesKey });
  qc.invalidateQueries({ queryKey: ['passport'] });
}

export function useFaceProfile() {
  return useQuery<FaceProfile>({
    queryKey: faceProfileKey,
    queryFn: () => take(face.getFaceProfile()),
  });
}

export function useSetFaceAttribute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      take(face.setFaceAttribute(key, value)),
    onSuccess: (profile) => {
      qc.setQueryData(faceProfileKey, profile);
      invalidateFaceDependents(qc);
    },
  });
}

export function useSetFaceShape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => take(face.setFaceShape(value)),
    onSuccess: (profile) => {
      qc.setQueryData(faceProfileKey, profile);
      invalidateFaceDependents(qc);
    },
  });
}

export function useShapeReport() {
  return useQuery({
    queryKey: ['face', 'shape-report'],
    queryFn: () => take(face.getShapeReport()),
    retry: noRetryOn404,
  });
}

export function useAllShapes() {
  return useQuery({
    queryKey: ['face', 'shapes'],
    queryFn: () => take(face.getAllShapes()),
    staleTime: Infinity, // static reference data
  });
}

// ------------------------------------------------------------------ hair

export function useHairstyles(filters: HairFilters = {}) {
  return useQuery({
    queryKey: [...hairKey, 'styles', filters],
    queryFn: () => take(face.getHairstyles(filters)),
  });
}

export function useBangs(texture?: string) {
  return useQuery<{ faceShape: string | null; bangs: BangsOption[]; disclaimer: string }>({
    queryKey: [...hairKey, 'bangs', texture ?? null],
    queryFn: () => take(face.getBangs(texture)),
  });
}

export function useHairColours(maxLift?: string) {
  return useQuery<{ season: string | null; seasonLabel: string | null; colours: HairColourOption[] }>({
    queryKey: [...hairKey, 'colours', maxLift ?? null],
    queryFn: () => take(face.getHairColours(maxLift)),
  });
}

export function usePartings() {
  return useQuery<{ faceShape: string | null; partings: Parting[] }>({
    queryKey: [...hairKey, 'partings'],
    queryFn: () => take(face.getPartings()),
  });
}

export function useSalonGuide(styleKey: string | null) {
  return useQuery<SalonGuide>({
    queryKey: [...hairKey, 'salon', styleKey],
    queryFn: () => take(face.getSalonGuide(styleKey as string)),
    enabled: Boolean(styleKey),
    retry: noRetryOn404,
  });
}

// ---------------------------------------------------------------- makeup

export function useAesthetics(occasion?: string, maxMinutes?: number) {
  return useQuery<{ contrast: string | null; count: number; aesthetics: Aesthetic[] }>({
    queryKey: [...makeupKey, 'aesthetics', occasion ?? null, maxMinutes ?? null],
    queryFn: () => take(face.getAesthetics(occasion, maxMinutes)),
  });
}

export function useMakeupLook(key: string | null, occasion?: string) {
  return useQuery<MakeupLook>({
    queryKey: [...makeupKey, 'look', key, occasion ?? null],
    queryFn: () => take(face.getMakeupLook(key as string, occasion)),
    enabled: Boolean(key),
    retry: noRetryOn404,
  });
}

// ----------------------------------------------------------- accessories

export function useAccessories() {
  return useQuery<AccessoriesBundle>({
    queryKey: [...accessoriesKey, 'all'],
    queryFn: () => take(face.getAccessories()),
  });
}

// ---------------------------------------------------------------- guides

export function useGuideProgress() {
  return useQuery<{ progress: GuideProgressRow[]; completedCount: number; savedCount: number }>({
    queryKey: guideProgressKey,
    queryFn: () => take(face.getGuideProgress()),
  });
}

export function useUpdateGuideProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...body }: { slug: string; saved?: boolean; completed?: boolean; lastStep?: number }) =>
      take(face.updateGuideProgress(slug, body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: guideProgressKey });
      qc.invalidateQueries({ queryKey: ['passport'] });
    },
  });
}

export function useSyncGuideProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ completed, saved }: { completed: string[]; saved: string[] }) =>
      take(face.syncGuideProgress(completed, saved)),
    onSuccess: () => qc.invalidateQueries({ queryKey: guideProgressKey }),
  });
}

/**
 * React Query hooks for Create My Look.
 *
 * Mutations invalidate the Passport as well as the look queries, so a saved
 * look shows up in the journey without a cold reload.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as looks from '../services/lookService';
import type {
  GeneratedLooks, LookBrief, LookComposition, LookContext, LookDraft, LookOptions,
  ReopenedLook, SavedLook, Selection, Verdict,
} from '../services/lookService';
import { ApiResponse } from '../types';
import { NotFoundError } from './useBeauty';

async function take<T>(call: Promise<ApiResponse<T>>): Promise<T> {
  const res = await call;
  if (res.success && res.data !== null) return res.data;
  if (res.status === 404) throw new NotFoundError(res.error ?? 'Not found');
  throw new Error(res.error ?? 'Request failed');
}

export const lookOptionsKey = ['looks', 'options'] as const;
export const lookContextKey = ['looks', 'context'] as const;
export const draftsKey = ['looks', 'drafts'] as const;
export const savedLooksKey = ['looks', 'saved'] as const;
export const collectionsKey = ['looks', 'collections'] as const;

function invalidateLooks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: draftsKey });
  qc.invalidateQueries({ queryKey: savedLooksKey });
  qc.invalidateQueries({ queryKey: collectionsKey });
  qc.invalidateQueries({ queryKey: ['passport'] });
}

export function useLookOptions() {
  return useQuery<LookOptions>({
    queryKey: lookOptionsKey,
    queryFn: () => take(looks.getLookOptions()),
    staleTime: Infinity, // static reference data
  });
}

export function useLookContext(exclude: string[] = []) {
  return useQuery<LookContext>({
    queryKey: [...lookContextKey, exclude.join(',')],
    queryFn: () => take(looks.getLookContext(exclude)),
  });
}

export function useGenerateLooks() {
  return useMutation<GeneratedLooks, Error, LookBrief>({
    mutationFn: (brief) => take(looks.generateLooks(brief)),
  });
}

export function useAlternatives(query: looks.AlternativeQuery | null) {
  return useQuery({
    queryKey: ['looks', 'alternatives', query],
    queryFn: () => take(looks.getAlternatives(query as looks.AlternativeQuery)),
    enabled: Boolean(query),
  });
}

export function useApplyComponent() {
  return useMutation<
    { composition: LookComposition; changed: boolean; note: string | null },
    Error,
    { composition: LookComposition; component: string; selection: Selection }
  >({
    mutationFn: ({ composition, component, selection }) =>
      take(looks.applyComponent(composition, component, selection)),
  });
}

export function useShiftLook() {
  return useMutation<
    { composition: LookComposition; changed: boolean; note: string | null },
    Error,
    { composition: LookComposition; kind: string }
  >({
    mutationFn: ({ composition, kind }) => take(looks.shiftLook(composition, kind)),
  });
}

export function useDrafts() {
  return useQuery({
    queryKey: draftsKey,
    queryFn: () => take(looks.listDrafts()),
  });
}

export function useDraft(id: string | null) {
  return useQuery<LookDraft>({
    queryKey: [...draftsKey, id],
    queryFn: () => take(looks.getDraft(id as string)),
    enabled: Boolean(id),
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation<LookDraft, Error, Parameters<typeof looks.saveDraft>[0]>({
    mutationFn: (payload) => take(looks.saveDraft(payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: draftsKey });
      qc.invalidateQueries({ queryKey: ['passport'] });
    },
  });
}

export function useDiscardDraft() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => take(looks.discardDraft(id)),
    onSuccess: () => invalidateLooks(qc),
  });
}

export function useSavedLooks(status?: string) {
  return useQuery({
    queryKey: [...savedLooksKey, status ?? null],
    queryFn: () => take(looks.listSavedLooks(status)),
  });
}

export function useSavedLook(id: string | null) {
  return useQuery<ReopenedLook>({
    queryKey: [...savedLooksKey, 'one', id],
    queryFn: () => take(looks.getSavedLook(id as string)),
    enabled: Boolean(id),
  });
}

export function useSaveLook() {
  const qc = useQueryClient();
  return useMutation<SavedLook, Error, Parameters<typeof looks.saveLook>[0]>({
    mutationFn: (payload) => take(looks.saveLook(payload)),
    onSuccess: () => invalidateLooks(qc),
  });
}

export function useUpdateLook() {
  const qc = useQueryClient();
  return useMutation<
    SavedLook, Error, { id: string; patch: Parameters<typeof looks.updateLook>[1] }
  >({
    mutationFn: ({ id, patch }) => take(looks.updateLook(id, patch)),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...savedLooksKey, 'one', variables.id] });
      invalidateLooks(qc);
    },
  });
}

export function useDuplicateLook() {
  const qc = useQueryClient();
  return useMutation<SavedLook, Error, { id: string; name?: string; clientToken?: string }>({
    mutationFn: ({ id, name, clientToken }) =>
      take(looks.duplicateLook(id, { name, clientToken })),
    onSuccess: () => invalidateLooks(qc),
  });
}

export function useDeleteLook() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => take(looks.deleteLook(id)),
    onSuccess: () => invalidateLooks(qc),
  });
}

export function useCompareLooks(ids: string[]) {
  return useQuery({
    queryKey: ['looks', 'compare', ids.join(',')],
    queryFn: () => take(looks.compareLooks(ids)),
    enabled: ids.length >= 2,
  });
}

export function useSendFeedback() {
  const qc = useQueryClient();
  return useMutation<
    unknown, Error, { component: string; itemKey: string; verdict: Verdict }
  >({
    mutationFn: ({ component, itemKey, verdict }) =>
      take(looks.sendFeedback(component, itemKey, verdict)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['looks', 'alternatives'] });
      qc.invalidateQueries({ queryKey: ['looks', 'feedback'] });
    },
  });
}

export function useCollections() {
  return useQuery({
    queryKey: collectionsKey,
    queryFn: () => take(looks.listCollections()),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation<{ id: string; name: string; created: boolean }, Error, string>({
    mutationFn: (name) => take(looks.createCollection(name)),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionsKey }),
  });
}

export function useAddToCollection() {
  const qc = useQueryClient();
  return useMutation<{ added: boolean }, Error, { collectionId: string; lookId: string }>({
    mutationFn: ({ collectionId, lookId }) => take(looks.addToCollection(collectionId, lookId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionsKey }),
  });
}

export function useRemoveFromCollection() {
  const qc = useQueryClient();
  return useMutation<void, Error, { collectionId: string; lookId: string }>({
    mutationFn: ({ collectionId, lookId }) =>
      take(looks.removeFromCollection(collectionId, lookId)),
    onSuccess: () => qc.invalidateQueries({ queryKey: collectionsKey }),
  });
}

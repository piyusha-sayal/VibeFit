import { del, get, patch, post } from './api';
import type { ApiResponse } from '../types';

export interface StoredPhoto {
  analysisId: string;
  createdAt: string | null;
  status: string;
  /** True when a photograph is still held in storage for this scan. */
  stored: boolean;
  deletedAt: string | null;
  analysisKept: boolean;
}

export interface PhotoList {
  photos: StoredPhoto[];
  storedCount: number;
  /** False when this deployment has no object storage, so nothing can be kept. */
  storageAvailable: boolean;
  retentionNote: string;
  /** Present only when storage is unavailable; explains what happens instead. */
  storageNote: string | null;
}

export interface PhotoConsent {
  /** What the person asked for, which can outlive the ability to honour it. */
  photoRetentionConsent: boolean;
  photoReuseConsent: boolean;
  storageAvailable: boolean;
  /** Consent AND capability — the only field that describes reality. */
  retentionEffective: boolean;
  reuseEffective: boolean;
  retentionNote: string;
  storageNote: string | null;
}

export interface DeletionResult {
  deleted: boolean;
  photographsAttempted: number;
  photographsRemoved: number;
  /** Objects storage refused right now. Queued server-side, not forgotten. */
  photographsQueuedForRetry: number;
  retentionNote: string;
}

/** Typed exactly, never localised, never trimmed — the server compares it. */
export const DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';

export const listPhotos = (): Promise<ApiResponse<PhotoList>> =>
  get<PhotoList>('/privacy/photos');

export const deletePhoto = (
  analysisId: string,
): Promise<ApiResponse<{ photo: StoredPhoto; objectRemoved: boolean }>> =>
  del(`/privacy/photos/${analysisId}`);

export const deleteAllPhotos = (): Promise<
  ApiResponse<{ requested: number; objectsRemoved: number }>
> => del('/privacy/photos');

export const getConsent = (): Promise<ApiResponse<PhotoConsent>> =>
  get<PhotoConsent>('/privacy/consent');

export const setConsent = (body: {
  photoRetentionConsent?: boolean;
  photoReuseConsent?: boolean;
}): Promise<ApiResponse<PhotoConsent>> => patch<PhotoConsent>('/privacy/consent', body);

/**
 * The export arrives as a whole account document. Casing is deliberately
 * preserved: these are the server's own column names, and rewriting them to
 * camelCase would hand the user a file that no longer describes their data.
 */
export const exportData = (): Promise<ApiResponse<Record<string, unknown>>> =>
  get<Record<string, unknown>>('/privacy/export', { preserveCase: true });

export const deleteAccount = (body: {
  confirmation: string;
  password?: string;
}): Promise<ApiResponse<DeletionResult>> =>
  post<DeletionResult>('/privacy/delete-account', body);

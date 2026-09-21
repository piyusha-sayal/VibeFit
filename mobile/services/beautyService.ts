/**
 * Client for the colour and passport endpoints.
 *
 * `api.ts` already converts snake_case to camelCase both ways, so the shapes
 * here are the camelCase view of what the backend returns.
 */
import { del, get, patch, post, put } from './api';
import { ApiResponse } from '../types';

export interface Swatch {
  name: string;
  hex: string;
}

export interface SeasonPalettes {
  best: Swatch[];
  neutrals: Swatch[];
  accents: Swatch[];
  compare: Swatch[];
  lipstick: Swatch[];
  blush: Swatch[];
  eyeshadow: Swatch[];
  hair: Swatch[];
}

export interface ColorReport {
  season: string;
  label: string;
  family: string;
  summary: string;
  undertone: string;
  depth: string;
  chroma: string;
  contrast: string;
  skinColor: string;
  confidence: number;
  limitations: string[];
  alternate: { season: string; label: string; summary: string };
  palettes: SeasonPalettes;
  metals: string[];
  garments: { indian: string[]; global: string[] };
  analysisId?: string;
  createdAt?: string;
}

export interface SeasonSummary {
  season: string;
  label: string;
  family: string;
  summary: string;
  palettes: { best: Swatch[]; neutrals: Swatch[] };
}

export interface PassportAttribute {
  key: string;
  label: string;
  status: 'present' | 'missing';
  value: string | string[] | null;
  detail?: string | null;
  route?: string;
  action?: { label: string; route: string } | null;
}

export interface Passport {
  attributes: PassportAttribute[];
  completion: number;
  completed: number;
  total: number;
  /**
   * What this completion counts. The style questionnaire reports its own,
   * over a different set of answers — the two are never the same number, so
   * both are labelled rather than shown as a bare percentage.
   */
  completionOf: string;
  nextAction: { label: string; route: string } | null;
  journey: {
    analyses: number;
    savedLooks: number;
    triedLooks: number;
    wantToTry: number;
    completeLooks: number;
    looksInProgress: number;
    collections: number;
    activeGoals: number;
  };
  recentLooks: {
    id: string;
    name: string;
    status: string;
    occasion: string | null;
    updatedAt: string;
    swatches: Swatch[];
  }[];
  favouriteAesthetics: { key: string; name: string }[];
  lovedItems: string[];
  timeline: { id: string; kind: string; summary: string; refId: string | null; createdAt: string }[];
  latestAnalysisId: string | null;
  photoReuseConsent: boolean;
}

export interface SavedLook {
  id: string;
  name: string;
  kind: 'hair' | 'makeup' | 'outfit' | 'colour' | 'complete';
  status: 'saved' | 'want_to_try' | 'tried';
  occasion?: string | null;
  payload?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
}

export interface BeautyProfile {
  bodyType?: string | null;
  heightCm?: number | null;
  fitPreference?: string | null;
  necklinePreferences?: string[] | null;
  sleevePreferences?: string[] | null;
  silhouettePreferences?: string[] | null;
  aesthetics?: string[] | null;
  culturalPreferences?: string[] | null;
  favouriteOccasions?: string[] | null;
  hairLength?: string | null;
  hairDensity?: string | null;
  makeupExperience?: string | null;
}

export interface BeautyGoal {
  id: string;
  title: string;
  detail?: string | null;
  status: 'active' | 'done' | 'dropped';
  createdAt: string;
  completedAt?: string | null;
}

export interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  reducedMotion: boolean;
  country?: string | null;
  language?: string | null;
  photoReuseConsent: boolean;
}

// ------------------------------------------------------------------- colour

export const getColorReport = (): Promise<ApiResponse<ColorReport>> => get<ColorReport>('/color/report');

export const listSeasons = (): Promise<ApiResponse<{ seasons: SeasonSummary[] }>> =>
  get<{ seasons: SeasonSummary[] }>('/color/seasons');

export const getSeason = (season: string): Promise<ApiResponse<ColorReport>> =>
  get<ColorReport>(`/color/seasons/${season}`);

// ----------------------------------------------------------------- passport

export const getPassport = (): Promise<ApiResponse<Passport>> => get<Passport>('/passport');

export const getBeautyProfile = (): Promise<ApiResponse<BeautyProfile>> =>
  get<BeautyProfile>('/passport/profile');

export const saveBeautyProfile = (body: BeautyProfile): Promise<ApiResponse<BeautyProfile>> =>
  put<BeautyProfile>('/passport/profile', body);

export const listLooks = (params?: { kind?: string; status?: string }): Promise<ApiResponse<SavedLook[]>> =>
  get<SavedLook[]>('/passport/looks', params);

export const saveLook = (look: {
  name: string;
  kind: SavedLook['kind'];
  status?: SavedLook['status'];
  occasion?: string;
  payload?: Record<string, unknown>;
  notes?: string;
}): Promise<ApiResponse<SavedLook>> => post<SavedLook>('/passport/looks', look);

export const updateLook = (
  id: string,
  body: { name?: string; status?: SavedLook['status']; notes?: string },
): Promise<ApiResponse<SavedLook>> => patch<SavedLook>(`/passport/looks/${id}`, body);

export const deleteLook = (id: string): Promise<ApiResponse<null>> => del<null>(`/passport/looks/${id}`);

export const listGoals = (): Promise<ApiResponse<BeautyGoal[]>> => get<BeautyGoal[]>('/passport/goals');

export const createGoal = (goal: { title: string; detail?: string }): Promise<ApiResponse<BeautyGoal>> =>
  post<BeautyGoal>('/passport/goals', goal);

export const updateGoal = (
  id: string,
  body: { status?: BeautyGoal['status']; title?: string },
): Promise<ApiResponse<BeautyGoal>> => patch<BeautyGoal>(`/passport/goals/${id}`, body);

export const getSettings = (): Promise<ApiResponse<UserSettings>> => get<UserSettings>('/passport/settings');

export const updateSettings = (body: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> =>
  patch<UserSettings>('/passport/settings', body);

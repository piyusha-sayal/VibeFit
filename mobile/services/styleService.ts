/**
 * Client for Discover My Style.
 *
 * Saving an outfit deliberately goes through the Passport's saved-looks
 * endpoint rather than a style-specific one — there is one saved-items system.
 */
import { get, post, put } from './api';

export interface StyleField {
  key: string;
  value: unknown;
  answered: boolean;
  action: string | null;
}

export interface StyleSection {
  key: string;
  label: string;
  intro: string;
  complete: boolean;
  fields: StyleField[];
}

export interface StyleProfile {
  bodyType: string | null;
  bodyTypeDeclined: boolean;
  heightCm: number | null;
  fitPreference: string | null;
  silhouettePreferences: string[];
  necklinePreferences: string[];
  sleevePreferences: string[];
  garmentPreferences: Record<string, unknown>;
  aesthetics: string[];
  aestheticDetails: { key: string; name: string; summary: string }[];
  culturalPreferences: string[];
  sizes: Record<string, unknown>;
  favouriteOccasions: string[];
  comfortNotes: string | null;
  styleQuiz: Record<string, unknown>;
  climate: string | null;
  budget: string | null;
  modesty: string | null;
  market: string | null;
  sections: StyleSection[];
  completion: number;
  answered: number;
  total: number;
  bodyTypes: string[];
  bodyTypeNote: string;
}

export interface Garment {
  key: string;
  name: string;
  category: string;
  region: string;
  description: string;
  silhouette: string;
  fit: string;
  formality: string;
  occasions: string[];
  climates: string[];
  styling: string[];
  aesthetics: string[];
  note: string;
  score: number;
  reasons: string[];
}

export interface StyleAesthetic {
  key: string;
  name: string;
  summary: string;
  signature: string[];
  heroGarments: string[];
  formality: string;
  effort: string;
  region: string;
  paletteHint?: string;
  score?: number;
}

export interface Outfit {
  key: string;
  name: string;
  summary: string;
  occasion: string | null;
  formality: string;
  pieces: Garment[];
  colours: {
    season: string | null;
    seasonLabel: string | null;
    main: { name: string; hex: string }[];
    neutral: { name: string; hex: string }[];
    accent: { name: string; hex: string }[];
  };
  why: string[];
  accessories: Garment[];
  alternatives: { role: string; swapFor: string; key: string }[];
  score: number;
}

export interface OutfitResponse {
  outfits: Outfit[];
  count: number;
  personalisedWith: {
    bodyType: string | null;
    aesthetics: string[];
    season: string | null;
    seasonLabel: string | null;
    climate: string | null;
  };
  couldImproveWith: string[];
}

export interface ColourSuggestion {
  roles: string[];
  colours: { name: string; hex: string; role: string }[];
  harmony: string;
  label: string;
  why: string;
}

export interface ColourPairing {
  key: string;
  name: string;
  region: string;
  roles: string[];
  note: string;
  season: string | null;
  seasonLabel: string | null;
  palette: { name: string; hex: string; role: string }[];
  suggestions: ColourSuggestion[];
}

export interface QuizQuestion {
  key: string;
  prompt: string;
  helpText: string;
  multi: boolean;
  options: { key: string; label: string }[];
}

export interface StyleOptions {
  bodyTypes: { key: string; label: string; skippable: boolean }[];
  bodyTypeNote: string;
  categories: string[];
  regions: string[];
  climates: string[];
  formality: string[];
  aesthetics: StyleAesthetic[];
  pairings: { key: string; name: string; region: string; roles: string[]; note: string }[];
}

export type StyleProfilePatch = Partial<{
  bodyType: string | null;
  heightCm: number;
  fitPreference: string;
  silhouettePreferences: string[];
  necklinePreferences: string[];
  sleevePreferences: string[];
  garmentPreferences: Record<string, unknown>;
  aesthetics: string[];
  culturalPreferences: string[];
  sizes: Record<string, unknown>;
  favouriteOccasions: string[];
  comfortNotes: string;
}>;

export const getStyleProfile = () => get<StyleProfile>('/style/profile');

export const updateStyleProfile = (patch: StyleProfilePatch) =>
  put<StyleProfile>('/style/profile', patch);

export const getStyleOptions = () => get<StyleOptions>('/style/options');

export interface GarmentFilters {
  category?: string;
  region?: string;
  occasion?: string;
  climate?: string;
  aesthetic?: string;
}

export function getGarments(filters: GarmentFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.region) params.region = filters.region;
  if (filters.occasion) params.occasion = filters.occasion;
  if (filters.climate) params.climate = filters.climate;
  if (filters.aesthetic) params.aesthetic = filters.aesthetic;
  return get<{ count: number; garments: Garment[]; personalisedWith: Record<string, unknown> }>(
    '/style/garments', params,
  );
}

export const getGarment = (key: string) => get<Garment>(`/style/garments/${key}`);

export const getAesthetics = () => get<{ aesthetics: StyleAesthetic[] }>('/style/aesthetics');

export const getQuiz = () => get<{ questions: QuizQuestion[]; note: string }>('/style/quiz');

export const submitQuiz = (answers: Record<string, string[] | string>, save = true) =>
  post<{ ranked: StyleAesthetic[]; suggested: string[]; saved: boolean; note: string }>(
    '/style/quiz', { answers, save },
  );

export const getOutfits = (occasion?: string, climate?: string) =>
  get<OutfitResponse>('/style/outfits', {
    ...(occasion ? { occasion } : {}),
    ...(climate ? { climate } : {}),
  });

export const getOutfitColours = (region?: string) =>
  get<{ season: string | null; seasonLabel: string | null; harmonies: string[]; pairings: ColourPairing[] }>(
    '/style/colours', region ? { region } : undefined,
  );

export const getColourPairing = (key: string) => get<ColourPairing>(`/style/colours/${key}`);

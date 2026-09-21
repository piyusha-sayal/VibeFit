/**
 * Client for Discover My Face, Hair Studio, Makeup Studio and Accessories.
 *
 * `api.ts` converts snake_case to camelCase in both directions, so these types
 * are the camelCase view of the backend payloads.
 */
import { get, post, put } from './api';
import { ApiResponse } from '../types';

export interface AttributeOption {
  key: string;
  label: string;
  description: string;
  styling: string[];
}

/** One facial attribute, with the scan reading and the user's own choice kept apart. */
export interface FaceAttribute {
  key: string;
  label: string;
  intro: string;
  method: string;
  scanValue: string | null;
  userValue: string | null;
  value: string | null;
  valueLabel: string | null;
  styling: string[];
  source: 'scan' | 'user' | 'unset';
  overridden: boolean;
  options: AttributeOption[];
}

export interface FaceShapeGuide {
  summary: string;
  goals: string[];
  hairstyles: string[];
  necklines: string[];
  glasses: string[];
  earrings: string[];
  makeup: string[];
  beard: string[];
}

export interface FaceShape {
  value: string | null;
  scanValue: string | null;
  userValue: string | null;
  source: 'scan' | 'user' | 'unset';
  overridden: boolean;
  alternate: string | null;
  confidence: number | null;
  measurements: Record<string, number>;
  options: string[];
  guide: FaceShapeGuide | null;
}

export interface FaceProfile {
  faceShape: FaceShape;
  attributes: FaceAttribute[];
  completion: number;
  known: number;
  total: number;
  hasScan: boolean;
  analysisId: string | null;
  analysedAt: string | null;
  context: {
    hairTexture: string | null;
    hairLength: string | null;
    season: string | null;
    contrastLevel: string | null;
    maintenanceTolerance: string | null;
    timeAvailable: string | null;
    stylePreferences: string[];
    genderPresentation: string | null;
  };
  proportions: Record<string, number>;
  browMap: Record<string, unknown>;
  disclaimer: string;
}

export interface Hairstyle {
  key: string;
  name: string;
  length: string;
  description: string;
  textures: string[];
  maintenance: 'low' | 'medium' | 'high';
  stylingMinutes: number;
  presentation: string;
  aesthetics: string[];
  origin: string;
  protective: boolean;
  notes: string;
  score: number;
  reasons: string[];
}

export interface BangsOption {
  key: string;
  name: string;
  description: string;
  textures: string[];
  maintenance: string;
  notes: string;
  suited: boolean;
}

export interface HairColourOption {
  key: string;
  name: string;
  hex: string;
  family: string;
  warmth: string;
  liftRequired: 'none' | 'low' | 'medium' | 'high';
  maintenance: string;
  notes: string;
  seasonMatch: boolean;
  reasons: string[];
}

export interface Parting {
  key: string;
  name: string;
  note: string;
  suited: boolean;
}

export interface SalonGuide {
  styleKey: string;
  title: string;
  askFor: string[];
  watchOut: string[];
  maintenance: string;
  disclaimer: string;
}

export interface Aesthetic {
  key: string;
  name: string;
  summary: string;
  signature: string[];
  intensity: string;
  minutes: number;
  occasions: string[];
  origin: string;
  reasons: string[];
}

export interface MakeupLook {
  aesthetic: { key: string; name: string; summary: string; intensity: string; minutes: number; origin: string };
  occasion: string | null;
  steps: string[];
  techniques: {
    key: string; name: string; basedOn: string; basedOnValue: string; steps: string[]; note: string;
  }[];
  missingAttributes: string[];
  palette: {
    season: string | null;
    seasonLabel: string | null;
    lipstick: { name: string; hex: string }[];
    blush: { name: string; hex: string }[];
    eyeshadow: { name: string; hex: string }[];
  };
  foundation: {
    howTo: string[];
    disclaimer: string;
    yourUndertone?: string;
    shadeFamily?: string;
  };
}

export interface AccessoryItem {
  key: string;
  name: string;
  category: string;
  description: string;
  note: string;
  origin: string;
  suited: boolean;
  universal: boolean;
}

export interface MetalItem {
  key: string;
  name: string;
  hex: string;
  warmth: string;
  note: string;
  suited: boolean;
}

export interface AccessoriesBundle {
  faceShape: string | null;
  glasses: AccessoryItem[];
  earrings: AccessoryItem[];
  necklines: AccessoryItem[];
  hairAccessories: AccessoryItem[];
  metals: MetalItem[];
  note: string;
}

export interface GuideProgressRow {
  slug: string;
  saved: boolean;
  completed: boolean;
  completedAt: string | null;
  lastStep: number | null;
  updatedAt: string | null;
}

// ------------------------------------------------------------------ face

export const getFaceProfile = () => get<FaceProfile>('/face/profile');

export const setFaceAttribute = (key: string, value: string) =>
  put<FaceProfile>(`/face/attributes/${key}`, { value });

export const setFaceShape = (value: string) => put<FaceProfile>('/face/shape', { value });

export const getShapeReport = () =>
  get<{ faceShape: FaceShape; disclaimer: string; measurementNote: string }>('/face/shape-report');

export const getAllShapes = () =>
  get<{ shapes: ({ key: string } & FaceShapeGuide)[]; disclaimer: string }>('/face/shapes');

// ------------------------------------------------------------------ hair

export interface HairFilters {
  texture?: string;
  length?: string;
  maintenance?: string;
  presentation?: string;
  protectiveOnly?: boolean;
  maxMinutes?: number;
}

export function getHairstyles(filters: HairFilters = {}) {
  const params: Record<string, string | number | boolean> = {};
  if (filters.texture) params.texture = filters.texture;
  if (filters.length) params.length = filters.length;
  if (filters.maintenance) params.maintenance = filters.maintenance;
  if (filters.presentation) params.presentation = filters.presentation;
  if (filters.protectiveOnly) params.protective_only = true;
  if (filters.maxMinutes) params.max_minutes = filters.maxMinutes;
  return get<{ faceShape: string | null; appliedTexture: string | null; count: number; styles: Hairstyle[]; disclaimer: string }>(
    '/hair/styles', params,
  );
}

export const getBangs = (texture?: string) =>
  get<{ faceShape: string | null; bangs: BangsOption[]; disclaimer: string }>(
    '/hair/bangs', texture ? { texture } : undefined,
  );

export const getHairColours = (maxLift?: string) =>
  get<{ season: string | null; seasonLabel: string | null; colours: HairColourOption[] }>(
    '/hair/colours', maxLift ? { max_lift: maxLift } : undefined,
  );

export const getPartings = () =>
  get<{ faceShape: string | null; partings: Parting[] }>('/hair/partings');

export const getSalonGuide = (styleKey: string) => get<SalonGuide>(`/hair/salon-guide/${styleKey}`);

// ---------------------------------------------------------------- makeup

export const getAesthetics = (occasion?: string, maxMinutes?: number) =>
  get<{ contrast: string | null; count: number; aesthetics: Aesthetic[] }>('/makeup/aesthetics', {
    ...(occasion ? { occasion } : {}),
    ...(maxMinutes ? { max_minutes: maxMinutes } : {}),
  });

export const getMakeupLook = (key: string, occasion?: string) =>
  get<MakeupLook>(`/makeup/looks/${key}`, occasion ? { occasion } : undefined);

export const getMakeupOptions = () =>
  get<{ occasions: string[]; timeBudgets: number[]; intensities: string[] }>('/makeup/options');

// ----------------------------------------------------------- accessories

export const getAccessories = () => get<AccessoriesBundle>('/accessories');

export const getAccessoryCategory = (category: string, origin?: string) =>
  get<{ category: string; faceShape: string | null; items: AccessoryItem[]; note: string }>(
    `/accessories/${category}`, origin ? { origin } : undefined,
  );

// ---------------------------------------------------------------- guides

export const getGuideProgress = () =>
  get<{ progress: GuideProgressRow[]; completedCount: number; savedCount: number }>('/guides/progress');

export const updateGuideProgress = (
  slug: string, body: { saved?: boolean; completed?: boolean; lastStep?: number },
) => put<GuideProgressRow>(`/guides/progress/${slug}`, body);

export const completeGuide = (slug: string) =>
  post<GuideProgressRow>(`/guides/progress/${slug}/complete`, {});

export const syncGuideProgress = (completed: string[], saved: string[]) =>
  post<{ merged: number; total: number }>('/guides/progress/sync', { completed, saved });

export type FaceServiceResponse<T> = ApiResponse<T>;
